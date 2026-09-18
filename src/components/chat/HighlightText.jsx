/**
 * ⭐ تظليل النص المطابق في البحث
 * مع تأثير أنيق
 */
const HighlightText = ({ text = "", query = "" }) => {
  if (!query || !text) return <>{text}</>;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  const lowerQuery = query.toLowerCase();

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = part.toLowerCase() === lowerQuery;
        return isMatch ? (
          <mark
            key={i}
            className="search-highlight"
            style={{
              padding: "1px 2px",
              backgroundColor: "#ffe066",
              color: "#1a1a1a",
              borderRadius: "3px",
              fontWeight: 600,
              boxShadow: "0 0 0 1px rgba(255, 224, 102, 0.5)",
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
};

export default HighlightText;