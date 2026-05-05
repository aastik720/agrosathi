import axios from "axios";
import { ArrowLeft, Clock3, Leaf, MapPin, Sprout } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import DiagnosisResult from "../components/DiagnosisResult.jsx";
import ImageUploader from "../components/ImageUploader.jsx";
import ScanHistory from "../components/ScanHistory.jsx";
import useAuth from "../hooks/useAuth.js";
import useImageCapture from "../hooks/useImageCapture.js";
import useLanguage from "../hooks/useLanguage.js";
import useTextToSpeech from "../hooks/useTextToSpeech.js";
import { supabase } from "../utils/supabaseClient.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

function buildVoiceScript(result) {
  if (!result) return "";

  if (result.status === "healthy") {
    return `Badhai ho! Aapki fasal bilkul swasth hai. ${
      result.ai_generated_advice || result.treatment?.prevention || "Dekhbhal jaari rakhein."
    }`;
  }

  if (result.status === "disease_found") {
    return `Aapki fasal mein ${result.disease_name_hindi || result.disease_name} bimari mili hai. Iska ilaj hai: ${
      result.treatment?.organic || "Krishi salah lekar upay karein."
    } Turant dhyan dein.`;
  }

  return `Pehchaan nahi hui. Aur paas se, acchi roshni mein, bimari wali jagah ki photo dobara lein.`;
}

function cropLabel(crop) {
  return crop || "Fasal";
}

export default function DiseaseScanner() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const tts = useTextToSpeech();
  const imageCapture = useImageCapture();
  const crops = useMemo(() => profile?.crop_types || [], [profile]);
  const [cropType, setCropType] = useState(() => crops[0] || "");
  const [location, setLocation] = useState(profile?.location || "Theog, Himachal Pradesh");
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [scans, setScans] = useState([]);

  useEffect(() => {
    if (!cropType && crops[0]) setCropType(crops[0]);
  }, [cropType, crops]);

  useEffect(() => {
    if (profile?.location) setLocation(profile.location);
  }, [profile?.location]);

  const getAuthHeaders = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) throw new Error("Please login again.");
    return { Authorization: `Bearer ${session.access_token}` };
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const headers = await getAuthHeaders();
      const { data } = await axios.get(`${SERVER_URL}/api/disease/history`, {
        params: { limit: 10 },
        headers,
      });
      setScans(data?.scans || []);
    } catch {
      toast.error("Scan history nahi khul paayi.");
    } finally {
      setHistoryLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!result) return undefined;

    const id = window.setTimeout(() => {
      tts.speak(buildVoiceScript(result), language);
    }, 350);

    return () => window.clearTimeout(id);
  }, [language, result?.scan_id, result?.id, result?.status]);

  const handleAnalyze = async () => {
    if (!imageCapture.selectedImage) {
      toast.error("Pehle photo chunein.");
      return;
    }

    try {
      setAnalyzing(true);
      const headers = await getAuthHeaders();
      const { data } = await axios.post(
        `${SERVER_URL}/api/disease/analyze`,
        {
          image_base64: imageCapture.selectedImage.base64,
          crop_type: cropType || crops[0] || "Fasal",
          location,
          language,
        },
        { headers, timeout: 90000 }
      );

      setResult(data);
      toast.success(data.cached ? "Cached diagnosis mil gayi." : "Scan save ho gaya.");
      loadHistory();

      if (data.quota_warning || data.quota?.warning) {
        toast("Aaj ke scan limit khatam hone wale hain");
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        "Scan nahi ho paaya. Internet ya API key check karein.";
      setResult({
        status: "error",
        message,
        confidence: 0,
        treatment: {
          prevention: "Aur paas se, acchi roshni mein, bimari wali jagah ki photo lein.",
        },
      });
      toast.error(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleScanAgain = () => {
    setResult(null);
    imageCapture.resetImage();
  };

  const handleSelectHistory = (scan) => {
    setResult(scan);
    setCropType(scan.crop_type || cropType);
    setLocation(scan.location || location);
    setHistoryOpen(false);
  };

  const handleDelete = async (scanId) => {
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${SERVER_URL}/api/disease/scan/${scanId}`, { headers });
      setScans((current) => current.filter((scan) => scan.id !== scanId));
      if (result?.id === scanId || result?.scan_id === scanId) setResult(null);
      toast.success("Scan delete ho gaya.");
    } catch {
      toast.error("Scan delete nahi ho paaya.");
    }
  };

  const handleDeleteAll = async () => {
    const ok = window.confirm("Saare disease scans delete karne hain?");
    if (!ok) return;

    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${SERVER_URL}/api/disease/history`, { headers });
      setScans([]);
      setResult(null);
      toast.success("Saare scans delete ho gaye.");
    } catch {
      toast.error("Scans delete nahi ho paaye.");
    }
  };

  return (
    <section className="page-shell space-y-5">
      <header className="rounded-lg border border-green-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-green-100 text-agro-green transition hover:bg-green-50"
              to="/dashboard"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={21} aria-hidden="true" />
            </Link>
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-100 text-agro-green">
                <Leaf size={24} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wide text-agro-orange">
                  Fasal Health
                </p>
                <h1 className="truncate text-2xl font-extrabold text-slate-950">
                  Bimari Detector
                </h1>
              </div>
            </div>
          </div>

          <button
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-green-100 text-agro-green transition hover:bg-green-50"
            type="button"
            aria-label="Open scan history"
            title="Scan history"
            onClick={() => {
              setHistoryOpen(true);
              loadHistory();
            }}
          >
            <Clock3 size={21} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="grid gap-3 rounded-lg border border-green-100 bg-white p-4 shadow-sm sm:grid-cols-2">
        <label className="field-label">
          <span className="flex items-center gap-2">
            <Sprout size={17} className="text-agro-green" aria-hidden="true" />
            Fasal
          </span>
          {crops.length ? (
            <select
              className="field-input"
              value={cropType}
              onChange={(event) => setCropType(event.target.value)}
            >
              {crops.map((crop) => (
                <option key={crop} value={crop}>
                  {cropLabel(crop)}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="field-input"
              value={cropType}
              placeholder="Jaise apple, tomato, wheat"
              onChange={(event) => setCropType(event.target.value)}
            />
          )}
        </label>

        <label className="field-label">
          <span className="flex items-center gap-2">
            <MapPin size={17} className="text-agro-green" aria-hidden="true" />
            Location / Gaon
          </span>
          <input
            className="field-input"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </label>
      </section>

      {result ? (
        <DiagnosisResult
          result={result}
          language={language}
          onSpeak={(text) => tts.speak(text, language)}
          onScanAgain={handleScanAgain}
        />
      ) : (
        <ImageUploader
          acceptedTypes={imageCapture.acceptedTypes}
          cameraInputRef={imageCapture.cameraInputRef}
          galleryInputRef={imageCapture.galleryInputRef}
          selectedImage={imageCapture.selectedImage}
          compressing={imageCapture.compressing}
          error={imageCapture.error}
          analyzing={analyzing}
          onCamera={imageCapture.openCamera}
          onGallery={imageCapture.openGallery}
          onInputChange={imageCapture.handleInputChange}
          onAnalyze={handleAnalyze}
          onReset={imageCapture.resetImage}
        />
      )}

      <ScanHistory
        open={historyOpen}
        scans={scans}
        loading={historyLoading}
        onClose={() => setHistoryOpen(false)}
        onSelect={handleSelectHistory}
        onDelete={handleDelete}
        onDeleteAll={handleDeleteAll}
        onStartScan={() => {
          setHistoryOpen(false);
          handleScanAgain();
        }}
      />
    </section>
  );
}
