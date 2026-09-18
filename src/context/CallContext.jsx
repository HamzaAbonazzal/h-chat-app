import { createContext, useContext } from "react";
import { useWebRTC } from "../hooks/useWebRTC";

const CallContext = createContext(null);

export const CallProvider = ({ children }) => {
  const webrtc = useWebRTC();

  return (
    <CallContext.Provider value={webrtc}>{children}</CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within CallProvider");
  }
  return context;
};

export default CallContext;