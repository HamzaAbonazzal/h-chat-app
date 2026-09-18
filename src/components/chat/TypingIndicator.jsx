import { useTranslation } from "react-i18next";

const TypingIndicator = ({ users }) => {
  const { t } = useTranslation();

  if (!users || users.length === 0) return null;

  const names = users.map((u) => u.username);
  let text = "";

  if (names.length === 1) {
    text = `${names[0]} ${t("common.typing")}`;
  } else if (names.length === 2) {
    text = `${names[0]} و${names[1]} ${t("common.typing")}`;
  } else {
    text = `${names.length} ${t("common.typing")}`;
  }

  return (
    <div
      className="d-flex align-items-center gap-2 px-3 py-1 small"
      style={{ color: "#008069", fontStyle: "italic", height: "24px" }}
    >
      <div className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span>{text}</span>
    </div>
  );
};

export default TypingIndicator;