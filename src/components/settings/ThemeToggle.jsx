import { ButtonGroup, Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../hooks/useTheme";
import { THEMES } from "../../utils/constants";

const ThemeToggle = () => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const options = [
    { value: THEMES.LIGHT, icon: "bi-sun-fill", label: t("settings.lightMode") },
    { value: THEMES.DARK, icon: "bi-moon-stars-fill", label: t("settings.darkMode") },
    { value: THEMES.SYSTEM, icon: "bi-circle-half", label: t("settings.systemMode") },
  ];

  return (
    <ButtonGroup className="w-100">
      {options.map((opt) => (
        <Button
          key={opt.value}
          variant={theme === opt.value ? "success" : "outline-secondary"}
          onClick={() => setTheme(opt.value)}
          className="d-flex align-items-center justify-content-center gap-2 py-2"
        >
          <i className={`bi ${opt.icon}`}></i>
          <span className="d-none d-sm-inline small">{opt.label}</span>
        </Button>
      ))}
    </ButtonGroup>
  );
};

export default ThemeToggle;