import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { languageOptions, translations } from "../utils/translations.js";
import { supabase } from "../utils/supabaseClient.js";
import useAuth from "../hooks/useAuth.js";

export const LanguageContext = createContext(null);

const DEFAULT_LANGUAGE = "hindi";

function withTimeout(promise, timeoutMs = 6000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error("Language update timed out.")), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

export function LanguageProvider({ children }) {
  const { user, profile, refreshProfile } = useAuth();
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem("preferred_language") || DEFAULT_LANGUAGE;
  });

  useEffect(() => {
    if (profile?.preferred_language && profile.preferred_language !== language) {
      setLanguageState(profile.preferred_language);
      localStorage.setItem("preferred_language", profile.preferred_language);
    }
  }, [profile?.preferred_language]);

  const translate = useCallback(
    (key) => {
      return translations[language]?.[key] || translations[DEFAULT_LANGUAGE][key] || key;
    },
    [language]
  );

  const changeLanguage = useCallback(
    async (nextLanguage) => {
      if (!translations[nextLanguage]) return;

      setLanguageState(nextLanguage);
      localStorage.setItem("preferred_language", nextLanguage);

      if (user && supabase) {
        const { error } = await withTimeout(
          supabase.from("profiles").update({ preferred_language: nextLanguage }).eq("id", user.id)
        );

        if (!error) {
          await refreshProfile();
        }
      }
    },
    [user, refreshProfile]
  );

  const value = useMemo(
    () => ({
      language,
      languages: languageOptions,
      translate,
      changeLanguage,
    }),
    [language, translate, changeLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
