import useLanguage from "../hooks/useLanguage.js";

export default function LoadingSpinner({ size = "full", label }) {
  const { translate } = useLanguage();
  const text = label || translate("loading");

  if (size === "inline") {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-agro-green">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-agro-green border-t-transparent" />
        {text}
      </span>
    );
  }

  if (size === "skeleton") {
    return (
      <div className="animate-pulse rounded-lg border border-green-100 bg-white p-5 shadow-sm">
        <div className="h-5 w-32 rounded bg-slate-200" />
        <div className="mt-5 h-14 w-40 rounded bg-slate-200" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="h-20 rounded bg-slate-100" />
          <div className="h-20 rounded bg-slate-100" />
          <div className="h-20 rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell flex min-h-[70vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-lg bg-white px-5 py-4 text-agro-green shadow-soft">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-agro-green border-t-transparent" />
        <span className="font-semibold">{text}</span>
      </div>
    </div>
  );
}
