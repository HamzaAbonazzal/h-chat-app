/**
 * مُولّد الرنين عبر Web Audio API + الاهتزاز
 * — يعمل بدون ملفات MP3
 * — يتعامل مع Chrome's vibrate restrictions بهدوء
 */

let audioContext = null;
let currentOscillator = null;
let ringPatternTimer = null;
let vibratePatternTimer = null;

// ⭐ تتبع تفاعل المستخدم (لتجنب تحذيرات Chrome)
let userHasInteracted = false;

if (typeof window !== "undefined") {
  const markInteracted = () => {
    userHasInteracted = true;
    window.removeEventListener("click", markInteracted);
    window.removeEventListener("touchstart", markInteracted);
    window.removeEventListener("keydown", markInteracted);
  };
  window.addEventListener("click", markInteracted, { once: true });
  window.addEventListener("touchstart", markInteracted, { once: true });
  window.addEventListener("keydown", markInteracted, { once: true });
}

/**
 * تهيئة AudioContext
 */
const ensureAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (err) {
      console.warn("Web Audio API not supported:", err);
      return null;
    }
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
};

/**
 * تشغيل نغمة واحدة
 */
const playTone = (frequency, duration, startTime, volume = 0.15) => {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  // ⭐ Fade in/out لمنع النقرات
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
  gainNode.gain.setValueAtTime(volume, startTime + duration - 0.05);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
};

/**
 * ⭐ اهتزاز آمن — يتعامل مع Chrome restrictions بهدوء
 */
const safeVibrate = (pattern) => {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;

  try {
    navigator.vibrate(pattern);
  } catch (err) {
    // ⭐ تجاهل بهدوء — لا يُظهر في Console
  }
};

/**
 * نمط رنين المكالمة الواردة (كلاسيكي)
 */
const playIncomingCallPattern = () => {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // ⭐ النغمة الأساسية (كلاسيكية)
  playTone(440, 0.4, now, 0.2); // نغمة أولى
  playTone(480, 0.4, now + 0.6, 0.2); // نغمة ثانية

  // ⭐ جدولة التكرار
  ringPatternTimer = setTimeout(() => {
    playIncomingCallPattern();
  }, 2200);
};

/**
 * نمط "جارٍ الاتصال" (نغمة واحدة)
 */
const playCallingPattern = () => {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  playTone(440, 0.6, now, 0.1);

  ringPatternTimer = setTimeout(() => {
    playCallingPattern();
  }, 3000);
};

/**
 * نغمة انتهاء المكالمة (نغمة هابطة)
 */
const playEndCallTone = () => {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  playTone(660, 0.15, now, 0.15);
  playTone(440, 0.15, now + 0.2, 0.15);
  playTone(330, 0.3, now + 0.4, 0.15);
};

/**
 * إيقاف كل الأصوات والاهتزاز
 */
export const stopRingtones = () => {
  if (ringPatternTimer) {
    clearTimeout(ringPatternTimer);
    ringPatternTimer = null;
  }

  if (currentOscillator) {
    try {
      currentOscillator.stop();
    } catch {}
    currentOscillator = null;
  }

  // ⭐ إيقاف الاهتزاز بأمان
  safeVibrate(0);

  if (vibratePatternTimer) {
    clearTimeout(vibratePatternTimer);
    vibratePatternTimer = null;
  }
};

/**
 * تشغيل نغمة الرنين للمكالمة الواردة + اهتزاز
 */
export const startIncomingRingtone = () => {
  stopRingtones(); // ⭐ إيقاف أي نغمة سابقة

  try {
    playIncomingCallPattern();
  } catch (err) {
    console.warn("Failed to play incoming ringtone:", err);
  }

  // ⭐ الاهتزاز بأمان (على الجوال)
  const vibratePattern = [500, 300, 500, 1000]; // نمط كلاسيكي
  const vibrateLoop = () => {
    safeVibrate(vibratePattern);
    vibratePatternTimer = setTimeout(vibrateLoop, 3000);
  };
  vibrateLoop();
};

/**
 * تشغيل نغمة "جارٍ الاتصال"
 */
export const startCallingRingtone = () => {
  stopRingtones();

  try {
    playCallingPattern();
  } catch (err) {
    console.warn("Failed to play calling ringtone:", err);
  }
};

/**
 * تشغيل نغمة انتهاء المكالمة
 */
export const playEndCall = () => {
  stopRingtones();

  try {
    playEndCallTone();
  } catch (err) {
    console.warn("Failed to play end call tone:", err);
  }
};

/**
 * الاهتزاز عند رفض/إنهاء المكالمة
 */
export const vibrateShort = () => {
  safeVibrate(100);
};
