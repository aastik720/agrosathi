import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const recognitionLang = {
  hindi: "hi-IN",
  punjabi: "pa-IN",
  pahadi: "hi-IN",
  english: "en-IN",
};

const errorMessages = {
  "not-allowed": "Mic ki permission nahi mili. Browser settings mein permission dein.",
  "service-not-allowed": "Mic ki permission nahi mili. Browser settings mein permission dein.",
  "no-speech": "Kuch suna nahi gaya. Dobara koshish karein.",
  network: "Voice service se connection nahi ho pa raha.",
};

function getRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function useSpeechRecognition({ onAutoSubmit } = {}) {
  const Recognition = useMemo(() => getRecognitionConstructor(), []);
  const supported = Boolean(Recognition);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const noSpeechTimerRef = useRef(null);
  const transcriptRef = useRef("");
  const submitRef = useRef(onAutoSubmit);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    submitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  const clearTimers = useCallback(() => {
    window.clearTimeout(silenceTimerRef.current);
    window.clearTimeout(noSpeechTimerRef.current);
  }, []);

  const reset = useCallback(() => {
    transcriptRef.current = "";
    setTranscript("");
    setError("");
    setStatus("");
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onend = null;
      recognition.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, [clearTimers]);

  const start = useCallback(
    (language = "hindi") => {
      if (!supported) {
        setError("Aapka browser voice support nahi karta. Text type karein.");
        return;
      }

      stop();
      reset();

      const recognition = new Recognition();
      recognition.lang = recognitionLang[language] || "hi-IN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      const scheduleNoSpeech = () => {
        window.clearTimeout(noSpeechTimerRef.current);
        noSpeechTimerRef.current = window.setTimeout(() => {
          if (!transcriptRef.current.trim()) {
            setError("Kuch suna nahi gaya. Dobara koshish karein.");
            setStatus("");
            stop();
          }
        }, 10000);
      };

      const scheduleAutoSubmit = () => {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = window.setTimeout(() => {
          const finalText = transcriptRef.current.trim();
          if (finalText) {
            setStatus("Samajh raha hoon...");
            stop();
            submitRef.current?.(finalText);
          }
        }, 3000);
      };

      recognition.onstart = () => {
        setListening(true);
        setStatus("Sun raha hoon...");
        scheduleNoSpeech();
      };

      recognition.onresult = (event) => {
        let finalText = "";
        let interimText = "";

        for (let index = 0; index < event.results.length; index += 1) {
          const item = event.results[index];
          if (item.isFinal) {
            finalText += item[0].transcript;
          } else {
            interimText += item[0].transcript;
          }
        }

        const nextTranscript = `${finalText} ${interimText}`.trim();
        transcriptRef.current = nextTranscript;
        setTranscript(nextTranscript);
        setError("");

        if (nextTranscript) {
          window.clearTimeout(noSpeechTimerRef.current);
          scheduleAutoSubmit();
        }
      };

      recognition.onerror = (event) => {
        const message = errorMessages[event.error] || "Voice input mein dikkat aa rahi hai.";
        setError(message);
        setStatus("");
        stop();
      };

      recognition.onend = () => {
        clearTimers();
        setListening(false);
      };

      try {
        recognition.start();
      } catch {
        setError("Voice input shuru nahi ho paaya. Dobara koshish karein.");
        setStatus("");
      }
    },
    [Recognition, clearTimers, reset, stop, supported]
  );

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    supported,
    listening,
    transcript,
    error,
    status,
    start,
    stop,
    reset,
  };
}
