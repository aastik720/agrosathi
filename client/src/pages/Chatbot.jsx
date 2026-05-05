import axios from "axios";
import { Bot, Eraser, Leaf, Mic, RefreshCcw, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import ChatInput from "../components/ChatInput.jsx";
import ChatMessage from "../components/ChatMessage.jsx";
import SuggestionChips from "../components/SuggestionChips.jsx";
import TypingIndicator from "../components/TypingIndicator.jsx";
import useAuth from "../hooks/useAuth.js";
import useLanguage from "../hooks/useLanguage.js";
import useSpeechRecognition from "../hooks/useSpeechRecognition.js";
import useTextToSpeech from "../hooks/useTextToSpeech.js";
import { supabase } from "../utils/supabaseClient.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";
const TWO_HOURS = 2 * 60 * 60 * 1000;

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function newUuid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (item) =>
    (Number(item) ^ (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(item) / 4)))).toString(16)
  );
}

function getStoredSessionId() {
  return localStorage.getItem("agrosathi_chat_session_id") || newUuid();
}

function isCurrentSession(message) {
  if (!message?.created_at) return false;
  return Date.now() - new Date(message.created_at).getTime() <= TWO_HOURS;
}

function aiErrorMessage(error, online) {
  if (error?.code === "ERR_CANCELED") return "Jawab cancel kar diya.";
  if (error?.code === "ECONNABORTED") return "Jawab aane mein der ho rahi hai. Dobara poochein.";
  if (!online) return "Internet nahi hai. Kripya connection check karein.";
  return "AI se connection nahi ho pa raha. Internet check karein.";
}

function isSchemeQuestion(text = "") {
  const value = String(text).toLowerCase();
  return [
    "scheme",
    "schemes",
    "yojana",
    "yojna",
    "योजना",
    "sarkari",
    "सरकारी",
    "pm kisan",
    "subsidy",
    "सब्सिडी",
  ].some((term) => value.includes(term));
}

function buildSchemeReply(data) {
  const schemes = (data?.eligible_schemes || []).slice(0, 4);
  if (!schemes.length) {
    return "Kisan bhai, abhi profile ke hisaab se eligible schemes nahi mili. Profile mein land size, location aur crops update karein, phir main dobara check kar dunga.";
  }

  const lines = schemes.map((scheme) => `${scheme.scheme_name}: ${scheme.benefit_text}`).join(". ");
  const total = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(data?.total_possible_benefit || 0);

  return `Kisan bhai, aap ${data.eligible_count} sarkari schemes ke liye eligible hain. Total lagbhag ${total}+ ka fayda mil sakta hai. ${lines}. Apply karne ke liye Sarkari Yojnayein page kholiye.`;
}

export default function Chatbot() {
  const { user, profile } = useAuth();
  const { language, translate } = useLanguage();
  const tts = useTextToSpeech();
  const endRef = useRef(null);
  const abortRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(getStoredSessionId);
  const [suggestions, setSuggestions] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyNotice, setHistoryNotice] = useState("");
  const [mode, setMode] = useState("");
  const [error, setError] = useState("");
  const [lastRetry, setLastRetry] = useState(null);
  const [online, setOnline] = useState(() => navigator.onLine);

  const farmerContext = useMemo(
    () => ({
      id: user?.id,
      full_name: profile?.full_name,
      location: profile?.location,
      land_size: profile?.land_size,
      crop_types: profile?.crop_types || [],
    }),
    [profile, user]
  );

  useEffect(() => {
    localStorage.setItem("agrosathi_chat_session_id", sessionId);
  }, [sessionId]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking, suggestions]);

  const getAuthHeaders = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) throw new Error("Please login again.");
    return { Authorization: `Bearer ${session.access_token}` };
  }, []);

  const saveMessage = useCallback(
    async (message) => {
      const headers = await getAuthHeaders();
      const { data } = await axios.post(
        `${SERVER_URL}/api/chat/save`,
        {
          session_id: message.session_id,
          role: message.role,
          content: message.content,
          is_voice: Boolean(message.is_voice),
          ai_used: message.ai_used || null,
          language,
        },
        { headers }
      );
      return data?.message;
    },
    [getAuthHeaders, language]
  );

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!user) return;
      setHistoryLoading(true);
      setError("");
      setHistoryNotice("");

      try {
        const headers = await getAuthHeaders();
        const { data } = await axios.get(`${SERVER_URL}/api/chat/history`, {
          params: { limit: 20 },
          headers,
        });

        if (!active) return;

        const visibleMessages = (data?.messages || []).filter(
          (message) => message.ai_used !== "feedback"
        );
        setMessages(visibleMessages);

        const lastMessage = visibleMessages[visibleMessages.length - 1];
        if (isCurrentSession(lastMessage)) {
          setSessionId(lastMessage.session_id);
        } else {
          const nextSessionId = newUuid();
          setSessionId(nextSessionId);
        }
      } catch {
        if (active) {
          setMessages([]);
          setHistoryNotice("Purani chat nahi khul paayi. Nayi chat shuru kar sakte hain.");
        }
      } finally {
        if (active) setHistoryLoading(false);
      }
    }

    loadHistory();
    return () => {
      active = false;
    };
  }, [getAuthHeaders, user]);

  const updateSavedMessage = useCallback((temporaryId, savedMessage) => {
    if (!savedMessage?.id) return;
    setMessages((current) =>
      current.map((message) => (message.id === temporaryId ? { ...message, ...savedMessage } : message))
    );
  }, []);

  const sendMessage = useCallback(
    async (textOverride, options = {}) => {
      const text = String(textOverride ?? input).trim();
      if (!text || thinking) return;

      const activeSessionId = sessionId || newUuid();
      if (!sessionId) setSessionId(activeSessionId);

      const userMessage = {
        id: newUuid(),
        farmer_id: user?.id,
        session_id: activeSessionId,
        role: "user",
        content: text,
        is_voice: Boolean(options.isVoice),
        ai_used: null,
        language,
        created_at: new Date().toISOString(),
      };

      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput("");
      setSuggestions([]);
      setError("");
      setThinking(true);
      setLastRetry({ text, isVoice: Boolean(options.isVoice) });

      try {
        saveMessage(userMessage)
          .then((saved) => updateSavedMessage(userMessage.id, saved))
          .catch(() => toast.error("Chat history save nahi ho paayi."));

        if (isSchemeQuestion(text)) {
          const headers = await getAuthHeaders();
          const { data } = await axios.get(`${SERVER_URL}/api/schemes/eligible`, { headers });
          const assistantMessage = {
            id: newUuid(),
            farmer_id: user?.id,
            session_id: activeSessionId,
            role: "assistant",
            content: buildSchemeReply(data),
            is_voice: false,
            ai_used: "gemini",
            language,
            created_at: new Date().toISOString(),
          };

          setMessages((current) => [...current, assistantMessage]);
          setMode("gemini");
          setSuggestions(["Sarkari Yojnayein page kholo", "PM Kisan details batao", "Apply kaise karun?"]);
          setLastRetry(null);
          saveMessage(assistantMessage)
            .then((saved) => updateSavedMessage(assistantMessage.id, saved))
            .catch(() => toast.error("AI reply save nahi ho paayi."));
          tts.speak(assistantMessage.content, language);
          return;
        }

        const controller = new AbortController();
        abortRef.current = controller;
        const aiRequest = axios.post(
          `${AI_SERVICE_URL}/ai/chat/voice`,
          {
            message: text,
            language,
            history: nextMessages
              .filter((message) => message.role === "user" || message.role === "assistant")
              .slice(-5)
              .map((message) => ({
                role: message.role,
                content: message.content,
              })),
            farmer: farmerContext,
            is_voice: Boolean(options.isVoice),
            session_id: activeSessionId,
          },
          {
            signal: controller.signal,
            timeout: 45000,
          }
        );

        const [aiResponse] = await Promise.all([aiRequest, wait(1000)]);
        const payload = aiResponse.data || {};
        const assistantMessage = {
          id: newUuid(),
          farmer_id: user?.id,
          session_id: activeSessionId,
          role: "assistant",
          content: payload.reply || "Maaf kijiye, abhi jawab nahi ban paaya.",
          is_voice: false,
          ai_used: payload.ai_used || payload.mode || "gemini",
          language,
          created_at: new Date().toISOString(),
        };

        setMessages((current) => [...current, assistantMessage]);
        setMode(assistantMessage.ai_used);
        setSuggestions((payload.suggestions || []).slice(0, 3));
        setLastRetry(null);

        saveMessage(assistantMessage)
          .then((saved) => updateSavedMessage(assistantMessage.id, saved))
          .catch(() => toast.error("AI reply save nahi ho paayi."));

        tts.speak(assistantMessage.content, language);
      } catch (requestError) {
        setError(aiErrorMessage(requestError, online));
      } finally {
        abortRef.current = null;
        setThinking(false);
      }
    },
    [
      farmerContext,
      input,
      language,
      messages,
      online,
      saveMessage,
      sessionId,
      thinking,
      tts,
      updateSavedMessage,
      user,
    ]
  );

  const speech = useSpeechRecognition({
    onAutoSubmit: (text) => {
      setInput(text);
      sendMessage(text, { isVoice: true });
    },
  });

  useEffect(() => {
    if (speech.listening) setInput(speech.transcript);
  }, [speech.listening, speech.transcript]);

  const handleClear = async () => {
    const ok = window.confirm("Saari chat history clear karni hai?");
    if (!ok) return;

    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${SERVER_URL}/api/chat/clear`, { headers });
      setMessages([]);
      setSuggestions([]);
      setSessionId(newUuid());
      toast.success("Chat history clear ho gayi.");
    } catch {
      toast.error("Chat clear nahi ho paayi.");
    }
  };

  const handleCopy = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Message copy ho gaya.");
    } catch {
      toast.error("Copy nahi ho paaya.");
    }
  };

  const handleFeedback = async (message, feedback) => {
    setMessages((current) =>
      current.map((item) => (item.id === message.id ? { ...item, feedback } : item))
    );

    try {
      const headers = await getAuthHeaders();
      await axios.post(
        `${SERVER_URL}/api/chat/feedback`,
        {
          session_id: message.session_id || sessionId,
          message_id: message.id,
          feedback,
          language,
        },
        { headers }
      );
      toast.success(feedback === "helpful" ? "Dhanyavaad, feedback save ho gaya." : "Feedback save ho gaya.");
    } catch {
      toast.error("Feedback save nahi ho paaya.");
    }
  };

  const handleRetry = () => {
    if (!lastRetry) return;
    setError("");
    sendMessage(lastRetry.text, { isVoice: lastRetry.isVoice });
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setError("Jawab cancel kar diya.");
    setThinking(false);
  };

  const modeBadge =
    mode === "ollama"
      ? "Offline mode mein kaam kar raha hai"
      : mode === "gemini"
        ? "Cloud AI mode"
        : "";

  return (
    <section className="page-shell">
      <div className="overflow-hidden rounded-lg border border-green-100 bg-white shadow-soft">
        <header className="flex flex-col gap-4 border-b border-green-100 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-agro-green text-white">
              <Bot size={26} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-agro-orange">{translate("chatbot")}</p>
              <h1 className="text-2xl font-extrabold text-slate-950">Saathi AI</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!online && mode !== "ollama" && (
              <span className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700">
                <WifiOff size={15} aria-hidden="true" />
                Internet nahi hai
              </span>
            )}
            {modeBadge && (
              <span
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold ${
                  mode === "ollama" ? "bg-green-100 text-agro-green" : "bg-sky-100 text-sky-700"
                }`}
              >
                <Leaf size={15} aria-hidden="true" />
                {modeBadge}
              </span>
            )}
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-green-200 bg-white text-agro-green transition hover:bg-green-50"
              type="button"
              aria-label="Clear chat history"
              title="Clear chat"
              onClick={handleClear}
            >
              <Eraser size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="min-h-[58vh] space-y-4 bg-gradient-to-b from-green-50 to-white p-4">
          {historyLoading ? (
            <div className="flex min-h-[45vh] items-center justify-center">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-green-200 border-t-agro-green" />
            </div>
          ) : messages.length ? (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onCopy={handleCopy}
                onFeedback={handleFeedback}
                onSpeak={(content) => tts.speak(content, language)}
              />
            ))
          ) : (
            <div className="flex min-h-[45vh] flex-col items-center justify-center text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-agro-green">
                <Mic size={32} aria-hidden="true" />
              </span>
              <h2 className="text-2xl font-extrabold text-slate-950">Apna sawaal poochhein</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                Fasal, mausam, dawa, mandi ya scheme ke baare mein mic se bolkar ya text likhkar poochhein.
              </p>
            </div>
          )}

          {thinking && (
            <div className="flex items-start justify-between gap-3">
              <TypingIndicator />
              <button
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-extrabold text-red-700 shadow-sm transition hover:bg-red-50"
                type="button"
                onClick={handleCancel}
              >
                <X size={14} aria-hidden="true" />
                Cancel
              </button>
            </div>
          )}

          {historyNotice && !messages.length && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm font-bold text-yellow-800">
              {historyNotice}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">
              <p>{error}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {lastRetry && error !== "Jawab cancel kar diya." && (
                  <button
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-extrabold text-white"
                    type="button"
                    onClick={handleRetry}
                  >
                    <RefreshCcw size={14} aria-hidden="true" />
                    Retry
                  </button>
                )}
                {thinking && (
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-extrabold text-red-700"
                    type="button"
                    onClick={handleCancel}
                  >
                    <X size={14} aria-hidden="true" />
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          <SuggestionChips
            disabled={thinking}
            suggestions={suggestions}
            onSelect={(suggestion) => {
              setSuggestions([]);
              sendMessage(suggestion);
            }}
          />
          <div ref={endRef} />
        </div>

        <ChatInput
          value={input}
          disabled={thinking || historyLoading}
          listening={speech.listening}
          voiceError={speech.error}
          voiceStatus={speech.status}
          voiceSupported={speech.supported}
          onChange={setInput}
          onSubmit={() => sendMessage()}
          onVoiceStart={() => speech.start(language)}
          onVoiceStop={speech.stop}
        />
      </div>
    </section>
  );
}
