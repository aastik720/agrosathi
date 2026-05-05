import { Sparkles } from "lucide-react";

export default function SuggestionChips({ suggestions = [], onSelect, disabled = false }) {
  if (!suggestions.length) return null;

  return (
    <div className="chips-in flex flex-wrap gap-2 pb-1">
      {suggestions.slice(0, 3).map((suggestion) => (
        <button
          key={suggestion}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-green-200 bg-white px-3 py-2 text-left text-sm font-bold text-agro-green shadow-sm transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={disabled}
          onClick={() => onSelect?.(suggestion)}
        >
          <Sparkles size={15} aria-hidden="true" />
          <span>{suggestion}</span>
        </button>
      ))}
    </div>
  );
}
