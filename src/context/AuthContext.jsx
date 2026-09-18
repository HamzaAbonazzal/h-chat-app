import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { authService } from "../services/authService";
import { storage } from "../utils/storage";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => storage.getUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  // ⭐ عند بدء التطبيق: تحقق من صحة التوكن
  useEffect(() => {
    isMounted.current = true;

    const initAuth = async () => {
      const token = storage.getToken();

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const freshUser = await authService.getMe();
        if (isMounted.current) {
          setUser(freshUser);
          storage.setUser(freshUser);
        }
      } catch (err) {
        // التوكن منتهي أو غير صالح
        if (isMounted.current) {
          storage.clear();
          setUser(null);
        }
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // ⭐ تسجيل الدخول
  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const data = await authService.login(email, password);
      storage.setToken(data.accessToken);
      storage.setRefreshToken(data.refreshToken);
      storage.setUser(data);
      setUser(data);
      return data;
    } catch (err) {
      const message =
        err.response?.data?.message || "Login failed";
      setError(message);
      throw new Error(message);
    }
  }, []);

  // ⭐ تسجيل حساب جديد
  const register = useCallback(async (username, email, password) => {
    setError(null);
    try {
      const data = await authService.register(username, email, password);
      storage.setToken(data.accessToken);
      storage.setRefreshToken(data.refreshToken);
      storage.setUser(data);
      setUser(data);
      return data;
    } catch (err) {
      const message =
        err.response?.data?.message || "Registration failed";
      setError(message);
      throw new Error(message);
    }
  }, []);

  // ⭐ تسجيل الخروج
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      // نتجاهل الأخطاء — المستخدم يريد الخروج
    } finally {
      storage.clear();
      setUser(null);
    }
  }, []);

  // ⭐ تحديث بيانات المستخدم (بعد تعديل الملف الشخصي)
  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      storage.setUser(updated);
      return updated;
    });
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};