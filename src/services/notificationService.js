import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging, VAPID_KEY } from "../config/firebase";
import api from "./api";

export const notificationService = {
  /**
   * فحص دعم المتصفح.
   */
  isSupported: () => {
    return (
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator
    );
  },

  /**
   * طلب إذن الإشعارات.
   * يعيد: "granted" | "denied" | "default" | "unsupported"
   */
  requestPermission: async () => {
    if (!notificationService.isSupported()) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (err) {
      console.error("Permission request failed:", err);
      return "default";
    }
  },

  /**
   * تسجيل Service Worker.
   */
  registerServiceWorker: async () => {
    if (!notificationService.isSupported()) return null;

    try {
      // const registration = await navigator.serviceWorker.register(
      //   "/firebase-messaging-sw.js",
      //   { scope: "/" },
      // );
      const registration = await navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}firebase-messaging-sw.js`,
        { scope: import.meta.env.BASE_URL },
      );
      console.log("✅ SW registered:", registration.scope);
      return registration;
    } catch (err) {
      console.error("❌ SW registration failed:", err);
      return null;
    }
  },

  /**
   * جلب FCM Token.
   */
  getFCMToken: async () => {
    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      console.warn("Messaging not supported");
      return null;
    }

    if (!VAPID_KEY) {
      console.warn("VAPID key not configured");
      return null;
    }

    try {
      // انتظر حتى يصبح Service Worker جاهزاً
      const swRegistration = await navigator.serviceWorker.ready;

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration,
      });

      return token || null;
    } catch (err) {
      console.error("❌ Failed to get FCM token:", err);
      return null;
    }
  },

  /**
   * تسجيل التوكن في الـ Backend.
   */
  registerTokenWithBackend: async (token) => {
    const { data } = await api.post("/notifications/register-token", {
      token,
      device: "web",
    });
    return data;
  },

  /**
   * إلغاء تسجيل التوكن من الـ Backend.
   */
  unregisterTokenFromBackend: async (token) => {
    try {
      await api.delete("/notifications/unregister-token", {
        data: { token },
      });
    } catch (err) {
      console.error("Unregister failed:", err);
    }
  },

  /**
   * الاستماع للرسائل في الـ Foreground.
   * يعيد دالة unsubscribe.
   */
  onForegroundMessage: async (callback) => {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return () => {};

    return onMessage(messaging, (payload) => {
      callback(payload);
    });
  },
};
