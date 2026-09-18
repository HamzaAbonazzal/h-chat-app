import { createContext, useState, useCallback, useContext } from "react";

const ToastContext = createContext(null);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, options = {}) => {
    const id = ++toastId;
    const toast = {
      id,
      message,
      type: options.type || "info", // success | error | warning | info
      duration: options.duration || 3000,
      icon: options.icon,
    };

    setToasts((prev) => [...prev, toast]);

    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ⭐ دوال مساعدة
  const success = useCallback(
    (message, options = {}) => addToast(message, { ...options, type: "success" }),
    [addToast]
  );
  const error = useCallback(
    (message, options = {}) => addToast(message, { ...options, type: "error" }),
    [addToast]
  );
  const warning = useCallback(
    (message, options = {}) => addToast(message, { ...options, type: "warning" }),
    [addToast]
  );
  const info = useCallback(
    (message, options = {}) => addToast(message, { ...options, type: "info" }),
    [addToast]
  );

  const value = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

export default ToastContext;