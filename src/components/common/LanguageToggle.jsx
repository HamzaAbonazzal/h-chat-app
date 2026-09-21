import { Dropdown } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../../utils/constants";

/**
 * زر تبديل اللغة — يُستخدم داخل AuthToolbar.
 * 
 * ⭐ popperConfig: strategy "fixed" ← يمنع انزياح العناصر المجاورة
 * عند فتح القائمة.
 */
const LanguageToggle = () => {
  const { i18n } = useTranslation();

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || {
    code: i18n.language,
    name: i18n.language === "ar" ? "العربية" : "English",
  };

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
  };

  return (
    <Dropdown
      align="end"
      className="language-toggle"
      popperConfig={{
        strategy: "fixed", // ⭐ المفتاح — يفصل القائمة عن التخطيط
        modifiers: [
          {
            name: "preventOverflow",
            options: {
              boundary: "viewport",
              padding: 8,
            },
          },
          {
            name: "offset",
            options: {
              offset: [0, 8], // مسافة صغيرة أسفل الزر
            },
          },
        ],
      }}
    >
      <Dropdown.Toggle
        as="button"
        className="btn language-toggle-btn d-flex align-items-center gap-2 px-3 py-2"
        style={{ borderRadius: "20px" }}
        id="language-toggle"
      >
        <i className="bi bi-globe2"></i>
        <span className="small fw-semibold d-none d-sm-inline">
          {currentLang.name}
        </span>
      </Dropdown.Toggle>

      <Dropdown.Menu className="language-dropdown-menu">
        {LANGUAGES.map((lang) => (
          <Dropdown.Item
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            active={i18n.language === lang.code}
            className="d-flex align-items-center gap-2"
          >
            {i18n.language === lang.code && (
              <i className="bi bi-check-lg"></i>
            )}
            <span
              className={i18n.language === lang.code ? "fw-semibold" : ""}
            >
              {lang.name}
            </span>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default LanguageToggle;