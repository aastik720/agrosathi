import { CheckCircle2, Leaf, Loader2, Trash2, X } from "lucide-react";

function relativeDate(dateValue) {
  if (!dateValue) return "";

  const diff = Date.now() - new Date(dateValue).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} din pehle`;
  if (hours > 0) return `${hours} ghante pehle`;
  return `${minutes} min pehle`;
}

function scanTitle(scan) {
  if (scan.is_healthy) return "Swasth";
  return scan.disease_name_hindi || scan.disease_name || "Pehchaan nahi hui";
}

export default function ScanHistory({
  open,
  scans,
  loading,
  onClose,
  onSelect,
  onDelete,
  onDeleteAll,
  onStartScan,
}) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md transform flex-col bg-white shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between border-b border-green-100 p-4">
          <div>
            <p className="text-sm font-extrabold text-agro-orange">Bimari Detector</p>
            <h2 className="text-xl font-extrabold text-slate-950">Scan History</h2>
          </div>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-green-100 text-slate-700 transition hover:bg-green-50"
            type="button"
            aria-label="Close history"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-56 items-center justify-center text-agro-green">
              <Loader2 className="animate-spin" size={30} aria-hidden="true" />
            </div>
          ) : scans.length ? (
            <ul className="space-y-3">
              {scans.map((scan) => (
                <li key={scan.id}>
                  <article className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-lg border border-green-100 bg-green-50/50 p-3 transition hover:border-agro-green hover:bg-green-50">
                    <button
                      className="contents text-left"
                      type="button"
                      onClick={() => onSelect(scan)}
                      aria-label={`Open ${scanTitle(scan)} scan`}
                    >
                      <div className="h-16 w-16 overflow-hidden rounded-lg bg-white">
                        {scan.thumbnail_url || scan.image_url ? (
                          <img
                            className="h-full w-full object-cover"
                            src={scan.thumbnail_url || scan.image_url}
                            alt={scanTitle(scan)}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-agro-green">
                            <Leaf size={24} aria-hidden="true" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              scan.is_healthy ? "bg-agro-green" : "bg-red-500"
                            }`}
                          />
                          <p className="truncate text-sm font-extrabold text-slate-950">
                            {scanTitle(scan)}
                          </p>
                        </div>
                        <p className="mt-1 truncate text-xs font-bold text-slate-600">
                          {scan.crop_type || "Fasal"} - {relativeDate(scan.created_at)}
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-extrabold ${
                            scan.is_healthy ? "bg-green-100 text-agro-green" : "bg-orange-100 text-agro-orange"
                          }`}
                        >
                          {Math.round(Number(scan.confidence || 0))}%
                        </span>
                      </div>
                    </button>

                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50"
                      type="button"
                      aria-label="Delete scan"
                      onClick={() => onDelete(scan.id)}
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-agro-green">
                <Leaf size={32} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-xl font-extrabold text-slate-950">
                Abhi tak koi scan nahi kiya
              </h3>
              <button className="primary-button mt-5" type="button" onClick={onStartScan}>
                <CheckCircle2 size={19} aria-hidden="true" />
                Pehla Scan Karein
              </button>
            </div>
          )}
        </div>

        {scans.length > 0 && (
          <footer className="border-t border-green-100 p-4">
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-extrabold text-red-700 transition hover:bg-red-100"
              type="button"
              onClick={onDeleteAll}
            >
              <Trash2 size={18} aria-hidden="true" />
              Sab delete karein
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}
