import { useTranslation } from "react-i18next";
import { Dropdown } from "react-bootstrap";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import Avatar from "../common/Avatar";

const CallLogItem = ({ call, currentUserId, onRedial, onDelete }) => {
  const { t, i18n } = useTranslation();

  const isOutgoing = call.direction === "outgoing";
  const otherUser = isOutgoing ? call.receiver : call.caller;
  const isMissed =
    call.status === "missed" || call.status === "rejected";

  // ⭐ تنسيق المدة
  const formatDuration = (seconds) => {
    if (!seconds || seconds < 1) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  // ⭐ تنسيق التاريخ
  const getDateLabel = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const locale = i18n.language === "ar" ? ar : enUS;

    if (isToday(d)) {
      return format(d, "HH:mm", { locale });
    }
    if (isYesterday(d)) {
      return i18n.language === "ar" ? "أمس" : "Yesterday";
    }
    return format(d, "dd/MM/yyyy", { locale });
  };

  // ⭐ أيقونة الاتجاه
  const getDirectionIcon = () => {
    if (call.status === "missed") {
      return {
        icon: "bi-telephone-x-fill",
        color: "#dc3545",
      };
    }
    if (call.status === "rejected") {
      return {
        icon: "bi-telephone-x",
        color: "#dc3545",
      };
    }
    if (isOutgoing) {
      return {
        icon: "bi-telephone-outbound-fill",
        color: "#25d366",
      };
    }
    return {
      icon: "bi-telephone-inbound-fill",
      color: "#0d6efd",
    };
  };

  const directionIcon = getDirectionIcon();

  // ⭐ نوع المكالمة
  const callTypeIcon = call.callType === "video" ? "bi-camera-video-fill" : "bi-telephone-fill";

  return (
    <div
      className="d-flex align-items-center gap-3 p-3 rounded-3 call-log-item"
      style={{
        backgroundColor: "var(--bs-body-bg)",
        transition: "background-color 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = "var(--bs-tertiary-bg)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = "var(--bs-body-bg)")
      }
    >
      {/* ⭐ الصورة الرمزية */}
      <div onClick={() => onRedial?.(otherUser, call.callType)}>
        <Avatar user={otherUser} size={48} />
      </div>

      {/* ⭐ البيانات */}
      <div
        className="flex-grow-1 min-w-0"
        onClick={() => onRedial?.(otherUser, call.callType)}
      >
        <div
          className="fw-semibold text-truncate"
          style={{
            fontSize: "0.95rem",
            color: isMissed ? "#dc3545" : "var(--bs-body-color)",
          }}
        >
          {otherUser?.username || "Unknown"}
        </div>

        <div
          className="d-flex align-items-center gap-1 small text-muted"
          style={{ fontSize: "0.75rem" }}
        >
          {/* ⭐ أيقونة الاتجاه */}
          <i
            className={`bi ${directionIcon.icon}`}
            style={{ color: directionIcon.color, fontSize: "0.75rem" }}
          ></i>

          {/* ⭐ نوع المكالمة */}
          <i className={`bi ${callTypeIcon}`} style={{ fontSize: "0.7rem" }}></i>

          {/* ⭐ النص */}
          <span>
            {call.status === "missed"
              ? t("call.missedCall")
              : call.status === "rejected"
              ? t("call.rejectedCall")
              : isOutgoing
              ? t("call.outgoing")
              : t("call.incoming")}
          </span>

          {/* ⭐ المدة */}
          {call.duration > 0 && (
            <span className="text-muted">· {formatDuration(call.duration)}</span>
          )}

          {/* ⭐ التاريخ */}
          <span className="ms-auto text-muted">
            {getDateLabel(call.createdAt)}
          </span>
        </div>
      </div>

      {/* ⭐ زر إعادة الاتصال */}
      <button
        type="button"
        className="call-log-action"
        onClick={(e) => {
          e.stopPropagation();
          onRedial?.(otherUser, call.callType);
        }}
        title={t("call.callback")}
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          border: "none",
          backgroundColor: "transparent",
          color: "#008069",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "1rem",
          transition: "background-color 0.15s",
        }}
      >
        <i
          className={`bi ${
            call.callType === "video"
              ? "bi-camera-video-fill"
              : "bi-telephone-fill"
          }`}
        ></i>
      </button>

      {/* ⭐ قائمة الخيارات */}
      <Dropdown align="end">
        <Dropdown.Toggle
          as="button"
          bsPrefix="btn btn-link p-1 text-secondary call-log-action"
          style={{ border: "none" }}
        >
          <i className="bi bi-three-dots-vertical"></i>
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item
            className="text-danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(call._id);
            }}
          >
            <i className="bi bi-trash me-2"></i>
            {t("call.deleteCallLog")}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default CallLogItem;