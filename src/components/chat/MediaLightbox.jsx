import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { formatMessageTime } from "../../utils/formatters";
import Avatar from "../common/Avatar";

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.3;
const SKIP_SECONDS = 10;

const MediaLightbox = ({ media, initialIndex = 0, onClose, senderInfo = null }) => {
  const { t, i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  const [videoMuted, setVideoMuted] = useState(false);
  const [videoSpeed, setVideoSpeed] = useState(1);
  const [videoBuffered, setVideoBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // ⭐ Image transforms
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const current = media[currentIndex];
  const hasMultiple = media.length > 1;
  const isVideo = current?.type === "video";
  const isImage = current?.type === "image";
  const isZoomed = zoom > 1;

  // ⭐ إعادة التصفير عند التغيير
  useEffect(() => {
    setLoading(true);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setVideoPlaying(false);
    setVideoProgress(0);
    setVideoCurrentTime(0);
    setVideoBuffered(0);
  }, [currentIndex]);

  // ⭐ مراقبة fullscreen
  useEffect(() => {
    const handler = () => {
      setIsVideoFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ⭐ إخفاء عناصر التحكم تلقائياً
  useEffect(() => {
    clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);

    if (videoPlaying && !showThumbnails) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => clearTimeout(controlsTimeoutRef.current);
  }, [videoPlaying, currentIndex, showThumbnails]);

  const handleContainerMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    if (videoPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // ⭐ التنقل
  const handleNext = useCallback(() => {
    if (!hasMultiple) return;
    setCurrentIndex((prev) => (prev + 1) % media.length);
  }, [media.length, hasMultiple]);

  const handlePrev = useCallback(() => {
    if (!hasMultiple) return;
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  }, [media.length, hasMultiple]);

  // ⭐ الفيديو
  const togglePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setVideoMuted(v.muted);
  };

  const handleVolumeChange = (e) => {
    const v = videoRef.current;
    if (!v) return;
    const vol = parseFloat(e.target.value);
    v.volume = vol;
    v.muted = vol === 0;
    setVideoVolume(vol);
    setVideoMuted(v.muted);
  };

  const handleSkip = (seconds) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds));
  };

  const handleSeek = (e) => {
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = percent * v.duration;
  };

  const cycleSpeed = () => {
    const speeds = [0.5, 1, 1.25, 1.5, 2];
    const v = videoRef.current;
    if (!v) return;
    const currentIdx = speeds.indexOf(videoSpeed);
    const nextIdx = (currentIdx + 1) % speeds.length;
    v.playbackRate = speeds[nextIdx];
    setVideoSpeed(speeds[nextIdx]);
  };

  const toggleFullscreen = async () => {
    const el = videoContainerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  // ⭐ اختصارات لوحة المفاتيح
  useEffect(() => {
    const handleKey = (e) => {
      // ESC
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
          return;
        }
        onClose?.();
        return;
      }

      // ⭐ في وضع fullscreen للفيديو → seek
      if (isVideo && isVideoFullscreen && videoRef.current) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          handleSkip(SKIP_SECONDS);
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          handleSkip(-SKIP_SECONDS);
          return;
        }
        if (e.key === " " || e.key === "k" || e.key === "K") {
          e.preventDefault();
          togglePlayPause();
          return;
        }
        if (e.key === "m" || e.key === "M") {
          toggleMute();
          return;
        }
        if (e.key === "f" || e.key === "F") {
          toggleFullscreen();
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const v = videoRef.current;
          const newVol = Math.min(1, (v.volume || 0) + 0.1);
          v.volume = newVol;
          v.muted = false;
          setVideoVolume(newVol);
          setVideoMuted(false);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const v = videoRef.current;
          const newVol = Math.max(0, (v.volume || 0) - 0.1);
          v.volume = newVol;
          v.muted = newVol === 0;
          setVideoVolume(newVol);
          setVideoMuted(newVol === 0);
          return;
        }
        return; // لا تنقل بين الوسائط في fullscreen
      }

      // ⭐ في الوضع العادي
      if (e.key === "ArrowRight") {
        if (isVideo && videoRef.current && videoPlaying) {
          handleSkip(SKIP_SECONDS);
        } else {
          handleNext();
        }
      }
      if (e.key === "ArrowLeft") {
        if (isVideo && videoRef.current && videoPlaying) {
          handleSkip(-SKIP_SECONDS);
        } else {
          handlePrev();
        }
      }

      if (isImage) {
        if (e.key === "+" || e.key === "=") {
          setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
        }
        if (e.key === "-") {
          setZoom((z) => {
            const nz = Math.max(z - ZOOM_STEP, ZOOM_MIN);
            if (nz === ZOOM_MIN) setPosition({ x: 0, y: 0 });
            return nz;
          });
        }
        if (e.key === "0") {
          setZoom(1);
          setRotation(0);
          setPosition({ x: 0, y: 0 });
        }
        if (e.key === "r" || e.key === "R") {
          setRotation((r) => (r + 90) % 360);
        }
      }

      if (isVideo) {
        if (e.key === " " || e.key === "k" || e.key === "K") {
          e.preventDefault();
          togglePlayPause();
        }
        if (e.key === "m" || e.key === "M") {
          toggleMute();
        }
        if (e.key === "f" || e.key === "F") {
          toggleFullscreen();
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    currentIndex,
    isImage,
    isVideo,
    isVideoFullscreen,
    videoPlaying,
    handleNext,
    handlePrev,
    onClose,
  ]);

  // ⭐ منع scroll body
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ⭐ Image handlers
  const handleWheel = (e) => {
    if (!isImage) return;
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? ZOOM_STEP : -ZOOM_STEP;
    setZoom((z) => {
      const nz = Math.max(ZOOM_MIN, Math.min(z + factor, ZOOM_MAX));
      if (nz === ZOOM_MIN) setPosition({ x: 0, y: 0 });
      return nz;
    });
  };

  const handleMouseDown = (e) => {
    if (!isImage || !isZoomed) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e) => {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };
    const handleUp = () => setIsDragging(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging]);

  const handleDoubleClick = () => {
    if (!isImage) return;
    if (isZoomed) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setZoom(2);
    }
  };

  const handleDownload = () => {
    if (!current?.url) return;
    const link = document.createElement("a");
    link.href = current.url;
    link.download = current.filename || `media-${Date.now()}`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!current) return null;

  return createPortal(
    <div
      ref={containerRef}
      className="media-lightbox"
      onClick={handleBackdropClick}
      onMouseMove={handleContainerMouseMove}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(0, 0, 0, 0.96)",
        display: "flex",
        flexDirection: "column",
        animation: "lightboxFadeIn 0.2s ease-out",
        userSelect: "none",
      }}
    >
      {/* ⭐═══════════ TOP BAR ═══════════ */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "12px 16px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
          color: "#fff",
          opacity: showControls || !videoPlaying ? 1 : 0,
          transition: "opacity 0.3s",
          pointerEvents: showControls || !videoPlaying ? "auto" : "none",
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="link"
            className="text-white p-0 text-decoration-none me-2"
            onClick={onClose}
            title={t("common.close")}
          >
            <i className="bi bi-x-lg fs-5"></i>
          </Button>

          {senderInfo && (
            <>
              <Avatar user={senderInfo} size={36} />
              <div>
                <div className="fw-semibold small">
                  {senderInfo.username || "Unknown"}
                </div>
                {senderInfo.createdAt && (
                  <div className="small" style={{ opacity: 0.7, fontSize: "0.7rem" }}>
                    {formatMessageTime(senderInfo.createdAt, i18n.language)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="d-flex align-items-center gap-1">
          {hasMultiple && (
            <span
              className="small px-2 py-1 rounded-pill"
              style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                fontSize: "0.8rem",
              }}
            >
              {currentIndex + 1} / {media.length}
            </span>
          )}

          {isImage && (
            <>
              <Button
                variant="link"
                className="text-white p-2 text-decoration-none"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title={t("media.rotate", "تدوير")}
              >
                <i className="bi bi-arrow-clockwise fs-5"></i>
              </Button>
              <Button
                variant="link"
                className="text-white p-2 text-decoration-none"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                  setPosition({ x: 0, y: 0 });
                }}
                title={t("media.reset", "إعادة تعيين")}
              >
                <i className="bi bi-arrow-counterclockwise fs-5"></i>
              </Button>
            </>
          )}

          <Button
            variant="link"
            className="text-white p-2 text-decoration-none"
            onClick={() => setShowThumbnails((s) => !s)}
            title={t("media.thumbnails", "الصور المصغرة")}
          >
            <i className="bi bi-grid-3x3-gap-fill fs-5"></i>
          </Button>

          <Button
            variant="link"
            className="text-white p-2 text-decoration-none"
            onClick={handleDownload}
            title={t("common.download", "تنزيل")}
          >
            <i className="bi bi-download fs-5"></i>
          </Button>
        </div>
      </div>

      {/* ⭐═══════════ MAIN AREA ═══════════ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          cursor:
            isImage && isZoomed
              ? isDragging
                ? "grabbing"
                : "grab"
              : "default",
        }}
        onWheel={handleWheel}
      >
        {loading && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 5,
            }}
          >
            <Spinner animation="border" variant="light" />
          </div>
        )}

        {/* ⭐ IMAGE */}
        {isImage && (
          <img
            src={current.url}
            alt=""
            draggable={false}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleMouseDown}
            style={{
              maxWidth: "95vw",
              maxHeight: "85vh",
              objectFit: "contain",
              opacity: loading ? 0 : 1,
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transition: isDragging ? "none" : "transform 0.25s ease, opacity 0.3s",
              userSelect: "none",
            }}
          />
        )}

        {/* ⭐ VIDEO */}
        {isVideo && (
          <div
            ref={videoContainerRef}
            style={{
              position: "relative",
              maxWidth: "95vw",
              maxHeight: "85vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#000",
            }}
          >
            <video
              ref={videoRef}
              src={current.url}
              autoPlay
              playsInline
              onClick={togglePlayPause}
              onLoadedMetadata={(e) => {
                setVideoDuration(e.currentTarget.duration);
                setLoading(false);
              }}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                setVideoCurrentTime(v.currentTime);
                setVideoProgress((v.currentTime / v.duration) * 100);
              }}
              onProgress={(e) => {
                const v = e.currentTarget;
                if (v.buffered.length > 0) {
                  setVideoBuffered(
                    (v.buffered.end(v.buffered.length - 1) / v.duration) * 100
                  );
                }
              }}
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
              onEnded={() => setVideoPlaying(false)}
              onError={() => setLoading(false)}
              style={{
                maxWidth: "95vw",
                maxHeight: "85vh",
                outline: "none",
                cursor: "pointer",
                opacity: loading ? 0 : 1,
                transition: "opacity 0.3s",
              }}
            />

            {/* ⭐ زر التشغيل المركزي الكبير */}
            {!videoPlaying && !loading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "84px",
                  height: "84px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(0, 128, 105, 0.9)",
                  backdropFilter: "blur(10px)",
                  border: "3px solid rgba(255,255,255,0.3)",
                  color: "#fff",
                  fontSize: "2.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s",
                  zIndex: 5,
                  boxShadow: "0 8px 32px rgba(0, 128, 105, 0.4)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform =
                    "translate(-50%, -50%) scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform =
                    "translate(-50%, -50%) scale(1)";
                }}
              >
                <i className="bi bi-play-fill" style={{ marginLeft: "6px" }}></i>
              </button>
            )}

            {/* ⭐ أزرار الـ seek العائمة (في الوسط يظهر عند الحركة) */}
            {videoPlaying && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  gap: "40px",
                  alignItems: "center",
                  opacity: showControls ? 1 : 0,
                  transition: "opacity 0.3s",
                  pointerEvents: showControls ? "auto" : "none",
                  zIndex: 4,
                }}
              >
                <FloatingButton
                  icon="bi-arrow-counterclockwise"
                  label="-10"
                  onClick={() => handleSkip(-SKIP_SECONDS)}
                />
                <FloatingButton
                  icon="bi-arrow-clockwise"
                  label="+10"
                  onClick={() => handleSkip(SKIP_SECONDS)}
                />
              </div>
            )}

            {/* ⭐ Custom Video Controls */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "60px 12px 12px",
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, transparent 100%)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                opacity: showControls ? 1 : 0,
                transition: "opacity 0.3s",
                pointerEvents: showControls ? "auto" : "none",
                borderRadius: isVideoFullscreen ? "0" : "0 0 8px 8px",
              }}
            >
              {/* ⭐ Progress Bar */}
              <div
                onClick={handleSeek}
                style={{
                  height: "18px",
                  padding: "6px 0",
                  cursor: "pointer",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    height: "4px",
                    width: "100%",
                    backgroundColor: "rgba(255,255,255,0.25)",
                    borderRadius: "2px",
                    position: "relative",
                    overflow: "visible",
                    transition: "height 0.15s",
                  }}
                >
                  {/* Buffered */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${videoBuffered}%`,
                      backgroundColor: "rgba(255,255,255,0.4)",
                      borderRadius: "2px",
                    }}
                  />
                  {/* Progress */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${videoProgress}%`,
                      backgroundColor: "#008069",
                      borderRadius: "2px",
                    }}
                  />
                  {/* Thumb */}
                  <div
                    style={{
                      position: "absolute",
                      left: `${videoProgress}%`,
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      backgroundColor: "#fff",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                    }}
                  />
                </div>
              </div>

              {/* ⭐ Buttons Row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#fff",
                }}
              >
                <ControlButton
                  icon={videoPlaying ? "bi-pause-fill" : "bi-play-fill"}
                  onClick={togglePlayPause}
                  title={videoPlaying ? t("call.pause", "إيقاف") : t("call.play", "تشغيل")}
                />

                <ControlButton
                  icon="bi-skip-backward-fill"
                  onClick={() => handleSkip(-SKIP_SECONDS)}
                  title={`-${SKIP_SECONDS}s`}
                />

                <ControlButton
                  icon="bi-skip-forward-fill"
                  onClick={() => handleSkip(SKIP_SECONDS)}
                  title={`+${SKIP_SECONDS}s`}
                />

                {/* ⭐ Volume */}
                <div
                  style={{ position: "relative" }}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <ControlButton
                    icon={
                      videoMuted || videoVolume === 0
                        ? "bi-volume-mute-fill"
                        : videoVolume < 0.5
                        ? "bi-volume-down-fill"
                        : "bi-volume-up-fill"
                    }
                    onClick={toggleMute}
                    title={t("call.mute", "كتم")}
                  />
                  {showVolumeSlider && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        padding: "10px 8px",
                        backgroundColor: "rgba(0,0,0,0.9)",
                        borderRadius: "8px",
                        marginBottom: "4px",
                      }}
                    >
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={videoMuted ? 0 : videoVolume}
                        onChange={handleVolumeChange}
                        style={{
                          width: "80px",
                          accentColor: "#008069",
                          cursor: "pointer",
                        }}
                      />
                    </div>
                  )}
                </div>

                <span
                  style={{
                    fontSize: "0.85rem",
                    fontFamily: "monospace",
                    opacity: 0.95,
                    marginLeft: "4px",
                  }}
                >
                  {formatTime(videoCurrentTime)} / {formatTime(videoDuration)}
                </span>

                <div style={{ flex: 1 }}></div>

                <ControlButton
                  icon="bi-speedometer2"
                  label={`${videoSpeed}×`}
                  onClick={cycleSpeed}
                  title={t("media.speed", "السرعة")}
                />

                <ControlButton
                  icon="bi-pip"
                  onClick={async () => {
                    try {
                      if (videoRef.current && document.pictureInPictureEnabled) {
                        if (document.pictureInPictureElement) {
                          await document.exitPictureInPicture();
                        } else {
                          await videoRef.current.requestPictureInPicture();
                        }
                      }
                    } catch (err) {
                      console.error("PiP failed:", err);
                    }
                  }}
                  title={t("media.pip", "صورة داخل صورة")}
                />

                <ControlButton
                  icon={
                    isVideoFullscreen
                      ? "bi-fullscreen-exit"
                      : "bi-arrows-fullscreen"
                  }
                  onClick={toggleFullscreen}
                  title={t("media.fullscreen", "ملء الشاشة")}
                />
              </div>
            </div>
          </div>
        )}

        {/* ⭐ زر السابق */}
        {hasMultiple && (
          <NavArrow
            direction="prev"
            onClick={handlePrev}
            visible={showControls || !videoPlaying}
          />
        )}

        {/* ⭐ زر التالي */}
        {hasMultiple && (
          <NavArrow
            direction="next"
            onClick={handleNext}
            visible={showControls || !videoPlaying}
          />
        )}
      </div>

      {/* ⭐═══════════ THUMBNAILS STRIP ═══════════ */}
      {showThumbnails && hasMultiple && (
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            backgroundColor: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {media.map((m, i) => (
            <button
              key={m._id || i}
              type="button"
              onClick={() => setCurrentIndex(i)}
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "8px",
                overflow: "hidden",
                border:
                  i === currentIndex
                    ? "2px solid #008069"
                    : "2px solid transparent",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
                position: "relative",
                backgroundColor: "#1a1a1a",
                transition: "all 0.15s",
              }}
            >
              {m.type === "video" ? (
                <>
                  <video
                    src={m.url}
                    preload="metadata"
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0,0,0,0.35)",
                      color: "#fff",
                      fontSize: "1.2rem",
                    }}
                  >
                    <i className="bi bi-play-circle-fill"></i>
                  </div>
                </>
              ) : (
                <img
                  src={m.url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* ⭐ Zoom indicator */}
      {isImage && zoom > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            padding: "6px 12px",
            borderRadius: "20px",
            backgroundColor: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: "0.8rem",
            backdropFilter: "blur(10px)",
            zIndex: 10,
          }}
        >
          <i className="bi bi-zoom-in me-1"></i>
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* ⭐ Hint للأزرار */}
      {isVideo && !loading && (
        <div
          style={{
            position: "absolute",
            top: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "6px 14px",
            borderRadius: "20px",
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(10px)",
            color: "rgba(255,255,255,0.7)",
            fontSize: "0.7rem",
            opacity: showControls ? 1 : 0,
            transition: "opacity 0.3s",
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          <i className="bi bi-keyboard me-1"></i>
          ← → {isVideoFullscreen ? `${SKIP_SECONDS}s` : "navigate"} · Space · M · F
        </div>
      )}
    </div>,
    document.body
  );
};

// ⭐ زر تنقل
const NavArrow = ({ direction, onClick, visible }) => {
  const isPrev = direction === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "absolute",
        [isPrev ? "left" : "right"]: "16px",
        top: "50%",
        transform: "translateY(-50%)",
        width: "50px",
        height: "50px",
        borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.15)",
        backdropFilter: "blur(10px)",
        border: "none",
        color: "#fff",
        fontSize: "1.4rem",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s, transform 0.15s, background-color 0.15s",
        zIndex: 10,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(0, 128, 105, 0.9)";
        e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)";
        e.currentTarget.style.transform = "translateY(-50%) scale(1)";
      }}
    >
      <i className={`bi bi-chevron-${isPrev ? "left" : "right"}`}></i>
    </button>
  );
};

// ⭐ زر تحكم صغير
const ControlButton = ({ icon, label, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      background: "transparent",
      border: "none",
      color: "#fff",
      fontSize: "1.15rem",
      cursor: "pointer",
      padding: "6px 8px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      transition: "background-color 0.15s, transform 0.1s",
      fontWeight: 600,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = "transparent";
    }}
    onMouseDown={(e) => {
      e.currentTarget.style.transform = "scale(0.94)";
    }}
    onMouseUp={(e) => {
      e.currentTarget.style.transform = "scale(1)";
    }}
  >
    <i className={`bi ${icon}`}></i>
    {label && <span style={{ fontSize: "0.8rem" }}>{label}</span>}
  </button>
);

// ⭐ زر عائم (±10s)
const FloatingButton = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    style={{
      width: "70px",
      height: "70px",
      borderRadius: "50%",
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      backdropFilter: "blur(10px)",
      border: "2px solid rgba(255,255,255,0.3)",
      color: "#fff",
      fontSize: "1.6rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transition: "transform 0.2s, background-color 0.2s",
      position: "relative",
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "scale(1.1)";
      e.currentTarget.style.backgroundColor = "rgba(0, 128, 105, 0.8)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "scale(1)";
      e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.55)";
    }}
  >
    <i className={`bi ${icon}`}></i>
    <span
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: "0.55rem",
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  </button>
);

export default MediaLightbox;