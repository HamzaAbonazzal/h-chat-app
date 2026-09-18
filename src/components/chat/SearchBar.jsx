import { useState, useEffect, useRef } from "react";
import { Form, Button, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";

const SearchBar = ({
  onSearch,
  onClose,
  resultsCount,
  currentIndex,
  onNavigate,
  loading,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ⭐ بحث فوري مع تأخير (debounce)
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!query.trim() || query.trim().length < 2) {
      onSearch("");
      return;
    }

    timeoutRef.current = setTimeout(() => {
      onSearch(query.trim());
    }, 400);

    return () => clearTimeout(timeoutRef.current);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (resultsCount > 0) onNavigate(1);
    }
  };

  const hasResults = resultsCount > 0;
  const isSearching = query.trim().length >= 2;

  return (
    <div
      className="d-flex align-items-center gap-2 px-3 py-2 border-bottom"
      style={{ backgroundColor: "var(--bs-body-bg)", flexShrink: 0 }}
    >
      <Button
        variant="link"
        className="p-0 text-secondary text-decoration-none"
        onClick={onClose}
        title={t("common.close")}
      >
        <i className="bi bi-arrow-right fs-5"></i>
      </Button>

      <Form.Control
        ref={inputRef}
        type="text"
        size="sm"
        placeholder={t("chat.searchInChat")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="border-0 bg-body-tertiary flex-grow-1"
      />

      {/* ⭐ عدّاد النتائج */}
      {isSearching && !loading && (
        <span
          className="small text-muted flex-shrink-0"
          style={{ minWidth: "60px", textAlign: "center" }}
        >
          {hasResults
            ? `${currentIndex + 1} / ${resultsCount}`
            : t("chat.noResults")}
        </span>
      )}

      {loading && (
        <Spinner animation="border" size="sm" variant="success" />
      )}

      {/* ⭐ أزرار التنقل */}
      {hasResults && !loading && (
        <div className="d-flex gap-1 flex-shrink-0">
          <Button
            variant="link"
            size="sm"
            className="p-1 text-secondary"
            onClick={() => onNavigate(-1)}
            title={t("chat.previous")}
          >
            <i className="bi bi-chevron-up"></i>
          </Button>
          <Button
            variant="link"
            size="sm"
            className="p-1 text-secondary"
            onClick={() => onNavigate(1)}
            title={t("chat.next")}
          >
            <i className="bi bi-chevron-down"></i>
          </Button>
        </div>
      )}

      {/* ⭐ زر مسح */}
      {query && (
        <Button
          variant="link"
          className="p-0 text-secondary"
          onClick={() => setQuery("")}
        >
          <i className="bi bi-x-lg"></i>
        </Button>
      )}
    </div>
  );
};

export default SearchBar;