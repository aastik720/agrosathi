import { Construction } from "lucide-react";
import useLanguage from "../hooks/useLanguage.js";

export default function PlaceholderPage({ title, phase }) {
  const { translate } = useLanguage();

  return (
    <section className="page-shell">
      <div className="rounded-lg border border-green-100 bg-white p-8 text-center shadow-soft">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-green-100 text-agro-green">
          <Construction size={30} aria-hidden="true" />
        </span>
        <p className="mt-5 text-sm font-bold text-agro-orange">{phase}</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-950">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
          {translate("coming_soon")}
        </p>
      </div>
    </section>
  );
}
