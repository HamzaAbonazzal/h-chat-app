// public/firebase-messaging-sw.js

// ⭐ يجب أن يكون هذا الملف في مجلد public/
// ⭐ لا يمكنه قراءة متغيرات البيئة، لذا القيم مكتوبة مباشرة هنا
// ⭐ هذه القيم ليست سرية (نفس القيم موجودة في كود الفرونت)

importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js",
);

// ⭐ إعدادات Firebase (انسخها من firebaseConfig في كودك)
firebase.initializeApp({
  apiKey: "AIzaSyC889724ecQJDy7KMUgoPEPW3QRFZNLgjg",
  authDomain: "chat-app-notifications-692cf.firebaseapp.com",
  projectId: "hat-app-notifications-692cf",
  storageBucket: "chat-app-notifications-692cf.firebasestorage.app",
  messagingSenderId: "368919673928",
  appId: "1:368919673928:web:71ca3faa8c6a90da646c7d",
});

const messaging = firebase.messaging();

// ⭐ مسار التطبيق على GitHub Pages
const APP_BASE = "/h-chat-app/";

// ============ Background Messages ============

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background message:", payload);

  const notificationTitle =
    payload.notification?.title || payload.data?.title || "رسالة جديدة";

  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || "",
    icon: `${APP_BASE}logo192.png`,
    badge: `${APP_BASE}logo192.png`,
    tag: payload.data?.chatId || "default",
    renotify: true,
    data: {
      ...payload.data,
      click_action: payload.data?.link || APP_BASE,
    },
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions,
  );
});

// ============ Notification Click ============

self.addEventListener("notificationclick", (event) => {
  console.log("[firebase-messaging-sw.js] Notification clicked:", event);

  event.notification.close();

  // ⭐ المسار الذي سيُفتح عند الضغط على الإشعار
  const link = event.notification.data?.click_action || APP_BASE;

  // ⭐ إذا كان الرابط نسبيًا، أضف المسار الكامل
  const fullUrl = link.startsWith("http")
    ? link
    : `${self.location.origin}${APP_BASE}#${link.startsWith("/") ? link : "/" + link}`;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // ⭐ إذا كان التطبيق مفتوحًا في نافذة، ركّز عليها
        for (const client of clientList) {
          if (client.url.includes(APP_BASE) && "focus" in client) {
            return client.focus();
          }
        }
        // ⭐ وإلا افتح نافذة جديدة
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      }),
  );
});

// ============ Service Worker Install/Activate ============

self.addEventListener("install", (event) => {
  console.log("[firebase-messaging-sw.js] Installing...");
  self.skipWaiting(); // ⭐ تفعيل SW الجديد فورًا
});

self.addEventListener("activate", (event) => {
  console.log("[firebase-messaging-sw.js] Activating...");
  event.waitUntil(self.clients.claim()); // ⭐ السيطرة على الصفحات المفتوحة
});
