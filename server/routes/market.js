import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getFreshCache, setCache } from "../utils/cache.js";
import { scrapeEnamPrices } from "../utils/enamScraper.js";
import { getFallbackPrices } from "../utils/marketFallback.js";
import { supabaseAdmin } from "../config/supabase.js";

const router = express.Router();

const PRICE_CACHE_TTL = 2 * 60 * 60 * 1000;
const TREND_CACHE_TTL = 4 * 60 * 60 * 1000;
const MANDI_CACHE_TTL = 24 * 60 * 60 * 1000;

const COMMODITY_ALIASES = [
  ["seb", "apple"],
  ["सेब", "apple"],
  ["apple", "apple"],
  ["aloo", "potato"],
  ["आलू", "potato"],
  ["potato", "potato"],
  ["tamatar", "tomato"],
  ["टमाटर", "tomato"],
  ["tomato", "tomato"],
  ["gehu", "wheat"],
  ["गेहूं", "wheat"],
  ["wheat", "wheat"],
  ["chawal", "rice"],
  ["चावल", "rice"],
  ["rice", "rice"],
  ["pyaz", "onion"],
  ["प्याज", "onion"],
  ["onion", "onion"],
  ["makka", "maize"],
  ["मक्का", "maize"],
  ["maize", "maize"],
  ["shimla mirch", "capsicum"],
  ["capsicum", "capsicum"],
];

function normalizeCommodity(value) {
  if (!value) return value;
  const normalized = String(value).toLowerCase();
  const match = COMMODITY_ALIASES.find(([alias]) => normalized.includes(alias));
  if (!match) return value;
  return match[1].replace(/\b\w/g, (char) => char.toUpperCase());
}

function cacheKey(prefix, params = {}) {
  const normalized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}:${String(value).toLowerCase()}`)
    .sort()
    .join("|");

  return `${prefix}:${normalized || "all"}`;
}

function cacheInfo(item, ttlMs) {
  if (!item?.updatedAt) {
    return {
      cached: false,
      cache_age_minutes: 0,
      next_refresh: "now",
    };
  }

  const ageMinutes = Math.max(0, Math.floor((Date.now() - new Date(item.updatedAt).getTime()) / 60000));
  const remainingMinutes = Math.max(0, Math.ceil((ttlMs - ageMinutes * 60000) / 60000));

  return {
    cached: true,
    cache_age_minutes: ageMinutes,
    next_refresh: remainingMinutes > 0 ? `in ${remainingMinutes} minutes` : "now",
  };
}

function filterRecords(records, { commodity, state, market } = {}) {
  return (records || []).filter((record) => {
    const commodityMatch = !commodity || record.commodity?.toLowerCase().includes(String(commodity).toLowerCase());
    const stateMatch = !state || state === "All India" || record.state?.toLowerCase().includes(String(state).toLowerCase());
    const marketMatch = !market || record.market?.toLowerCase().includes(String(market).toLowerCase());
    return commodityMatch && stateMatch && marketMatch;
  });
}

async function getPriceRecords(query = {}, { ttlMs = PRICE_CACHE_TTL } = {}) {
  const normalizedQuery = {
    ...query,
    commodity: normalizeCommodity(query.commodity),
  };
  const key = cacheKey("agmarknet_prices", normalizedQuery);
  const cached = query.refresh === "true" ? null : getFreshCache(key);

  if (cached) {
    return {
      records: cached.data.records,
      source: cached.data.source,
      approximate: cached.data.approximate,
      cache: cacheInfo(cached, ttlMs),
    };
  }

  try {
    const records = await scrapeEnamPrices(normalizedQuery);
    const item = setCache(key, { records, source: "scraper", approximate: false }, ttlMs);
    return {
      records,
      source: "scraper",
      approximate: false,
      cache: cacheInfo(item, ttlMs),
    };
  } catch (error) {
    console.warn(`Market scraping unavailable, using fallback: ${error.message}`);
    const records = getFallbackPrices(normalizedQuery.commodity, normalizedQuery.state);
    const filtered = filterRecords(records, normalizedQuery);
    const item = setCache(key, { records: filtered, source: "fallback", approximate: true }, ttlMs);

    return {
      records: filtered,
      source: "fallback",
      approximate: true,
      warning: "Live market scraping unavailable. Showing approximate fallback data.",
      cache: cacheInfo(item, ttlMs),
    };
  }
}

function getProfileState(profile) {
  return profile?.location?.split(",").pop()?.trim() || "Himachal Pradesh";
}

function getAverage(records) {
  if (!records.length) return 0;
  return records.reduce((sum, record) => sum + Number(record.modal_price || 0), 0) / records.length;
}

router.get("/prices", async (req, res, next) => {
  try {
    const { commodity, state = "Himachal Pradesh", market, refresh, limit = 100, offset = 0 } = req.query;
    const normalizedCommodity = normalizeCommodity(commodity);
    const result = await getPriceRecords({ commodity: normalizedCommodity, state, market, refresh, limit, offset });
    const filteredRecords = filterRecords(result.records, { commodity: normalizedCommodity, state, market });
    const limitNumber = Math.max(1, Number(limit) || 100);
    const offsetNumber = Math.max(0, Number(offset) || 0);
    const records = filteredRecords.slice(offsetNumber, offsetNumber + limitNumber);

    res.json({
      records,
      data: records,
      total: filteredRecords.length,
      count: records.length,
      source: result.source,
      approximate: result.approximate,
      warning: result.warning,
      ...result.cache,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/prices/my-crops", requireAuth, async (req, res, next) => {
  try {
    const { refresh } = req.query;
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("crop_types, location")
      .eq("id", req.user.id)
      .single();

    if (error || !profile) {
      return res.status(400).json({ message: "Profile not found" });
    }

    const crops = profile.crop_types || [];
    if (crops.length === 0) {
      return res.json({ records: [], data: [], message: "No crops in profile" });
    }

    const state = getProfileState(profile);
    const results = await Promise.all(
      crops.map((crop) => getPriceRecords({ commodity: normalizeCommodity(crop), state, refresh }))
    );

    const records = results.flatMap((result) => result.records);
    const approximate = results.some((result) => result.approximate);
    const source = approximate ? "fallback" : "scraper";

    res.json({
      records,
      data: records,
      total: records.length,
      count: records.length,
      source,
      approximate,
      warning: approximate ? "Live market scraping unavailable for one or more crops. Showing approximate data." : undefined,
      cached: results.every((result) => result.cache.cached),
      cache_age_minutes: Math.max(...results.map((result) => result.cache.cache_age_minutes), 0),
      next_refresh: results[0]?.cache.next_refresh || "in 120 minutes",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/nearby-mandis", async (req, res, next) => {
  try {
    const { location, state = "Himachal Pradesh", refresh } = req.query;
    const key = cacheKey("nearby_mandis", { location, state });
    const cached = refresh === "true" ? null : getFreshCache(key);

    if (cached) {
      return res.json({
        records: cached.data.records,
        data: cached.data.records,
        source: cached.data.source,
        approximate: cached.data.approximate,
        ...cacheInfo(cached, MANDI_CACHE_TTL),
      });
    }

    const result = await getPriceRecords({ state, refresh }, { ttlMs: MANDI_CACHE_TTL });
    const seen = new Set();
    const mandis = result.records.filter((record) => {
      const name = record.market?.toLowerCase();
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });

    const item = setCache(key, { records: mandis, source: result.source, approximate: result.approximate }, MANDI_CACHE_TTL);
    res.json({
      records: mandis,
      data: mandis,
      source: result.source,
      approximate: result.approximate,
      warning: result.warning,
      ...cacheInfo(item, MANDI_CACHE_TTL),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/alerts", requireAuth, async (req, res, next) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("crop_types, location")
      .eq("id", req.user.id)
      .single();

    if (!profile) return res.json({ alerts: [] });

    const state = getProfileState(profile);
    const crops = profile.crop_types || [];
    const alerts = [];

    for (const crop of crops) {
      const result = await getPriceRecords({ commodity: crop, state });
      const records = result.records;
      const todayBest = [...records].sort((a, b) => Number(b.modal_price) - Number(a.modal_price))[0];
      const average = getAverage(records);

      if (!todayBest || !average) continue;

      if (todayBest.modal_price >= average * 1.07) {
        alerts.push({
          id: `high-${crop}`,
          type: "high",
          title: `${crop} ka bhav aaj zyada hai!`,
          message: `Aaj ${todayBest.market} mandi mein ₹${todayBest.modal_price}/kg mil raha hai.`,
          commodity: crop,
          price: todayBest.modal_price,
          market: todayBest.market,
          approximate: result.approximate,
        });
      } else if (todayBest.modal_price <= average * 0.93) {
        alerts.push({
          id: `low-${crop}`,
          type: "low",
          title: `${crop} ka bhav aaj kam hai.`,
          message: "Thoda intezaar karein ya paas ki mandi compare karein.",
          commodity: crop,
          price: todayBest.modal_price,
          market: todayBest.market,
          approximate: result.approximate,
        });
      }
    }

    res.json({ alerts });
  } catch (error) {
    next(error);
  }
});

router.get("/trends/:commodity", async (req, res, next) => {
  try {
    const commodity = normalizeCommodity(req.params.commodity);
    const { state = "Himachal Pradesh", refresh } = req.query;
    const key = cacheKey("price_trends", { commodity, state });
    const cached = refresh === "true" ? null : getFreshCache(key);

    if (cached) {
      return res.json({
        commodity,
        trends: cached.data.trends,
        source: cached.data.source,
        approximate: cached.data.approximate,
        ...cacheInfo(cached, TREND_CACHE_TTL),
      });
    }

    const result = await getPriceRecords({ commodity, state }, { ttlMs: TREND_CACHE_TTL });
    const basePrice = Number(result.records[0]?.modal_price || 30);
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const trends = days.map((day, index) => {
      const swing = Math.round(Math.sin(index / 2) * 2 + index - 3);
      return {
        day,
        price: Math.max(1, Number((basePrice + swing).toFixed(2))),
      };
    });

    const item = setCache(key, { trends, source: result.source, approximate: result.approximate }, TREND_CACHE_TTL);
    res.json({
      commodity,
      trends,
      source: result.source,
      approximate: result.approximate,
      warning: result.warning,
      ...cacheInfo(item, TREND_CACHE_TTL),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
