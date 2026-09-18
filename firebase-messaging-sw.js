/* eslint-disable no-undef */
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js",
);

// ⚠️ استبدل بقيمك الحقيقية من Firebase
firebase.initializeApp({
  apiKey: "AIza...",
  authDomain: "chat-app-notifications.firebaseapp.com",
  projectId: "chat-app-notifications",
  storageBucket: "chat-app-notifications.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123...",
});

firebase.messaging();

// ⭐ FCM يعرض الإشعار تلقائياً (بسبب وجود notification)
// نتوقف هنا لتجنب الازدواج

// ⭐ عند النقر على الإشعار
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const isCall = data.type === "incoming_call";

  // ⭐ بناء الرابط
  let link = data.link || "/";
  if (isCall && data.callId) {
    link = `/?incoming_call=${data.callId}&caller=${data.callerId}&callType=${data.callType}`;
  }

  const fullUrl = new URL(link, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (
            client.url.startsWith(self.location.origin) &&
            "focus" in client
          ) {
            client.navigate(fullUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      }),
  );
});

// ⭐ إغلاق الإشعار عند الرد على المكالمة من مكان آخر
self.addEventListener("message", (event) => {
  if (event.data?.type === "close-call-notification") {
    self.registration
      .getNotifications({ tag: "incoming_call" })
      .then((notifications) => {
        notifications.forEach((n) => n.close());
      });
  }
});
