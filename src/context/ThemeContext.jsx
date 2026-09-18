import { createContext, useState, useEffect, useCallback } from "react";
import { THEMES } from "../utils/constants";

export const ThemeContext = createContext(null);

const STORAGE_KEY = "chat_app_theme";

export const ThemeProvider = ({ children }) => {
  // ⭐ قراءة الوضع المحفوظ أو الافتراضي
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || THEMES.LIGHT;
  });

  // الوضع الفعلي المطبق (light/dark) بعد حل system
  const [resolvedTheme, setResolvedTheme] = useState("light");

  // ⭐ تطبيق الوضع على <html data-bs-theme>
  const applyTheme = useCallback((newTheme) => {
    let effectiveTheme = newTheme;

    if (newTheme === THEMES.SYSTEM) {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      effectiveTheme = prefersDark ? THEMES.DARK : THEMES.LIGHT;
    }

    document.documentElement.setAttribute("data-bs-theme", effectiveTheme);
    setResolvedTheme(effectiveTheme);

    return effectiveTheme;
  }, []);

  // عند تغيير theme
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, applyTheme]);

  // متابعة تغييرات نظام التشغيل عند وضع system
  useEffect(() => {
    if (theme !== THEMES.SYSTEM) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme(THEMES.SYSTEM);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, applyTheme]);

  // ⭐ الدوال المُصدّرة
  const setTheme = (newTheme) => {
    if (Object.values(THEMES).includes(newTheme)) {
      setThemeState(newTheme);
    }
  };

  const toggleTheme = () => {
    setThemeState((prev) =>
      prev === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT
    );
  };

  const value = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === "dark",
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};