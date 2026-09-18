import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSocket } from "./useSocket";
import { useAuth } from "./useAuth";
import { callService } from "../services/callService";
import {
  startIncomingRingtone,
  playEndCall,
  stopRingtones,
  vibrateShort,
} from "../utils/ringtone";

const DEFAULT_ICE_SERVERS = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

export const useGroupCall = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { on, emit } = useSocket();

  const [callState, setCallState] = useState("idle");
  // idle | calling | ringing | active | ended

  const [currentGroupCall, setCurrentGroupCall] = useState(null);
  // { groupCallId, conversationId, conversationName, conversationAvatar, callType, isIncoming, initiator }

  const [participants, setParticipants] = useState([]);
  // [{ _id, username, avatar }]

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  // { userId: MediaStream }

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState(null);
  const [videoFallback, setVideoFallback] = useState(false);

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // userId -> RTCPeerConnection
  const remoteStreamsRef = useRef({});
  const iceServersRef = useRef(DEFAULT_ICE_SERVERS);
  const durationTimerRef = useRef(null);
  const tRef = useRef(t);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // ⭐ جلب ICE servers
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const data = await callService.getIceServers();
        if (data?.iceServers?.length > 0) {
          iceServersRef.current = { iceServers: data.iceServers };
        }
      } catch (err) {
        console.warn("Failed to load ICE servers:", err.message);
      }
    };

    load();
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

  // ⭐ الرنين للمكالمة الجماعية الواردة
  useEffect(() => {
    if (callState === "ringing") {
      startIncomingRingtone();
    } else if (callState === "active") {
      stopRingtones();
    } else if (callState === "ended") {
      playEndCall();
    } else if (callState === "idle") {
      stopRingtones();
    }

    return () => {
      if (callState === "ringing") {
        stopRingtones();
      }
    };
  }, [callState]);

  // ⭐ تنظيف
  const cleanup = useCallback(() => {
    console.log("🧹 Cleaning up group call");

    // إغلاق كل PeerConnections
    for (const [userId, pc] of peerConnectionsRef.current.entries()) {
      try {
        pc.getSenders().forEach((sender) => {
          if (sender.track) sender.track.stop();
        });
        pc.close();
      } catch (err) {
        console.error(`Error closing PC for ${userId}:`, err);
      }
    }
    peerConnectionsRef.current.clear();

    // إيقاف المسار المحلي
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    remoteStreamsRef.current = {};
    stopRingtones();

    setLocalStream(null);
    setRemoteStreams({});
    setParticipants([]);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallError(null);
    setVideoFallback(false);
  }, []);

  // ⭐ الحصول على المسار المحلي
  const getLocalStream = useCallback(async (callType) => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          callType === "video"
            ? { width: { ideal: 640 }, height: { ideal: 480 } }
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
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          localStreamRef.current = audioStream;
          setLocalStream(audioStream);
          setVideoFallback(true);
          return { stream: audioStream, actualType: "voice" };
        } catch (audioErr) {
          setCallError("MEDIA_ACCESS_DENIED");
          throw audioErr;
        }
      }

      setCallError("MEDIA_ACCESS_DENIED");
      throw err;
    }
  }, []);

  // ⭐ إنشاء PeerConnection لمشارك معين
  const createPeerConnection = useCallback(
    (peerUserId, groupCallId) => {
      // إذا كان موجوداً، أغلقه
      if (peerConnectionsRef.current.has(peerUserId)) {
        const oldPc = peerConnectionsRef.current.get(peerUserId);
        try {
          oldPc.close();
        } catch {}
        peerConnectionsRef.current.delete(peerUserId);
      }

      const pc = new RTCPeerConnection(iceServersRef.current);

      // ⭐ ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          emit("groupCallIceCandidate", {
            groupCallId,
            to: peerUserId,
            from: user._id,
            candidate: event.candidate,
          });
        }
      };

      // ⭐ تغيّر حالة الاتصال
      pc.onconnectionstatechange = () => {
        console.log(`🔗 PC[${peerUserId}] state:`, pc.connectionState);

        if (pc.connectionState === "connected") {
          // ⭐ التحقق: هل نحن في حالة active؟
          const anyConnected = Array.from(
            peerConnectionsRef.current.values(),
          ).some((p) => p.connectionState === "connected");

          if (anyConnected) {
            setCallState("active");
          }
        }

        if (pc.connectionState === "failed") {
          console.warn(`❌ PC[${peerUserId}] failed`);
        }
      };

      // ⭐ استقبال المسار البعيد
      pc.ontrack = (event) => {
        console.log(`📥 Remote track from ${peerUserId}:`, event.track.kind);
        const [stream] = event.streams;

        remoteStreamsRef.current = {
          ...remoteStreamsRef.current,
          [peerUserId]: stream,
        };
        setRemoteStreams({ ...remoteStreamsRef.current });
      };

      // ⭐ إضافة المسار المحلي
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      peerConnectionsRef.current.set(peerUserId, pc);
      return pc;
    },
    [emit, user],
  );

  // ⭐ إنشاء Offer لمشارك
  const createAndSendOffer = useCallback(
    async (peerUserId, groupCallId) => {
      try {
        const pc = createPeerConnection(peerUserId, groupCallId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        emit("groupCallOffer", {
          groupCallId,
          to: peerUserId,
          from: user._id,
          signal: offer,
        });

        console.log(`📤 Sent offer to ${peerUserId}`);
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    },
    [createPeerConnection, emit, user],
  );

  // ⭐ بدء مكالمة جماعية جديدة
  const startGroupCall = useCallback(
    async (conversation, callType = "voice") => {
      if (!user || !conversation?.isGroup) return;

      // ⭐ احصل على المسار المحلي
      let stream, actualType;
      try {
        const result = await getLocalStream(callType);
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

      setCurrentGroupCall({
        groupCallId: null,
        conversationId: conversation._id,
        conversationName: conversation.name,
        conversationAvatar: conversation.groupAvatar,
        callType: actualType,
        isIncoming: false,
        initiator: user,
      });

      setParticipants([
        {
          _id: user._id,
          username: user.username,
          avatar: user.avatar,
        },
      ]);

      setCallState("calling");

      // ⭐ أرسل للخادم
      emit("startGroupCall", {
        conversationId: conversation._id,
        callType: actualType,
        from: user._id,
      });
    },
    [user, emit, getLocalStream],
  );

  // ⭐ قبول مكالمة جماعية
  const acceptGroupCall = useCallback(async () => {
    const call = currentGroupCall;
    if (!call) return;

    stopRingtones();
    setCallState("connecting");

    try {
      const result = await getLocalStream(call.callType);
      setVideoFallback(result.actualType !== call.callType);

      // ⭐ انضم عبر Socket
      emit("joinGroupCall", {
        groupCallId: call.groupCallId,
        userId: user._id,
      });
    } catch (err) {
      console.error("Failed to accept group call:", err);
      alert(tRef.current("call.errors.mediaAccess"));
      rejectGroupCall();
    }
  }, [currentGroupCall, user, emit, getLocalStream]);

  // ⭐ رفض المكالمة الجماعية
  const rejectGroupCall = useCallback(() => {
    const call = currentGroupCall;
    if (!call) return;

    vibrateShort();

    emit("rejectGroupCall", {
      groupCallId: call.groupCallId,
      userId: user._id,
    });

    cleanup();
    setCurrentGroupCall(null);
    setCallState("idle");
  }, [currentGroupCall, user, emit, cleanup]);

  // ⭐ إنهاء المكالمة الجماعية
  const endGroupCall = useCallback(() => {
    const call = currentGroupCall;
    if (!call) return;

    vibrateShort();

    emit("endGroupCall", {
      groupCallId: call.groupCallId,
      userId: user._id,
    });

    cleanup();
    setCurrentGroupCall(null);
    setCallState("idle");
  }, [currentGroupCall, user, emit, cleanup]);

  // ⭐ مغادرة المكالمة الجماعية (بدون إنهائها للآخرين)
  const leaveGroupCall = useCallback(() => {
    const call = currentGroupCall;
    if (!call) return;

    vibrateShort();

    emit("leaveGroupCall", {
      groupCallId: call.groupCallId,
      userId: user._id,
    });

    cleanup();
    setCurrentGroupCall(null);
    setCallState("idle");
  }, [currentGroupCall, user, emit, cleanup]);

  // ⭐ تبديل الكتم
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // ⭐ تبديل الفيديو
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  // ⭐ الاستماع لأحداث Socket
  useEffect(() => {
    if (!user) return;

    // ⭐ مكالمة جماعية واردة
    const offIncoming = on(
      "incomingGroupCall",
      ({
        groupCallId,
        conversationId,
        conversationName,
        conversationAvatar,
        from,
        initiator,
        callType,
      }) => {
        console.log("📞 Incoming group call:", {
          groupCallId,
          conversationName,
        });

        if (currentGroupCall) {
          // مشغول بمكالمة أخرى → رفض تلقائي
          emit("rejectGroupCall", {
            groupCallId,
            userId: user._id,
          });
          return;
        }

        setCurrentGroupCall({
          groupCallId,
          conversationId,
          conversationName,
          conversationAvatar,
          callType,
          isIncoming: true,
          initiator,
        });
        setCallState("ringing");
      },
    );

    // ⭐ بدأ المُنشئ المكالمة
    const offStarted = on("groupCallStarted", ({ groupCallId }) => {
      console.log("✅ Group call started:", groupCallId);
      setCurrentGroupCall((prev) => {
        if (!prev) return prev;
        return { ...prev, groupCallId };
      });
    });

    // ⭐ استقبال قائمة المشاركين (بعد joinGroupCall)
    const offParticipants = on(
      "groupCallParticipants",
      async ({ groupCallId, participants: existingParticipants }) => {
        console.log(
          "👥 Received participants:",
          existingParticipants.map((p) => p.username),
        );

        // ⭐ أضف نفسي + الموجودين
        setParticipants([
          { _id: user._id, username: user.username, avatar: user.avatar },
          ...existingParticipants,
        ]);

        setCallState("connecting");

        // ⭐ أنشئ Offer لكل مشارك موجود
        for (const participant of existingParticipants) {
          await createAndSendOffer(participant._id, groupCallId);
        }
      },
    );

    // ⭐ عضو جديد انضم
    const offUserJoined = on(
      "userJoinedGroupCall",
      ({ groupCallId, user: newUser }) => {
        console.log("👋 User joined:", newUser.username);

        setParticipants((prev) => {
          if (prev.some((p) => p._id === newUser._id)) return prev;
          return [...prev, newUser];
        });
      },
    );

    // ⭐ عضو غادر
    const offUserLeft = on("userLeftGroupCall", ({ groupCallId, userId }) => {
      console.log("👋 User left:", userId);

      // أغلق PeerConnection
      const pc = peerConnectionsRef.current.get(userId);
      if (pc) {
        try {
          pc.close();
        } catch {}
        peerConnectionsRef.current.delete(userId);
      }

      // احذف من remote streams
      const newStreams = { ...remoteStreamsRef.current };
      delete newStreams[userId];
      remoteStreamsRef.current = newStreams;
      setRemoteStreams(newStreams);

      // احذف من participants
      setParticipants((prev) => prev.filter((p) => p._id !== userId));
    });

    // ⭐ استقبال Offer من مشارك جديد
    const offOffer = on(
      "groupCallOffer",
      async ({ groupCallId, from, signal }) => {
        console.log("📥 Received offer from:", from);

        try {
          const pc = createPeerConnection(from, groupCallId);

          await pc.setRemoteDescription(new RTCSessionDescription(signal));

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          emit("groupCallAnswer", {
            groupCallId,
            to: from,
            from: user._id,
            signal: answer,
          });

          console.log(`📤 Sent answer to ${from}`);
        } catch (err) {
          console.error("Error handling offer:", err);
        }
      },
    );

    // ⭐ استقبال Answer
    const offAnswer = on(
      "groupCallAnswer",
      async ({ groupCallId, from, signal }) => {
        console.log("📥 Received answer from:", from);

        try {
          const pc = peerConnectionsRef.current.get(from);
          if (!pc) return;

          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } catch (err) {
          console.error("Error handling answer:", err);
        }
      },
    );

    // ⭐ ICE candidates
    const offIce = on(
      "groupCallIceCandidate",
      async ({ groupCallId, from, candidate }) => {
        try {
          const pc = peerConnectionsRef.current.get(from);
          if (!pc) {
            console.warn(`PC not found for ${from}, ICE skipped`);
            return;
          }

          if (candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (err) {
          console.error("Error adding group ICE:", err);
        }
      },
    );

    // ⭐ رُفض من مشارك
    const offRejected = on("groupCallRejected", ({ groupCallId, userId }) => {
      console.log("❌ User rejected group call:", userId);
    });

    // ⭐ انتهت المكالمة
    const offEnded = on("groupCallEnded", ({ groupCallId, reason }) => {
      console.log("📴 Group call ended:", reason);
      cleanup();
      setCallState("ended");
      setTimeout(() => {
        setCurrentGroupCall(null);
        setCallState("idle");
      }, 1500);
    });

    // ⭐ فشل
    const offFailed = on("groupCallFailed", ({ reason, message }) => {
      console.error("⚠️ Group call failed:", reason, message);
      cleanup();

      let errorMsg;
      if (reason === "CALL_FULL") {
        errorMsg = tRef.current("call.groupCallFull", "المكالمة ممتلئة");
      } else if (reason === "CALL_IN_PROGRESS") {
        errorMsg = tRef.current(
          "call.groupCallInProgress",
          "هناك مكالمة جارية",
        );
      } else if (reason === "CALL_NOT_FOUND") {
        errorMsg = tRef.current("call.groupCallNotFound", "المكالمة انتهت");
      } else {
        errorMsg = message || tRef.current("call.errors.callFailed");
      }

      setCallError(errorMsg);
      setCallState("ended");
      setTimeout(() => {
        setCurrentGroupCall(null);
        setCallState("idle");
        setCallError(null);
      }, 2000);
    });

    return () => {
      offIncoming?.();
      offStarted?.();
      offParticipants?.();
      offUserJoined?.();
      offUserLeft?.();
      offOffer?.();
      offAnswer?.();
      offIce?.();
      offRejected?.();
      offEnded?.();
      offFailed?.();
    };
  }, [
    user,
    on,
    emit,
    cleanup,
    createPeerConnection,
    createAndSendOffer,
    currentGroupCall,
  ]);

  // ⭐ تنظيف عند Unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    callState,
    currentGroupCall,
    participants,
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    callDuration,
    callError,
    videoFallback,
    startGroupCall,
    acceptGroupCall,
    rejectGroupCall,
    endGroupCall,
    leaveGroupCall,
    toggleMute,
    toggleVideo,
    cleanup,
  };
};
