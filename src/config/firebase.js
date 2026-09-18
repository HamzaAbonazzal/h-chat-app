import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * إرجاع messaging إذا كان المتصفح يدعمه، وإلا null.
 */
export const getFirebaseMessaging = async () => {
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(app);
  } catch (err) {
    console.error("Messaging not supported:", err);
    return null;
  }
};
