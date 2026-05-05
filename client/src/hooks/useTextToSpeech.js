import { useCallback, useEffect, useMemo, useState } from "react";

const speechLang = {
  hindi: "hi-IN",
  punjabi: "pa-IN",
  pahadi: "hi-IN",
  english: "en-IN",
};

export default function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const supported = useMemo(() => typeof window !== "undefined" && "speechSynthesis" in window, []);

  useEffect(() => {
    if (!supported) return undefined;

    const handleEnd = () => setSpeaking(false);
    window.speechSynthesis.addEventListener?.("voiceschanged", handleEnd);
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener?.("voiceschanged", handleEnd);
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text, language = "hindi") => {
      if (!supported || !text) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const lang = speechLang[language] || "hi-IN";
      utterance.lang = lang;
      utterance.rate = language === "english" ? 0.95 : 0.9;
      utterance.pitch = 1;

      const voices = window.speechSynthesis.getVoices();
      const matchingVoice =
        voices.find((voice) => voice.lang === lang) ||
        voices.find((voice) => voice.lang?.startsWith(lang.split("-")[0]));

      if (matchingVoice) utterance.voice = matchingVoice;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [supported]
  );

  return { supported, speaking, speak, stop };
}
