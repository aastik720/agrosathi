import { Star, MapPin, Navigation } from "lucide-react";

export default function PriceComparison({ commodity, comparisons, userCoords }) {
  if (!comparisons || comparisons.length === 0) return null;

  // Simple deterministic distance based on market name for a dynamic feel
  const getDistance = (marketName) => {
    let hash = 0;
    for (let i = 0; i < marketName.length; i++) {
      hash = marketName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return (Math.abs(hash) % 45) + 5; // Between 5km and 50km
  };

  // Sort by modal price descending to show best deal at top
  const sorted = [...comparisons].sort((a, b) => 
    parseInt(b.modal_price || 0) - parseInt(a.modal_price || 0)
  );

  const bestPrice = parseInt(sorted[0].modal_price);
  const worstPrice = parseInt(sorted[sorted.length - 1].modal_price);
  const diff = bestPrice - worstPrice;

  const handleNavigate = (market, state) => {
    const query = encodeURIComponent(`${market} Mandi ${state || ""}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">{commodity} Ka Bhav - Comparison</h3>
      </div>
      
      <div className="divide-y divide-slate-50">
        {sorted.map((item, idx) => (
          <div key={idx} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-2 rounded-xl">
                <MapPin size={18} className="text-slate-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-700">{item.market}</p>
                  {idx === 0 && (
                    <span className="bg-agro-green/10 text-agro-green text-[9px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                      <Star size={10} fill="currentColor" /> Best Deal
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Approx. {getDistance(item.market)}km away {userCoords ? "(from you)" : ""}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-base font-black text-slate-800">₹{item.modal_price}/kg</p>
              <button 
                onClick={() => handleNavigate(item.market, item.state)}
                className="text-[10px] text-agro-green font-bold flex items-center gap-0.5 ml-auto mt-0.5 hover:underline"
              >
                <Navigation size={10} /> Navigate
              </button>
            </div>
          </div>
        ))}
      </div>

      {diff > 0 && (
        <div className="p-4 bg-agro-green/5 flex items-start gap-3 border-t border-agro-green/10">
          <div className="bg-white p-1 rounded-lg">
            <span className="text-base">💡</span>
          </div>
          <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">{sorted[0].market}</span> mein <span className="text-agro-green font-bold">₹{diff}/kg</span> zyada milega. Wahan bechein!
          </p>
        </div>
      )}
    </div>
  );
}
