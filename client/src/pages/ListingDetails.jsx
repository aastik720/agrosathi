import axios from "axios";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Edit,
  MapPin,
  MessageCircle,
  Phone,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import useAuth from "../hooks/useAuth.js";
import { supabase } from "../utils/supabaseClient.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const deliveryLabels = {
  buyer_pickup: "Buyer pickup available",
  deliver_20km: "Delivery within 20km",
  deliver_50km: "Delivery within 50km",
};

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

async function getAuthHeaders(optional = false) {
  if (!supabase) {
    if (optional) return {};
    throw new Error("Supabase is not configured.");
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    if (optional) return {};
    throw new Error("Please login again.");
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export default function ListingDetails() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const [message, setMessage] = useState("Namaste, mujhe is listing mein interest hai. Kya yeh available hai?");
  const [offeredPrice, setOfferedPrice] = useState("");
  const [sending, setSending] = useState(false);

  const loadListing = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders(true);
      const { data } = await axios.get(`${SERVER_URL}/api/marketplace/listings/${id}`, { headers });
      setListing(data?.listing || null);
      setInquiries(data?.inquiries || []);
      setIsOwner(Boolean(data?.is_owner));
    } catch (error) {
      toast.error(error.response?.data?.message || "Listing load nahi ho paayi.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadListing();
  }, [loadListing]);

  const images = useMemo(() => listing?.image_urls || (listing?.image_url ? [listing.image_url] : []), [listing]);
  const totalValue = Number(listing?.quantity || 0) * Number(listing?.expected_price || 0);

  const deleteListing = async () => {
    const ok = window.confirm("Listing delete karni hai?");
    if (!ok) return;

    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${SERVER_URL}/api/marketplace/listings/${id}`, { headers });
      toast.success("Listing delete ho gayi.");
      navigate("/marketplace", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete nahi ho paaya.");
    }
  };

  const sendInquiry = async () => {
    try {
      setSending(true);
      const headers = await getAuthHeaders();
      await axios.post(
        `${SERVER_URL}/api/marketplace/inquiries`,
        {
          listing_id: id,
          message,
          offered_price: offeredPrice ? Number(offeredPrice) : null,
        },
        { headers }
      );
      toast.success("Message farmer ko bhej diya gaya.");
      setContactOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Message nahi bhej paaye.");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (!listing) {
    return (
      <section className="page-shell">
        <div className="rounded-lg border border-green-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-950">Listing nahi mili</h1>
          <Link className="primary-button mt-5" to="/marketplace">Marketplace wapas jao</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell space-y-5">
      <header className="rounded-lg border border-green-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-green-100 text-agro-green transition hover:bg-green-50"
              to={isOwner ? "/marketplace" : "/buyer-dashboard"}
              aria-label="Back"
            >
              <ArrowLeft size={21} />
            </Link>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-agro-orange">Listing Details</p>
              <h1 className="text-2xl font-extrabold text-slate-950">{listing.crop_name}</h1>
            </div>
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <Link className="secondary-button min-h-10 px-3 py-2" to={`/marketplace/listings/new?edit=${listing.id}`}>
                <Edit size={17} />
                Edit
              </Link>
              <button className="secondary-button min-h-10 px-3 py-2 text-red-600 hover:bg-red-50" type="button" onClick={deleteListing}>
                <Trash2 size={17} />
                Delete
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-green-100 bg-white shadow-sm">
            <div className="relative aspect-[4/3] bg-green-50">
              {images.length ? (
                <img className="h-full w-full object-cover" src={images[activeImage]} alt={listing.crop_name} />
              ) : (
                <div className="flex h-full items-center justify-center text-7xl">{getCropIcon(listing.crop_name)}</div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-white/90 text-slate-800 shadow-sm"
                    type="button"
                    onClick={() => setActiveImage((current) => (current === 0 ? images.length - 1 : current - 1))}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-white/90 text-slate-800 shadow-sm"
                    type="button"
                    onClick={() => setActiveImage((current) => (current + 1) % images.length)}
                    aria-label="Next photo"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
            </div>
          </div>

          {images.length > 1 && (
            <div className="flex justify-center gap-2">
              {images.map((url, index) => (
                <button
                  key={url}
                  className={`h-2.5 w-2.5 rounded-full ${activeImage === index ? "bg-agro-green" : "bg-green-200"}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Show photo ${index + 1}`}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-green-100 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-950">
              {getCropIcon(listing.crop_name)} {listing.crop_name}
            </h2>
            {listing.variety_grade && (
              <p className="mt-1 font-semibold text-slate-600">{listing.variety_grade}</p>
            )}
            {listing.is_organic && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-sm font-extrabold text-agro-green">
                <BadgeCheck size={16} />
                Organic
              </p>
            )}
          </div>

          <div className="mt-5 space-y-4 divide-y divide-green-100 text-sm">
            <DetailBlock rows={[
              ["Quantity", `${listing.quantity} ${listing.unit}`],
              ["Price", `₹${listing.expected_price} per ${listing.unit}`],
              ["Total Value", `₹${totalValue.toLocaleString("en-IN")}`],
            ]} />
            <DetailBlock rows={[
              ["Harvest", listing.harvest_status === "available_now" ? "Abhi Available" : listing.harvest_date || "Upcoming"],
              ["Location", listing.location || "Farm"],
              ["Posted", formatTime(listing.created_at)],
            ]} />
            <div className="pt-4">
              <p className="font-extrabold text-slate-950">Delivery:</p>
              <div className="mt-2 space-y-1 font-semibold text-slate-600">
                {(listing.delivery_options || []).map((option) => (
                  <p key={option}>✓ {deliveryLabels[option] || option}</p>
                ))}
              </div>
            </div>
            <div className="pt-4">
              <p className="font-extrabold text-slate-950">Farmer Details:</p>
              <div className="mt-2 space-y-1 font-semibold text-slate-600">
                <p>Name: {listing.farmer?.full_name || "Farmer"}</p>
                <p className="flex items-center gap-1">
                  <MapPin size={15} className="text-agro-green" />
                  {listing.farmer?.location || listing.location || "Farm"}
                </p>
                <p>Phone: {isOwner ? listing.farmer?.phone || "Not added" : "Hidden until contact"}</p>
              </div>
            </div>
          </div>

          {!isOwner && (
            <div className="mt-5 grid gap-2">
              <button className="primary-button" type="button" onClick={() => setContactOpen(true)}>
                <Phone size={19} />
                Contact Farmer
              </button>
              <button className="secondary-button" type="button" onClick={() => toast.success("Report feature Phase 6 moderation queue mein jayega.")}>
                <AlertTriangle size={18} />
                Report Listing
              </button>
            </div>
          )}
        </section>
      </div>

      {isOwner && (
        <section className="rounded-lg border border-green-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-agro-orange">Buyer Inquiries</p>
              <h2 className="text-2xl font-extrabold text-slate-950">
                {inquiries.length} buyers ne poochha
              </h2>
            </div>
          </div>

          {inquiries.length ? (
            <div className="mt-4 grid gap-3">
              {inquiries.map((inquiry) => (
                <article key={inquiry.id} className="rounded-lg border border-green-100 bg-green-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-950">
                        {inquiry.buyer?.full_name || "Buyer"} {inquiry.buyer?.business_type ? `- ${inquiry.buyer.business_type}` : ""}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{inquiry.message}</p>
                      <p className="mt-2 text-xs font-bold text-slate-500">{formatTime(inquiry.created_at)}</p>
                    </div>
                    {inquiry.offered_price && (
                      <span className="rounded-lg bg-white px-3 py-2 text-sm font-extrabold text-agro-green">
                        Offer ₹{inquiry.offered_price}
                      </span>
                    )}
                  </div>
                  <button className="secondary-button mt-3 min-h-10 px-3 py-2 text-sm" type="button">
                    <MessageCircle size={16} />
                    Jawab Dein
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              Abhi koi inquiry nahi hai. Nearby buyers listing dekh sakte hain.
            </p>
          )}
        </section>
      )}

      {contactOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-soft">
            <h2 className="text-2xl font-extrabold text-slate-950">Farmer ko message bhejein</h2>
            <label className="mt-4 block">
              <span className="field-label">Message</span>
              <textarea
                className="field-input min-h-28"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>
            <label className="mt-4 block">
              <span className="field-label">Offered Price (optional)</span>
              <input
                className="field-input"
                type="number"
                value={offeredPrice}
                onChange={(event) => setOfferedPrice(event.target.value)}
                placeholder={`₹ per ${listing.unit}`}
              />
            </label>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button className="primary-button" type="button" disabled={sending} onClick={sendInquiry}>
                {sending ? <span className="spinner" /> : <MessageCircle size={18} />}
                Send
              </button>
              <button className="secondary-button" type="button" onClick={() => setContactOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function DetailBlock({ rows }) {
  return (
    <div className="grid gap-2 pt-4 first:pt-0">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4">
          <span className="font-bold text-slate-500">{label}:</span>
          <span className="text-right font-extrabold text-slate-900">{value}</span>
        </div>
      ))}
    </div>
  );
}
