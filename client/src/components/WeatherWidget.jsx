import { Link } from "react-router-dom";
import { AlertTriangle, CloudRain, CloudSun, Droplets, RefreshCw, Snowflake, Sun, Wind, ChevronRight } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner.jsx";
import useLanguage from "../hooks/useLanguage.js";
import useWeather from "../hooks/useWeather.js";

const alertStyles = {
  frost: "border-red-200 bg-red-50 text-red-800",
  rain: "border-blue-200 bg-blue-50 text-blue-800",
  heavy_rain: "border-blue-300 bg-blue-50 text-blue-900",
  heat: "border-orange-200 bg-orange-50 text-orange-800",
  storm: "border-purple-200 bg-purple-50 text-purple-800",
  wind: "border-slate-200 bg-slate-50 text-slate-800",
};

const alertText = {
  hindi: {
    frost: "Pala Alert! Aaj raat pala girne ki sambhavna hai. Apni fasal dhakein.",
    rain: "Barish Alert! Kal barish ho sakti hai. Harvesting rokein.",
    heavy_rain: "Bhari Barish Alert! Paani jama ho sakta hai. Nali aur drainage saaf rakhein.",
    heat: "Garmi Alert! Fasal ko zyada paani dein.",
    storm: "Aandhi-Toofan Alert! Tez bijli aur aandhi ki sambhavna hai. Khet mein kaam sambhal kar karein.",
    wind: "Tez Hawa Alert! Fasal, polyhouse aur support structure check karein.",
  },
  punjabi: {
    frost: "Pala Alert! Aaj raat pala pai sakda hai. Apni fasal dhak lo.",
    rain: "Barish Alert! Kal meeh ho sakda hai. Harvesting rok lo.",
    heavy_rain: "Bhari Barish Alert! Paani jama ho sakda hai. Drainage saaf rakho.",
    heat: "Garmi Alert! Fasal nu zyada paani deo.",
    storm: "Aandhi-Toofan Alert! Bijli te tez hawa di sambhavna hai. Khet vich sambhal ke kaam karo.",
    wind: "Tez Hawa Alert! Fasal, polyhouse te support check karo.",
  },
  pahadi: {
    frost: "Pala Alert! Aaj raat pala padne di sambhavna hai. Apni fasal dhak lo.",
    rain: "Barish Alert! Kal barish ho sakdi hai. Harvesting rok lo.",
    heavy_rain: "Bhari Barish Alert! Paani jama ho sakda hai. Nali saaf rakho.",
    heat: "Garmi Alert! Fasal nu zyada paani deo.",
    storm: "Aandhi-Toofan Alert! Bijli aur tez hawa di sambhavna hai. Khet mein sambhal ke kaam karo.",
    wind: "Tez Hawa Alert! Fasal aur support structure check karo.",
  },
  english: {
    frost: "Frost Alert! Frost is possible tonight. Cover your crop.",
    rain: "Rain Alert! Rain is likely tomorrow. Pause harvesting.",
    heavy_rain: "Heavy Rain Alert! Waterlogging is possible. Keep drains clear.",
    heat: "Heat Alert! Give crops extra water.",
    storm: "Storm Alert! Thunder and strong winds are possible. Avoid risky field work.",
    wind: "High Wind Alert! Check crop supports, polyhouse, and structures.",
  },
};

function WeatherIcon({ condition }) {
  const normalized = String(condition || "").toLowerCase();
  if (normalized.includes("rain")) return <CloudRain size={48} aria-hidden="true" />;
  if (normalized.includes("snow")) return <Snowflake size={48} aria-hidden="true" />;
  if (normalized.includes("clear")) return <Sun size={48} aria-hidden="true" />;
  return <CloudSun size={48} aria-hidden="true" />;
}

function dayName(date, locale) {
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(date));
}

export default function WeatherWidget({ location }) {
  const { language, translate } = useLanguage();
  const { weather, forecast, alerts, loading, error, refresh } = useWeather(location, language);
  const locale = translate("date_locale");

  if (loading) {
    return <LoadingSpinner size="skeleton" />;
  }

  if (!weather) {
    return (
      <section className="rounded-lg border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-agro-orange" size={24} aria-hidden="true" />
          <div>
            <h2 className="font-extrabold text-slate-950">{translate("weather_unavailable")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{translate("try_again")}</p>
          </div>
        </div>
        <button className="secondary-button mt-4" type="button" onClick={refresh}>
          <RefreshCw size={17} aria-hidden="true" />
          {translate("try_again")}
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {alerts.map((item) => (
        <div
          key={item.type}
          className={`flex gap-3 rounded-lg border p-4 font-semibold ${
            alertStyles[item.type] || "border-orange-200 bg-orange-50 text-orange-800"
          }`}
        >
          <AlertTriangle className="mt-0.5 shrink-0" size={22} aria-hidden="true" />
          <span>{alertText[language]?.[item.type] || item.message}</span>
        </div>
      ))}

      {error && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm font-semibold text-yellow-800">
          {translate("weather_unavailable")}. Purana saved data dikhaya ja raha hai.
        </div>
      )}

      <Link to="/weather" className="block group transition-transform hover:-translate-y-1">
        <div className="rounded-lg border border-green-100 bg-white p-5 shadow-soft group-hover:border-agro-green transition-colors">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-agro-orange flex items-center gap-2">
                {translate("current_weather")}
                <ChevronRight size={14} />
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-950">
                {weather.city || location || "Theog"}
              </h2>
              <p className="mt-1 capitalize text-slate-600">{weather.condition}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {translate("last_updated")}:{" "}
                {weather.last_updated
                  ? new Intl.DateTimeFormat(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    }).format(new Date(weather.last_updated))
                  : "--"}
              </p>
            </div>

            <div className="flex items-center gap-4 text-agro-green">
              <WeatherIcon condition={weather.condition_main} />
              <div>
                <p className="text-5xl font-extrabold text-slate-950">{weather.temperature}°C</p>
                <p className="text-sm font-semibold text-slate-600">
                  Feels like {weather.feels_like}°C
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 grid-cols-3">
            <div className="rounded-lg bg-green-50 p-4">
              <Droplets className="text-agro-green" size={22} aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-slate-600">{translate("humidity")}</p>
              <p className="text-2xl font-extrabold text-slate-950">{weather.humidity ?? "--"}%</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4">
              <Wind className="text-blue-600" size={22} aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-slate-600">{translate("wind")}</p>
              <p className="text-2xl font-extrabold text-slate-950">{weather.wind_speed} km/h</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-4">
              <CloudSun className="text-agro-orange" size={22} aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-slate-600">{translate("temperature")}</p>
              <p className="text-2xl font-extrabold text-slate-950">{weather.condition_main}</p>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}
