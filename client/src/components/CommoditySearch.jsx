import { useState, useEffect } from "react";
import { Search, Mic, X, History } from "lucide-react";
import useSpeechRecognition from "../hooks/useSpeechRecognition.js";

const COMMODITIES = [
  { hi: "Seb", en: "Apple" },
  { hi: "Aloo", en: "Potato" },
  { hi: "Tamatar", en: "Tomato" },
  { hi: "Gehu", en: "Wheat" },
  { hi: "Chawal", en: "Rice" },
  { hi: "Pyaz", en: "Onion" },
  { hi: "Makka", en: "Maize" },
  { hi: "Shimla Mirch", en: "Capsicum" },
  { hi: "Aadoo", en: "Peach" },
  { hi: "Nashpati", en: "Pear" },
  { hi: "Sarson", en: "Mustard" },
  { hi: "Chana", en: "Chickpea" },
  { hi: "Moong", en: "Green Gram" },
  { hi: "Arhar", en: "Pigeon Pea" },
];

export default function CommoditySearch({ onSearch }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState(() => {
    return JSON.parse(localStorage.getItem("recent_searches") || "[]");
  });

  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition({
    onResult: (text) => setQuery(text)
  });

  useEffect(() => {
    if (query.trim()) {
      const filtered = COMMODITIES.filter(c => 
        c.hi.toLowerCase().includes(query.toLowerCase()) || 
        c.en.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const handleSearch = (q) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;

    onSearch(searchQuery);
    
    // Update history
    const newHistory = [searchQuery, ...history.filter(h => h !== searchQuery)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem("recent_searches", JSON.stringify(newHistory));
    
    setSuggestions([]);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text"
          placeholder="Fasal ya mandi khojein..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          className="w-full pl-10 pr-20 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-agro-green/20 focus:border-agro-green outline-none transition-all shadow-sm font-medium text-slate-700"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button onClick={() => setQuery("")} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          )}
          <button 
            onClick={isListening ? stopListening : startListening}
            className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-agro-green/10 text-agro-green hover:bg-agro-green/20'}`}
          >
            <Mic size={18} />
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-20">
            {suggestions.map((s, idx) => (
              <button 
                key={idx}
                onClick={() => { setQuery(s.hi); handleSearch(s.en); }}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Search size={14} className="text-slate-300 group-hover:text-agro-green transition-colors" />
                  <span className="text-sm font-bold text-slate-700">{s.hi} <span className="text-slate-400 font-normal">({s.en})</span></span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recent Searches */}
      {history.length > 0 && !query && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <History size={10} /> Aapki recent searches
          </p>
          <div className="flex flex-wrap gap-2">
            {history.map((h, idx) => (
              <button
                key={idx}
                onClick={() => { setQuery(h); handleSearch(h); }}
                className="px-3 py-1.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:border-agro-green hover:text-agro-green transition-all shadow-sm"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
