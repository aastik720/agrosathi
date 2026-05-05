import { SendHorizonal } from "lucide-react";
import VoiceButton from "./VoiceButton.jsx";

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  voiceSupported,
  listening,
  voiceStatus,
  voiceError,
  onVoiceStart,
  onVoiceStop,
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <form className="space-y-3 border-t border-green-100 bg-white p-3 sm:p-4" onSubmit={handleSubmit}>
      {!voiceSupported && (
        <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-bold text-agro-orange">
          Aapka browser voice support nahi karta. Text type karein.
        </p>
      )}

      {voiceError && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          <p>{voiceError}</p>
          {voiceError.includes("permission") && (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs font-semibold text-red-700">
              <li>Address bar ke lock icon par tap karein.</li>
              <li>Microphone permission Allow karein.</li>
              <li>Page refresh karke mic dobara dabayein.</li>
            </ol>
          )}
        </div>
      )}

      {voiceStatus && (
        <p className="text-center text-sm font-extrabold text-agro-green">{voiceStatus}</p>
      )}

      <div className="flex items-end gap-3">
        <VoiceButton
          disabled={disabled}
          listening={listening}
          supported={voiceSupported}
          onStart={onVoiceStart}
          onStop={onVoiceStop}
        />
        <label className="min-w-0 flex-1">
          <span className="sr-only">Message</span>
          <textarea
            className="max-h-36 min-h-14 w-full resize-none rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-agro-green focus:bg-white focus:ring-4 focus:ring-green-100"
            value={value}
            rows={1}
            disabled={disabled}
            placeholder="Apna sawaal likhein ya mic dabayein..."
            onChange={(event) => onChange?.(event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </label>
        <button
          className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-agro-orange text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          title="Send"
        >
          <SendHorizonal size={24} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
