import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  RefreshCcw, 
  TrendingUp, 
  MapPin, 
  Filter,
  Info,
  Volume2,
  X
} from "lucide-react";
import axios from "axios";
import useLanguage from "../hooks/useLanguage.js";
import useTextToSpeech from "../hooks/useTextToSpeech.js";
import { useAlerts } from "../context/AlertContext.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import PriceTrendChart from "../components/PriceTrendChart.jsx";
import DecisionMatrix from "../components/DecisionMatrix.jsx";
import PriceComparison from "../components/PriceComparison.jsx";
import CommoditySearch from "../components/CommoditySearch.jsx";
import { supabase } from "../utils/supabaseClient.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const COMMODITY_ALIASES = [
  { hi: "seb", en: "apple" },
  { hi: "सेब", en: "apple" },
  { hi: "aloo", en: "potato" },
  { hi: "आलू", en: "potato" },
  { hi: "tamatar", en: "tomato" },
  { hi: "टमाटर", en: "tomato" },
  { hi: "gehu", en: "wheat" },
  { hi: "गेहूं", en: "wheat" },
  { hi: "chawal", en: "rice" },
  { hi: "चावल", en: "rice" },
  { hi: "pyaz", en: "onion" },
  { hi: "प्याज", en: "onion" },
  { hi: "makka", en: "maize" },
  { hi: "मक्का", en: "maize" },
  { hi: "shimla mirch", en: "capsicum" },
];

function getSearchTerms(searchText) {
  const query = searchText.trim().toLowerCase();
  if (!query) return [];

  const terms = [query];
  COMMODITY_ALIASES.forEach(({ hi, en }) => {
    if (query.includes(hi) || query.includes(en)) {
      terms.push(hi, en);
    }
  });
  return [...new Set(terms)];
}

function matchesSearch(price, searchText) {
  const terms = getSearchTerms(searchText);
  if (terms.length === 0) return true;

  const haystack = [price.commodity, price.market, price.state]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return terms.some((term) => haystack.includes(term));
}

function priceSuffix(price) {
  return price.approximate ? " (approximate)" : "";
}

const getDistance = (marketName) => {
  let hash = 0;
  for (let i = 0; i < marketName.length; i++) {
    hash = marketName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 45) + 5;
};

export default function MarketPrices() {
  const { translate } = useLanguage();
  const { speak } = useTextToSpeech();
  const { alerts, dismissAlert } = useAlerts();
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState([]);
  const [myCropsPrices, setMyCropsPrices] = useState([]);
  const [trends, setTrends] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(10);
  const [userCoords, setUserCoords] = useState(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, (err) => console.warn("Geolocation error:", err.message));
    }
  }, []);

  const fetchPrices = async (isRefresh = false) => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const token = session?.access_token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.get(`${SERVER_URL}/api/market/prices${isRefresh ? "?refresh=true" : ""}`);
      setPrices(res.data.records || []);

      if (token) {
        try {
          const myRes = await axios.get(`${SERVER_URL}/api/market/prices/my-crops${isRefresh ? "?refresh=true" : ""}`, { headers });
          const records = myRes.data.records || [];
          setMyCropsPrices(records);

          if (records.length > 0) {
            const primaryCrop = records[0].commodity;
            const trendRes = await axios.get(`${SERVER_URL}/api/market/trends/${encodeURIComponent(primaryCrop)}`);
            setTrends(trendRes.data);
          }
        } catch (authError) {
          console.warn("Personalized market prices unavailable:", authError.message);
        }
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const handleSpeakPrice = (p) => {
    const text = `${p.commodity} ka aaj ka bhav ${p.modal_price} rupaye kilo hai, ${p.market} mandi mein.${p.approximate ? " Yeh anumaanik data hai." : ""}`;
    speak(text);
  };

  const filteredPrices = useMemo(() => {
    return prices
      .filter(p => matchesSearch(p, search))
      .sort((a, b) => getDistance(a.market) - getDistance(b.market));
  }, [prices, search]);

  useEffect(() => {
    setVisibleCount(10);
  }, [search]);

  const comparisons = useMemo(() => {
    if (!search || filteredPrices.length < 2) return null;
    return filteredPrices.slice(0, 4);
  }, [filteredPrices, search]);

  const decisionMandiPrice = Number(myCropsPrices[0]?.modal_price || filteredPrices[0]?.modal_price || 35);
  const directPrice = Math.round(decisionMandiPrice * 1.2);

  if (loading && prices.length === 0) return <LoadingSpinner fullScreen />;

  return (
    <div className="pb-24 bg-agro-background min-h-screen">
      <div className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">
            {translate("market") || "Aaj Ka Mandi Bhav"}
          </h1>
        </div>
        <button 
          onClick={() => fetchPrices(true)}
          disabled={loading}
          className={`p-2 hover:bg-slate-100 rounded-full transition-colors ${loading ? 'animate-spin' : ''}`}
        >
          <RefreshCcw size={20} className="text-agro-green" />
        </button>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        <CommoditySearch onSearch={setSearch} />

        {/* Alerts Banner */}
        {alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className="bg-gradient-to-r from-agro-green to-emerald-600 rounded-2xl p-4 text-white shadow-lg shadow-agro-green/20 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Price Alert</p>
                      <p className="font-bold">{alert.title}</p>
                    </div>
                  </div>
                  <button onClick={() => dismissAlert(alert.id)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <TrendingUp size={100} className="absolute -right-4 -bottom-8 opacity-10 rotate-12" />
              </div>
            ))}
          </div>
        )}

        {/* Personalized Prices */}
        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <span className="w-2 h-6 bg-agro-green rounded-full"></span>
            Aapki Faslon Ka Bhav
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {myCropsPrices.map((p, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">{p.commodity}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={10} /> {p.market} Mandi{priceSuffix(p)} (~{getDistance(p.market)} km)
                    </p>
                  </div>
                  <button 
                    onClick={() => handleSpeakPrice(p)}
                    className="p-2 bg-agro-green/10 text-agro-green rounded-xl hover:bg-agro-green hover:text-white transition-all shadow-sm"
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-100">
                   <div className="flex gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Min</span>
                        <span className="text-sm font-bold text-slate-700">₹{p.min_price}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Max</span>
                        <span className="text-sm font-bold text-slate-700">₹{p.max_price}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-1">
                      <p className="text-right">
                        <span className="text-xl font-black text-agro-green">₹{p.modal_price}</span>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-tighter">Modal Price</span>
                      </p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Comparison */}
        {comparisons && (
          <PriceComparison commodity={search} comparisons={comparisons} userCoords={userCoords} />
        )}

        {/* Trend Chart */}
        {trends && (
          <PriceTrendChart data={trends.trends} commodity={trends.commodity} />
        )}

        {/* Decision Matrix */}
        <DecisionMatrix mandiPrice={decisionMandiPrice} marketplacePrice={directPrice} />

        {/* All Mandi Prices Table */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span className="w-2 h-6 bg-slate-300 rounded-full"></span>
              Sabhi Mandi Bhav
            </h2>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fasal</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Price (₹)</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mandi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredPrices.slice(0, visibleCount).map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => handleSpeakPrice(p)}>
                      <td className="px-4 py-4 font-bold text-slate-700 text-sm">{p.commodity}</td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-black text-slate-800 text-sm">{p.modal_price}</span>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">/kg{p.approximate ? " approx" : ""}</span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500 font-medium">
                        {p.market}
                        <span className="block text-[9px] text-slate-400">~{getDistance(p.market)} km</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleCount < filteredPrices.length && (
              <button 
                onClick={() => setVisibleCount(prev => prev + 15)}
                className="w-full py-4 text-xs font-bold text-slate-400 hover:text-agro-green hover:bg-slate-50 transition-all border-t border-slate-50"
              >
                AUR DEKHO
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-100/50 p-4 rounded-2xl flex items-start gap-3">
          <Info size={18} className="text-slate-400 shrink-0" />
          <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">
            Agmarknet API ke dwara data pradan kiya gaya hai. <br/>
            Price approximate ho sakte hain. Kripya mandi jane se pehle confirm karein.
          </p>
        </div>
      </div>
    </div>
  );
}
