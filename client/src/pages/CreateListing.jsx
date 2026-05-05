import axios from "axios";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Leaf,
  MapPin,
  Package,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import useAuth from "../hooks/useAuth.js";
import { compressImage } from "../utils/imageCompressor.js";
import { supabase } from "../utils/supabaseClient.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const cropCatalog = [
  { id: "apple", name: "Apple", local: "Seb", icon: "🍎" },
  { id: "potato", name: "Potato", local: "Aloo", icon: "🥔" },
  { id: "tomato", name: "Tomato", local: "Tamatar", icon: "🍅" },
  { id: "wheat", name: "Wheat", local: "Gehu", icon: "🌾" },
  { id: "rice", name: "Rice", local: "Chawal", icon: "🍚" },
  { id: "maize", name: "Maize", local: "Makka", icon: "🌽" },
  { id: "onion", name: "Onion", local: "Pyaz", icon: "🧅" },
  { id: "capsicum", name: "Capsicum", local: "Shimla Mirch", icon: "🫑" },
  { id: "other", name: "Other Crop", local: "Dusri Fasal", icon: "🌿" },
];

const deliveryOptions = [
  { value: "buyer_pickup", label: "Buyer pickup from farm", hint: "recommended" },
  { value: "deliver_20km", label: "I can deliver within 20km" },
  { value: "deliver_50km", label: "I can deliver within 50km" },
];

const emptyForm = {
  crop_name: "apple",
  variety_grade: "",
  is_organic: false,
  quantity: "",
  unit: "kg",
  expected_price: "",
  min_order_quantity: "",
  min_order_unit: "kg",
  harvest_status: "available_now",
  harvest_date: "",
  location: "",
  delivery_options: ["buyer_pickup"],
  additional_details: "",
};

async function getAuthHeaders() {
  if (!supabase) throw new Error("Supabase is not configured.");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Please login again.");
  return { Authorization: `Bearer ${session.access_token}` };
}

export default function CreateListing() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));
  const [mandiPrice, setMandiPrice] = useState(null);

  const cropOptions = useMemo(() => {
    const profileCrops = profile?.crop_types || [];
    const byId = new Map(cropCatalog.map((crop) => [crop.id, crop]));
    const preferred = profileCrops.map((crop) => byId.get(crop) || { id: crop, name: crop, local: crop, icon: "🌿" });
    const rest = cropCatalog.filter((crop) => !profileCrops.includes(crop.id));
    return [...preferred, ...rest];
  }, [profile?.crop_types]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      crop_name: current.crop_name || cropOptions[0]?.id || "apple",
      location: current.location || profile?.location || "Theog, Himachal Pradesh",
    }));
  }, [cropOptions, profile?.location]);

  useEffect(() => {
    async function loadEditListing() {
      if (!editId) return;
      try {
        setLoadingEdit(true);
        const headers = await getAuthHeaders();
        const { data } = await axios.get(`${SERVER_URL}/api/marketplace/listings/${editId}`, { headers });
        const listing = data?.listing;
        if (!listing) throw new Error("Listing nahi mili.");
        setForm({
          crop_name: listing.crop_name || "apple",
          variety_grade: listing.variety_grade || "",
          is_organic: Boolean(listing.is_organic),
          quantity: listing.quantity || "",
          unit: listing.unit || "kg",
          expected_price: listing.expected_price || "",
          min_order_quantity: listing.min_order_quantity || "",
          min_order_unit: listing.min_order_unit || listing.unit || "kg",
          harvest_status: listing.harvest_status || "available_now",
          harvest_date: listing.harvest_date || "",
          location: listing.location || profile?.location || "",
          delivery_options: listing.delivery_options?.length ? listing.delivery_options : ["buyer_pickup"],
          additional_details: listing.additional_details || "",
        });
        setExistingPhotos(listing.image_urls || []);
      } catch (error) {
        toast.error(error.response?.data?.message || "Edit listing load nahi ho paayi.");
      } finally {
        setLoadingEdit(false);
      }
    }
    loadEditListing();
  }, [editId, profile?.location]);

  useEffect(() => {
    async function loadMandiPrice() {
      try {
        if (!form.crop_name) return;
        const { data } = await axios.get(`${SERVER_URL}/api/market/prices`, {
          params: { commodity: form.crop_name, limit: 1 },
        });
        const price = data?.records?.[0]?.modal_price;
        setMandiPrice(price ? Number(price) : null);
      } catch {
        setMandiPrice(null);
      }
    }
    loadMandiPrice();
  }, [form.crop_name]);

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const toggleDelivery = (value) => {
    setForm((current) => {
      const exists = current.delivery_options.includes(value);
      return {
        ...current,
        delivery_options: exists
          ? current.delivery_options.filter((item) => item !== value)
          : [...current.delivery_options, value],
      };
    });
  };

  const validateStep = () => {
    if (step === 1 && !form.crop_name) return "Fasal chuniye.";
    if (step === 2 && (!form.quantity || !form.expected_price)) return "Quantity aur price bharna zaroori hai.";
    if (step === 3 && (!form.location || form.delivery_options.length === 0)) return "Location aur delivery option chuniye.";
    return "";
  };

  const goNext = () => {
    const error = validateStep();
    if (error) {
      toast.error(error);
      return;
    }
    setStep((current) => Math.min(current + 1, 4));
  };

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, 3 - photos.length);
    event.target.value = "";
    if (!files.length) return;

    try {
      setCompressing(true);
      const compressed = await Promise.all(files.map((file) => compressImage(file)));
      setPhotos((current) => [...current, ...compressed].slice(0, 3));
      toast.success("Photo ready hai.");
    } catch (error) {
      toast.error(error.message || "Photo compress nahi ho paayi.");
    } finally {
      setCompressing(false);
    }
  };

  const submitListing = async () => {
    const error = validateStep();
    if (error) {
      toast.error(error);
      return;
    }
    if (!editId && photos.length === 0) {
      toast.error("Kam se kam 1 crop photo upload karein.");
      return;
    }

    try {
      setSubmitting(true);
      const headers = await getAuthHeaders();
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        expected_price: Number(form.expected_price),
        min_order_quantity: form.min_order_quantity ? Number(form.min_order_quantity) : null,
        harvest_date: form.harvest_status === "upcoming" ? form.harvest_date : null,
      };

      if (editId) {
        await axios.put(`${SERVER_URL}/api/marketplace/listings/${editId}`, payload, { headers });
        toast.success("Listing update ho gayi.");
      } else {
        await axios.post(
          `${SERVER_URL}/api/marketplace/listings`,
          { ...payload, photos: photos.map((photo) => photo.base64) },
          { headers, timeout: 60000 }
        );
        toast.success("Listing live ho gayi! Paas ke buyers ko notification chali gayi.");
      }

      navigate("/marketplace", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Listing save nahi ho paayi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEdit) return <LoadingSpinner fullScreen />;

  return (
    <section className="page-shell space-y-5">
      <header className="rounded-lg border border-green-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-green-100 text-agro-green transition hover:bg-green-50"
            to="/marketplace"
            aria-label="Back to marketplace"
          >
            <ArrowLeft size={21} />
          </Link>
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-100 text-agro-green">
            <Package size={24} />
          </span>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-agro-orange">
              {editId ? "Listing Edit" : "Nayi Listing"}
            </p>
            <h1 className="text-2xl font-extrabold text-slate-950">List Nayi Fasal</h1>
          </div>
        </div>
      </header>

      <div className="rounded-lg border border-green-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className={`h-2 rounded-full ${item <= step ? "bg-agro-green" : "bg-green-100"}`} />
          ))}
        </div>
      </div>

      <section className="rounded-lg border border-green-100 bg-white p-5 shadow-soft">
        {step === 1 && (
          <StepOne form={form} cropOptions={cropOptions} setField={setField} />
        )}
        {step === 2 && (
          <StepTwo form={form} mandiPrice={mandiPrice} setField={setField} />
        )}
        {step === 3 && (
          <StepThree form={form} setField={setField} toggleDelivery={toggleDelivery} />
        )}
        {step === 4 && (
          <StepFour
            photos={photos}
            existingPhotos={existingPhotos}
            compressing={compressing}
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            handleFiles={handleFiles}
            removePhoto={(index) => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          />
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            className="secondary-button"
            type="button"
            disabled={step === 1 || submitting}
            onClick={() => setStep((current) => Math.max(current - 1, 1))}
          >
            <ChevronLeft size={19} />
            Back
          </button>

          {step < 4 ? (
            <button className="primary-button" type="button" onClick={goNext}>
              Next
              <ChevronRight size={19} />
            </button>
          ) : (
            <button className="primary-button" type="button" disabled={submitting || compressing} onClick={submitListing}>
              {submitting ? <span className="spinner" /> : <Save size={19} />}
              {submitting ? "Listing ban rahi hai..." : editId ? "Update Listing" : "Submit Listing"}
            </button>
          )}
        </div>
      </section>
    </section>
  );
}

function StepOne({ form, cropOptions, setField }) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-100 text-agro-green">
          <Leaf size={24} />
        </span>
        <div>
          <p className="text-sm font-extrabold text-agro-orange">Step 1</p>
          <h2 className="text-2xl font-extrabold text-slate-950">Crop Details</h2>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Crop Type</span>
          <select className="field-input" value={form.crop_name} onChange={(event) => setField("crop_name", event.target.value)}>
            {cropOptions.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.icon} {crop.local} ({crop.name})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="field-label">Variety / Grade</span>
          <input
            className="field-input"
            value={form.variety_grade}
            onChange={(event) => setField("variety_grade", event.target.value)}
            placeholder="e.g., Royal Delicious, Grade A"
          />
        </label>

        <label className="flex items-center gap-3 rounded-lg border border-green-100 bg-green-50 p-4 sm:col-span-2">
          <input
            className="h-5 w-5 accent-agro-green"
            type="checkbox"
            checked={form.is_organic}
            onChange={(event) => setField("is_organic", event.target.checked)}
          />
          <span className="font-extrabold text-slate-800">Kya yeh organic hai?</span>
        </label>
      </div>
    </div>
  );
}

function StepTwo({ form, mandiPrice, setField }) {
  const suggestedLow = mandiPrice ? Math.round(mandiPrice * 1.08) : 38;
  const suggestedHigh = mandiPrice ? Math.round(mandiPrice * 1.28) : 45;

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-100 text-agro-orange">
          <IndianRupee size={24} />
        </span>
        <div>
          <p className="text-sm font-extrabold text-agro-orange">Step 2</p>
          <h2 className="text-2xl font-extrabold text-slate-950">Quantity + Price</h2>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Quantity</span>
          <div className="mt-2 grid grid-cols-[1fr_120px] gap-2">
            <input
              className="field-input mt-0"
              type="number"
              min="0"
              value={form.quantity}
              onChange={(event) => setField("quantity", event.target.value)}
              placeholder="50"
            />
            <select className="field-input mt-0" value={form.unit} onChange={(event) => setField("unit", event.target.value)}>
              <option value="kg">kg</option>
              <option value="quintal">quintal</option>
              <option value="ton">ton</option>
            </select>
          </div>
        </label>

        <label className="block">
          <span className="field-label">Expected Price</span>
          <input
            className="field-input"
            type="number"
            min="0"
            value={form.expected_price}
            onChange={(event) => setField("expected_price", event.target.value)}
            placeholder={`₹ per ${form.unit}`}
          />
        </label>

        <label className="block">
          <span className="field-label">Minimum Order</span>
          <input
            className="field-input"
            type="number"
            min="0"
            value={form.min_order_quantity}
            onChange={(event) => setField("min_order_quantity", event.target.value)}
            placeholder="e.g., 5"
          />
        </label>

        <div className="rounded-lg border border-green-100 bg-green-50 p-4">
          <p className="text-sm font-extrabold text-slate-950">
            Mandi bhav: {mandiPrice ? `₹${mandiPrice}/kg` : "live data nahi mila"}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            Direct marketplace mein buyers ₹{suggestedLow}-{suggestedHigh} dete hain. Commission nahi hai.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepThree({ form, setField, toggleDelivery }) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-100 text-agro-green">
          <MapPin size={24} />
        </span>
        <div>
          <p className="text-sm font-extrabold text-agro-orange">Step 3</p>
          <h2 className="text-2xl font-extrabold text-slate-950">Harvest + Location</h2>
        </div>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="rounded-lg border border-green-100 p-4">
            <input
              className="mr-2 accent-agro-green"
              type="radio"
              checked={form.harvest_status === "available_now"}
              onChange={() => setField("harvest_status", "available_now")}
            />
            <span className="font-extrabold text-slate-800">Abhi available</span>
          </label>
          <label className="rounded-lg border border-green-100 p-4">
            <input
              className="mr-2 accent-agro-green"
              type="radio"
              checked={form.harvest_status === "upcoming"}
              onChange={() => setField("harvest_status", "upcoming")}
            />
            <span className="font-extrabold text-slate-800">Future date</span>
          </label>
        </div>

        {form.harvest_status === "upcoming" && (
          <label className="block">
            <span className="field-label">Harvest Date</span>
            <input
              className="field-input"
              type="date"
              value={form.harvest_date}
              onChange={(event) => setField("harvest_date", event.target.value)}
            />
          </label>
        )}

        <label className="block">
          <span className="field-label">Location</span>
          <input
            className="field-input"
            value={form.location}
            onChange={(event) => setField("location", event.target.value)}
            placeholder="Theog, Himachal Pradesh"
          />
        </label>

        <div>
          <p className="field-label">Delivery Options</p>
          <div className="mt-2 grid gap-2">
            {deliveryOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-3 rounded-lg border border-green-100 p-4">
                <input
                  className="h-5 w-5 accent-agro-green"
                  type="checkbox"
                  checked={form.delivery_options.includes(option.value)}
                  onChange={() => toggleDelivery(option.value)}
                />
                <span className="font-bold text-slate-800">
                  {option.label}
                  {option.hint && <span className="ml-2 text-xs text-agro-green">({option.hint})</span>}
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="field-label">Additional Details</span>
          <textarea
            className="field-input min-h-28"
            value={form.additional_details}
            onChange={(event) => setField("additional_details", event.target.value)}
            placeholder="Kuch aur batana chahein?"
          />
        </label>
      </div>
    </div>
  );
}

function StepFour({
  photos,
  existingPhotos,
  compressing,
  cameraInputRef,
  galleryInputRef,
  handleFiles,
  removePhoto,
}) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-100 text-agro-orange">
          <Camera size={24} />
        </span>
        <div>
          <p className="text-sm font-extrabold text-agro-orange">Step 4</p>
          <h2 className="text-2xl font-extrabold text-slate-950">Photo Upload</h2>
        </div>
      </div>

      <input ref={cameraInputRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={handleFiles} />
      <input ref={galleryInputRef} className="hidden" type="file" accept="image/*" multiple onChange={handleFiles} />

      <div className="grid gap-3 sm:grid-cols-2">
        <button className="secondary-button min-h-16" type="button" disabled={compressing || photos.length >= 3} onClick={() => cameraInputRef.current?.click()}>
          <Camera size={20} />
          Tap to capture photo
        </button>
        <button className="secondary-button min-h-16" type="button" disabled={compressing || photos.length >= 3} onClick={() => galleryInputRef.current?.click()}>
          <Upload size={20} />
          Upload from gallery
        </button>
      </div>

      <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm font-bold leading-7 text-slate-700">
        <p><Check className="mr-1 inline text-agro-green" size={16} />Fasal ki clear photo lo</p>
        <p><Check className="mr-1 inline text-agro-green" size={16} />Natural light mein</p>
        <p><Check className="mr-1 inline text-agro-green" size={16} />Taaza dikhna chahiye</p>
      </div>

      {compressing && <p className="mt-3 text-sm font-bold text-agro-orange">Photo compress ho rahi hai...</p>}

      {(existingPhotos.length > 0 || photos.length > 0) && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {existingPhotos.map((url) => (
            <div key={url} className="aspect-square overflow-hidden rounded-lg border border-green-100">
              <img className="h-full w-full object-cover" src={url} alt="Existing crop" />
            </div>
          ))}
          {photos.map((photo, index) => (
            <div key={photo.base64} className="relative aspect-square overflow-hidden rounded-lg border border-green-100">
              <img className="h-full w-full object-cover" src={photo.base64} alt="Crop preview" />
              <button
                className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-red-600 shadow-sm"
                type="button"
                onClick={() => removePhoto(index)}
                aria-label="Remove photo"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
