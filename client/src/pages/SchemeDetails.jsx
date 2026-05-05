import axios from "axios";
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, IndianRupee, Mic2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import useLanguage from "../hooks/useLanguage.js";
import useTextToSpeech from "../hooks/useTextToSpeech.js";
import { supabase } from "../utils/supabaseClient.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

async function getAuthHeaders() {
  if (!supabase) throw new Error("Supabase is not configured.");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Please login again.");
  return { Authorization: `Bearer ${session.access_token}` };
}

export default function SchemeDetails() {
  const { id } = useParams();
  const { language } = useLanguage();
  const { speak } = useTextToSpeech();
  const [loading, setLoading] = useState(true);
  const [scheme, setScheme] = useState(null);
  const [stories, setStories] = useState([]);

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const { data } = await axios.get(`${SERVER_URL}/api/schemes/details/${id}`, { headers });
      setScheme(data?.scheme || null);
      setStories(data?.success_stories || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Scheme details load nahi ho paayi.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const script = useMemo(() => {
    if (!scheme) return "";
    return `${scheme.scheme_name}. ${scheme.description_hindi || scheme.description}. Fayda: ${scheme.benefit_text}. Eligibility: ${scheme.reason}. Apply karne ke liye Aadhaar, bank passbook aur land records ready rakhein.`;
  }, [scheme]);

  if (loading) return <LoadingSpinner fullScreen />;
  if (!scheme) {
    return (
      <section className="page-shell">
        <div className="rounded-lg border border-green-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-950">Scheme nahi mili</h1>
          <Link className="primary-button mt-5" to="/schemes">Schemes wapas</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell space-y-6">
      <header className="rounded-lg border border-green-100 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link className="secondary-button mb-5 min-h-10 px-3 py-2 text-sm" to="/schemes">
              <ArrowLeft size={18} />
              Schemes
            </Link>
            <p className="text-sm font-extrabold uppercase tracking-wide text-agro-orange">
              Scheme Details
            </p>
            <h1 className="mt-2 break-words text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
              {scheme.icon} {scheme.scheme_name}
            </h1>
            <p className="mt-2 text-lg font-bold text-slate-600">{scheme.name_hindi}</p>
          </div>
          <button className="primary-button" type="button" onClick={() => speak(script, language)}>
            <Mic2 size={18} />
            Yojana ke baare mein suniye
          </button>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <InfoPanel title="What is this scheme?" icon={FileText}>
            <p>{scheme.description_hindi || scheme.description}</p>
          </InfoPanel>
          <InfoPanel title="Who is eligible?" icon={CheckCircle2}>
            <p className={scheme.eligible ? "text-agro-green" : "text-red-700"}>
              {scheme.eligible ? "Aap eligible hain." : "Aap eligible nahi hain."}
            </p>
            <p className="mt-2">{scheme.reason}</p>
          </InfoPanel>
          <InfoPanel title="How to apply?" icon={ExternalLink}>
            <ol className="list-inside list-decimal space-y-2">
              <li>Required documents ready karein.</li>
              <li>AgroSaathi par Apply Now dabayein.</li>
              <li>Tracking ID note karein.</li>
              <li>Official portal par status verify karein.</li>
            </ol>
            <a className="primary-button mt-4 w-fit" href={scheme.apply_link} target="_blank" rel="noreferrer">
              Official Link
              <ExternalLink size={17} />
            </a>
          </InfoPanel>
          <InfoPanel title="Success stories" icon={Users}>
            <div className="grid gap-3">
              {stories.map((story) => (
                <blockquote key={`${story.farmer}-${story.location}`} className="rounded-lg bg-green-50 p-4">
                  <p className="font-extrabold text-slate-950">"{story.quote}"</p>
                  <footer className="mt-2 text-sm font-bold text-agro-green">
                    - {story.farmer}, {story.location}
                  </footer>
                </blockquote>
              ))}
            </div>
          </InfoPanel>
        </div>

        <aside className="h-fit rounded-lg border border-green-100 bg-white p-5 shadow-sm">
          <IndianRupee className="text-agro-green" size={30} />
          <p className="mt-3 text-sm font-bold text-slate-600">Benefit</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-950">{scheme.benefit_text}</p>

          <div className="mt-5">
            <p className="font-extrabold text-slate-950">Required documents</p>
            <ul className="mt-3 space-y-2">
              {(scheme.documents || []).map((doc) => (
                <li key={doc} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CheckCircle2 size={16} className="text-agro-green" />
                  {doc}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </section>
  );
}

function InfoPanel({ title, icon: Icon, children }) {
  return (
    <section className="rounded-lg border border-green-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-agro-green">
          <Icon size={21} />
        </span>
        <h2 className="text-xl font-extrabold text-slate-950">{title}</h2>
      </div>
      <div className="text-sm font-semibold leading-7 text-slate-700">{children}</div>
    </section>
  );
}
