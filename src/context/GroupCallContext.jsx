import { createContext, useContext } from "react";
import { useGroupCall } from "../hooks/useGroupCall";

const GroupCallContext = createContext(null);

export const GroupCallProvider = ({ children }) => {
  const groupCall = useGroupCall();

  return (
    <GroupCallContext.Provider value={groupCall}>
      {children}
    </GroupCallContext.Provider>
  );
};

export const useGroupCallContext = () => {
  const context = useContext(GroupCallContext);
  if (!context) {
    throw new Error(
      "useGroupCallContext must be used within GroupCallProvider"
    );
  }
  return context;
};

export default GroupCallContext;