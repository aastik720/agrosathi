export default function TypingIndicator() {
  return (
    <div className="flex max-w-[82%] flex-col items-start gap-2 rounded-lg border border-green-100 bg-white px-4 py-3 shadow-sm sm:max-w-[70%]">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-agro-green [animation-delay:-0.25s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-agro-green [animation-delay:-0.12s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-agro-green" />
      </div>
      <p className="text-xs font-bold text-slate-500">Saathi soch raha hai...</p>
    </div>
  );
}
