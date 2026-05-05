import { 
  AlertTriangle, 
  CloudRain, 
  CloudSun, 
  Droplets, 
  MapPin, 
  RefreshCw, 
  Search, 
  Sun, 
  Thermometer, 
  Wind,
  Sprout,
  Waves,
  SunMedium,
  ArrowLeft,
  CalendarDays,
  X,
  Share2,
  Clock,
  Eye,
  Sunrise,
  Sunset,
  CloudLightning
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import useLanguage from "../hooks/useLanguage.js";
import useAuth from "../hooks/useAuth.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

function WeatherIcon({ condition, size = 24 }) {
  const normalized = String(condition || "").toLowerCase();
  if (normalized.includes("rain")) return <CloudRain size={size} className="text-blue-500" />;
  if (normalized.includes("storm") || normalized.includes("thunder")) return <CloudLightning size={size} className="text-purple-500" />;
  if (normalized.includes("clear")) return <Sun size={size} className="text-orange-400" />;
  if (normalized.includes("cloud")) return <CloudSun size={size} className="text-slate-400" />;
  return <SunMedium size={size} className="text-agro-green" />;
}

function getAgriAdvice(day, lang, crops = []) {
  const { rain_probability, max_wind_speed, max_temp } = day;
  const advices = { hi: [], en: [] };
  const cropText = crops.length > 0 ? crops[0] : "fasal";

  if (rain_probability > 50) {
    advices.hi.push(`Baarish ka anuman! Aaj ${cropText} mein sinchai (irrigation) na karein.`);
    advices.en.push(`Rain expected! Do not irrigate your ${cropText} today.`);
    advices.hi.push("Kitnashak ka chidkao (Spray) rokein.");
    advices.en.push("Avoid pesticide spray.");
  } else if (max_temp > 35) {
    advices.hi.push(`Garmi zyada hai! Sham ko ${cropText} mein pani (water) dein.`);
    advices.en.push(`High heat! Water your ${cropText} in the evening.`);
  }

  if (max_wind_speed > 20) {
    advices.hi.push(`Tez hawa! Apni ${cropText} aur polyhouse check karein.`);
    advices.en.push(`Strong winds! Check ${cropText} supports.`);
  }

  if (advices.hi.length === 0) {
    advices.hi.push(`Aaj ${cropText} ke kamo ke liye din accha hai.`);
    advices.en.push(`Favorable day for farming ${cropText}.`);
  }

  return lang === "hindi" ? advices.hi : advices.en;
}

export default function WeatherPage() {
  const { translate, language } = useLanguage();
  const { profile } = useAuth();
  const userCrops = profile?.crop_types || [];
  
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("Theog");
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [error, setError] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  const fetchWeather = useCallback(async (loc) => {
    setLoading(true);
    setError("");
    setIsOffline(false);
    setSuggestions([]);
    setShowSuggestions(false);
    try {
      const [currentRes, forecastRes] = await Promise.all([
        axios.get(`${SERVER_URL}/api/weather/current`, { params: { location: loc, language } }),
        axios.get(`${SERVER_URL}/api/weather/forecast`, { params: { location: loc, language } })
      ]);

      if (currentRes.data?.data) {
        const wData = currentRes.data.data;
        const fData = forecastRes.data?.data || [];
        const hData = forecastRes.data?.hourly || [];
        
        setWeather(wData);
        setForecast(fData);
        setHourly(hData);
        setLocation(wData.city || loc);

        // Cache for offline
        localStorage.setItem("agro_weather_cache", JSON.stringify({ wData, fData, hData, loc: wData.city || loc }));
      } else {
        throw new Error("No data returned");
      }
    } catch (err) {
      // Try load from cache
      const cached = localStorage.getItem("agro_weather_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        setWeather(parsed.wData);
        setForecast(parsed.fData);
        setHourly(parsed.hData);
        setLocation(parsed.loc);
        setIsOffline(true);
        setError("Internet connection nahi hai. Purana data dikhaya ja raha hai.");
      } else {
        setError("Mausam ki jankari nahi mili. Kripya internet aur naam check karein.");
      }
    } finally {
      setLoading(false);
    }
  }, [language]);

  // Fetch suggestions as user types
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${SERVER_URL}/api/weather/search`, { params: { q: query } });
        setSuggestions(res.data.suggestions || []);
        setShowSuggestions(true);
      } catch (err) {
        setSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Try to load cached location on mount
    const cached = localStorage.getItem("agro_weather_cache");
    if (cached) {
      const parsed = JSON.parse(cached);
      setLocation(parsed.loc);
      fetchWeather(parsed.loc);
    } else {
      fetchWeather(location);
    }
  }, []);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (query.trim()) {
      fetchWeather(query.trim());
      setQuery("");
    }
  };

  const handleSelectSuggestion = (s) => {
    setQuery("");
    fetchWeather(s.name + (s.state ? `, ${s.state}` : ""));
  };

  const handleShare = () => {
    if (!weather) return;
    const text = `AgroSaathi Mausam Update (${weather.city}):\n🌡 Temp: ${weather.temperature}°C\n💧 Nami: ${weather.humidity}%\n🌬 Hawa: ${weather.wind_speed} km/h\nKheti ki salah aur 7-din ka mausam dekhne ke liye AgroSaathi app kholain!`;
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  if (loading && !weather) return <LoadingSpinner fullScreen />;

  return (
    <div className="pb-24 bg-[#F8FAF9] min-h-screen font-sans">
      {/* Header */}
      <div className="bg-white px-4 py-4 sticky top-0 z-30 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={22} className="text-slate-600" />
          </Link>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">
            Mausam Ki Jankari
          </h1>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={handleShare}
            className="p-2 hover:bg-green-50 text-agro-green rounded-full transition-colors"
          >
            <Share2 size={20} />
          </button>
          <button 
            onClick={() => fetchWeather(location)}
            className={`p-2 hover:bg-slate-100 rounded-full transition-colors ${loading ? 'animate-spin text-agro-green' : 'text-slate-600'}`}
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Search Bar with Autocomplete Suggestions */}
        <div className="relative" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative group">
            <input
              type="text"
              placeholder="Shehar ya Gaon ka naam..."
              className="w-full h-16 pl-14 pr-32 bg-white rounded-[1.5rem] border-2 border-slate-100 focus:border-agro-green focus:outline-none transition-all shadow-xl shadow-agro-green/5 text-lg font-bold text-slate-700"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length >= 2 && setShowSuggestions(true)}
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-agro-green transition-colors" size={24} />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
               {query && (
                 <button type="button" onClick={() => setQuery("")} className="p-2 text-slate-300 hover:text-slate-500">
                    <X size={20} />
                 </button>
               )}
               <button 
                type="submit"
                className="bg-agro-green text-white px-6 py-3 rounded-2xl font-black text-sm active:scale-95 transition-transform"
              >
                DEKHO
              </button>
            </div>
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl border border-slate-100 shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left px-5 py-4 hover:bg-slate-50 rounded-2xl flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <div className="bg-slate-100 p-2 rounded-lg">
                      <MapPin size={16} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">{s.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {s.state}{s.country ? `, ${s.country}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-100 p-4 rounded-3xl text-red-600 font-bold flex items-center gap-3">
            <AlertTriangle size={24} className="shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {isOffline && !error && (
          <div className="bg-yellow-50 border-2 border-yellow-100 p-4 rounded-3xl text-yellow-700 font-bold flex items-center gap-3">
            <AlertTriangle size={24} className="shrink-0" />
            <p className="text-sm">Aap offline hain. Saved mausam data dikhaya ja raha hai.</p>
          </div>
        )}

        {/* Current Weather Card */}
        {weather && (
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl shadow-slate-200/40 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-2 bg-agro-green/10 text-agro-green px-4 py-1.5 rounded-full w-fit mb-4">
                    <MapPin size={14} fill="currentColor" />
                    <span className="text-xs font-black uppercase tracking-widest">{weather.city}</span>
                  </div>
                  <h2 className="text-8xl font-black text-slate-800 tracking-tighter">
                    {weather.temperature}<span className="text-agro-green">°</span>
                  </h2>
                  <p className="text-2xl font-bold text-slate-400 mt-2 capitalize">{weather.condition}</p>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                  <WeatherIcon condition={weather.condition_main} size={72} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F0FDF4] p-6 rounded-[2rem] flex items-center gap-5 border border-[#DCFCE7]">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <Droplets className="text-agro-green" size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nami (Humidity)</p>
                    <p className="text-2xl font-black text-slate-800">{weather.humidity}%</p>
                  </div>
                </div>
                <div className="bg-[#EFF6FF] p-6 rounded-[2rem] flex items-center gap-5 border border-[#DBEAFE]">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <Wind className="text-blue-500" size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hawa (Wind)</p>
                    <p className="text-2xl font-black text-slate-800">{weather.wind_speed} km/h</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute right-0 top-0 opacity-[0.04] p-4 -mr-10 -mt-10">
               <Sprout size={300} />
            </div>
          </div>
        )}

        {/* Hourly Forecast (24 Hours) */}
        {hourly.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 px-2">
              <Clock className="text-agro-green" size={20} />
              Agley 24 Ghante
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar pl-2">
              {hourly.map((h, i) => (
                <div key={i} className="snap-center shrink-0 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm min-w-[100px] flex flex-col items-center gap-3 text-center">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    {new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: true }).format(new Date(h.time))}
                  </p>
                  <WeatherIcon condition={h.condition_main} size={32} />
                  <div>
                    <p className="text-xl font-black text-slate-800">{h.temp}°</p>
                    <p className="text-[10px] font-bold text-blue-500 flex items-center justify-center gap-0.5 mt-1">
                      <Droplets size={10} /> {h.rain_probability}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Agri-Metrics */}
        {weather && (
          <div className="grid grid-cols-3 gap-3">
             <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-2 text-center">
                <Eye size={24} className="text-slate-400" />
                <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Visibility</p>
                <p className="font-black text-slate-800">{weather.visibility ? `${weather.visibility} km` : "--"}</p>
             </div>
             <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-2 text-center">
                <Sunrise size={24} className="text-orange-400" />
                <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Sunrise</p>
                <p className="font-black text-slate-800 text-sm">
                  {weather.sunrise ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(weather.sunrise)) : "--"}
                </p>
             </div>
             <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-2 text-center">
                <Sunset size={24} className="text-purple-400" />
                <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Sunset</p>
                <p className="font-black text-slate-800 text-sm">
                  {weather.sunset ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(weather.sunset)) : "--"}
                </p>
             </div>
          </div>
        )}

        {/* 7-Day Forecast Section */}
        <div className="space-y-6 pt-4">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 px-2">
            <CalendarDays className="text-agro-green" size={28} />
            Agli 7 Din Ka Mausam
          </h2>

          <div className="space-y-4">
            {forecast.map((day, idx) => {
              const advice = getAgriAdvice(day, language, userCrops);
              return (
                <div key={idx} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl hover:border-agro-green/20 transition-all">
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-slate-50 rounded-[1.8rem] flex items-center justify-center border border-slate-50 group-hover:scale-105 transition-transform shadow-inner">
                        <WeatherIcon condition={day.condition_main} size={40} />
                      </div>
                      <div>
                        <p className="text-xl font-black text-slate-800">
                          {idx === 0 ? "Aaj (Today)" : new Intl.DateTimeFormat('hi-IN', { weekday: 'long' }).format(new Date(day.date))}
                        </p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{day.condition}</p>
                      </div>
                    </div>
                    <div className="text-right pr-2">
                      <p className="text-3xl font-black text-slate-800">{day.max_temp}°</p>
                      <p className="text-sm font-bold text-slate-300">{day.min_temp}°</p>
                    </div>
                  </div>

                  {/* Ag-Details Row */}
                  <div className="px-6 py-4 grid grid-cols-3 gap-4 border-t border-slate-50 bg-slate-50/30">
                    <div className="flex items-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-tight">
                      <Waves size={16} className="text-blue-400" /> Barish: {day.rain_probability}%
                    </div>
                    <div className="flex items-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-tight">
                      <Wind size={16} className="text-slate-400" /> {day.max_wind_speed}km/h
                    </div>
                    <div className="flex items-center gap-2.5 text-[11px] font-black text-slate-500 uppercase tracking-tight">
                      <Droplets size={16} className="text-blue-300" /> {day.rain_volume}mm
                    </div>
                  </div>

                  {/* Crop Specific Advice Section */}
                  <div className="bg-[#F0FDF4] px-7 py-5 flex items-start gap-5 border-t border-[#DCFCE7]">
                    <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-agro-green/10">
                      <Sprout size={24} className="text-agro-green" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-agro-green uppercase tracking-widest opacity-60">
                        {userCrops.length > 0 ? `${userCrops[0]} Ke Liye Salah` : "Agri Advice"}
                      </p>
                      {advice.map((line, i) => (
                        <p key={i} className="text-[15px] font-bold text-agro-green/90 leading-relaxed">
                          • {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="bg-slate-100/60 p-8 rounded-[2rem] flex items-start gap-5 border border-slate-100">
          <AlertTriangle size={28} className="text-slate-400 shrink-0" />
          <p className="text-xs text-slate-500 font-bold leading-relaxed uppercase tracking-tight">
            Kripya Dhyan Dein: Yeh data OpenWeatherMap se hai. Kheti ka koi bhi mahatvapurn kaam karne se pehle local mausam vibhag se confirm karein.
          </p>
        </div>
      </div>
    </div>
  );
}
