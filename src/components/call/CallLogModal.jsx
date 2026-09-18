import { useState, useEffect, useCallback } from "react";
import { Modal, Spinner, Alert, Button, Badge } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { isToday, isYesterday, isSameDay, format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { callService } from "../../services/callService";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../../hooks/useAuth";
import { useCall } from "../../context/CallContext";
import CallLogItem from "./CallLogItem";
import ConfirmModal from "../chat/ConfirmModal";
import EmptyState from "../common/EmptyState";

const CallLogModal = ({ show, onHide }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { on } = useSocket();
  const { startCall, callState } = useCall();

  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all | missed
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // ⭐ تحميل السجل عند الفتح
  useEffect(() => {
    if (!show) {
      setFilter("all");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await callService.getCallLogs(1, 100);
        setCalls(res.data || []);
      } catch (err) {
        console.error("Failed to load call logs:", err);
        setError(err.response?.data?.message || t("common.error"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [show, t]);

  // ⭐ استقبال سجل جديد عبر Socket
  useEffect(() => {
    if (!show) return;

    const offAdded = on("callLogAdded", (newCall) => {
      setCalls((prev) => {
        // تجنب التكرار
        if (prev.some((c) => c._id === newCall._id)) return prev;
        return [newCall, ...prev];
      });
    });

    return () => offAdded?.();
  }, [show, on]);

  // ⭐ فلترة
  const filteredCalls = filter === "missed"
    ? calls.filter((c) => c.status === "missed" || c.status === "rejected")
    : calls;

  // ⭐ تجميع حسب التاريخ
  const groupedCalls = () => {
    const groups = [];
    let currentDate = null;
    let currentGroup = null;

    filteredCalls.forEach((call) => {
      const callDate = new Date(call.createdAt);
      const isNewDay =
        !currentDate || !isSameDay(callDate, currentDate);

      if (isNewDay) {
        if (currentGroup) groups.push(currentGroup);

        let label;
        if (isToday(callDate)) {
          label = i18n.language === "ar" ? "اليوم" : "Today";
        } else if (isYesterday(callDate)) {
          label = i18n.language === "ar" ? "أمس" : "Yesterday";
        } else {
          label = format(callDate, "dd MMMM yyyy", {
            locale: i18n.language === "ar" ? ar : enUS,
          });
        }

        currentGroup = { label, calls: [call] };
        currentDate = callDate;
      } else {
        currentGroup.calls.push(call);
      }
    });

    if (currentGroup) groups.push(currentGroup);
    return groups;
  };

  const groups = groupedCalls();
  const missedCount = calls.filter(
    (c) => c.status === "missed" || c.status === "rejected"
  ).length;

  // ⭐ إعادة الاتصال
  const handleRedial = (otherUser, callType) => {
    if (!otherUser) return;

    // ⭐ لا يمكن إعادة الاتصال إذا كانت هناك مكالمة نشطة
    if (callState !== "idle") {
      return;
    }

    onHide();
    startCall(otherUser._id, otherUser, callType);
  };

  // ⭐ حذف سجل
  const handleDelete = async (callId) => {
    try {
      await callService.deleteCallLog(callId);
      setCalls((prev) => prev.filter((c) => c._id !== callId));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  // ⭐ مسح كل السجل
  const handleClearAll = async () => {
    try {
      await callService.clearCallLogs();
      setCalls([]);
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Failed to clear:", err);
    }
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2">
            <i className="bi bi-telephone"></i>
            {t("call.callHistory")}

            {calls.length > 0 && (
              <Badge
                bg="secondary"
                pill
                style={{ fontSize: "0.7rem" }}
              >
                {calls.length}
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body
          className="p-0"
          style={{ maxHeight: "75vh", overflowY: "auto" }}
        >
          {/* ⭐ التبويبات */}
          {calls.length > 0 && (
            <div
              className="d-flex gap-2 px-3 py-2 border-bottom sticky-top"
              style={{ backgroundColor: "var(--bs-body-bg)", zIndex: 5 }}
            >
              <button
                type="button"
                className={`btn btn-sm ${
                  filter === "all" ? "btn-success" : "btn-outline-secondary"
                }`}
                onClick={() => setFilter("all")}
                style={{ borderRadius: "20px", fontSize: "0.8rem" }}
              >
                {t("chat.allChats")}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${
                  filter === "missed"
                    ? "btn-danger"
                    : "btn-outline-secondary"
                }`}
                onClick={() => setFilter("missed")}
                style={{ borderRadius: "20px", fontSize: "0.8rem" }}
              >
                {t("call.missedCall")}
                {missedCount > 0 && (
                  <span
                    className="badge ms-1"
                    style={{
                      backgroundColor:
                        filter === "missed"
                          ? "rgba(255,255,255,0.3)"
                          : "#dc3545",
                      fontSize: "0.65rem",
                    }}
                  >
                    {missedCount}
                  </span>
                )}
              </button>

              {/* ⭐ مسح الكل */}
              <Button
                variant="outline-danger"
                size="sm"
                className="ms-auto"
                onClick={() => setShowClearConfirm(true)}
                style={{ borderRadius: "20px", fontSize: "0.8rem" }}
              >
                <i className="bi bi-trash me-1"></i>
                {t("call.clearCallLog")}
              </Button>
            </div>
          )}

          {/* ⭐ المحتوى */}
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="success" />
            </div>
          ) : error ? (
            <div className="p-3">
              <Alert variant="danger" className="small mb-0">
                {error}
              </Alert>
            </div>
          ) : filteredCalls.length === 0 ? (
            <EmptyState
              icon="bi-telephone"
              title={
                filter === "missed"
                  ? t("call.noMissedCalls", "لا مكالمات فائتة")
                  : t("call.noCalls")
              }
              description={
                filter === "missed"
                  ? ""
                  : t("call.noCallsDesc")
              }
            />
          ) : (
            <div className="px-2 py-2">
              {groups.map((group) => (
                <div key={group.label} className="mb-3">
                  {/* ⭐ عنوان اليوم */}
                  <div className="text-center my-2">
                    <span
                      className="badge bg-body-secondary text-body-secondary rounded-pill px-3 py-1"
                      style={{ fontSize: "0.7rem" }}
                    >
                      {group.label}
                    </span>
                  </div>

                  {/* ⭐ المكالمات */}
                  <div className="d-flex flex-column gap-1">
                    {group.calls.map((call) => (
                      <CallLogItem
                        key={call._id}
                        call={call}
                        currentUserId={user._id}
                        onRedial={handleRedial}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* ⭐ تأكيد مسح الكل */}
      <ConfirmModal
        show={showClearConfirm}
        onHide={() => setShowClearConfirm(false)}
        onConfirm={handleClearAll}
        title={t("call.clearCallLog")}
        message={t("call.clearCallLogConfirm")}
        confirmText={t("common.delete")}
        confirmVariant="danger"
        icon="bi-trash"
      />
    </>
  );
};

export default CallLogModal;