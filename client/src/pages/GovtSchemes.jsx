import axios from "axios";
import {
  ArrowLeft,
  BadgeIndianRupee,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileText,
  IndianRupee,
  Info,
  Send,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import useAuth from "../hooks/useAuth.js";
import { supabase } from "../utils/supabaseClient.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const statusStyles = {
  not_applied: { label: "Not Applied", icon: Info, className: "bg-slate-100 text-slate-700" },
  applied: { label: "Submitted", icon: Clock3, className: "bg-blue-100 text-blue-700" },
  pending: { label: "Pending", icon: Clock3, className: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-green-100 text-agro-green" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-red-100 text-red-700" },
};

async function getAuthHeaders() {
  if (!supabase) throw new Error("Supabase is not configured.");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Please login again.");
  return { Authorization: `Bearer ${session.access_token}` };
}

function money(value = 0) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function shortDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(value));
}

export default function GovtSchemes() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schemes, setSchemes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [totalBenefit, setTotalBenefit] = useState(0);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const loadSchemes = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const { data } = await axios.get(`${SERVER_URL}/api/schemes/eligible`, { headers });
      setSchemes(data?.schemes || []);
      setApplications(data?.applications || []);
      setSummary(data?.profile_summary || null);
      setTotalBenefit(data?.total_possible_benefit || 0);
      setNotifications(data?.notifications || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Schemes load nahi ho paayi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchemes();
  }, [loadSchemes]);

  const eligibleCount = useMemo(() => schemes.filter((scheme) => scheme.eligible).length, [schemes]);
  const eligibleSchemes = schemes.filter((scheme) => scheme.eligible);
  const nonEligibleSchemes = schemes.filter((scheme) => !scheme.eligible);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <section className="page-shell space-y-6">
      <header className="overflow-hidden rounded-lg border border-green-100 bg-white shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
          <div className="p-5 sm:p-7">
            <Link className="secondary-button mb-5 min-h-10 px-3 py-2 text-sm" to="/dashboard">
              <ArrowLeft size={18} />
              Dashboard
            </Link>
            <p className="text-sm font-extrabold uppercase tracking-wide text-agro-orange">
              Government Benefit Auto-Matcher
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
              Aapke Liye Sarkari Yojnayein
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              Humne aapki profile ke hisaab se schemes dhundhi hain. Apply, documents aur tracking ek jagah.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm font-bold text-slate-600">Eligible Schemes</p>
                <p className="mt-2 text-3xl font-extrabold text-agro-green">
                  {eligibleCount} schemes
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 p-4">
                <p className="text-sm font-bold text-slate-600">Possible Benefit</p>
                <p className="mt-2 text-3xl font-extrabold text-agro-orange">
                  {money(totalBenefit)}+
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center bg-agro-green p-6 text-white">
            <div>
              <BadgeIndianRupee size={48} />
              <p className="mt-5 text-sm font-extrabold uppercase tracking-wide text-green-100">
                Direct benefit
              </p>
              <p className="mt-2 text-2xl font-extrabold leading-tight">
                Aap {eligibleCount} schemes ke liye eligible hain.
              </p>
              <span className="mt-4 inline-flex rounded-lg bg-white px-3 py-2 text-sm font-extrabold text-agro-green">
                {money(totalBenefit)}+ saal bhar mein mil sakta hai
              </span>
            </div>
          </div>
        </div>
      </header>

      {notifications.length > 0 && (
        <section className="grid gap-3 md:grid-cols-2">
          {notifications.map((notification) => (
            <div key={notification} className="rounded-lg border border-green-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-extrabold text-agro-green">{notification}</p>
            </div>
          ))}
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <EligibilitySummary summary={summary} profile={profile} eligibleCount={eligibleCount} totalBenefit={totalBenefit} />

        <div className="space-y-5">
          <div>
            <p className="text-sm font-extrabold text-agro-orange">Eligible first</p>
            <h2 className="text-2xl font-extrabold text-slate-950">Matched Schemes</h2>
          </div>

          <div className="grid gap-4">
            {eligibleSchemes.map((scheme) => (
              <SchemeCard key={scheme.id} scheme={scheme} onApply={() => setSelectedScheme(scheme)} />
            ))}
            {nonEligibleSchemes.map((scheme) => (
              <SchemeCard key={scheme.id} scheme={scheme} onApply={() => setSelectedScheme(scheme)} />
            ))}
          </div>
        </div>
      </section>

      <ApplicationTracker applications={applications} />

      {selectedScheme && (
        <ApplicationModal
          scheme={selectedScheme}
          onClose={() => setSelectedScheme(null)}
          onApplied={() => {
            setSelectedScheme(null);
            loadSchemes();
          }}
        />
      )}
    </section>
  );
}

function EligibilitySummary({ summary, profile, eligibleCount, totalBenefit }) {
  const crops = summary?.crops?.length ? summary.crops : profile?.crop_types || [];
  return (
    <aside className="h-fit rounded-lg border border-green-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-agro-green">
          <ShieldCheck size={25} />
        </span>
        <div>
          <p className="text-sm font-extrabold text-agro-orange">Aapki</p>
          <h2 className="text-xl font-extrabold text-slate-950">Eligibility Summary</h2>
        </div>
      </div>
      <div className="mt-5 space-y-3 text-sm font-semibold text-slate-700">
        <SummaryRow label="Land Size" value={summary?.land_size ? `${summary.land_size} hectare` : "Profile mein add karein"} />
        <SummaryRow label="Location" value={summary?.location || profile?.location || "Location missing"} />
        <SummaryRow label="Crops" value={crops.length ? crops.join(", ") : "Crops missing"} />
        <SummaryRow label="Income" value={summary?.farmer_type || "Small/Marginal Farmer"} />
      </div>
      <div className="mt-5 rounded-lg bg-green-50 p-4">
        <p className="font-extrabold text-agro-green">Eligible for {eligibleCount} schemes</p>
        <p className="mt-1 font-extrabold text-slate-950">Total Possible Benefit: {money(totalBenefit)}+</p>
      </div>
    </aside>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-green-100 pb-3 last:border-b-0">
      <span className="shrink-0 text-slate-500">{label}:</span>
      <span className="break-words text-right font-extrabold text-slate-900">{value}</span>
    </div>
  );
}

function SchemeCard({ scheme, onApply }) {
  const status = statusStyles[scheme.status || "not_applied"] || statusStyles.not_applied;
  const StatusIcon = status.icon;
  const approved = scheme.status === "approved";
  const applied = ["applied", "pending", "approved"].includes(scheme.status);

  return (
    <article
      className={`rounded-lg border bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-soft ${
        scheme.eligible ? "border-green-300" : "border-slate-200 opacity-90"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-xl font-extrabold leading-7 text-slate-950">
            <span className="mr-2">{scheme.icon}</span>
            {scheme.scheme_name}
          </h3>
          <p className="mt-1 text-sm font-bold text-slate-500">{scheme.ministry}</p>
        </div>
        <span className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold ${status.className}`}>
          <StatusIcon size={15} />
          {approved ? `${money(scheme.application?.amount_received || scheme.estimated_benefit_amount)} received` : status.label}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-sm font-extrabold text-slate-950">
            <IndianRupee className="mr-1 inline text-agro-green" size={17} />
            {scheme.benefit_text}
          </p>
          <p className={`mt-2 text-sm font-bold ${scheme.eligible ? "text-agro-green" : "text-slate-500"}`}>
            {scheme.eligible ? "Aap eligible hain!" : "Aap eligible nahi hain"}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{scheme.reason}</p>
        </div>

        <div className="flex flex-col gap-2 sm:w-40">
          {scheme.eligible && (
            <button
              className="primary-button min-h-11 px-3 py-2 text-sm"
              type="button"
              disabled={applied}
              onClick={onApply}
            >
              <Send size={17} />
              {applied ? "Application Submitted" : "Apply Now"}
            </button>
          )}
          <Link className="secondary-button min-h-11 px-3 py-2 text-sm" to={`/schemes/${scheme.id}`}>
            <Info size={17} />
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}

function ApplicationTracker({ applications }) {
  return (
    <section className="rounded-lg border border-green-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <FileCheck2 className="text-agro-green" size={25} />
        <h2 className="text-2xl font-extrabold text-slate-950">Aapki Applications Ki Status</h2>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-green-100 bg-green-50">
              <th className="px-4 py-3 font-extrabold text-slate-700">Scheme Name</th>
              <th className="px-4 py-3 font-extrabold text-slate-700">Status</th>
              <th className="px-4 py-3 font-extrabold text-slate-700">Date</th>
              <th className="px-4 py-3 font-extrabold text-slate-700">Amount</th>
              <th className="px-4 py-3 font-extrabold text-slate-700">Tracking ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-green-50">
            {applications.length ? (
              applications.map((application) => {
                const status = statusStyles[application.application_status || application.status] || statusStyles.applied;
                const StatusIcon = status.icon;
                return (
                  <tr key={application.id} className="transition hover:bg-green-50">
                    <td className="px-4 py-4 font-extrabold text-slate-950">{application.scheme_name}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-extrabold ${status.className}`}>
                        <StatusIcon size={14} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{shortDate(application.application_date || application.created_at)}</td>
                    <td className="px-4 py-4 font-extrabold text-agro-green">
                      {application.amount_received ? money(application.amount_received) : "-"}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-slate-600">{application.tracking_id || "-"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center font-semibold text-slate-500">
                  Abhi koi application submit nahi hui.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ApplicationModal({ scheme, onClose, onApplied }) {
  const [documents, setDocuments] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const requiredDocs = scheme.documents || ["Aadhaar Card", "Bank Passbook", "Land Records (Jamabandi)", "Photo"];

  const submit = async () => {
    try {
      setSubmitting(true);
      const headers = await getAuthHeaders();
      const uploaded = requiredDocs.map((doc) => documents[doc]?.name || `${doc} - demo-uploaded`);
      const { data } = await axios.post(
        `${SERVER_URL}/api/schemes/apply`,
        { scheme_id: scheme.id, documents_uploaded: uploaded },
        { headers }
      );
      toast.success(`Application submitted! ID: ${data?.tracking_id}`);
      onApplied();
    } catch (error) {
      toast.error(error.response?.data?.message || "Application submit nahi ho paayi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-agro-orange">Apply Now</p>
            <h2 className="mt-1 break-words text-2xl font-extrabold leading-8 text-slate-950">
              {scheme.icon} {scheme.scheme_name}
            </h2>
            <p className="mt-2 text-sm font-bold text-agro-green">{scheme.benefit_text}</p>
          </div>
          <button className="secondary-button min-h-10 px-3 py-2" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {requiredDocs.map((doc) => (
            <label key={doc} className="rounded-lg border border-green-100 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2 font-extrabold text-slate-800">
                  <FileText size={18} className="text-agro-green" />
                  {doc}
                </span>
                <span className="secondary-button min-h-10 cursor-pointer px-3 py-2 text-sm">
                  <Upload size={16} />
                  Upload
                  <input
                    className="hidden"
                    type="file"
                    onChange={(event) => setDocuments((current) => ({ ...current, [doc]: event.target.files?.[0] }))}
                  />
                </span>
              </div>
              {documents[doc]?.name && (
                <p className="mt-2 text-xs font-bold text-agro-green">{documents[doc].name}</p>
              )}
            </label>
          ))}
        </div>

        <button className="primary-button mt-5 w-full" type="button" disabled={submitting} onClick={submit}>
          {submitting ? <span className="spinner" /> : <Send size={18} />}
          {submitting ? "Application submit ho rahi hai..." : "Submit Application"}
        </button>
      </div>
    </div>
  );
}
