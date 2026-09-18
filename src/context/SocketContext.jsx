import {
  createContext,
  useState,
  useEffect,
  useRef,
  useContext,
} from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";

export const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("🔌 Socket connected:", newSocket.id);
      setIsConnected(true);
      newSocket.emit("setup", user._id);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      setIsConnected(false);
    });

    newSocket.on("onlineUsers", (userIds) => {
      setOnlineUsers(new Set(userIds));
    });

    newSocket.on("contactsStatus", (statuses) => {
      const onlineSet = new Set();
      statuses.forEach((s) => {
        if (s.isOnline) onlineSet.add(s.userId);
      });
      setOnlineUsers(onlineSet);
    });

    newSocket.on("userOnline", ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
    });

    newSocket.on("userOffline", ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    return () => {
      newSocket.off("connect");
      newSocket.off("disconnect");
      newSocket.off("connect_error");
      newSocket.off("onlineUsers");
      newSocket.off("contactsStatus");
      newSocket.off("userOnline");
      newSocket.off("userOffline");
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [user?._id]);

  // ⭐ إرسال حدث — مع حماية
  const emit = (event, data) => {
    const sock = socketRef.current;
    if (sock && sock.connected) {
      sock.emit(event, data);
    }
  };

  // ⭐ الاستماع لحدث — نحفظ مرجع socket في closure
  const on = (event, handler) => {
    const sock = socketRef.current;
    if (!sock) return () => {};

    sock.on(event, handler);

    // ⭐ نحفظ sock في closure — لا نعتمد على socketRef.current لاحقاً
    return () => {
      if (sock && typeof sock.off === "function") {
        sock.off(event, handler);
      }
    };
  };

  const off = (event, handler) => {
    const sock = socketRef.current;
    if (sock && typeof sock.off === "function") {
      sock.off(event, handler);
    }
  };

  const value = {
    socket,
    isConnected,
    onlineUsers,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};