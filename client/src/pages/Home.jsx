import {
  CloudSun,
  FileText,
  Languages,
  LayoutDashboard,
  LineChart,
  Mic,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "../assets/farmer-field-work.jpg";
import useAuth from "../hooks/useAuth.js";

const featureLinks = [
  {
    icon: Mic,
    title: "Bolkar poochho",
    text: "Saathi AI se fasal, dawa, mausam aur mandi ke sawaal poochhein.",
    href: "/chatbot",
    color: "bg-green-100 text-agro-green",
  },
  {
    icon: Search,
    title: "Photo se bimari pakdo",
    text: "Patti ya phal ki photo upload karke ilaj ki salah dekhein.",
    href: "/disease-scanner",
    color: "bg-orange-100 text-agro-orange",
  },
  {
    icon: CloudSun,
    title: "Aaj ka mausam",
    text: "Pala, barish, garmi aur hawa ke alerts dashboard par milte hain.",
    href: "/dashboard",
    color: "bg-sky-100 text-sky-700",
  },
  {
    icon: LineChart,
    title: "Mandi bhav",
    text: "Agle phase mein nearby mandis ke daam aur trend yahin dikhenge.",
    href: "/market",
    color: "bg-blue-100 text-blue-700",
  },
  {
    icon: Store,
    title: "Seedha becho",
    text: "Bichauliye ke bina buyer se direct baat karne ka marketplace.",
    href: "/marketplace",
    color: "bg-purple-100 text-purple-700",
  },
  {
    icon: FileText,
    title: "Sarkari yojna",
    text: "Kisan ke profile ke hisaab se eligible schemes track karne ke liye.",
    href: "/schemes",
    color: "bg-yellow-100 text-yellow-700",
  },
];

const trustPoints = [
  { icon: Languages, label: "Hindi, Punjabi, Pahadi, English" },
  { icon: ShieldCheck, label: "Free-tier APIs, no hardcoded keys" },
  { icon: LayoutDashboard, label: "Mobile-first farmer dashboard" },
];

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <section>
      <div
        className="relative min-h-[calc(100vh-4.2rem)] overflow-hidden bg-slate-950"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(5, 46, 22, 0.88), rgba(5, 46, 22, 0.58), rgba(5, 46, 22, 0.18)), url(${heroImage})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="mx-auto flex min-h-[calc(100vh-4.2rem)] max-w-6xl flex-col justify-center px-4 py-10 text-white sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-extrabold text-green-50 ring-1 ring-white/25">
              <Languages size={18} aria-hidden="true" />
              भारत के किसानों के लिए
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
              AgroSaathi
            </h1>
            <p className="mt-4 max-w-xl text-lg font-semibold leading-8 text-green-50">
              Bolkar poochho, photo se bimari pakdo, mausam alert dekho, aur apni
              kheti ka kaam simple dashboard se sambhalo.
            </p>

            {!loading && (
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {user ? (
                  <>
                    <Link
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 font-bold text-agro-green transition hover:bg-green-50"
                      to="/dashboard"
                    >
                      Dashboard kholen
                    </Link>
                    <Link
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/60 bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/20"
                      to="/chatbot"
                    >
                      Mic se poochhein
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 font-bold text-agro-green transition hover:bg-green-50"
                      to="/register"
                    >
                      Free shuru karein
                    </Link>
                    <Link
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/60 bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/20"
                      to="/login"
                    >
                      Login
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {trustPoints.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg bg-white/12 px-4 py-3 text-sm font-extrabold text-white ring-1 ring-white/20 backdrop-blur"
              >
                <item.icon className="shrink-0 text-orange-200" size={20} aria-hidden="true" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="page-shell space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-agro-orange">AgroSaathi tools</p>
            <h2 className="text-2xl font-extrabold text-slate-950">
              Kisan ke din ke kaam, ek jagah
            </h2>
          </div>
          {!user && !loading && (
            <p className="text-sm font-semibold text-slate-600">
              Protected tools login ke baad khulenge.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureLinks.map((feature) => (
            <Link
              key={feature.href}
              className="rounded-lg border border-green-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-agro-green hover:shadow-soft"
              to={feature.href}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${feature.color}`}
              >
                <feature.icon size={25} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold text-slate-950">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
              <span className="mt-4 inline-flex text-sm font-extrabold text-agro-green">
                Open
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
