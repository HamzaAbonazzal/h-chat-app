import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import Avatar from "../common/Avatar";

// ⭐ خلية فيديو لمشارك
const ParticipantTile = ({ user, stream, isLocal, isMuted, isVideoOff }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (isLocal) {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }
    } else {
      if (audioRef.current && stream) {
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(() => {});
      }
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [stream, isLocal]);

  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "#1a1a1a",
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        aspectRatio: "1 / 1",
        minHeight: "150px",
      }}
    >
      {/* ⭐ الفيديو */}
      {!isVideoOff && stream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: isLocal ? "scaleX(-1)" : "none",
            }}
          />
          {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
        </>
      ) : (
        // ⭐ Avatar عند إيقاف الفيديو
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
          }}
        >
          <Avatar user={user} size={80} />
          <div
            style={{
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "0.8rem",
            }}
          >
            <i className="bi bi-camera-video-off"></i>
          </div>
        </div>
      )}

      {/* ⭐ شريط الاسم + المايك */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "8px 12px",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            color: "#fff",
            fontSize: "0.8rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {user?.username || "Unknown"}
          {isLocal && (
            <span
              style={{
                fontSize: "0.65rem",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              (أنت)
            </span>
          )}
        </div>

        {isMuted && (
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              backgroundColor: "rgba(220, 53, 69, 0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.65rem",
              color: "#fff",
            }}
          >
            <i className="bi bi-mic-mute-fill"></i>
          </div>
        )}
      </div>
    </div>
  );
};

// ⭐ Modal الرئيسي
const GroupCallModal = ({
  callState,
  currentGroupCall,
  participants,
  localStream,
  remoteStreams,
  isMuted,
  isVideoOff,
  callDuration,
  callError,
  onAccept,
  onReject,
  onEndCall,
  onLeaveCall,
  onToggleMute,
  onToggleVideo,
  currentUserId,
}) => {
  const { t } = useTranslation();

  if (!currentGroupCall || callState === "idle") return null;

  const isIncoming = currentGroupCall.isIncoming;
  const isRinging = callState === "ringing";
  const isCalling = callState === "calling";
  const isConnecting = callState === "connecting";
  const isActive = callState === "active";
  const isEnded = callState === "ended";
  const isVideo = currentGroupCall.callType === "video";

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  // ⭐ عدد الأعمدة حسب عدد المشاركين
  const getGridCols = () => {
    const count = Math.max(participants.length, 1);
    if (count === 1) return 1;
    if (count === 2) return 2;
    return 2; // 3-4 مشاركين → شبكة 2x2
  };

  // ⭐ حساب ارتفاع كل خلية
  const getTileHeight = () => {
    const count = participants.length;
    if (count === 1) return "60vh";
    if (count === 2) return "45vh";
    if (count === 3) return "32vh";
    return "28vh"; // 4
  };

  return createPortal(
    <div
      className="group-call-modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99998,
        backgroundColor: "rgba(17, 27, 33, 0.98)",
        display: "flex",
        flexDirection: "column",
        color: "#fff",
        animation: "lightboxFadeIn 0.2s ease-out",
        overflow: "hidden",
      }}
    >
      {/* ⭐ رأس المكالمة */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Avatar
            user={{
              username: currentGroupCall.conversationName,
              avatar: currentGroupCall.conversationAvatar,
            }}
            size={40}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
              {currentGroupCall.conversationName}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "rgba(255, 255, 255, 0.6)",
              }}
            >
              {isRinging && t("call.incomingCall")}
              {isCalling && t("call.calling")}
              {isConnecting && t("call.connecting")}
              {isActive &&
                `${formatDuration(callDuration)} · ${participants.length} مشارك`}
              {isEnded && t("call.ended")}
            </div>
          </div>
        </div>

        {isVideo && (
          <div
            style={{
              fontSize: "0.75rem",
              padding: "4px 10px",
              borderRadius: "12px",
              backgroundColor: "rgba(0, 128, 105, 0.9)",
            }}
          >
            <i className="bi bi-camera-video-fill me-1"></i>
            {t("call.videoCall")}
          </div>
        )}
      </div>

      {/* ⭐ رسالة الخطأ */}
      {callError && (
        <div
          style={{
            margin: "10px 20px",
            padding: "10px 16px",
            borderRadius: "8px",
            backgroundColor: "rgba(220, 53, 69, 0.15)",
            border: "1px solid rgba(220, 53, 69, 0.4)",
            color: "#ff6b6b",
            fontSize: "0.85rem",
            textAlign: "center",
          }}
        >
          <i className="bi bi-exclamation-triangle me-2"></i>
          {callError}
        </div>
      )}

      {/* ⭐ منطقة المشاركين */}
      <div
        style={{
          flex: 1,
          padding: "16px",
          overflowY: "auto",
        }}
      >
        {/* ⭐ إذا كان Ringing (مكالمة واردة) */}
        {isRinging && isIncoming ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: "20px",
            }}
          >
            <div style={{ position: "relative" }}>
              <Avatar
                user={{
                  username: currentGroupCall.conversationName,
                  avatar: currentGroupCall.conversationAvatar,
                }}
                size={140}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "-10px",
                  borderRadius: "50%",
                  border: "3px solid rgba(0, 128, 105, 0.5)",
                  animation: "callPulse 1.5s ease-out infinite",
                }}
              />
            </div>

            <div style={{ textAlign: "center" }}>
              <h3 style={{ marginBottom: "8px" }}>
                {currentGroupCall.conversationName}
              </h3>
              <p
                style={{
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: "0.9rem",
                }}
              >
                <i className="bi bi-person-fill me-1"></i>
                {currentGroupCall.initiator?.username} بدأ مكالمة جماعية
              </p>
              <p
                style={{
                  color: "rgba(255, 255, 255, 0.5)",
                  fontSize: "0.85rem",
                  marginTop: "8px",
                }}
              >
                <i
                  className={`bi ${
                    isVideo ? "bi-camera-video" : "bi-telephone"
                  } me-1`}
                ></i>
                {isVideo ? t("call.videoCall") : t("call.voiceCall")}
              </p>
            </div>
          </div>
        ) : (
          // ⭐ شبكة المشاركين
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${getGridCols()}, 1fr)`,
              gap: "12px",
            }}
          >
            {participants.map((participant) => {
              const isLocal = participant._id === currentUserId;
              const stream = isLocal
                ? localStream
                : remoteStreams[participant._id];

              // ⭐ حالة الفيديو والكتم لكل مشارك
              // (محلياً نعرف حالتنا، وللآخرين نفترض أنهم مفعّلون)
              const tileMuted = isLocal ? isMuted : false;
              const tileVideoOff = isLocal
                ? isVideoOff || !stream
                : !stream;

              return (
                <div
                  key={participant._id}
                  style={{ height: getTileHeight() }}
                >
                  <ParticipantTile
                    user={participant}
                    stream={stream}
                    isLocal={isLocal}
                    isMuted={tileMuted}
                    isVideoOff={tileVideoOff}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ⭐ أزرار التحكم */}
      <div
        style={{
          padding: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* مكالمة واردة */}
        {isRinging && isIncoming && (
          <>
            <CallButton
              icon="bi-telephone-x-fill"
              color="#dc3545"
              onClick={onReject}
              title={t("call.reject")}
              large
            />
            <CallButton
              icon="bi-telephone-fill"
              color="#25d366"
              onClick={onAccept}
              title={t("call.accept")}
              large
              pulse
            />
          </>
        )}

        {/* مكالمة جارية */}
        {(isCalling ||
          isConnecting ||
          isActive ||
          (isRinging && !isIncoming)) && (
          <>
            <CallButton
              icon={isMuted ? "bi-mic-mute-fill" : "bi-mic-fill"}
              color={isMuted ? "#dc3545" : "rgba(255, 255, 255, 0.15)"}
              onClick={onToggleMute}
              title={isMuted ? t("call.unmute") : t("call.mute")}
            />

            {isVideo && (
              <CallButton
                icon={
                  isVideoOff
                    ? "bi-camera-video-off-fill"
                    : "bi-camera-video-fill"
                }
                color={
                  isVideoOff ? "#dc3545" : "rgba(255, 255, 255, 0.15)"
                }
                onClick={onToggleVideo}
                title={
                  isVideoOff ? t("call.cameraOn") : t("call.cameraOff")
                }
              />
            )}

            {/* زر مغادرة (للمشاركين غير المنشئ) */}
            {isActive && currentGroupCall.initiator?._id !== currentUserId ? (
              <CallButton
                icon="bi-box-arrow-right"
                color="#dc3545"
                onClick={onLeaveCall}
                title={t("call.leave", "مغادرة")}
                large
              />
            ) : (
              <CallButton
                icon="bi-telephone-x-fill"
                color="#dc3545"
                onClick={onEndCall}
                title={t("call.hangUp")}
                large
              />
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes callPulse {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }

        @keyframes callBtnPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(37, 211, 102, 0);
          }
        }

        .call-btn-pulse {
          animation: callBtnPulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>,
    document.body
  );
};

// ⭐ زر مكالمة
const CallButton = ({ icon, color, onClick, title, large, pulse }) => {
  const size = large ? 64 : 52;
  const iconSize = large ? "1.6rem" : "1.3rem";

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={pulse ? "call-btn-pulse" : ""}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        border: "none",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "transform 0.15s, background-color 0.15s",
        fontSize: iconSize,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <i className={`bi ${icon}`}></i>
    </button>
  );
};

export default GroupCallModal;