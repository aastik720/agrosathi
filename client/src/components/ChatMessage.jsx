import { Bot, Check, Copy, Mic, ThumbsDown, ThumbsUp, User, Volume2 } from "lucide-react";
import { useRef, useState } from "react";

export default function ChatMessage({ message, onSpeak, onCopy, onFeedback }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const longPressRef = useRef(null);
  const isUser = message.role === "user";

  const startLongPress = () => {
    window.clearTimeout(longPressRef.current);
    longPressRef.current = window.setTimeout(() => setActionsOpen(true), 450);
  };

  const stopLongPress = () => {
    window.clearTimeout(longPressRef.current);
  };

  return (
    <article
      className={`group flex ${isUser ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => !isUser && setActionsOpen(true)}
      onMouseLeave={() => !isUser && setActionsOpen(false)}
      onTouchStart={!isUser ? startLongPress : undefined}
      onTouchEnd={!isUser ? stopLongPress : undefined}
    >
      <div
        className={`max-w-[86%] rounded-lg px-4 py-3 shadow-sm sm:max-w-[72%] ${
          isUser
            ? "bg-agro-green text-white"
            : "border border-green-100 bg-white text-slate-800"
        }`}
      >
        <div className="mb-2 flex items-center gap-2 text-xs font-extrabold opacity-85">
          {isUser ? <User size={14} aria-hidden="true" /> : <Bot size={14} aria-hidden="true" />}
          <span>{isUser ? "Aap" : "Saathi AI"}</span>
          {message.is_voice && <Mic size={14} aria-label="Voice message" />}
          {!isUser && message.ai_used && (
            <span
              className={`rounded-full px-2 py-0.5 ${
                message.ai_used === "ollama"
                  ? "bg-green-100 text-agro-green"
                  : "bg-sky-100 text-sky-700"
              }`}
            >
              {message.ai_used === "ollama" ? "Offline" : "Cloud AI"}
            </span>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>

        {!isUser && (
          <div
            className={`mt-3 flex flex-wrap gap-2 transition ${
              actionsOpen ? "opacity-100" : "opacity-0 group-focus-within:opacity-100"
            }`}
          >
            <ActionButton label="Speak" onClick={() => onSpeak?.(message.content)}>
              <Volume2 size={15} aria-hidden="true" />
            </ActionButton>
            <ActionButton label="Copy" onClick={() => onCopy?.(message.content)}>
              <Copy size={15} aria-hidden="true" />
            </ActionButton>
            <ActionButton label="Helpful" onClick={() => onFeedback?.(message, "helpful")}>
              {message.feedback === "helpful" ? (
                <Check size={15} aria-hidden="true" />
              ) : (
                <ThumbsUp size={15} aria-hidden="true" />
              )}
            </ActionButton>
            <ActionButton label="Not helpful" onClick={() => onFeedback?.(message, "not_helpful")}>
              <ThumbsDown size={15} aria-hidden="true" />
            </ActionButton>
          </div>
        )}
      </div>
    </article>
  );
}

function ActionButton({ label, onClick, children }) {
  return (
    <button
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-green-100 bg-green-50 text-agro-green transition hover:bg-green-100"
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
