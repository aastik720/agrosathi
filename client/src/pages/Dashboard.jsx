import {
  AlertTriangle,
  Bot,
  CloudSun,
  FileText,
  Leaf,
  LineChart,
  Mic,
  Search,
  Store,
} from "lucide-react";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import WeatherWidget from "../components/WeatherWidget.jsx";
import useAuth from "../hooks/useAuth.js";
import useLanguage from "../hooks/useLanguage.js";
import { supabase } from "../utils/supabaseClient.js";
import { getLanguageOption } from "../utils/translations.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const accentClasses = {
  green: "bg-green-100 text-agro-green",
  orange: "bg-orange-100 text-agro-orange",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  yellow: "bg-yellow-100 text-yellow-700",
  sky: "bg-sky-100 text-sky-700",
};

function relativeDate(dateValue) {
  if (!dateValue) return "";
  const diff = Date.now() - new Date(dateValue).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} din pehle`;
  if (hours > 0) return `${hours} ghante pehle`;
  return `${minutes} min pehle`;
}

function lastScanValue(scan, fallback) {
  if (!scan) return fallback;
  const when = relativeDate(scan.created_at);
  if (scan.is_healthy) return `Swasth - ${when}`;
  return `${scan.disease_name_hindi || scan.disease_name || "Bimari"} - ${when}`;
}

function activityText(scan) {
  if (!scan) return "";
  const result = scan.is_healthy
    ? "swasth"
    : scan.disease_name_hindi || scan.disease_name || "bimari mili";
  return `Bimari scan: ${scan.crop_type || "fasal"} - ${result} - ${relativeDate(scan.created_at)}`;
}

export default function Dashboard() {
  const { profile, user } = useAuth();
  const { language, translate } = useLanguage();
  const [activeListings, setActiveListings] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastDiseaseScan, setLastDiseaseScan] = useState(null);
  const [scanLoading, setScanLoading] = useState(true);
  const [bestPrice, setBestPrice] = useState("₹ -- per kg");
  const [schemeStats, setSchemeStats] = useState({
    loading: true,
    eligibleCount: 0,
    totalBenefit: 0,
    applications: [],
  });

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Farmer";
  const currentLanguage = getLanguageOption(language);
  const hour = new Date().getHours();
  const greeting = hour < 17 ? translate("good_morning") : translate("good_evening");
  const locale = translate("date_locale");
  const location = profile?.location || "Theog";

  useEffect(() => {
    async function fetchBestPrice() {
      try {
        const {
          data: { session },
        } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
        const token = session?.access_token;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        let allRecords = [];
        if (token) {
          try {
            const res = await axios.get(`${SERVER_URL}/api/market/prices/my-crops`, { headers });
            allRecords = res.data.records || [];
          } catch (e) {
            console.warn("My crops prices fetch failed, falling back to general prices");
          }
        }

        if (allRecords.length === 0) {
          const generalRes = await axios.get(`${SERVER_URL}/api/market/prices?limit=20`);
          allRecords = generalRes.data.records || [];
        }

        if (allRecords.length > 0) {
          // Sort to find the actual best (highest) price
          const sorted = [...allRecords].sort((a, b) => Number(b.modal_price) - Number(a.modal_price));
          const best = sorted[0];
          setBestPrice(`₹${best.modal_price}/kg - ${best.commodity}`);
        } else {
          setBestPrice("N/A");
        }
      } catch (err) {
        console.error("Error fetching dashboard best price:", err);
        setBestPrice("Check connection");
      }
    }
    fetchBestPrice();
  }, [user, profile]);

  const dateText = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [locale]
  );

  useEffect(() => {
    async function loadStats() {
      if (!supabase || !user) {
        setStatsLoading(false);
        return;
      }

      const { count } = await supabase
        .from("crop_listings")
        .select("id", { count: "exact", head: true })
        .eq("farmer_id", user.id)
        .eq("status", "active");

      setActiveListings(count || 0);
      setStatsLoading(false);
    }

    loadStats();
  }, [user]);

  const loadLastDiseaseScan = useCallback(async () => {
    if (!supabase || !user) {
      setScanLoading(false);
      return;
    }

    try {
      setScanLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setLastDiseaseScan(null);
        return;
      }

      const { data } = await axios.get(`${SERVER_URL}/api/disease/history`, {
        params: { limit: 1 },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      setLastDiseaseScan(data?.scans?.[0] || null);
    } catch {
      setLastDiseaseScan(null);
    } finally {
      setScanLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadLastDiseaseScan();
  }, [loadLastDiseaseScan]);

  useEffect(() => {
    async function loadSchemeStats() {
      if (!supabase || !user) {
        setSchemeStats((current) => ({ ...current, loading: false }));
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) return;
        const { data } = await axios.get(`${SERVER_URL}/api/schemes/eligible`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        setSchemeStats({
          loading: false,
          eligibleCount: data?.eligible_count || 0,
          totalBenefit: data?.total_possible_benefit || 0,
          applications: data?.applications || [],
        });
      } catch {
        setSchemeStats((current) => ({ ...current, loading: false }));
      }
    }

    loadSchemeStats();
  }, [user]);

  const featureCards = [
    {
      icon: Mic,
      title: translate("voice_title"),
      desc: translate("voice_desc"),
      color: "green",
      href: "/chatbot",
    },
    {
      icon: Search,
      title: translate("disease_title"),
      desc: translate("disease_desc"),
      color: "orange",
      href: "/disease-scanner",
      badge: lastDiseaseScan && !lastDiseaseScan.is_healthy ? "! Dhyan Dein" : "",
    },
    {
      icon: LineChart,
      title: translate("market_title"),
      desc: translate("market_desc"),
      color: "blue",
      href: "/market",
    },
    {
      icon: Store,
      title: translate("marketplace_title"),
      desc: translate("marketplace_desc"),
      color: "purple",
      href: "/marketplace",
    },
    {
      icon: FileText,
      title: translate("schemes_title"),
      desc: translate("schemes_desc"),
      color: "yellow",
      href: "/schemes",
      badge: schemeStats.eligibleCount ? `${schemeStats.eligibleCount} eligible` : "",
    },
    {
      icon: CloudSun,
      title: translate("weather_title"),
      desc: translate("weather_desc"),
      color: "sky",
      href: "/weather",
    },
  ];

  const activities = [
    ...(profile?.crop_types?.length ? [translate("crop_listed")] : []),
    ...(lastDiseaseScan ? [activityText(lastDiseaseScan)] : []),
    ...(schemeStats.applications?.length
      ? schemeStats.applications.slice(0, 2).map((application) =>
          `${application.scheme_name} ke liye apply kiya - ${relativeDate(application.created_at)}`
        )
      : profile?.crop_types?.length
        ? [translate("scheme_seen")]
        : []),
  ];

  if (profile?.user_type === "buyer") {
    return <Navigate to="/buyer-dashboard" replace />;
  }

  return (
    <section className="page-shell space-y-6">
      <header className="rounded-lg border border-green-100 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-agro-orange">
              {greeting}, {displayName}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-950">
              {translate("dashboard")}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
              <Leaf size={17} className="text-agro-green" aria-hidden="true" />
              {location}
            </p>
          </div>

          <div className="flex flex-col gap-2 text-left lg:text-right">
            <p className="text-sm font-bold text-slate-700">{dateText}</p>
            <span className="inline-flex w-fit items-center rounded-full bg-green-100 px-3 py-1 text-xs font-extrabold text-agro-green lg:ml-auto">
              {currentLanguage.icon} {currentLanguage.nativeName}
            </span>
          </div>
        </div>
      </header>

      <WeatherWidget location={location} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={translate("best_mandi_price")} value={bestPrice} href="/market" />
        <StatCard
          title={translate("active_listings")}
          value={statsLoading ? translate("loading") : String(activeListings)}
        />
        <StatCard
          title="Govt Benefits Eligible"
          value={
            schemeStats.loading
              ? translate("loading")
              : `${schemeStats.eligibleCount} schemes (${new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(schemeStats.totalBenefit)}+)`
          }
          href="/schemes"
        />
        <StatCard
          title={translate("last_scan")}
          value={scanLoading ? translate("loading") : lastScanValue(lastDiseaseScan, translate("no_scan_yet"))}
          href="/disease-scanner"
          warning={lastDiseaseScan && !lastDiseaseScan.is_healthy}
          healthy={lastDiseaseScan?.is_healthy}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-agro-orange">Aaj ke kaam</p>
            <h2 className="text-2xl font-extrabold text-slate-950">Kya karna hai?</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {featureCards.map((card) => (
            <Link
              key={card.title}
              className="flex min-h-52 flex-col rounded-lg border border-green-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-agro-green hover:shadow-soft"
              to={card.href}
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-lg ${
                  accentClasses[card.color]
                }`}
              >
                <card.icon size={29} aria-hidden="true" />
              </span>
              {card.badge && (
                <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-extrabold text-agro-orange">
                  <AlertTriangle size={13} aria-hidden="true" />
                  {card.badge}
                </span>
              )}
              <h3 className="mt-4 text-base font-extrabold leading-6 text-slate-950 sm:text-lg">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.desc}</p>
              <span className="mt-auto pt-4 text-sm font-extrabold text-agro-green">
                {translate("open")}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-green-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Bot className="text-agro-green" size={22} aria-hidden="true" />
          <h2 className="text-xl font-extrabold text-slate-950">
            {translate("recent_activity")}
          </h2>
        </div>

        {activities.length ? (
          <ul className="space-y-3">
            {activities.map((activity) => (
              <li
                key={activity}
                className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                {activity}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            {translate("no_activity")}
          </p>
        )}
      </section>

      <Link
        className="fixed bottom-5 right-5 z-20 inline-flex h-16 w-16 items-center justify-center rounded-full bg-agro-orange text-white shadow-soft transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200"
        to="/chatbot"
        aria-label="Open Saathi AI voice chat"
        title={translate("voice_title")}
      >
        <Mic size={30} aria-hidden="true" />
      </Link>
    </section>
  );
}

function StatCard({ title, value, href, warning, healthy }) {
  const content = (
    <article
      className={`h-full rounded-lg border bg-white p-4 shadow-sm transition ${
        warning
          ? "border-orange-200 hover:bg-orange-50"
          : healthy
            ? "border-green-200 hover:bg-green-50"
            : "border-green-100"
      }`}
    >
      <p className="text-sm font-bold text-slate-600">{title}</p>
      <p
        className={`mt-3 text-2xl font-extrabold ${
          warning ? "text-agro-orange" : healthy ? "text-agro-green" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </article>
  );

  if (href) {
    return (
      <Link className="block h-full" to={href}>
        {content}
      </Link>
    );
  }

  return content;
}
