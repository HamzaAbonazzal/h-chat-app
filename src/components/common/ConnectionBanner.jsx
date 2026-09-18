import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSocket } from "../../hooks/useSocket";

const ConnectionBanner = () => {
  const { t } = useTranslation();
  const { isConnected } = useSocket();
  const [showReconnected, setShowReconnected] = useState(false);
  const wasDisconnectedRef = useRef(false);

  useEffect(() => {
    if (!isConnected) {
      // ⭐ انقطع الاتصال
      wasDisconnectedRef.current = true;
      setShowReconnected(false);
    } else if (wasDisconnectedRef.current) {
      // ⭐ عاد الاتصال بعد انقطاع
      setShowReconnected(true);
      wasDisconnectedRef.current = false;

      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  // ⭐ لا شيء (متصلاً بشكل طبيعي)
  if (isConnected && !showReconnected) return null;

  // ⭐ تم إعادة الاتصال
  if (isConnected && showReconnected) {
    return (
      <div
        className="connection-banner"
        style={{
          backgroundColor: "#25d366",
          color: "#fff",
          padding: "6px 16px",
          fontSize: "0.8rem",
          fontWeight: 500,
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          animation: "bannerSlideDown 0.3s ease-out",
          zIndex: 100,
        }}
      >
        <i className="bi bi-check-circle-fill"></i>
        {t("connection.restored", "تم استعادة الاتصال")}
      </div>
    );
  }

  // ⭐ انقطع الاتصال
  return (
    <div
      className="connection-banner"
      style={{
        backgroundColor: "#dc3545",
        color: "#fff",
        padding: "6px 16px",
        fontSize: "0.8rem",
        fontWeight: 500,
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        animation: "bannerSlideDown 0.3s ease-out",
        zIndex: 100,
      }}
    >
      <span
        className="spinner-border spinner-border-sm"
        style={{ width: "12px", height: "12px", borderWidth: "2px" }}
      ></span>
      {t("connection.lost", "غير متصل — جارٍ إعادة المحاولة...")}
    </div>
  );
};

export default ConnectionBanner;