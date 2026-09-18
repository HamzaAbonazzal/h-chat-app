import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";

const ImageLightbox = ({ images, initialIndex = 0, onClose }) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [zoomed, setZoomed] = useState(false);

  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;

  // ⭐ إعادة التصفير عند تغيير الصورة
  useEffect(() => {
    setLoading(true);
    setZoomed(false);
  }, [currentIndex]);

  // ⭐ إغلاق عند ESC
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight" && hasMultiple) handleNext();
      if (e.key === "ArrowLeft" && hasMultiple) handlePrev();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [currentIndex, hasMultiple]);

  // ⭐ منع التمرير على body
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleDownload = () => {
    if (!currentImage) return;
    const link = document.createElement("a");
    link.href = currentImage;
    link.download = `image-${Date.now()}.jpg`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return createPortal(
    <div
      className="image-lightbox"
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(0, 0, 0, 0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "lightboxFadeIn 0.2s ease-out",
      }}
    >
      {/* ⭐ زر الإغلاق */}
      <Button
        variant="link"
        className="position-absolute text-white"
        style={{
          top: "16px",
          right: "16px",
          zIndex: 10,
          padding: "8px",
        }}
        onClick={onClose}
        title={t("common.close")}
      >
        <i className="bi bi-x-lg fs-3"></i>
      </Button>

      {/* ⭐ زر التنزيل */}
      <Button
        variant="link"
        className="position-absolute text-white"
        style={{
          top: "16px",
          right: "60px",
          zIndex: 10,
          padding: "8px",
        }}
        onClick={handleDownload}
        title="Download"
      >
        <i className="bi bi-download fs-4"></i>
      </Button>

      {/* ⭐ العدّاد */}
      {hasMultiple && (
        <div
          className="position-absolute text-white small px-3 py-1 rounded-pill"
          style={{
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(10px)",
          }}
        >
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* ⭐ زر السابق */}
      {hasMultiple && (
        <Button
          variant="link"
          className="position-absolute text-white"
          style={{
            left: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            padding: "12px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "50%",
            width: "48px",
            height: "48px",
          }}
          onClick={handlePrev}
          title="Previous"
        >
          <i className="bi bi-chevron-left fs-4"></i>
        </Button>
      )}

      {/* ⭐ زر التالي */}
      {hasMultiple && (
        <Button
          variant="link"
          className="position-absolute text-white"
          style={{
            right: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            padding: "12px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "50%",
            width: "48px",
            height: "48px",
          }}
          onClick={handleNext}
          title="Next"
        >
          <i className="bi bi-chevron-right fs-4"></i>
        </Button>
      )}

      {/* ⭐ الصورة */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {loading && (
          <div style={{ position: "absolute" }}>
            <Spinner animation="border" variant="light" />
          </div>
        )}

        <img
          src={currentImage}
          alt=""
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          onClick={() => setZoomed((z) => !z)}
          style={{
            maxWidth: "90vw",
            maxHeight: "90vh",
            objectFit: "contain",
            opacity: loading ? 0 : 1,
            transition: "opacity 0.3s ease, transform 0.3s ease",
            cursor: zoomed ? "zoom-out" : "zoom-in",
            transform: zoomed ? "scale(1.5)" : "scale(1)",
            borderRadius: "4px",
            boxShadow: "0 8px 40px rgba(0, 0, 0, 0.5)",
          }}
        />
      </div>
    </div>,
    document.body
  );
};

export default ImageLightbox;