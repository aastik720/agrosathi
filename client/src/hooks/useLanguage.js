import { useContext } from "react";
import { LanguageContext } from "../context/LanguageContext.jsx";

export default function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}
