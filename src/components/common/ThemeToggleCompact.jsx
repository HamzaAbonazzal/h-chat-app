import { useTranslation } from "react-i18next";
import { useTheme } from "../../hooks/useTheme";
import { THEMES } from "../../utils/constants";

/**
 * زر صغير لتبديل الوضع الليلي/النهاري — لصفحات المصادقة.
 */
const ThemeToggleCompact = () => {
  const { t } = useTranslation();
  const { setTheme, isDark } = useTheme();

  const toggleTheme = () => {
    setTheme(isDark ? THEMES.LIGHT : THEMES.DARK);
  };

  const label = isDark ? t("settings.lightMode") : t("settings.darkMode");
  const icon = isDark ? "bi-sun-fill" : "bi-moon-stars-fill";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle-btn btn d-flex align-items-center gap-2 px-3 py-2"
      style={{ borderRadius: "20px" }}
      title={label}
      aria-label={label}
    >
      <i className={`bi ${icon}`}></i>
      <span className="small fw-semibold d-none d-sm-inline">{label}</span>
    </button>
  );
};

export default ThemeToggleCompact;