export default function DecisionMatrix({ mandiPrice = 35, marketplacePrice = 42 }) {
  const diff = marketplacePrice - mandiPrice;
  const isMarketplaceBetter = diff > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">Kahan Bechein? (Where to Sell?)</h3>
        <span className="text-xs bg-agro-green text-white px-2 py-0.5 rounded-full font-bold">AI Recommended</span>
      </div>
      
      <div className="flex divide-x divide-slate-100">
        {/* Mandi Option */}
        <div className={`flex-1 p-4 flex flex-col items-center ${!isMarketplaceBetter ? 'bg-agro-green/5' : ''}`}>
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2">
            <span className="text-xl">🏪</span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mandi</span>
          <span className="text-lg font-black text-slate-800 mt-1">₹{mandiPrice}</span>
          <span className="text-[9px] text-slate-400 mt-1 uppercase">After 10% Fee</span>
        </div>

        {/* Marketplace Option */}
        <div className={`flex-1 p-4 flex flex-col items-center ${isMarketplaceBetter ? 'bg-agro-green/5' : ''}`}>
          <div className="w-10 h-10 bg-agro-green/10 rounded-full flex items-center justify-center mb-2">
            <span className="text-xl">📱</span>
          </div>
          <span className="text-[10px] font-bold text-agro-green uppercase tracking-wider">Direct</span>
          <span className="text-lg font-black text-slate-800 mt-1">₹{marketplacePrice}</span>
          <span className="text-[9px] text-agro-green font-bold mt-1 uppercase">Zero Commission</span>
        </div>
      </div>

      <div className="p-4 bg-agro-green/10 border-t border-agro-green/10">
        <div className="flex items-start gap-3">
          <div className="bg-white p-1.5 rounded-lg shadow-sm">
            <span className="text-lg">💡</span>
          </div>
          <p className="text-xs font-medium text-slate-700 leading-relaxed">
            {isMarketplaceBetter ? (
              <>
                <span className="text-agro-green font-bold">Direct Marketplace</span> mein becho! <br/>
                Aapko <span className="font-bold text-slate-900">₹{diff}/kg</span> zyada munafa hoga.
              </>
            ) : (
              <>
                Abhi <span className="text-slate-900 font-bold">Mandi</span> mein bechna behtar hai. <br/>
                Yahan buyers ki sankhya zyada hai.
              </>
            )}
          </p>
        </div>
        <button className="w-full mt-3 bg-agro-green text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-agro-green/20 active:scale-95 transition-transform flex items-center justify-center gap-2">
          {isMarketplaceBetter ? (
            <>
              <span>Marketplace Mein List Karo</span>
              <span className="text-base">🚀</span>
            </>
          ) : (
            <>
              <span>Mandi Ki Jankari Dekho</span>
              <span className="text-base">📍</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
