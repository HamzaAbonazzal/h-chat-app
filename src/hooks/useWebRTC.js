import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useSocket } from "./useSocket";
import { useAuth } from "./useAuth";
import { callService } from "../services/callService";
import {
  startIncomingRingtone,
  startCallingRingtone,
  playEndCall,
  stopRingtones,
  vibrateShort,
} from "../utils/ringtone";

// ⭐ ICE Servers الافتراضية (fallback)
const DEFAULT_ICE_SERVERS = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

export const useWebRTC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { on, emit } = useSocket();
  const location = useLocation();

  const [callState, setCallState] = useState("idle");
  const [currentCall, setCurrentCall] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [connectionState, setConnectionState] = useState("new");
  const [callError, setCallError] = useState(null);
  const [videoFallback, setVideoFallback] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [iceType, setIceType] = useState(null); // stun | turn

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const durationTimerRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const currentCallRef = useRef(null);
  const tRef = useRef(t);
  const screenStreamRef = useRef(null);

  // ⭐ ICE servers (ديناميكية من الخادم)
  const iceServersRef = useRef(DEFAULT_ICE_SERVERS);
  const [iceServersLoaded, setIceServersLoaded] = useState(false);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  // ⭐ جلب ICE servers من الخادم عند البدء
  useEffect(() => {
    if (!user) return;

    const loadIceServers = async () => {
      try {
        const data = await callService.getIceServers();

        if (data?.iceServers && data.iceServers.length > 0) {
          iceServersRef.current = { iceServers: data.iceServers };
          setIceServersLoaded(true);
          console.log(
            "✅ ICE servers loaded:",
            data.iceServers.length,
            "servers (TURN:",
            data.hasTurn ? "yes" : "no",
            ")",
          );
        }
      } catch (err) {
        console.warn(
          "⚠️ Failed to load ICE servers, using defaults:",
          err.message,
        );
        iceServersRef.current = DEFAULT_ICE_SERVERS;
      }
    };

    loadIceServers();
  }, [user]);

  // ⭐ مؤقت المدة
  useEffect(() => {
    if (callState === "active") {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(durationTimerRef.current);
    }
    return () => clearInterval(durationTimerRef.current);
  }, [callState]);

  // ⭐ تشغيل / إيقاف الرنين
  useEffect(() => {
    if (callState === "ringing" && currentCall?.isIncoming) {
      startIncomingRingtone();
    } else if (callState === "calling") {
      startCallingRingtone();
    } else if (callState === "active") {
      stopRingtones();
    } else if (callState === "ended") {
      playEndCall();
    } else if (callState === "idle") {
      stopRingtones();
    }

    return () => {
      if (callState === "ringing" || callState === "calling") {
        stopRingtones();
      }
    };
  }, [callState, currentCall?.isIncoming]);

  // ⭐ معالجة رابط الإشعار
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const incomingCallId = urlParams.get("incoming_call");
    const caller = urlParams.get("caller");
    const callType = urlParams.get("callType");

    if (!incomingCallId || !caller) return;

    console.log("📞 Opening from notification:", {
      incomingCallId,
      caller,
      callType,
    });

    window.history.replaceState({}, "", window.location.pathname);

    if (currentCallRef.current) return;

    setTimeout(() => {
      emit("requestActiveCall", { callId: incomingCallId });
    }, 1500);
  }, [emit]);

  // ⭐ تنظيف
  const cleanup = useCallback(() => {
    console.log("🧹 Cleaning up WebRTC resources");

    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.getSenders().forEach((sender) => {
          if (sender.track) sender.track.stop();
        });
        peerConnectionRef.current.close();
      } catch (err) {
        console.error("Error closing peer connection:", err);
      }
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];

    stopRingtones();

    setLocalStream(null);
    setRemoteStream(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsSpeakerOn(false);
    setConnectionState("new");
    setCallError(null);
    setVideoFallback(false);
    setFacingMode("user");
    setIsScreenSharing(false);
    setIceType(null);
  }, []);

  // ⭐ تحليل نوع ICE المستخدم (STUN أو TURN)
  const analyzeIceType = useCallback(async (pc) => {
    try {
      const stats = await pc.getStats();

      stats.forEach((report) => {
        if (
          report.type === "candidate-pair" &&
          report.state === "succeeded" &&
          report.nominated
        ) {
          const localCandidate = stats.get(report.localCandidateId);

          if (localCandidate?.candidateType === "relay") {
            setIceType("turn");
            console.log("🔒 Using TURN relay");
          } else {
            setIceType("stun");
            console.log("⚡ Using direct connection (STUN)");
          }
        }
      });
    } catch (err) {
      console.warn("Failed to analyze ICE type:", err);
    }
  }, []);

  // ⭐ إنشاء PeerConnection
  const createPeerConnection = useCallback(
    (callId, peerId) => {
      // ⭐ استخدم ICE servers الديناميكية
      const pc = new RTCPeerConnection(iceServersRef.current);

      console.log(
        "🔧 Creating PeerConnection with",
        iceServersRef.current.iceServers.length,
        "ICE servers",
      );

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          emit("iceCandidate", {
            to: peerId,
            candidate: event.candidate,
            callId,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("🔗 Connection state:", pc.connectionState);
        setConnectionState(pc.connectionState);

        if (pc.connectionState === "connected") {
          setCallState("active");
          // ⭐ حلل نوع ICE
          analyzeIceType(pc);
        }

        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          console.log("❌ Connection failed");
          const call = currentCallRef.current;
          if (call) {
            emit("endCall", {
              to: call.peerId,
              callId: call.callId,
              from: user._id,
            });
          }
          setCallState("ended");
          setTimeout(() => {
            cleanup();
            setCurrentCall(null);
            setCallState("idle");
          }, 1500);
        }
      };

      pc.ontrack = (event) => {
        console.log("📥 Remote track received:", event.track.kind);
        const [stream] = event.streams;
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [emit, user, cleanup, analyzeIceType],
  );

  // ⭐ الحصول على الميكروفون (والكاميرا إذا فيديو)
  const getLocalStream = useCallback(async (callType, facing = "user") => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          callType === "video"
            ? {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: facing,
              }
            : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return { stream, actualType: callType };
    } catch (err) {
      console.error("Failed to get local stream:", err);

      if (callType === "video") {
        try {
          console.log("⚠️ Video failed, falling back to audio-only");
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          localStreamRef.current = audioStream;
          setLocalStream(audioStream);
          setVideoFallback(true);
          return { stream: audioStream, actualType: "voice" };
        } catch (audioErr) {
          console.error("Audio also failed:", audioErr);
          setCallError("MEDIA_ACCESS_DENIED");
          throw audioErr;
        }
      }

      setCallError("MEDIA_ACCESS_DENIED");
      throw err;
    }
  }, []);

  // ⭐ بدء مكالمة
  const startCall = useCallback(
    async (peerId, peerUser, callType = "voice") => {
      if (!user || !peerId) return;

      console.log("📞 Starting call to:", peerId, "Type:", callType);

      let stream, actualType;
      try {
        const result = await getLocalStream(callType, "user");
        stream = result.stream;
        actualType = result.actualType;
      } catch (err) {
        let errorKey = "call.errors.mediaAccess";
        if (err.name === "NotAllowedError") {
          errorKey = "call.errors.permissionDenied";
        } else if (err.name === "NotFoundError") {
          errorKey = "call.errors.notFound";
        } else if (err.name === "NotReadableError") {
          errorKey = "call.errors.notReadable";
        }
        alert(tRef.current(errorKey));
        return;
      }

      const tempCallId = `temp-${Date.now()}`;

      setCurrentCall({
        callId: tempCallId,
        peerId,
        peerUser,
        callType: actualType,
        isIncoming: false,
        startedAt: null,
      });
      setCallState("calling");

      const pc = createPeerConnection(tempCallId, peerId);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      emit("callUser", {
        to: peerId,
        from: user._id,
        signal: offer,
        callType: actualType,
      });
    },
    [user, emit, createPeerConnection, getLocalStream],
  );

  // ⭐ قبول مكالمة
  const acceptCall = useCallback(async () => {
    const call = currentCallRef.current;
    if (!call) return;

    console.log("✅ Accepting call:", call.callId);

    stopRingtones();

    setCallState("connecting");

    let stream, actualType;
    try {
      const result = await getLocalStream(call.callType, "user");
      stream = result.stream;
      actualType = result.actualType;
    } catch (err) {
      console.error("Failed to get local stream:", err);

      let errorKey = "call.errors.streamFailed";
      if (err.name === "NotAllowedError") {
        errorKey = "call.errors.permissionDeniedDetailed";
      } else if (err.name === "NotFoundError") {
        errorKey = "call.errors.notFoundDetailed";
      } else if (err.name === "NotReadableError") {
        errorKey = "call.errors.notReadableDetailed";
      } else if (err.name === "OverconstrainedError") {
        errorKey = "call.errors.overconstrained";
      }

      alert(tRef.current(errorKey));
      rejectCall();
      return;
    }

    try {
      const pc = createPeerConnection(call.callId, call.peerId);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      if (actualType !== call.callType) {
        setCurrentCall((prev) => ({
          ...prev,
          callType: actualType,
        }));
      }

      if (call.signal) {
        await pc.setRemoteDescription(new RTCSessionDescription(call.signal));
      }

      for (const candidate of pendingCandidatesRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding pending ICE:", err);
        }
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      emit("answerCall", {
        to: call.peerId,
        callId: call.callId,
        signal: answer,
      });

      setCurrentCall((prev) => ({
        ...prev,
        startedAt: new Date(),
      }));
    } catch (err) {
      console.error("Failed during acceptCall:", err);
      alert(
        tRef.current("call.errors.acceptFailedWithMsg", { msg: err.message }),
      );
      rejectCall();
    }
  }, [emit, createPeerConnection, getLocalStream]);

  // ⭐ رفض
  const rejectCall = useCallback(() => {
    const call = currentCallRef.current;
    if (!call) return;

    vibrateShort();

    emit("rejectCall", {
      to: call.peerId,
      callId: call.callId,
      from: user._id,
    });

    cleanup();
    setCurrentCall(null);
    setCallState("idle");
  }, [user, emit, cleanup]);

  // ⭐ إنهاء
  const endCall = useCallback(() => {
    const call = currentCallRef.current;
    if (!call) return;

    vibrateShort();

    emit("endCall", {
      to: call.peerId,
      callId: call.callId,
      from: user._id,
    });

    cleanup();
    setCurrentCall(null);
    setCallState("idle");
  }, [user, emit, cleanup]);

  // ⭐ كتم
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // ⭐ فيديو
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  // ⭐ مكبر
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
  }, []);

  // ⭐ تبديل الكاميرا
  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current || !peerConnectionRef.current) return;

    const newFacing = facingMode === "user" ? "environment" : "user";

    try {
      console.log("🔄 Switching camera to:", newFacing);

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      const videoSender = peerConnectionRef.current
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");

      if (videoSender) {
        await videoSender.replaceTrack(newVideoTrack);
      }

      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop();
      }

      localStreamRef.current.removeTrack(oldVideoTrack);
      localStreamRef.current.addTrack(newVideoTrack);

      const updatedStream = new MediaStream([
        ...localStreamRef.current.getAudioTracks(),
        newVideoTrack,
      ]);
      localStreamRef.current = updatedStream;
      setLocalStream(updatedStream);

      setFacingMode(newFacing);
      setIsVideoOff(false);

      console.log("✅ Camera switched to:", newFacing);
    } catch (err) {
      console.error("Failed to switch camera:", err);
      alert(tRef.current("call.errors.cameraSwitchFailed"));
    }
  }, [facingMode]);

  // ⭐ مشاركة الشاشة
  const toggleScreenShare = useCallback(async () => {
    if (!peerConnectionRef.current) return;

    try {
      if (isScreenSharing) {
        console.log("🛑 Stopping screen share");

        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((t) => t.stop());
          screenStreamRef.current = null;
        }

        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });

        const newVideoTrack = cameraStream.getVideoTracks()[0];

        const videoSender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");

        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }

        const updatedStream = new MediaStream([
          ...localStreamRef.current.getAudioTracks(),
          newVideoTrack,
        ]);
        localStreamRef.current = updatedStream;
        setLocalStream(updatedStream);
        setIsScreenSharing(false);
      } else {
        console.log("📺 Starting screen share");

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" },
          audio: false,
        });

        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];

        const videoSender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");

        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        const updatedStream = new MediaStream([
          ...localStreamRef.current.getAudioTracks(),
          screenTrack,
        ]);
        localStreamRef.current = updatedStream;
        setLocalStream(updatedStream);
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error("Screen share error:", err);
      if (err.name !== "NotAllowedError") {
        // تجاهل إلغاء المستخدم
      }
    }
  }, [isScreenSharing, facingMode]);

  // ⭐ الاستماع لأحداث Socket
  useEffect(() => {
    if (!user) return;

    const offIncoming = on(
      "incomingCall",
      ({ callId, from, callerUser, signal, callType }) => {
        console.log("📞 Incoming call:", { callId, from, callType });

        if (currentCallRef.current) {
          emit("busyCall", {
            to: from,
            callId,
            from: user._id,
          });
          return;
        }

        setCurrentCall({
          callId,
          peerId: from,
          peerUser: callerUser,
          callType,
          isIncoming: true,
          signal,
          startedAt: null,
        });
        setCallState("ringing");
      },
    );

    const offRinging = on("callRinging", ({ callId }) => {
      console.log("🔔 Ringing with backend callId:", callId);
      setCurrentCall((prev) => {
        if (!prev) return prev;
        return { ...prev, callId };
      });
    });

    const offAccepted = on(
      "callAccepted",
      async ({ callId, signal, answeredAt }) => {
        console.log("✅ Call accepted:", callId);

        const pc = peerConnectionRef.current;
        if (!pc) return;

        try {
          if (signal) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
          }

          for (const candidate of pendingCandidatesRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error("Error adding pending ICE:", err);
            }
          }
          pendingCandidatesRef.current = [];

          setCurrentCall((prev) => ({
            ...prev,
            callId,
            startedAt: answeredAt || new Date(),
          }));
        } catch (err) {
          console.error("Error setting remote description:", err);
        }
      },
    );

    const offRejected = on("callRejected", () => {
      cleanup();
      setCallState("ended");
      setTimeout(() => {
        setCurrentCall(null);
        setCallState("idle");
      }, 1500);
    });

    const offEnded = on("callEnded", () => {
      cleanup();
      setCallState("ended");
      setTimeout(() => {
        setCurrentCall(null);
        setCallState("idle");
      }, 1500);
    });

    const offFailed = on("callFailed", ({ reason, message }) => {
      cleanup();

      let errorMsg;
      if (reason === "USER_OFFLINE") {
        errorMsg = tRef.current("call.errors.userOffline");
      } else if (reason === "USER_BUSY") {
        errorMsg = tRef.current("call.errors.userBusy");
      } else {
        errorMsg = message || tRef.current("call.errors.callFailed");
      }

      setCallError(errorMsg);
      setCallState("ended");
      setTimeout(() => {
        setCurrentCall(null);
        setCallState("idle");
        setCallError(null);
      }, 2000);
    });

    const offBusy = on("callBusy", () => {
      cleanup();
      setCallError(tRef.current("call.errors.userBusy"));
      setCallState("ended");
      setTimeout(() => {
        setCurrentCall(null);
        setCallState("idle");
        setCallError(null);
      }, 2000);
    });

    const offIce = on("iceCandidate", async ({ candidate }) => {
      const pc = peerConnectionRef.current;

      if (!pc) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    });

    return () => {
      offIncoming?.();
      offRinging?.();
      offAccepted?.();
      offRejected?.();
      offEnded?.();
      offFailed?.();
      offBusy?.();
      offIce?.();
    };
  }, [user, on, emit, cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    callState,
    currentCall,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    callDuration,
    connectionState,
    callError,
    videoFallback,
    facingMode,
    isScreenSharing,
    iceType,
    iceServersLoaded,
    localStream,
    remoteStream,
    localStreamRef,
    remoteStreamRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    switchCamera,
    toggleScreenShare,
    cleanup,
  };
};
