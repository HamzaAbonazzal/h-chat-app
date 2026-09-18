import { useState, useEffect } from "react";
import { Modal, Spinner, ListGroup, Badge, Alert } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { format, isToday, isYesterday } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { messageService } from "../../services/messageService";
import Avatar from "../common/Avatar";

const MessageInfoModal = ({ show, onHide, message }) => {
  const { t, i18n } = useTranslation();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!show || !message?._id) {
      setInfo(null);
      setError("");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await messageService.getMessageInfo(message._id);
        setInfo(data);
      } catch (err) {
        setError(
          err.response?.data?.message || t("common.error")
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [show, message?._id]);

  if (!message) return null;

  // ⭐ تنسيق التاريخ الكامل
  const formatFullDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const locale = i18n.language === "ar" ? ar : enUS;

    let dayLabel;
    if (isToday(d)) dayLabel = i18n.language === "ar" ? "اليوم" : "Today";
    else if (isYesterday(d))
      dayLabel = i18n.language === "ar" ? "أمس" : "Yesterday";
    else dayLabel = format(d, "dd MMM yyyy", { locale });

    const time = format(d, "HH:mm", { locale });
    return `${dayLabel} - ${time}`;
  };

  // ⭐ معاينة محتوى الرسالة
  const renderPreview = () => {
    if (message.type === "image") return "📷 " + t("chat.sendImage");
    if (message.type === "video") return "🎥 " + t("chat.sendVideo");
    if (message.type === "audio") return "🎤 " + t("chat.recordVoice");
    if (message.type === "file") return "📎 " + t("chat.attachFile");
    return message.content || "";
  };

  // ⭐ وقت التسليم (أول عنصر في deliveredTo — لكن لا يوجد وقت محفوظ)
  // نستخدم createdAt كمرجع تقريبي إذا كان deliveredTo غير فارغ
  const deliveredTime =
    info?.deliveredTo?.length > 0 ? null : null; // لا يوجد وقت محفوظ
  const readTime = null; // نفس الشيء

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-bold">
          <i className="bi bi-info-circle me-2"></i>
          {t("chat.messageInfo")}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto" }}>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="success" />
          </div>
        ) : error ? (
          <Alert variant="danger" className="small">
            {error}
          </Alert>
        ) : info ? (
          <>
            {/* ⭐ معاينة الرسالة */}
            <div
              className="p-3 rounded-3 mb-4"
              style={{
                backgroundColor: "var(--bs-tertiary-bg)",
                borderLeft: "3px solid #008069",
              }}
            >
              <div
                className="small text-muted mb-1"
                style={{ fontSize: "0.72rem" }}
              >
                {t("chat.messagePreview")}
              </div>
              <div
                className="text-truncate-2"
                style={{ fontSize: "0.9rem", wordBreak: "break-word" }}
              >
                {renderPreview()}
              </div>
            </div>

            {/* ⭐ الجدول الزمني */}
            <div className="mb-4">
              {/* الإرسال */}
              <div className="d-flex align-items-start gap-3 mb-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    backgroundColor: "rgba(134, 150, 160, 0.15)",
                  }}
                >
                  <i className="bi bi-check2 text-secondary"></i>
                </div>
                <div className="flex-grow-1">
                  <div className="fw-semibold small">
                    {t("message.sent")}
                  </div>
                  <div className="small text-muted">
                    {formatFullDate(info.message.createdAt)}
                  </div>
                </div>
              </div>

              {/* التسليم */}
              {info.deliveredTo?.length > 0 && (
                <div className="d-flex align-items-start gap-3 mb-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: "36px",
                      height: "36px",
                      backgroundColor: "rgba(134, 150, 160, 0.15)",
                    }}
                  >
                    <i className="bi bi-check2-all text-secondary"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold small">
                      {t("message.delivered")}
                      <Badge
                        bg="secondary"
                        className="ms-2"
                        style={{ fontSize: "0.7rem" }}
                      >
                        {info.deliveredTo.length}
                      </Badge>
                    </div>
                    {!info.groupInfo && (
                      <div className="small text-muted">
                        {info.deliveredTo.map((u) => u.username).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* القراءة */}
              {info.readBy?.length > 0 && (
                <div className="d-flex align-items-start gap-3 mb-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: "36px",
                      height: "36px",
                      backgroundColor: "rgba(83, 189, 235, 0.15)",
                    }}
                  >
                    <i
                      className="bi bi-check2-all"
                      style={{ color: "#53bdeb" }}
                    ></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold small">
                      {t("message.read")}
                      <Badge
                        bg="info"
                        className="ms-2"
                        style={{ fontSize: "0.7rem" }}
                      >
                        {info.readBy.length}
                      </Badge>
                    </div>
                    {!info.groupInfo && (
                      <div className="small text-muted">
                        {info.readBy.map((u) => u.username).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ⭐ في المجموعات: تصنيف الأعضاء */}
            {info.groupInfo?.isGroup && (
              <>
                <hr className="my-3" />

                {/* قرأوا */}
                {info.groupInfo.readBy.length > 0 && (
                  <div className="mb-3">
                    <div className="small fw-semibold mb-2 d-flex align-items-center gap-2">
                      <i
                        className="bi bi-check2-all"
                        style={{ color: "#53bdeb" }}
                      ></i>
                      {t("chat.readBy")}
                      <Badge bg="info" style={{ fontSize: "0.7rem" }}>
                        {info.groupInfo.readBy.length}
                      </Badge>
                    </div>
                    <ListGroup variant="flush" className="border rounded">
                      {info.groupInfo.readBy.map((u) => (
                        <ListGroup.Item
                          key={u._id}
                          className="d-flex align-items-center gap-2 py-2"
                        >
                          <Avatar user={u} size={32} />
                          <span className="small fw-semibold">
                            {u.username}
                          </span>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </div>
                )}

                {/* وصلوا ولم يقرأوا */}
                {info.groupInfo.deliveredNotRead.length > 0 && (
                  <div className="mb-3">
                    <div className="small fw-semibold mb-2 d-flex align-items-center gap-2">
                      <i className="bi bi-check2-all text-secondary"></i>
                      {t("chat.deliveredNotRead")}
                      <Badge bg="secondary" style={{ fontSize: "0.7rem" }}>
                        {info.groupInfo.deliveredNotRead.length}
                      </Badge>
                    </div>
                    <ListGroup variant="flush" className="border rounded">
                      {info.groupInfo.deliveredNotRead.map((u) => (
                        <ListGroup.Item
                          key={u._id}
                          className="d-flex align-items-center gap-2 py-2"
                        >
                          <Avatar user={u} size={32} />
                          <span className="small fw-semibold">
                            {u.username}
                          </span>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </div>
                )}

                {/* في الانتظار */}
                {info.groupInfo.pending.length > 0 && (
                  <div className="mb-3">
                    <div className="small fw-semibold mb-2 d-flex align-items-center gap-2">
                      <i className="bi bi-clock text-muted"></i>
                      {t("chat.pendingMembers")}
                      <Badge bg="light" text="dark" style={{ fontSize: "0.7rem" }}>
                        {info.groupInfo.pending.length}
                      </Badge>
                    </div>
                    <ListGroup variant="flush" className="border rounded">
                      {info.groupInfo.pending.map((u) => (
                        <ListGroup.Item
                          key={u._id}
                          className="d-flex align-items-center gap-2 py-2"
                        >
                          <Avatar user={u} size={32} />
                          <span className="small fw-semibold">
                            {u.username}
                          </span>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </div>
                )}
              </>
            )}
          </>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

export default MessageInfoModal;