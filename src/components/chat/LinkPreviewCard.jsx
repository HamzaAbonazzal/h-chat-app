import { useState } from "react";
import { Button } from "react-bootstrap";

const LinkPreviewCard = ({
  preview,
  onRemove,
  isCompact = false,
  clickable = true,
}) => {
  const [imageError, setImageError] = useState(false);

  if (!preview || !preview.url) return null;

  const handleClick = () => {
    if (clickable && preview.url) {
      window.open(preview.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className="link-preview-card"
      style={{
        borderLeft: "3px solid #008069",
        backgroundColor: "var(--bs-body-bg)",
        borderRadius: "8px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        cursor: clickable ? "pointer" : "default",
        position: "relative",
        maxWidth: isCompact ? "100%" : "400px",
      }}
      onClick={handleClick}
    >
      {/* ⭐ الصورة */}
      {preview.image && !imageError && (
        <div
          style={{
            width: "100%",
            maxHeight: isCompact ? "140px" : "200px",
            overflow: "hidden",
            backgroundColor: "var(--bs-tertiary-bg)",
          }}
        >
          <img
            src={preview.image}
            alt=""
            onError={() => setImageError(true)}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              maxHeight: isCompact ? "140px" : "200px",
              objectFit: "cover",
            }}
          />
        </div>
      )}

      {/* ⭐ المحتوى */}
      <div style={{ padding: "10px 12px" }}>
        <div
          className="small text-muted text-truncate"
          style={{ fontSize: "0.7rem", marginBottom: "2px" }}
        >
          <i className="bi bi-globe me-1"></i>
          {preview.siteName || new URL(preview.url).hostname}
        </div>
        {preview.title && (
          <div
            className="fw-semibold text-truncate-2"
            style={{
              fontSize: "0.85rem",
              marginBottom: "4px",
              lineHeight: 1.3,
            }}
          >
            {preview.title}
          </div>
        )}
        {preview.description && (
          <div
            className="text-muted text-truncate-2"
            style={{ fontSize: "0.75rem", lineHeight: 1.3 }}
          >
            {preview.description}
          </div>
        )}
      </div>

      {/* ⭐ زر الإزالة */}
      {onRemove && (
        <Button
          variant="dark"
          size="sm"
          className="position-absolute rounded-circle p-0 d-flex align-items-center justify-content-center"
          style={{
            top: "8px",
            right: "8px",
            width: "26px",
            height: "26px",
            opacity: 0.8,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="إزالة المعاينة"
        >
          <i className="bi bi-x-lg" style={{ fontSize: "0.7rem" }}></i>
        </Button>
      )}
    </div>
  );
};

export default LinkPreviewCard;