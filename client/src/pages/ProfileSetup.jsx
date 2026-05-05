import { Check, ChevronLeft, ChevronRight, Languages, MapPin, Mountain, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import useAuth from "../hooks/useAuth.js";
import useLanguage from "../hooks/useLanguage.js";
import { isProfileComplete } from "../hooks/useProfileCheck.js";
import { languageOptions } from "../utils/translations.js";

const cropOptions = [
  { id: "apple", name: "Apple", local: "Seb", icon: "🍎" },
  { id: "wheat", name: "Wheat", local: "Gehu", icon: "🌾" },
  { id: "rice", name: "Rice", local: "Chawal", icon: "🍚" },
  { id: "potato", name: "Potato", local: "Aloo", icon: "🥔" },
  { id: "tomato", name: "Tomato", local: "Tamatar", icon: "🍅" },
  { id: "maize", name: "Maize", local: "Makka", icon: "🌽" },
  { id: "onion", name: "Onion", local: "Pyaz", icon: "🧅" },
  { id: "capsicum", name: "Capsicum", local: "Shimla Mirch", icon: "🫑" },
  { id: "peach", name: "Peach", local: "Aadoo", icon: "🍑" },
  { id: "other_vegetables", name: "Other Vegetables", local: "Sabziyan", icon: "🌿" },
];

const landOptions = [
  { label: "Less than 1 hectare", value: "0.5" },
  { label: "1-2 hectares", value: "1.5" },
  { label: "2-5 hectares", value: "3.5" },
  { label: "More than 5 hectares", value: "6" },
];

const businessTypeOptions = [
  { label: "Hotel", value: "hotel" },
  { label: "Restaurant", value: "restaurant" },
  { label: "Retail Store", value: "retail" },
  { label: "Wholesaler", value: "wholesale" },
];

export default function ProfileSetup() {
  const { user, profile, loading, updateProfile, refreshProfile } = useAuth();
  const { language, changeLanguage, translate } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language || "hindi");
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    location: "",
    land_size: "",
    business_type: "",
    user_type: "farmer",
    crop_types: [],
  });

  useEffect(() => {
    if (!profile && user) return;

    setForm({
      full_name: profile?.full_name || user?.user_metadata?.full_name || "",
      phone: profile?.phone || "",
      location: profile?.location || "",
      land_size: profile?.land_size ? String(profile.land_size) : "",
      business_type: profile?.business_type || "",
      user_type: profile?.user_type || user?.user_metadata?.user_type || "farmer",
      crop_types: profile?.crop_types || [],
    });
    setSelectedLanguage(profile?.preferred_language || language || "hindi");
  }, [profile, user, language]);

  const selectedLanguageLabel = useMemo(
    () => languageOptions.find((item) => item.code === selectedLanguage),
    [selectedLanguage]
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const saveLanguageAndNext = async () => {
    if (!selectedLanguage) return;
    setSaving(true);

    try {
      await changeLanguage(selectedLanguage);
      localStorage.setItem("preferred_language", selectedLanguage);
      toast.success(`${selectedLanguageLabel?.nativeName || "Language"} selected.`);
      setStep(2);
    } catch {
      toast.error(translate("error"));
    } finally {
      setSaving(false);
    }
  };

  const goToCrops = () => {
    if (!form.full_name || !form.location || (form.user_type === "farmer" && !form.land_size)) {
      toast.error(translate("profile_needed"));
      return;
    }
    if (form.user_type === "buyer" && !form.business_type) {
      toast.error("Business type chuniye.");
      return;
    }
    setStep(3);
  };

  const toggleCrop = (cropId) => {
    setForm((current) => {
      const exists = current.crop_types.includes(cropId);
      return {
        ...current,
        crop_types: exists
          ? current.crop_types.filter((crop) => crop !== cropId)
          : [...current.crop_types, cropId],
      };
    });
  };

  const submitProfile = async () => {
    if (form.crop_types.length === 0) {
      toast.error("Kam se kam 1 crop chuniye.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        full_name: form.full_name,
        phone: form.phone,
        location: form.location,
        land_size: form.user_type === "farmer" ? Number(form.land_size) : null,
        business_type: form.user_type === "buyer" ? form.business_type : null,
        crop_types: form.crop_types,
        preferred_language: selectedLanguage,
        user_type: form.user_type,
      });
      await refreshProfile();
      toast.success(translate("profile_saved"));
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error(translate("error"));
    } finally {
      setSaving(false);
    }
  };

  const profileAlreadyComplete = isProfileComplete(profile);

  return (
    <section className="page-shell">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-lg border border-green-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-agro-orange">{translate("profile_setup")}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className={`h-2 rounded-full ${item <= step ? "bg-agro-green" : "bg-green-100"}`}
              />
            ))}
          </div>
          {profileAlreadyComplete && (
            <p className="mt-3 text-sm font-semibold text-slate-600">
              Profile already complete. You can still update details here.
            </p>
          )}
        </div>

        {step === 1 && (
          <div className="rounded-lg border border-green-100 bg-white p-5 shadow-soft sm:p-7">
            <div className="mb-6 flex items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-agro-green">
                <Languages size={26} aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-950 sm:text-3xl">
                  Apni Bhasha Chuniye / Choose Your Language
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {translate("choose_language_subtitle")}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {languageOptions.map((item) => (
                <button
                  key={item.code}
                  className={`flex min-h-28 items-center gap-4 rounded-lg border-2 bg-white p-4 text-left transition hover:bg-green-50 ${
                    selectedLanguage === item.code
                      ? "border-agro-green shadow-soft"
                      : "border-green-100"
                  }`}
                  type="button"
                  onClick={() => setSelectedLanguage(item.code)}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-green-100 text-xl font-extrabold text-agro-green">
                    {item.code === "pahadi" ? <Mountain size={27} /> : item.icon}
                  </span>
                  <span>
                    <span className="block text-xl font-extrabold text-slate-950">
                      {item.label}
                    </span>
                    <span className="block text-sm font-semibold text-slate-600">
                      {item.nativeName}
                    </span>
                  </span>
                  {selectedLanguage === item.code && (
                    <Check className="ml-auto text-agro-green" size={24} aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>

            <button
              className="primary-button mt-6 w-full sm:w-auto"
              type="button"
              disabled={!selectedLanguage || saving}
              onClick={saveLanguageAndNext}
            >
              {saving ? <span className="spinner" /> : <ChevronRight size={19} />}
              {saving ? translate("saving") : translate("next")}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-lg border border-green-100 bg-white p-5 shadow-soft sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-agro-orange">
                <MapPin size={26} aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-extrabold text-slate-950">{translate("farm_details")}</h1>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">{translate("full_name")}</span>
                <input
                  className="field-input"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleFieldChange}
                  required
                />
              </label>

              <label className="block">
                <span className="field-label">{translate("phone")}</span>
                <input
                  className="field-input"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleFieldChange}
                  placeholder="+91 98765 43210"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="field-label">{translate("location")}</span>
                <input
                  className="field-input"
                  name="location"
                  value={form.location}
                  onChange={handleFieldChange}
                  placeholder="e.g. Theog, Shimla, Himachal Pradesh"
                  required
                />
              </label>

              <label className="block">
                <span className="field-label">
                  {form.user_type === "buyer" ? "Business Type" : translate("land_size")}
                </span>
                {form.user_type === "buyer" ? (
                  <select
                    className="field-input"
                    name="business_type"
                    value={form.business_type}
                    onChange={handleFieldChange}
                    required
                  >
                    <option value="">Select business type</option>
                    {businessTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="field-input"
                    name="land_size"
                    value={form.land_size}
                    onChange={handleFieldChange}
                    required
                  >
                    <option value="">Select land size</option>
                    {landOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </label>

              <label className="block">
                <span className="field-label">{translate("user_type")}</span>
                <select className="field-input opacity-80" value={form.user_type} disabled>
                  <option value="farmer">{translate("farmer")}</option>
                  <option value="buyer">{translate("buyer")}</option>
                </select>
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button className="secondary-button" type="button" onClick={() => setStep(1)}>
                <ChevronLeft size={19} />
                {translate("back")}
              </button>
              <button className="primary-button" type="button" onClick={goToCrops}>
                {translate("next")}
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-lg border border-green-100 bg-white p-5 shadow-soft sm:p-7">
            <h1 className="text-2xl font-extrabold text-slate-950">
              {form.user_type === "buyer" ? "Aap kin faslon mein interested hain?" : translate("crop_selection_title")}
            </h1>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {cropOptions.map((crop) => {
                const selected = form.crop_types.includes(crop.id);
                return (
                  <button
                    key={crop.id}
                    className={`relative min-h-32 rounded-lg border-2 p-3 text-center transition hover:bg-green-50 ${
                      selected ? "border-agro-green bg-green-50" : "border-green-100 bg-white"
                    }`}
                    type="button"
                    onClick={() => toggleCrop(crop.id)}
                  >
                    {selected && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-agro-green text-white">
                        <Check size={15} />
                      </span>
                    )}
                    <span className="block text-3xl">{crop.icon}</span>
                    <span className="mt-2 block text-sm font-extrabold text-slate-950">
                      {crop.name}
                    </span>
                    <span className="block text-xs font-semibold text-slate-600">
                      {crop.local}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button className="secondary-button" type="button" onClick={() => setStep(2)}>
                <ChevronLeft size={19} />
                {translate("back")}
              </button>
              <button className="primary-button" type="button" disabled={saving} onClick={submitProfile}>
                {saving ? <span className="spinner" /> : <Save size={19} />}
                {saving ? translate("saving") : translate("complete_profile")}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
