import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import Avatar from "../common/Avatar";

const CallModal = ({
  callState,
  currentCall,
  isMuted,
  isVideoOff,
  isSpeakerOn,
  callDuration,
  callError,
  videoFallback,
  isScreenSharing,
  facingMode,
  iceType,
  onAccept,
  onReject,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onSwitchCamera,
  onToggleScreenShare,
  remoteStream,
  localStream,
}) => {
  const { t } = useTranslation();
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const localVideoRef = useRef(null);
  const containerRef = useRef(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiPSwapped, setIsPiPSwapped] = useState(false);
  const [remoteVideoOff, setRemoteVideoOff] = useState(false);

  // ⭐ تشغيل الصوت البعيد
  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.play().catch((err) => {
        console.warn("Audio autoplay prevented:", err);
      });
    }
  }, [remoteStream]);

  // ⭐ مراقبة الفيديو البعيد
  useEffect(() => {
    if (!remoteStream) {
      setRemoteVideoOff(false);
      return;
    }

    const videoTracks = remoteStream.getVideoTracks();
    if (videoTracks.length === 0) {
      setRemoteVideoOff(true);
      return;
    }

    const track = videoTracks[0];
    setRemoteVideoOff(!track.enabled);

    const handleMute = () => setRemoteVideoOff(true);
    const handleUnmute = () => setRemoteVideoOff(false);

    track.addEventListener("mute", handleMute);
    track.addEventListener("unmute", handleUnmute);

    return () => {
      track.removeEventListener("mute", handleMute);
      track.removeEventListener("unmute", handleUnmute);
    };
  }, [remoteStream]);

  // ⭐ إظهار الفيديو البعيد
  useEffect(() => {
    if (
      videoRef.current &&
      remoteStream &&
      currentCall?.callType === "video" &&
      !isPiPSwapped
    ) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch((err) => {
        console.warn("Video autoplay prevented:", err);
      });
    }
  }, [remoteStream, currentCall?.callType, isPiPSwapped]);

  // ⭐ إظهار الفيديو المحلي
  useEffect(() => {
    const targetRef = isPiPSwapped ? videoRef : localVideoRef;
    if (
      targetRef.current &&
      localStream &&
      currentCall?.callType === "video"
    ) {
      targetRef.current.srcObject = localStream;
    }
  }, [localStream, currentCall?.callType, isPiPSwapped]);

  // ⭐ مراقبة Fullscreen API
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (!currentCall || callState === "idle") return null;

  const peer = currentCall.peerUser;
  const isIncoming = currentCall.isIncoming;
  const isRinging = callState === "ringing";
  const isCalling = callState === "calling";
  const isConnecting = callState === "connecting";
  const isActive = callState === "active";
  const isEnded = callState === "ended";
  const isVideo = currentCall.callType === "video";

  // ⭐ Fullscreen toggle
  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  // ⭐ تنسيق الوقت
  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  // ⭐ نص الحالة
  const getStatusText = () => {
    if (callError) {
      if (callError === "MEDIA_ACCESS_DENIED") {
        return t("call.errors.mediaAccess");
      }
      return callError;
    }
    if (isRinging) return t("call.incomingCall");
    if (isCalling) return t("call.calling");
    if (isConnecting) return t("call.connecting");
    if (isActive) return formatDuration(callDuration);
    if (isEnded) return t("call.ended");
    return "";
  };

  // ⭐ مؤشر نوع الاتصال
  const renderIceIndicator = () => {
    if (!isActive || !iceType) return null;

    return (
      <div
        style={{
          fontSize: "0.7rem",
          color: "rgba(255, 255, 255, 0.5)",
          marginTop: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
        }}
      >
        <i
          className={`bi ${
            iceType === "turn"
              ? "bi-shield-lock-fill"
              : "bi-lightning-charge-fill"
          }`}
        ></i>
        {iceType === "turn"
          ? t("call.turnRelay", "TURN Relay")
          : t("call.directConnection", "Direct")}
      </div>
    );
  };

  return createPortal(
    <div
      ref={containerRef}
      className="call-modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99998,
        backgroundColor: "rgba(17, 27, 33, 0.98)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        animation: "lightboxFadeIn 0.2s ease-out",
        overflow: "hidden",
      }}
    >
      <audio ref={audioRef} autoPlay playsInline />

      {/* ⭐ الفيديو البعيد */}
      {isVideo && remoteStream && !isPiPSwapped && (
        <>
          {!remoteVideoOff ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 1,
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Avatar user={peer} size={140} />
              <div
                style={{
                  marginTop: "20px",
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: "1rem",
                }}
              >
                <i className="bi bi-camera-video-off me-2"></i>
                {t("call.cameraOff")}
              </div>
            </div>
          )}
        </>
      )}

      {/* ⭐ الفيديو المحلي (PiP) */}
      {isVideo && localStream && !isPiPSwapped && (
        <div
          onClick={() => setIsPiPSwapped((prev) => !prev)}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "140px",
            height: "190px",
            borderRadius: "12px",
            overflow: "hidden",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
            zIndex: 20,
            backgroundColor: "#000",
            cursor: "pointer",
            transition: "transform 0.2s",
          }}
          title={t("call.tapToSwap")}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: facingMode === "user" ? "scaleX(-1)" : "none",
              opacity: isVideoOff ? 0.3 : 1,
            }}
          />

          {isVideoOff && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                color: "#fff",
              }}
            >
              <i
                className="bi bi-camera-video-off"
                style={{ fontSize: "2rem" }}
              ></i>
            </div>
          )}

          {isScreenSharing && (
            <div
              style={{
                position: "absolute",
                top: "6px",
                left: "6px",
                padding: "2px 8px",
                borderRadius: "6px",
                backgroundColor: "rgba(0, 128, 105, 0.9)",
                fontSize: "0.65rem",
                fontWeight: 600,
              }}
            >
              <i className="bi bi-display me-1"></i>
              {t("call.screen")}
            </div>
          )}

          {isMuted && (
            <div
              style={{
                position: "absolute",
                bottom: "6px",
                left: "6px",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "rgba(220, 53, 69, 0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
              }}
            >
              <i className="bi bi-mic-mute-fill"></i>
            </div>
          )}
        </div>
      )}

      {/* ⭐ الفيديو البعيد (مبادل) */}
      {isVideo && remoteStream && isPiPSwapped && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1,
          }}
        />
      )}

      {/* ⭐ المحتوى الرئيسي */}
      {!(isVideo && remoteStream && !isPiPSwapped) && (
        <div
          className="d-flex flex-column align-items-center justify-content-center"
          style={{ zIndex: 10 }}
        >
          <div style={{ position: "relative", marginBottom: "24px" }}>
            <Avatar user={peer} size={140} />

            {(isRinging || isCalling) && (
              <>
                <div
                  style={{
                    position: "absolute",
                    inset: "-10px",
                    borderRadius: "50%",
                    border: "3px solid rgba(0, 128, 105, 0.5)",
                    animation: "callPulse 1.5s ease-out infinite",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: "-10px",
                    borderRadius: "50%",
                    border: "3px solid rgba(0, 128, 105, 0.4)",
                    animation: "callPulse 1.5s ease-out infinite",
                    animationDelay: "0.5s",
                  }}
                />
              </>
            )}
          </div>

          <h3
            style={{
              marginBottom: "8px",
              fontWeight: 600,
              fontSize: "1.5rem",
            }}
          >
            {peer?.username || "Unknown"}
          </h3>

          <p
            style={{
              color: callError ? "#ff6b6b" : "rgba(255, 255, 255, 0.7)",
              fontSize: "1rem",
              marginBottom: "4px",
              fontWeight: callError ? 600 : 400,
              maxWidth: "80%",
              textAlign: "center",
            }}
          >
            {getStatusText()}
          </p>

          <div
            style={{
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "0.85rem",
            }}
          >
            <i
              className={`bi ${
                isVideo ? "bi-camera-video" : "bi-telephone"
              } me-1`}
            ></i>
            {isVideo ? t("call.videoCall") : t("call.voiceCall")}
          </div>

          {/* ⭐ مؤشر نوع الاتصال */}
          {renderIceIndicator()}

          {videoFallback && (
            <div
              style={{
                marginTop: "16px",
                padding: "8px 16px",
                borderRadius: "8px",
                backgroundColor: "rgba(255, 193, 7, 0.2)",
                border: "1px solid rgba(255, 193, 7, 0.5)",
                color: "#ffc107",
                fontSize: "0.8rem",
                maxWidth: "80%",
                textAlign: "center",
              }}
            >
              <i className="bi bi-exclamation-triangle me-1"></i>
              {t("call.videoFallback")}
            </div>
          )}
        </div>
      )}

      {/* ⭐ شريط الحالة العلوي */}
      {isVideo && remoteStream && !isPiPSwapped && (
        <div
          className="position-absolute d-flex flex-column align-items-start"
          style={{
            top: "20px",
            left: "20px",
            zIndex: 20,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            padding: "10px 16px",
            borderRadius: "12px",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            className="d-flex align-items-center gap-2"
            style={{ fontWeight: 600, fontSize: "1rem" }}
          >
            <i
              className={`bi ${
                isVideo ? "bi-camera-video" : "bi-telephone"
              }`}
            ></i>
            {peer?.username || "Unknown"}
          </div>
          <div
            style={{
              color: callError ? "#ff6b6b" : "rgba(255, 255, 255, 0.7)",
              fontSize: "0.85rem",
            }}
          >
            {getStatusText()}
          </div>

          {iceType && isActive && (
            <div
              style={{
                fontSize: "0.65rem",
                color: "rgba(255, 255, 255, 0.5)",
                marginTop: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <i
                className={`bi ${
                  iceType === "turn"
                    ? "bi-shield-lock-fill"
                    : "bi-lightning-charge-fill"
                }`}
              ></i>
              {iceType === "turn"
                ? t("call.turnRelay", "TURN Relay")
                : t("call.directConnection", "Direct")}
            </div>
          )}

          {videoFallback && (
            <div
              style={{
                marginTop: "6px",
                fontSize: "0.7rem",
                color: "#ffc107",
              }}
            >
              <i className="bi bi-exclamation-triangle me-1"></i>
              {t("call.videoFallback")}
            </div>
          )}
        </div>
      )}

      {/* ⭐ زر Fullscreen */}
      <button
        type="button"
        onClick={handleToggleFullscreen}
        title={t("call.fullscreen")}
        style={{
          position: "absolute",
          top: "20px",
          right: "180px",
          zIndex: 25,
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          border: "none",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "1rem",
        }}
      >
        <i
          className={`bi ${
            isFullscreen ? "bi-fullscreen-exit" : "bi-arrows-fullscreen"
          }`}
        ></i>
      </button>

      {/* ⭐ أزرار التحكم */}
      <div
        className="position-absolute d-flex align-items-center justify-content-center gap-3 flex-wrap"
        style={{
          bottom: "60px",
          left: 0,
          right: 0,
          zIndex: 30,
          padding: "0 20px",
        }}
      >
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

            {isVideo && !isScreenSharing && (
              <CallButton
                icon="bi-arrow-repeat"
                color="rgba(255, 255, 255, 0.15)"
                onClick={onSwitchCamera}
                title={t("call.switchCamera")}
              />
            )}

            {isVideo && (
              <CallButton
                icon={isScreenSharing ? "bi-display-fill" : "bi-display"}
                color={
                  isScreenSharing ? "#008069" : "rgba(255, 255, 255, 0.15)"
                }
                onClick={onToggleScreenShare}
                title={
                  isScreenSharing
                    ? t("call.stopShare")
                    : t("call.shareScreen")
                }
              />
            )}

            <CallButton
              icon="bi-telephone-x-fill"
              color="#dc3545"
              onClick={onEndCall}
              title={t("call.hangUp")}
              large
            />

            <CallButton
              icon={
                isSpeakerOn ? "bi-volume-up-fill" : "bi-volume-mute-fill"
              }
              color={isSpeakerOn ? "#008069" : "rgba(255, 255, 255, 0.15)"}
              onClick={onToggleSpeaker}
              title={t("call.speaker")}
            />
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
  const size = large ? 68 : 56;
  const iconSize = large ? "1.8rem" : "1.4rem";

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
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "scale(0.95)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1.08)";
      }}
    >
      <i className={`bi ${icon}`}></i>
    </button>
  );
};

export default CallModal;