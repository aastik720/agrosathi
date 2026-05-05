import html2canvas from "html2canvas";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Download,
  Leaf,
  MessageCircle,
  RefreshCcw,
  Share2,
  ShieldAlert,
  Volume2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

function confidenceColor(status) {
  if (status === "healthy") return "bg-agro-green";
  if (status === "disease_found") return "bg-agro-orange";
  return "bg-slate-500";
}

function buildDiagnosisText(result) {
  if (!result) return "";

  if (result.status === "healthy") {
    return `AgroSaathi scan: ${result.crop_type || result.plant_name || "Fasal"} swasth hai. Salah: ${
      result.ai_generated_advice || result.treatment?.prevention || "Fasal ki dekhbhal jaari rakhein."
    }`;
  }

  if (result.status === "disease_found") {
    return `AgroSaathi scan: ${result.crop_type || "Fasal"} mein ${
      result.disease_name_hindi || result.disease_name
    } bimari mili hai. Sambhavna ${result.confidence || 0}%. Organic ilaj: ${
      result.treatment?.organic || "Krishi salah lekar upay karein."
    }`;
  }

  return `AgroSaathi scan: Pehchaan nahi hui. Dobara clear photo lein, acchi roshni mein, bimari wali jagah paas se dikhayein.`;
}

export default function DiagnosisResult({ result, language, onSpeak, onScanAgain }) {
  const cardRef = useRef(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const diagnosisText = useMemo(() => buildDiagnosisText(result), [result]);
  const confidence = Math.max(0, Math.min(Number(result?.confidence || result?.health_score || 0), 100));
  const isDisease = result?.status === "disease_found";
  const isHealthy = result?.status === "healthy";
  const isFailed = !isDisease && !isHealthy;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(diagnosisText);
      toast.success("Copy ho gaya!");
    } catch {
      toast.error("Copy nahi ho paaya.");
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      isDisease
        ? `AgroSaathi se pata chala: Meri ${result.crop_type || "fasal"} mein ${
            result.disease_name_hindi || result.disease_name
          } bimari hai. Ilaj: ${result.treatment?.organic || "Krishi salah lein."} AgroSaathi app se scan karein!`
        : diagnosisText
    );
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const handleScreenshot = async () => {
    if (!cardRef.current) return;

    try {
      setCapturing(true);
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Screenshot failed.");

      const file = new File([blob], "agrosathi-diagnosis.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "AgroSaathi diagnosis",
          text: diagnosisText,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "agrosathi-diagnosis.png";
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Screenshot download ho gaya.");
      }
    } catch {
      toast.error("Screenshot share nahi ho paaya.");
    } finally {
      setCapturing(false);
    }
  };

  const handleSpeak = () => {
    onSpeak?.(diagnosisText, language);
  };

  return (
    <section className="space-y-4">
      <article
        ref={cardRef}
        className={`rounded-lg border bg-white p-5 shadow-soft ${
          isDisease ? "border-orange-200" : isHealthy ? "border-green-200" : "border-slate-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white ${
              isDisease ? "bg-red-600" : isHealthy ? "bg-agro-green" : "bg-slate-700"
            }`}
          >
            {isDisease && <ShieldAlert size={26} aria-hidden="true" />}
            {isHealthy && <CheckCircle2 size={26} aria-hidden="true" />}
            {isFailed && <AlertTriangle size={26} aria-hidden="true" />}
          </span>
          <div>
            <p className="text-sm font-extrabold text-agro-orange">AgroSaathi Diagnosis</p>
            <h2 className="text-2xl font-extrabold text-slate-950">
              {isDisease && "Bimari Mili!"}
              {isHealthy && "Fasal Swasth Hai!"}
              {isFailed && "Pehchaan Nahi Hui"}
            </h2>
          </div>
        </div>

        <div className="my-5 h-px bg-green-100" />

        {isDisease && (
          <DiseaseFound result={result} confidence={confidence} />
        )}
        {isHealthy && (
          <HealthyPlant result={result} confidence={confidence} />
        )}
        {isFailed && <ScanFailed result={result} />}

        <div className="my-5 h-px bg-green-100" />

        {result?.ai_generated_advice && !isFailed && (
          <div className="mb-5 rounded-lg bg-green-50 p-4">
            <p className="text-sm font-extrabold text-slate-950">Saathi AI Salah</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{result.ai_generated_advice}</p>
          </div>
        )}

        <p className="mb-4 text-xs font-extrabold uppercase tracking-wide text-slate-400">
          AgroSaathi Disease Scanner
        </p>

        <div className="grid gap-2 sm:grid-cols-4">
          <button className="secondary-button min-h-11 px-3 py-2 text-sm" type="button" onClick={handleSpeak}>
            <Volume2 size={18} aria-hidden="true" />
            Sunein
          </button>
          {!isFailed && (
            <>
              <button
                className="secondary-button min-h-11 px-3 py-2 text-sm"
                type="button"
                onClick={() => setShareOpen((value) => !value)}
              >
                <Share2 size={18} aria-hidden="true" />
                Share
              </button>
              <button
                className="secondary-button min-h-11 px-3 py-2 text-sm"
                type="button"
                onClick={() => toast.success("Scan save ho gaya.")}
              >
                <Download size={18} aria-hidden="true" />
                Save
              </button>
            </>
          )}
          <button className="primary-button min-h-11 px-3 py-2 text-sm" type="button" onClick={onScanAgain}>
            <RefreshCcw size={18} aria-hidden="true" />
            {isFailed ? "Dobara Koshish" : "Scan Again"}
          </button>
        </div>
      </article>

      {shareOpen && !isFailed && (
        <div className="rounded-lg border border-green-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-extrabold text-slate-950">Share options</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button className="secondary-button justify-start" type="button" onClick={handleWhatsApp}>
              <MessageCircle size={18} aria-hidden="true" />
              WhatsApp
            </button>
            <button
              className="secondary-button justify-start"
              type="button"
              onClick={handleScreenshot}
              disabled={capturing}
            >
              {capturing ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-agro-green border-t-transparent" /> : <Download size={18} aria-hidden="true" />}
              Screenshot
            </button>
            <button className="secondary-button justify-start" type="button" onClick={handleCopy}>
              <Clipboard size={18} aria-hidden="true" />
              Copy Text
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ConfidenceBar({ confidence, status }) {
  return (
    <div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${confidenceColor(status)}`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <p className="mt-1 text-sm font-extrabold text-slate-700">{confidence}%</p>
    </div>
  );
}

function DiseaseFound({ result, confidence }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-extrabold text-slate-600">Bimari ka Naam:</p>
        <h3 className="mt-1 text-xl font-extrabold text-slate-950">
          {result.disease_name_hindi || result.disease_name || "Bimari"}
        </h3>
      </div>

      <div>
        <p className="text-sm font-extrabold text-slate-600">Sambhavna (Confidence):</p>
        <ConfidenceBar confidence={confidence} status="disease_found" />
      </div>

      <div>
        <p className="text-sm font-extrabold text-slate-600">Pehchaan:</p>
        <p className="mt-1 text-sm leading-6 text-slate-700">{result.description}</p>
      </div>

      <div className="space-y-4 rounded-lg bg-orange-50 p-4">
        <div className="flex items-center gap-2 text-agro-orange">
          <Leaf size={20} aria-hidden="true" />
          <p className="font-extrabold">Ilaj (Treatment)</p>
        </div>
        <TreatmentBlock title="Organic Upay" text={result.treatment?.organic} />
        <TreatmentBlock title="Chemical Upay" text={result.treatment?.chemical} />
        <TreatmentBlock title="Savdhani" text={result.treatment?.prevention} />
      </div>
    </div>
  );
}

function HealthyPlant({ result, confidence }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-extrabold text-slate-600">Pehchaan:</p>
        <h3 className="mt-1 text-xl font-extrabold text-slate-950">
          {result.plant_name || result.crop_type || "Fasal"}
        </h3>
      </div>

      <div>
        <p className="text-sm font-extrabold text-slate-600">Swasthya Score:</p>
        <ConfidenceBar confidence={confidence} status="healthy" />
      </div>

      <div>
        <p className="text-sm font-extrabold text-slate-600">Salah:</p>
        <p className="mt-1 text-sm leading-6 text-slate-700">
          {result.ai_generated_advice || result.treatment?.prevention}
        </p>
      </div>
    </div>
  );
}

function ScanFailed({ result }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-extrabold text-slate-600">Karan:</p>
        <p className="mt-1 text-base font-bold text-slate-800">
          {result?.message || "Photo clear nahi thi"}
        </p>
      </div>

      <div>
        <p className="text-sm font-extrabold text-slate-600">Kya karein:</p>
        <ul className="mt-2 space-y-2 text-sm font-semibold text-slate-700">
          <li>Aur paas se photo lo</li>
          <li>Acchi roshni mein lo</li>
          <li>Bimari wali jagah dikhao</li>
        </ul>
      </div>
    </div>
  );
}

function TreatmentBlock({ title, text }) {
  return (
    <div>
      <p className="text-sm font-extrabold text-slate-950">{title}:</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">
        {text || "Iske liye krishi salah lekar upay karein."}
      </p>
    </div>
  );
}
