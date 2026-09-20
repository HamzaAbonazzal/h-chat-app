import { Suspense } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { CallProvider } from "./context/CallContext";
import { GroupCallProvider } from "./context/GroupCallContext";
import { ToastProvider } from "./context/ToastContext";
import { useNotifications } from "./hooks/useNotifications";
import AppRoutes from "./routes/AppRoutes";
import Loader from "./components/common/Loader";
import ToastContainer from "./components/common/ToastContainer";
import CallModal from "./components/call/CallModal";
import GroupCallModal from "./components/call/GroupCallModal";
import { useCall } from "./context/CallContext";
import { useGroupCallContext } from "./context/GroupCallContext";
import { useAuth } from "./hooks/useAuth";

const NotificationManager = () => {
  useNotifications();
  return null;
};

const GlobalCallModal = () => {
  const {
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
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    switchCamera,
    toggleScreenShare,
  } = useCall();

  if (!currentCall) return null;

  return (
    <CallModal
      callState={callState}
      currentCall={currentCall}
      isMuted={isMuted}
      isVideoOff={isVideoOff}
      isSpeakerOn={isSpeakerOn}
      callDuration={callDuration}
      callError={callError}
      videoFallback={videoFallback}
      isScreenSharing={isScreenSharing}
      facingMode={facingMode}
      iceType={iceType}
      localStream={localStream}
      remoteStream={remoteStream}
      onAccept={acceptCall}
      onReject={rejectCall}
      onEndCall={endCall}
      onToggleMute={toggleMute}
      onToggleVideo={toggleVideo}
      onToggleSpeaker={toggleSpeaker}
      onSwitchCamera={switchCamera}
      onToggleScreenShare={toggleScreenShare}
    />
  );
};

const GlobalGroupCallModal = () => {
  const { user } = useAuth();
  const {
    callState,
    currentGroupCall,
    participants,
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    callDuration,
    callError,
    acceptGroupCall,
    rejectGroupCall,
    endGroupCall,
    leaveGroupCall,
    toggleMute,
    toggleVideo,
  } = useGroupCallContext();

  if (!currentGroupCall) return null;

  return (
    <GroupCallModal
      callState={callState}
      currentGroupCall={currentGroupCall}
      participants={participants}
      localStream={localStream}
      remoteStreams={remoteStreams}
      isMuted={isMuted}
      isVideoOff={isVideoOff}
      callDuration={callDuration}
      callError={callError}
      currentUserId={user?._id}
      onAccept={acceptGroupCall}
      onReject={rejectGroupCall}
      onEndCall={endGroupCall}
      onLeaveCall={leaveGroupCall}
      onToggleMute={toggleMute}
      onToggleVideo={toggleVideo}
    />
  );
};

function App() {
  return (
    <Suspense fallback={<Loader fullScreen />}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <SocketProvider>
              <CallProvider>
                <GroupCallProvider>
                  <NotificationManager />
                  <AppRoutes />
                  <GlobalCallModal />
                  <GlobalGroupCallModal />
                  {/* ⭐ Toast Notifications */}
                  <ToastContainer />
                </GroupCallProvider>
              </CallProvider>
            </SocketProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </Suspense>
  );
}

export default App;