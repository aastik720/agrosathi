import { Mic, Square } from "lucide-react";

export default function VoiceButton({ listening, supported, disabled, onStart, onStop }) {
  if (!supported) return null;

  return (
    <button
      className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-white shadow-soft transition ${
        listening
          ? "animate-pulse border-red-300 bg-red-600 hover:bg-red-700"
          : "border-green-200 bg-agro-green hover:bg-green-700"
      } disabled:cursor-not-allowed disabled:opacity-60`}
      type="button"
      disabled={disabled}
      aria-label={listening ? "Stop voice recording" : "Start voice recording"}
      title={listening ? "Stop" : "Mic"}
      onClick={listening ? onStop : onStart}
    >
      {listening ? <Square size={24} aria-hidden="true" /> : <Mic size={27} aria-hidden="true" />}
    </button>
  );
}
