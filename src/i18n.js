import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "ar"],
    ns: ["translation"],
    defaultNS: "translation",
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
      // ⭐ منع التخزين المؤقت لملفات الترجمة
      requestOptions: {
        cache: "no-store",
      },
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "chat_app_language",
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
    // ⭐ إيقاف التخزين المؤقت الداخلي لـ i18next
    cache: {
      enabled: false,
    },
  });

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
});

export default i18n;
