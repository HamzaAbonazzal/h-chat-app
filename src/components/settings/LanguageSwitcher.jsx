import { ButtonGroup, Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../../utils/constants";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
  };

  return (
    <ButtonGroup className="w-100">
      {LANGUAGES.map((lang) => (
        <Button
          key={lang.code}
          variant={
            i18n.language === lang.code ? "success" : "outline-secondary"
          }
          onClick={() => changeLanguage(lang.code)}
          className="d-flex align-items-center justify-content-center gap-2 py-2"
        >
          <i className="bi bi-translate"></i>
          <span className="small">{lang.name}</span>
        </Button>
      ))}
    </ButtonGroup>
  );
};

export default LanguageSwitcher;