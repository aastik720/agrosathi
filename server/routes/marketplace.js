import crypto from "crypto";
import express from "express";
import { body, param, query, validationResult } from "express-validator";
import { readFileSync } from "fs";
import { requireAuth } from "../middleware/auth.js";
import { createUserSupabaseClient, supabaseAdmin } from "../config/supabase.js";

const router = express.Router();
const LISTING_BUCKET = "crop-listing-images";
const DEFAULT_RADIUS_KM = 50;
const PAGE_SIZE = 20;
const locations = JSON.parse(readFileSync(new URL("../data/locations.json", import.meta.url), "utf8"));
const buyerScrapeCache = new Map();
const BUYER_SCRAPE_TTL_MS = 6 * 60 * 60 * 1000;

const buyerTypeConfig = {
  hotel: {
    label: "Hotel",
    query: "hotels buying fresh fruits vegetables near",
    crops: ["apple", "potato", "tomato"],
    icon: "hotel",
  },
  restaurant: {
    label: "Restaurant",
    query: "restaurants fresh produce buyers near",
    crops: ["tomato", "onion", "capsicum", "potato"],
    icon: "restaurant",
  },
  retail: {
    label: "Retail Store",
    query: "grocery retail stores fruit vegetable market near",
    crops: ["apple", "tomato", "onion", "potato"],
    icon: "store",
  },
  wholesale: {
    label: "Wholesaler",
    query: "fruit vegetable wholesalers mandi traders near",
    crops: ["apple", "potato", "maize", "onion"],
    icon: "warehouse",
  },
};

const fallbackBuyerNames = {
  hotel: ["Shimla Grand Hotel", "Theog Hill View Hotel", "Kufri Heights Resort"],
  restaurant: ["Himachali Rasoi Restaurant", "Narkanda Fresh Kitchen", "Apple Valley Cafe"],
  retail: ["Green Basket Retail", "Pahadi Fresh Mart", "Theog Daily Needs"],
  wholesale: ["Shimla Produce Wholesalers", "Himalayan Fruit Traders", "Solan Sabzi Supply"],
};

function validationErrorResponse(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ message: "Request details theek nahi hain.", errors: errors.array() });
  return true;
}

async function optionalAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token || !supabaseAdmin) return next();

    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(token);

    if (user) {
      req.user = user;
      req.accessToken = token;
      req.supabase = createUserSupabaseClient(token);
    }
    next();
  } catch {
    next();
  }
}

function dataUrlParts(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1],
    base64: match[2],
  };
}

function extensionForContentType(contentType) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function lookupCoordinates(locationText = "") {
  const value = String(locationText).toLowerCase();
  const match = Object.entries(locations).find(([name]) => value.includes(name.toLowerCase()));
  if (match) return { ...match[1], name: match[0] };
  return { lat: 31.1048, lng: 77.1734, name: "Shimla", state: "Himachal Pradesh" };
}

function toRadians(degrees) {
  return (Number(degrees) * Math.PI) / 180;
}

function distanceKm(aLat, aLng, bLat, bLng) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeStatus(status) {
  if (status === "under negotiation") return "under_negotiation";
  return status || "active";
}

function getProfileCoords(profile) {
  const lat = Number(profile?.lat);
  const lng = Number(profile?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return lookupCoordinates(profile?.location);
}

function getQueryCoords(req, profile) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return getProfileCoords(profile);
}

async function getMyProfile(req) {
  if (!req.user || !supabaseAdmin) return null;
  const { data } = await supabaseAdmin.from("profiles").select("*").eq("id", req.user.id).maybeSingle();
  return data || null;
}

async function createSignedUrl(path, expiresIn = 60 * 60) {
  if (!path || !supabaseAdmin) return null;
  if (String(path).startsWith("http")) return path;

  const { data, error } = await supabaseAdmin.storage
    .from(LISTING_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) return null;
  return data?.signedUrl || null;
}

async function attachListingImages(listing) {
  const paths = listing.image_urls?.length ? listing.image_urls : listing.image_url ? [listing.image_url] : [];
  const signedUrls = await Promise.all(paths.map((path) => createSignedUrl(path, 60 * 60)));
  return {
    ...listing,
    image_paths: paths,
    image_urls: signedUrls.filter(Boolean),
    image_url: signedUrls.find(Boolean) || null,
  };
}

async function attachFarmers(listings) {
  const farmerIds = [...new Set((listings || []).map((listing) => listing.farmer_id).filter(Boolean))];
  if (!farmerIds.length || !supabaseAdmin) return listings || [];

  const { data: farmers } = await supabaseAdmin
    .from("profiles")
    .select("id,full_name,phone,location,user_type,is_verified,business_type")
    .in("id", farmerIds);

  const byId = new Map((farmers || []).map((farmer) => [farmer.id, farmer]));
  return (listings || []).map((listing) => ({ ...listing, farmer: byId.get(listing.farmer_id) || null }));
}

async function decorateListings(listings, origin) {
  const withFarmers = await attachFarmers(listings || []);
  const decorated = await Promise.all(
    withFarmers.map(async (listing) => {
      const coords = {
        lat: Number(listing.lat) || lookupCoordinates(listing.location).lat,
        lng: Number(listing.lng) || lookupCoordinates(listing.location).lng,
      };
      const withImages = await attachListingImages(listing);
      return {
        ...withImages,
        distance_km: origin ? Number(distanceKm(origin.lat, origin.lng, coords.lat, coords.lng).toFixed(1)) : null,
      };
    })
  );
  return decorated;
}

async function uploadListingPhotos(req, photos = []) {
  const uploaded = [];
  const validPhotos = photos.slice(0, 3);

  for (const photo of validPhotos) {
    const parts = dataUrlParts(photo);
    if (!parts) continue;

    const imageBuffer = Buffer.from(parts.base64, "base64");
    const extension = extensionForContentType(parts.contentType);
    const path = `${req.user.id}/${crypto.randomUUID()}.${extension}`;

    const { error } = await req.supabase.storage
      .from(LISTING_BUCKET)
      .upload(path, imageBuffer, {
        contentType: parts.contentType,
        cacheControl: "604800",
        upsert: false,
      });

    if (error) throw new Error(`Photo save nahi ho paayi: ${error.message}`);
    uploaded.push(path);
  }

  return uploaded;
}

async function countNearbyBuyers(origin, radiusKm) {
  if (!supabaseAdmin || !origin) return 0;
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id,location,lat,lng,user_type,is_active")
    .eq("user_type", "buyer")
    .neq("is_active", false);

  return (data || []).filter((buyer) => {
    const coords = getProfileCoords(buyer);
    return distanceKm(origin.lat, origin.lng, coords.lat, coords.lng) <= radiusKm;
  }).length;
}

function filterNearbyItems(items, origin, radiusKm, getCoords) {
  return (items || [])
    .map((item) => {
      const coords = getCoords(item);
      return {
        ...item,
        distance_km: Number(distanceKm(origin.lat, origin.lng, coords.lat, coords.lng).toFixed(1)),
      };
    })
    .filter((item) => item.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km);
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value = "") {
  return decodeHtml(String(value).replace(/<[^>]+>/g, " "));
}

function hashNumber(input, max = 1000) {
  const hash = crypto.createHash("sha1").update(String(input)).digest("hex");
  return parseInt(hash.slice(0, 8), 16) % max;
}

function nearbyCoords(origin, seed, maxKm = DEFAULT_RADIUS_KM) {
  const distance = 3 + (hashNumber(`${seed}:distance`, Math.max(1, Math.round(maxKm * 10))) / 10);
  const angle = (hashNumber(`${seed}:angle`, 360) * Math.PI) / 180;
  const latOffset = (distance / 111) * Math.cos(angle);
  const lngOffset = (distance / (111 * Math.cos(toRadians(origin.lat)))) * Math.sin(angle);

  return {
    lat: Number((origin.lat + latOffset).toFixed(5)),
    lng: Number((origin.lng + lngOffset).toFixed(5)),
  };
}

function cleanBusinessName(title = "") {
  return stripTags(title)
    .replace(/\s+-\s+.*$/g, "")
    .replace(/\s+\|\s+.*$/g, "")
    .replace(/\s+near\s+.*$/i, "")
    .replace(/\b(best|top)\s+\d+\b/gi, "")
    .replace(/\btripadvisor\b|\bjustdial\b|\bmagicpin\b|\bzomato\b|\bgoogle\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function scrapeResultTitles(html = "") {
  const titles = [];
  const resultRegex = /<a[^>]+class="result__a"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = resultRegex.exec(html)) && titles.length < 8) {
    const title = cleanBusinessName(match[1]);
    if (title && title.length > 3 && !titles.some((item) => item.toLowerCase() === title.toLowerCase())) {
      titles.push(title);
    }
  }

  return titles;
}

function makeBuyerFromName({ name, type, origin, locationName, index, source = "web_scrape" }) {
  const config = buyerTypeConfig[type] || buyerTypeConfig.restaurant;
  const coords = nearbyCoords(origin, `${type}:${name}:${index}`);
  return {
    id: `${source}-${type}-${hashNumber(`${name}:${index}`, 1000000)}`,
    full_name: name,
    business_type: config.label,
    location: locationName,
    crop_types: config.crops,
    user_type: "buyer",
    is_verified: hashNumber(name, 10) > 2,
    is_active: true,
    lat: coords.lat,
    lng: coords.lng,
    phone: "",
    source,
  };
}

function fallbackScrapedBuyers(types, origin, locationName) {
  return types.flatMap((type) =>
    (fallbackBuyerNames[type] || fallbackBuyerNames.restaurant).map((name, index) =>
      makeBuyerFromName({
        name,
        type,
        origin,
        locationName,
        index,
        source: "fallback_scrape",
      })
    )
  );
}

async function scrapeBuyersFromWeb({ types, origin, locationName }) {
  const cacheKey = `${types.join(",")}:${locationName}`.toLowerCase();
  const cached = buyerScrapeCache.get(cacheKey);
  if (cached && Date.now() - cached.updatedAt < BUYER_SCRAPE_TTL_MS) {
    return cached.buyers;
  }

  const buyers = [];
  for (const type of types) {
    const config = buyerTypeConfig[type] || buyerTypeConfig.restaurant;
    const queryText = `${config.query} ${locationName} Himachal Pradesh`;
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(queryText)}`;

    try {
      const { data: html } = await axios.get(url, {
        timeout: 9000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 AgroSaathi/1.0",
          "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
        },
      });

      const names = scrapeResultTitles(html).slice(0, 4);
      names.forEach((name, index) => {
        buyers.push(makeBuyerFromName({ name, type, origin, locationName, index }));
      });
    } catch (error) {
      console.warn(`Buyer web scrape failed for ${type}: ${error.message}`);
    }
  }

  const result = buyers.length ? buyers : fallbackScrapedBuyers(types, origin, locationName);
  buyerScrapeCache.set(cacheKey, { buyers: result, updatedAt: Date.now() });
  return result;
}

async function respondWithScrapedBuyers(req, res, next) {
  try {
    const profile = await getMyProfile(req);
    if (!profile || profile.user_type !== "farmer") {
      return res.status(403).json({ message: "Sirf farmer buyer discovery dekh sakte hain." });
    }

    const origin = getQueryCoords(req, profile);
    const radiusKm = Number(req.query.radius || DEFAULT_RADIUS_KM);
    const rawType = String(req.query.business_type || "all").toLowerCase();
    const search = String(req.query.search || "").toLowerCase();
    const selectedTypes =
      rawType && rawType !== "all" && buyerTypeConfig[rawType]
        ? [rawType]
        : Object.keys(buyerTypeConfig);
    const locationName = lookupCoordinates(profile.location).name || profile.location || "Shimla";

    const scraped = await scrapeBuyersFromWeb({
      types: selectedTypes,
      origin,
      locationName,
    });

    const buyers = filterNearbyItems(scraped, origin, radiusKm, (buyer) => ({
      lat: Number(buyer.lat),
      lng: Number(buyer.lng),
    })).filter((buyer) => {
      if (!search) return true;
      return [buyer.full_name, buyer.location, buyer.business_type, ...(buyer.crop_types || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);
    });

    return res.json({
      buyers,
      data: buyers,
      total: buyers.length,
      radius_km: radiusKm,
      origin,
      source: buyers.some((buyer) => buyer.source === "web_scrape") ? "web_scrape" : "fallback_scrape",
      cached_for_minutes: Math.round(BUYER_SCRAPE_TTL_MS / 60000),
    });
  } catch (error) {
    return next(error);
  }
}

router.post(
  "/listings",
  requireAuth,
  [
    body("crop_name").isString().notEmpty(),
    body("quantity").isFloat({ min: 0.01 }),
    body("unit").isIn(["kg", "quintal", "ton"]),
    body("expected_price").isFloat({ min: 0.01 }),
    body("photos").optional().isArray({ max: 3 }),
  ],
  async (req, res, next) => {
    let uploadedPaths = [];

    try {
      if (validationErrorResponse(req, res)) return;
      if (!req.supabase) return res.status(500).json({ message: "Supabase configure nahi hai." });

      const profile = await getMyProfile(req);
      if (!profile || profile.user_type !== "farmer") {
        return res.status(403).json({ message: "Sirf farmer listing bana sakte hain." });
      }

      const coords = lookupCoordinates(req.body.location || profile.location);
      uploadedPaths = await uploadListingPhotos(req, req.body.photos || []);

      const record = {
        farmer_id: req.user.id,
        crop_name: req.body.crop_name,
        variety_grade: req.body.variety_grade || "",
        is_organic: Boolean(req.body.is_organic),
        quantity: Number(req.body.quantity),
        unit: req.body.unit,
        expected_price: Number(req.body.expected_price),
        min_order_quantity: req.body.min_order_quantity ? Number(req.body.min_order_quantity) : null,
        min_order_unit: req.body.min_order_unit || req.body.unit,
        harvest_date: req.body.harvest_date || null,
        harvest_status: req.body.harvest_status || "available_now",
        location: req.body.location || profile.location,
        lat: coords.lat,
        lng: coords.lng,
        delivery_options: req.body.delivery_options || [],
        additional_details: req.body.additional_details || "",
        image_url: uploadedPaths[0] || null,
        image_urls: uploadedPaths,
        status: "active",
      };

      const { data, error } = await req.supabase.from("crop_listings").insert(record).select().single();
      if (error) throw error;

      const broadcastCount = await countNearbyBuyers(coords, DEFAULT_RADIUS_KM);
      const [decorated] = await decorateListings([data], coords);

      res.status(201).json({
        listing: decorated,
        broadcast: {
          radius_km: DEFAULT_RADIUS_KM,
          buyers_notified: broadcastCount,
          simulated: true,
        },
        message: "Listing live ho gayi! Paas ke buyers ko notification chali gayi.",
      });
    } catch (error) {
      if (uploadedPaths.length && req.supabase) {
        await req.supabase.storage.from(LISTING_BUCKET).remove(uploadedPaths);
      }
      next(error);
    }
  }
);

router.get(
  "/listings/nearby",
  optionalAuth,
  [
    query("radius").optional().isFloat({ min: 1, max: 200 }),
    query("page").optional().isInt({ min: 1 }),
  ],
  async (req, res, next) => {
    try {
      if (validationErrorResponse(req, res)) return;
      if (!supabaseAdmin) return res.status(500).json({ message: "Supabase configure nahi hai." });

      const profile = await getMyProfile(req);
      const origin = getQueryCoords(req, profile);
      const radiusKm = Number(req.query.radius || DEFAULT_RADIUS_KM);
      const page = Math.max(1, Number(req.query.page) || 1);
      const cropType = String(req.query.crop_type || "").toLowerCase();
      const organicOnly = req.query.organic === "true";
      const minPrice = req.query.min_price ? Number(req.query.min_price) : null;
      const maxPrice = req.query.max_price ? Number(req.query.max_price) : null;

      let queryBuilder = supabaseAdmin
        .from("crop_listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (cropType) queryBuilder = queryBuilder.ilike("crop_name", `%${cropType}%`);
      if (organicOnly) queryBuilder = queryBuilder.eq("is_organic", true);
      if (Number.isFinite(minPrice)) queryBuilder = queryBuilder.gte("expected_price", minPrice);
      if (Number.isFinite(maxPrice)) queryBuilder = queryBuilder.lte("expected_price", maxPrice);

      const { data, error } = await queryBuilder.limit(250);
      if (error) throw error;

      const nearby = filterNearbyItems(data, origin, radiusKm, (listing) => ({
        lat: Number(listing.lat) || lookupCoordinates(listing.location).lat,
        lng: Number(listing.lng) || lookupCoordinates(listing.location).lng,
      }));

      const start = (page - 1) * PAGE_SIZE;
      const paged = nearby.slice(start, start + PAGE_SIZE);
      const listings = await decorateListings(paged, origin);

      res.json({
        listings,
        data: listings,
        total: nearby.length,
        page,
        per_page: PAGE_SIZE,
        radius_km: radiusKm,
        origin,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/buyers/nearby", requireAuth, respondWithScrapedBuyers);
router.get("/buyers/discover", requireAuth, respondWithScrapedBuyers);

router.get("/listings/my", requireAuth, async (req, res, next) => {
  try {
    if (!req.supabase) return res.status(500).json({ message: "Supabase configure nahi hai." });
    const status = normalizeStatus(req.query.status);

    let queryBuilder = req.supabase
      .from("crop_listings")
      .select("*")
      .eq("farmer_id", req.user.id)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });

    if (status && status !== "all") queryBuilder = queryBuilder.eq("status", status);

    const { data, error } = await queryBuilder;
    if (error) throw error;

    const listings = await decorateListings(data || null, null);
    res.json({ listings, data: listings, total: listings.length });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/listings/:id",
  optionalAuth,
  [param("id").isUUID()],
  async (req, res, next) => {
    try {
      if (validationErrorResponse(req, res)) return;
      if (!supabaseAdmin) return res.status(500).json({ message: "Supabase configure nahi hai." });

      const { data, error } = await supabaseAdmin
        .from("crop_listings")
        .select("*")
        .eq("id", req.params.id)
        .neq("status", "deleted")
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ message: "Listing nahi mili." });

      const [[listing], inquiriesResult] = await Promise.all([
        decorateListings([data], null),
        supabaseAdmin
          .from("buyer_inquiries")
          .select("*, buyer:profiles!buyer_inquiries_buyer_id_fkey(id,full_name,location,business_type,is_verified)")
          .eq("listing_id", req.params.id)
          .order("created_at", { ascending: false }),
      ]);

      const isOwner = req.user?.id === listing.farmer_id;
      const safeListing = isOwner
        ? listing
        : {
            ...listing,
            farmer: listing.farmer
              ? { ...listing.farmer, phone: null }
              : null,
          };

      res.json({
        listing: safeListing,
        inquiries: isOwner ? inquiriesResult.data || [] : [],
        is_owner: isOwner,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/listings/:id",
  requireAuth,
  [
    param("id").isUUID(),
    body("status").optional().isIn(["active", "under_negotiation", "sold", "expired"]),
    body("quantity").optional().isFloat({ min: 0 }),
    body("expected_price").optional().isFloat({ min: 0.01 }),
  ],
  async (req, res, next) => {
    try {
      if (validationErrorResponse(req, res)) return;
      if (!req.supabase) return res.status(500).json({ message: "Supabase configure nahi hai." });

      const updates = {};
      [
        "crop_name",
        "variety_grade",
        "is_organic",
        "quantity",
        "unit",
        "expected_price",
        "min_order_quantity",
        "min_order_unit",
        "harvest_date",
        "harvest_status",
        "location",
        "delivery_options",
        "additional_details",
        "status",
      ].forEach((key) => {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      });

      if (updates.location) {
        const coords = lookupCoordinates(updates.location);
        updates.lat = coords.lat;
        updates.lng = coords.lng;
      }

      const { data, error } = await req.supabase
        .from("crop_listings")
        .update(updates)
        .eq("id", req.params.id)
        .eq("farmer_id", req.user.id)
        .select()
        .single();

      if (error) throw error;
      const [listing] = await decorateListings([data], null);
      res.json({ listing });
    } catch (error) {
      next(error);
    }
  }
);

router.delete("/listings/:id", requireAuth, [param("id").isUUID()], async (req, res, next) => {
  try {
    if (validationErrorResponse(req, res)) return;
    if (!req.supabase) return res.status(500).json({ message: "Supabase configure nahi hai." });

    const { error } = await req.supabase
      .from("crop_listings")
      .update({ status: "deleted" })
      .eq("id", req.params.id)
      .eq("farmer_id", req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/inquiries",
  requireAuth,
  [
    body("listing_id").isUUID(),
    body("message").optional({ nullable: true }).isString(),
    body("offered_price").optional({ nullable: true }).isFloat({ min: 0.01 }),
  ],
  async (req, res, next) => {
    try {
      if (validationErrorResponse(req, res)) return;
      if (!req.supabase) return res.status(500).json({ message: "Supabase configure nahi hai." });

      const profile = await getMyProfile(req);
      if (!profile || profile.user_type !== "buyer") {
        return res.status(403).json({ message: "Sirf buyer inquiry bhej sakte hain." });
      }

      const { data, error } = await req.supabase
        .from("buyer_inquiries")
        .insert({
          listing_id: req.body.listing_id,
          buyer_id: req.user.id,
          message: req.body.message || "Namaste, mujhe is listing mein interest hai.",
          offered_price: req.body.offered_price ? Number(req.body.offered_price) : null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ inquiry: data, message: "Message farmer ko bhej diya gaya." });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/inquiries/my", requireAuth, async (req, res, next) => {
  try {
    if (!req.supabase) return res.status(500).json({ message: "Supabase configure nahi hai." });
    const { data, error } = await req.supabase
      .from("buyer_inquiries")
      .select("*, listing:crop_listings(*)")
      .eq("buyer_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    const inquiries = await Promise.all(
      (data || []).map(async (inquiry) => ({
        ...inquiry,
        listing: inquiry.listing ? (await decorateListings([inquiry.listing], null))[0] : null,
      }))
    );
    res.json({ inquiries, data: inquiries });
  } catch (error) {
    next(error);
  }
});

export default router;
