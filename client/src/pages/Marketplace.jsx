import axios from "axios";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Copy,
  Eye,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Send,
  ShoppingBag,
  Store,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, Navigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import useAuth from "../hooks/useAuth.js";
import bazaarImage from "../assets/farmer-field-green.jpg";
import { supabase } from "../utils/supabaseClient.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const statusStyles = {
  active: { label: "Active", className: "bg-green-100 text-agro-green", dot: "bg-agro-green" },
  under_negotiation: { label: "Under Negotiation", className: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  sold: { label: "Sold", className: "bg-red-100 text-red-700", dot: "bg-red-600" },
  expired: { label: "Expired", className: "bg-slate-100 text-slate-600", dot: "bg-slate-500" },
};

const businessTypes = [
  { value: "all", label: "All" },
  { value: "hotel", label: "Hotels" },
  { value: "restaurant", label: "Restaurants" },
  { value: "retail", label: "Retail Stores" },
  { value: "wholesale", label: "Wholesalers" },
];

const distanceOptions = [5, 10, 25, 50];

const cropIcons = {
  apple: "🍎",
  seb: "🍎",
  potato: "🥔",
  aloo: "🥔",
  tomato: "🍅",
  tamatar: "🍅",
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

export default function Marketplace() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("listings");
  const [statusFilter, setStatusFilter] = useState("all");
  const [buyerSearch, setBuyerSearch] = useState("");
  const [buyerType, setBuyerType] = useState("all");
  const [distance, setDistance] = useState(50);
  const [myListings, setMyListings] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [connectBuyer, setConnectBuyer] = useState(null);
  const [buyerSource, setBuyerSource] = useState("");

  const loadListings = useCallback(async () => {
    try {
      setLoadingListings(true);
      const headers = await getAuthHeaders();
      const { data } = await axios.get(`${SERVER_URL}/api/marketplace/listings/my`, {
        headers,
        params: { status: statusFilter },
      });
      setMyListings(data?.listings || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Listings load nahi ho paayi.");
    } finally {
      setLoadingListings(false);
    }
  }, [statusFilter]);

  const loadBuyers = useCallback(async () => {
    try {
      setLoadingBuyers(true);
      const headers = await getAuthHeaders();
      const { data } = await axios.get(`${SERVER_URL}/api/marketplace/buyers/discover`, {
        headers,
        params: {
          radius: distance,
          search: buyerSearch,
          business_type: buyerType,
        },
      });
      setBuyers(data?.buyers || []);
      setBuyerSource(data?.source || "");
    } catch (error) {
      toast.error(error.response?.data?.message || "Buyers load nahi ho paaye.");
    } finally {
      setLoadingBuyers(false);
    }
  }, [buyerSearch, buyerType, distance]);

  useEffect(() => {
    if (profile?.user_type === "buyer") return;
    loadListings();
  }, [loadListings, profile?.user_type]);

  useEffect(() => {
    if (profile?.user_type === "buyer") return;
    if (activeTab === "buyers") loadBuyers();
  }, [activeTab, loadBuyers, profile?.user_type]);

  const deleteListing = async (listingId) => {
    const ok = window.confirm("Listing delete karni hai?");
    if (!ok) return;

    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${SERVER_URL}/api/marketplace/listings/${listingId}`, { headers });
      setMyListings((current) => current.filter((listing) => listing.id !== listingId));
      toast.success("Listing delete ho gayi.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete nahi ho paaya.");
    }
  };

  const visibleListings = useMemo(() => myListings, [myListings]);

  if (profile?.user_type === "buyer") {
    return <Navigate to="/buyer-dashboard" replace />;
  }

  return (
    <section className="page-shell space-y-5">
      <header className="rounded-lg border border-green-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-green-100 text-agro-green transition hover:bg-green-50"
              to="/dashboard"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={21} aria-hidden="true" />
            </Link>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-100 text-agro-green">
              <Store size={24} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-wide text-agro-orange">
                Zero Commission
              </p>
              <h1 className="truncate text-2xl font-extrabold text-slate-950">Mera Bazaar</h1>
            </div>
          </div>

          <Link className="primary-button w-full sm:w-auto" to="/marketplace/listings/new">
            <Plus size={19} />
            Nayi Listing
          </Link>
        </div>
      </header>

      <section className="overflow-hidden rounded-lg border border-green-100 bg-white shadow-sm">
        <div className="relative min-h-52">
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src={bazaarImage}
            alt="Farmers selling fresh produce"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/45 to-transparent" />
          <div className="relative max-w-2xl px-5 py-7 text-white sm:px-7">
            <p className="text-sm font-extrabold uppercase tracking-wide text-orange-200">
              Direct farmer-to-buyer marketplace
            </p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">
              Fasal seedha buyer tak, bina commission ke.
            </h2>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-green-50">
              Listings banao, web se nearby business buyers discover karo, aur deal ko jaldi close karo.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link className="primary-button bg-white text-agro-green hover:bg-green-50" to="/marketplace/listings/new">
                <Plus size={18} />
                Listing Banao
              </Link>
              <button
                className="secondary-button border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20"
                type="button"
                onClick={() => setActiveTab("buyers")}
              >
                <Search size={18} />
                Buyers Dhundo
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <ValueCard title="Zero Commission" body="Poora paisa farmer ke paas." />
        <ValueCard title="Apna Price" body="Mandi se compare karke rate set karein." />
        <ValueCard title="Web Discovery" body="Nearby business buyers public web se milte hain." />
      </section>

      <div className="rounded-lg border border-green-100 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`min-h-12 rounded-lg px-3 text-sm font-extrabold transition ${
              activeTab === "listings" ? "bg-agro-green text-white" : "text-slate-600 hover:bg-green-50"
            }`}
            type="button"
            onClick={() => setActiveTab("listings")}
          >
            Meri Listings
          </button>
          <button
            className={`min-h-12 rounded-lg px-3 text-sm font-extrabold transition ${
              activeTab === "buyers" ? "bg-agro-green text-white" : "text-slate-600 hover:bg-green-50"
            }`}
            type="button"
            onClick={() => setActiveTab("buyers")}
          >
            Kharidaar Dhundo
          </button>
        </div>
      </div>

      {activeTab === "listings" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {["all", "active", "under_negotiation", "sold", "expired"].map((status) => (
              <button
                key={status}
                className={`min-h-10 rounded-lg border px-4 py-2 text-sm font-bold leading-5 transition ${
                  statusFilter === status
                    ? "border-agro-green bg-green-50 text-agro-green"
                    : "border-green-100 bg-white text-slate-600 hover:bg-green-50"
                }`}
                type="button"
                onClick={() => setStatusFilter(status)}
              >
                {status === "all" ? "All" : statusStyles[status]?.label}
              </button>
            ))}
          </div>

          {loadingListings ? (
            <LoadingSpinner />
          ) : visibleListings.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {visibleListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onDelete={() => deleteListing(listing.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyListings />
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="rounded-lg border border-green-100 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              <label className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                <input
                  className="field-input mt-0 pl-10"
                  value={buyerSearch}
                  onChange={(event) => setBuyerSearch(event.target.value)}
                  placeholder="Buyer ya location khojein..."
                />
              </label>
              <select
                className="field-input mt-0 lg:w-40"
                value={distance}
                onChange={(event) => setDistance(Number(event.target.value))}
              >
                {distanceOptions.map((km) => (
                  <option key={km} value={km}>{km}km</option>
                ))}
              </select>
              <button className="secondary-button min-h-12" type="button" onClick={loadBuyers} disabled={loadingBuyers}>
                <RefreshCcw size={18} className={loadingBuyers ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {businessTypes.map((type) => (
                <button
                  key={type.value}
                  className={`rounded-lg border px-3 py-2 text-xs font-extrabold transition ${
                    buyerType === type.value
                      ? "border-agro-green bg-green-50 text-agro-green"
                      : "border-green-100 text-slate-600 hover:bg-green-50"
                  }`}
                  type="button"
                  onClick={() => setBuyerType(type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs font-bold text-slate-500">
              {buyerSource === "web_scrape"
                ? "Nearby buyers public web scraping se discover hue."
                : "Public scrape unavailable ho to AgroSaathi verified sample discovery dikhata hai."}
            </p>
          </div>

          {loadingBuyers ? (
            <LoadingSpinner />
          ) : buyers.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {buyers.map((buyer) => (
                <BuyerCard
                  key={buyer.id}
                  buyer={buyer}
                  onConnect={() => setConnectBuyer(buyer)}
                  onProfile={() => setSelectedBuyer(buyer)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-green-200 bg-white p-8 text-center shadow-sm">
              <Building2 className="mx-auto text-agro-green" size={42} />
              <h2 className="mt-4 text-xl font-extrabold text-slate-950">Nearby buyer nahi mile</h2>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                Distance badhakar ya filter hata kar dobara dekhein.
              </p>
            </div>
          )}
        </section>
      )}

      {selectedBuyer && (
        <BuyerProfileDialog buyer={selectedBuyer} onClose={() => setSelectedBuyer(null)} />
      )}
      {connectBuyer && (
        <BuyerConnectDialog
          buyer={connectBuyer}
          listings={myListings}
          onClose={() => setConnectBuyer(null)}
        />
      )}
    </section>
  );
}

function ValueCard({ title, body }) {
  return (
    <article className="min-w-0 rounded-lg border border-green-100 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-agro-green">
      <p className="break-words text-sm font-extrabold leading-5 text-agro-green">{title}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-600">{body}</p>
    </article>
  );
}

function EmptyListings() {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-dashed border-green-300 bg-white p-8 text-center shadow-sm">
      <ShoppingBag className="mx-auto text-agro-green" size={48} />
      <h2 className="mt-4 text-2xl font-extrabold text-slate-950">Abhi Koi Listing Nahi</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-slate-600">
        Apni fasal yahan list karein aur seedha buyers ko bechein.
      </p>
      <div className="mt-5 grid gap-2 text-left text-sm font-bold text-slate-700">
        <span>✓ Zero Commission</span>
        <span>✓ Apna Price Set Karein</span>
        <span>✓ Direct Buyers Se Deal</span>
      </div>
      <Link className="primary-button mt-6 w-full sm:w-auto" to="/marketplace/listings/new">
        <Plus size={19} />
        Pehli Listing Banao
      </Link>
    </div>
  );
}

function ListingCard({ listing, onDelete }) {
  const status = statusStyles[listing.status] || statusStyles.active;
  const inquiries = listing.inquiry_count || listing.inquiries_count || 0;

  return (
    <article className="overflow-hidden rounded-lg border border-green-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-agro-green hover:shadow-soft">
      <div className="aspect-[16/9] bg-green-50">
        {listing.image_url ? (
          <img className="h-full w-full object-cover" src={listing.image_url} alt={listing.crop_name} />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">{getCropIcon(listing.crop_name)}</div>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-extrabold leading-7 text-slate-950">
              {getCropIcon(listing.crop_name)} {listing.crop_name}
            </h2>
            {listing.variety_grade && (
              <p className="break-words text-sm font-semibold leading-6 text-slate-500">{listing.variety_grade}</p>
            )}
          </div>
          <span className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-lg px-2 py-1 text-xs font-extrabold leading-5 ${status.className}`}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <InfoItem label="Quantity" value={`${listing.quantity} ${listing.unit}`} />
          <InfoItem label="Price" value={`₹${listing.expected_price}/${listing.unit}`} />
          <InfoItem label="Harvest" value={listing.harvest_status === "available_now" ? "Abhi Available" : listing.harvest_date || "Upcoming"} />
          <InfoItem label="Location" value={listing.location || "Farm"} />
        </dl>

        <div className="break-words rounded-lg bg-green-50 px-3 py-2 text-sm font-bold leading-6 text-agro-green">
          Inquiries: {inquiries || "0"} buyers interested
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link className="secondary-button min-h-10 px-3 py-2 text-sm leading-5" to={`/marketplace/listings/${listing.id}`}>
            <Eye size={16} />
            Dekhein
          </Link>
          <Link className="secondary-button min-h-10 px-3 py-2 text-sm leading-5" to={`/marketplace/listings/new?edit=${listing.id}`}>
            <Pencil size={16} />
            Edit
          </Link>
          <button className="secondary-button min-h-10 px-3 py-2 text-sm leading-5 text-red-600 hover:bg-red-50" type="button" onClick={onDelete}>
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 p-3">
      <dt className="text-xs font-bold uppercase text-slate-400">{label}</dt>
      <dd className="mt-1 break-words font-extrabold leading-6 text-slate-800">{value}</dd>
    </div>
  );
}

function BuyerCard({ buyer, onConnect, onProfile }) {
  const crops = buyer.crop_types?.length ? buyer.crop_types : ["apple", "potato", "tomato"];

  return (
    <article className="min-w-0 rounded-lg border border-green-100 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-agro-green hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-agro-orange">
            <Building2 size={25} />
          </span>
          <div className="min-w-0">
            <h2 className="break-words text-lg font-extrabold leading-7 text-slate-950">{buyer.full_name}</h2>
            {buyer.is_verified && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-extrabold text-agro-green">
                <BadgeCheck size={15} />
                Verified Buyer
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 border-y border-green-100 py-3 text-sm font-semibold text-slate-600">
        <span className="break-words">Type: {buyer.business_type || "Hotel & Restaurant"}</span>
        <span className="flex min-w-0 items-start gap-1 leading-6">
          <MapPin size={15} className="mt-0.5 shrink-0 text-agro-green" />
          <span className="break-words">{buyer.location || "Nearby"} ({buyer.distance_km || 0} km away)</span>
        </span>
      </div>

      <div className="mt-4">
        <p className="text-sm font-extrabold text-slate-800">Interested In:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {crops.map((crop) => (
            <span key={crop} className="max-w-full break-words rounded-lg bg-green-50 px-2 py-1 text-xs font-bold leading-5 text-agro-green">
              {getCropIcon(crop)} {crop}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          className="primary-button min-h-10 px-3 py-2 text-sm leading-5"
          type="button"
          onClick={onConnect}
        >
          <MessageCircle size={16} />
          Connect
        </button>
        <button className="secondary-button min-h-10 px-3 py-2 text-sm leading-5" type="button" onClick={onProfile}>
          <Eye size={16} />
          Profile
        </button>
      </div>
    </article>
  );
}

function BuyerConnectDialog({ buyer, listings, onClose }) {
  const activeListings = listings.filter((listing) => listing.status === "active");
  const firstListing = activeListings[0];
  const [listingId, setListingId] = useState(firstListing?.id || "");
  const selectedListing = activeListings.find((listing) => listing.id === listingId) || firstListing;
  const message = selectedListing
    ? `Namaste ${buyer.full_name}, mere paas ${selectedListing.crop_name} available hai. Quantity ${selectedListing.quantity} ${selectedListing.unit}, price ₹${selectedListing.expected_price}/${selectedListing.unit}. Kya aap interested hain?`
    : `Namaste ${buyer.full_name}, main AgroSaathi farmer marketplace se contact kar raha hoon. Kya aap fresh local produce kharidte hain?`;

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Message copy ho gaya.");
    } catch {
      toast.error("Message copy nahi ho paaya.");
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-agro-orange">Connect Buyer</p>
            <h2 className="mt-1 break-words text-2xl font-extrabold leading-8 text-slate-950">
              {buyer.full_name}
            </h2>
          </div>
          <button className="secondary-button min-h-10 px-3 py-2" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="field-label">Listing choose karein</span>
            <select
              className="field-input"
              value={listingId}
              onChange={(event) => setListingId(event.target.value)}
              disabled={!activeListings.length}
            >
              {activeListings.length ? (
                activeListings.map((listing) => (
                  <option key={listing.id} value={listing.id}>
                    {listing.crop_name} - {listing.quantity} {listing.unit}
                  </option>
                ))
              ) : (
                <option value="">Pehle active listing banayein</option>
              )}
            </select>
          </label>

          <div className="rounded-lg border border-green-100 bg-green-50 p-4">
            <p className="text-sm font-extrabold text-slate-950">Suggested Message</p>
            <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-700">{message}</p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button className="primary-button" type="button" onClick={copyMessage}>
              <Copy size={18} />
              Copy Message
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => toast.success("Message ready hai. Buyer phone/profile data available hote hi direct send enable hoga.")}
            >
              <Send size={18} />
              Prepare Deal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuyerProfileDialog({ buyer, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-agro-orange">Buyer Profile</p>
            <h2 className="mt-1 break-words text-2xl font-extrabold leading-8 text-slate-950">{buyer.full_name}</h2>
          </div>
          <button className="secondary-button min-h-10 px-3 py-2" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-5 space-y-3 text-sm font-semibold text-slate-700">
          <p>Business Type: {buyer.business_type || "General Buyer"}</p>
          <p>Location: {buyer.location || "Nearby"}</p>
          <p>Distance: {buyer.distance_km || 0} km</p>
          <p>Phone: {buyer.phone || "Profile mein phone add nahi hai"}</p>
        </div>
      </div>
    </div>
  );
}
