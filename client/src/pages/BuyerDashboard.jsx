import axios from "axios";
import {
  ArrowUpDown,
  BarChart3,
  ClipboardList,
  MapPin,
  MessageCircle,
  Search,
  Settings,
  ShoppingBasket,
  Store,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, Navigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import useAuth from "../hooks/useAuth.js";
import { supabase } from "../utils/supabaseClient.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const cropIcons = {
  apple: "🍎",
  potato: "🥔",
  tomato: "🍅",
  wheat: "🌾",
  rice: "🍚",
  maize: "🌽",
  onion: "🧅",
  capsicum: "🫑",
};

function getCropIcon(name = "") {
  const key = String(name).toLowerCase();
  return Object.entries(cropIcons).find(([crop]) => key.includes(crop))?.[1] || "🌿";
}

function formatTime(dateValue) {
  if (!dateValue) return "";
  const diff = Date.now() - new Date(dateValue).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} din pehle`;
  if (hours > 0) return `${hours} ghante pehle`;
  return `${minutes} min pehle`;
}

async function getAuthHeaders() {
  if (!supabase) throw new Error("Supabase is not configured.");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Please login again.");
  return { Authorization: `Bearer ${session.access_token}` };
}

export default function BuyerDashboard() {
  const { profile, user } = useAuth();
  const [listings, setListings] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("nearest");
  const [search, setSearch] = useState("");
  const [distance, setDistance] = useState(50);
  const [cropType, setCropType] = useState("");
  const [organicOnly, setOrganicOnly] = useState(false);
  const [harvestStatus, setHarvestStatus] = useState("all");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const [nearbyRes, inquiryRes] = await Promise.all([
        axios.get(`${SERVER_URL}/api/marketplace/listings/nearby`, {
          headers,
          params: {
            radius: distance,
            crop_type: cropType,
            organic: organicOnly ? "true" : "",
          },
        }),
        axios.get(`${SERVER_URL}/api/marketplace/inquiries/my`, { headers }),
      ]);

      setListings(nearbyRes.data?.listings || []);
      setInquiries(inquiryRes.data?.inquiries || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Buyer dashboard load nahi ho paaya.");
    } finally {
      setLoading(false);
    }
  }, [cropType, distance, organicOnly]);

  useEffect(() => {
    if (profile && profile.user_type !== "buyer") return;
    loadData();
  }, [loadData, profile]);

  const filteredListings = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = listings.filter((listing) => {
      const matchesSearch = !query || [listing.crop_name, listing.location, listing.variety_grade]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
      const matchesHarvest = harvestStatus === "all" || listing.harvest_status === harvestStatus;
      return matchesSearch && matchesHarvest;
    });

    if (sort === "lowest_price") {
      result = [...result].sort((a, b) => Number(a.expected_price) - Number(b.expected_price));
    } else if (sort === "latest") {
      result = [...result].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === "organic") {
      result = [...result].filter((listing) => listing.is_organic);
    } else {
      result = [...result].sort((a, b) => Number(a.distance_km || 0) - Number(b.distance_km || 0));
    }

    return result;
  }, [harvestStatus, listings, search, sort]);

  const dealsClosed = inquiries.filter((inquiry) => inquiry.status === "accepted" || inquiry.status === "deal_closed").length;
  const moneySaved = Math.round(filteredListings.reduce((sum, listing) => sum + Number(listing.expected_price || 0) * 0.08, 0));
  const businessName = profile?.full_name || user?.email?.split("@")[0] || "Buyer";

  if (profile && profile.user_type !== "buyer") {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading && listings.length === 0) return <LoadingSpinner fullScreen />;

  return (
    <section className="page-shell space-y-6">
      <header className="rounded-lg border border-green-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-extrabold text-agro-orange">Buyer Dashboard</p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Namaste, {businessName}!</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-extrabold">
              <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1 text-agro-green">
                <MapPin size={14} />
                {profile?.location || "Location not set"}
              </span>
              <span className="rounded-lg bg-orange-100 px-3 py-1 text-agro-orange">
                {profile?.business_type || "Buyer"}
              </span>
            </div>
          </div>

          <Link className="primary-button" to="/marketplace">
            <Store size={19} />
            Farmer Marketplace
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Available Listings Nearby" value={String(filteredListings.length)} />
        <StatCard title="My Active Inquiries" value={String(inquiries.filter((item) => item.status === "pending").length)} />
        <StatCard title="Deals Closed This Month" value={String(dealsClosed)} />
        <StatCard title="Money Saved" value={`₹${moneySaved.toLocaleString("en-IN")}`} />
      </section>

      <section className="rounded-lg border border-green-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
            <input
              className="field-input mt-0 pl-10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Fasal khojein..."
            />
          </label>
          <select className="field-input mt-0 lg:w-48" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="nearest">Nearest First</option>
            <option value="lowest_price">Lowest Price</option>
            <option value="latest">Latest Posted</option>
            <option value="organic">Organic Only</option>
          </select>
          <button className="secondary-button min-h-12" type="button" onClick={loadData}>
            <ArrowUpDown size={18} />
            Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select className="field-input mt-0" value={distance} onChange={(event) => setDistance(Number(event.target.value))}>
            {[5, 10, 25, 50].map((km) => (
              <option key={km} value={km}>{km}km</option>
            ))}
          </select>
          <input
            className="field-input mt-0"
            value={cropType}
            onChange={(event) => setCropType(event.target.value)}
            placeholder="Crop type"
          />
          <label className="flex min-h-12 items-center gap-2 rounded-lg border border-green-100 px-3 font-bold text-slate-700">
            <input className="accent-agro-green" type="checkbox" checked={organicOnly} onChange={(event) => setOrganicOnly(event.target.checked)} />
            Organic only
          </label>
          <select className="field-input mt-0" value={harvestStatus} onChange={(event) => setHarvestStatus(event.target.value)}>
            <option value="all">All harvest</option>
            <option value="available_now">Available now</option>
            <option value="upcoming">Upcoming</option>
          </select>
          <input className="field-input mt-0" placeholder="Price range" disabled />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-extrabold text-agro-orange">Aapke Paas Ki Taazi Fasal</p>
          <h2 className="text-2xl font-extrabold text-slate-950">Nearby Fresh Produce</h2>
        </div>

        {filteredListings.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-green-200 bg-white p-8 text-center shadow-sm">
            <ShoppingBasket className="mx-auto text-agro-green" size={44} />
            <h3 className="mt-4 text-xl font-extrabold text-slate-950">Fresh produce nahi mila</h3>
            <p className="mt-2 text-sm font-semibold text-slate-600">Filters halka karke dobara dekhein.</p>
          </div>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-green-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-950">My Inquiries</h2>
          {inquiries.length ? (
            <div className="mt-4 space-y-3">
              {inquiries.slice(0, 5).map((inquiry) => (
                <article key={inquiry.id} className="rounded-lg border border-green-100 bg-green-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-slate-950">{inquiry.listing?.crop_name || "Listing"}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{inquiry.message}</p>
                    </div>
                    <span className="rounded-lg bg-white px-2 py-1 text-xs font-extrabold text-agro-green">
                      {inquiry.status || "pending"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              Abhi aapne kisi listing par inquiry nahi bheji.
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureCard icon={Search} title="Browse All Listings" href="#top" />
          <FeatureCard icon={BarChart3} title="Price Comparison Tool" href="/market" />
          <FeatureCard icon={MessageCircle} title="Messages" href="#messages" />
          <FeatureCard icon={ClipboardList} title="My Orders" href="#orders" />
          <FeatureCard icon={Settings} title="Settings" href="/profile-setup" />
        </div>
      </section>
    </section>
  );
}

function StatCard({ title, value }) {
  return (
    <article className="rounded-lg border border-green-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-slate-600">{title}</p>
      <p className="mt-3 text-2xl font-extrabold text-slate-950">{value}</p>
    </article>
  );
}

function ListingCard({ listing }) {
  return (
    <article className="overflow-hidden rounded-lg border border-green-100 bg-white shadow-sm">
      <div className="aspect-[16/10] bg-green-50">
        {listing.image_url ? (
          <img className="h-full w-full object-cover" src={listing.image_url} alt={listing.crop_name} />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">{getCropIcon(listing.crop_name)}</div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-950">
              {getCropIcon(listing.crop_name)} {listing.crop_name}
            </h3>
            <p className="text-sm font-semibold text-slate-500">{listing.quantity} {listing.unit}</p>
          </div>
          {listing.is_organic && (
            <span className="rounded-lg bg-green-100 px-2 py-1 text-xs font-extrabold text-agro-green">Organic</span>
          )}
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xl font-extrabold text-agro-green">₹{listing.expected_price}/{listing.unit}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {listing.distance_km || 0} km away · {formatTime(listing.created_at)}
            </p>
          </div>
          <Link className="secondary-button min-h-10 px-3 py-2 text-sm" to={`/marketplace/listings/${listing.id}`}>
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}

function FeatureCard({ icon: Icon, title, href }) {
  return (
    <Link className="rounded-lg border border-green-100 bg-white p-4 shadow-sm transition hover:border-agro-green hover:bg-green-50" to={href}>
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-100 text-agro-green">
        <Icon size={23} />
      </span>
      <h3 className="mt-3 font-extrabold text-slate-950">{title}</h3>
    </Link>
  );
}
