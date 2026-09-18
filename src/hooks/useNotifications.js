import { useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { notificationService } from "../services/notificationService";

export const useNotifications = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  const tokenRef = useRef(null);
  const swRegisteredRef = useRef(false);

  // ⭐ تسجيل SW مرة واحدة عند البدء
  useEffect(() => {
    if (swRegisteredRef.current) return;
    if (!notificationService.isSupported()) return;

    notificationService.registerServiceWorker().then((reg) => {
      if (reg) swRegisteredRef.current = true;
    });
  }, []);

  // ⭐ عند تسجيل الدخول: اطلب الإذن، اجلب التوكن، سجّله في Backend
  useEffect(() => {
    // عند تسجيل الخروج
    if (!isAuthenticated || !user) {
      if (tokenRef.current) {
        notificationService.unregisterTokenFromBackend(tokenRef.current);
        tokenRef.current = null;
      }
      return;
    }

    if (!notificationService.isSupported()) return;

    let cancelled = false;

    const setup = async () => {
      try {
        // 1. اطلب الإذن
        const permission = await notificationService.requestPermission();
        if (cancelled) return;
        if (permission !== "granted") {
          console.log("Notification permission:", permission);
          return;
        }

        // 2. انتظر حتى يكون SW جاهزاً
        await navigator.serviceWorker.ready;
        if (cancelled) return;

        // 3. اجلب FCM Token
        const token = await notificationService.getFCMToken();
        if (!token || cancelled) return;

        tokenRef.current = token;

        // 4. سجّله في الـ Backend
        await notificationService.registerTokenWithBackend(token);
        console.log("✅ FCM token registered with backend");
      } catch (err) {
        if (!cancelled) {
          console.error("Notification setup error:", err.message);
        }
      }
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?._id]);

  // ⭐ استقبال الرسائل في الـ Foreground (التطبيق مفتوح)
  useEffect(() => {
    if (!isAuthenticated) return;

    let unsubscribe = null;

    const setup = async () => {
      unsubscribe = await notificationService.onForegroundMessage((payload) => {
        console.log("📬 Foreground message:", payload);

        const data = payload.data || {};
        const title = payload.notification?.title || "رسالة جديدة";
        const body = payload.notification?.body || "";

        // عرض إشعار المتصفح حتى لو كان التطبيق مفتوحاً
        if (Notification.permission === "granted") {
          const notification = new Notification(title, {
            body,
            icon: "/icon-192.png",
            tag: data.conversationId || "foreground",
          });

          notification.onclick = () => {
            window.focus();
            if (data.link) {
              navigate(data.link);
            }
            notification.close();
          };
        }
      });
    };

    setup();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAuthenticated, navigate]);
};
