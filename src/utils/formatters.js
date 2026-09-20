import {
  format,
  isToday,
  isYesterday,
  formatDistanceToNow,
  differenceInMinutes,
  differenceInHours,
} from "date-fns";
import { ar, enUS } from "date-fns/locale";

/**
 * تنسيق وقت الرسالة (HH:MM)
 */
export const formatMessageTime = (date, lang = "en") => {
  return format(new Date(date), "HH:mm", {
    locale: lang === "ar" ? ar : enUS,
  });
};

/**
 * تنسيق تاريخ المحادثة (في القائمة)
 */
export const formatChatTime = (date, lang = "en") => {
  const d = new Date(date);
  const locale = lang === "ar" ? ar : enUS;

  if (isToday(d)) return format(d, "HH:mm", { locale });
  if (isYesterday(d)) return lang === "ar" ? "أمس" : "Yesterday";
  return format(d, "dd/MM/yyyy", { locale });
};

/**
 * ⭐ تنسيق زمني ذكي — مثل واتساب/تلغرام
 * - أقل من دقيقة → "الآن"
 * - أقل من ساعة → "قبل X د"
 * - اليوم → "14:30"
 * - أمس → "أمس 14:30"
 * - أقدم → "15/09/2024"
 */
export const formatSmartTime = (date, lang = "en") => {
  if (!date) return "";

  const d = new Date(date);
  const now = new Date();
  const locale = lang === "ar" ? ar : enUS;

  const diffMins = differenceInMinutes(now, d);
  const diffHours = differenceInHours(now, d);

  // ⭐ أقل من دقيقة
  if (diffMins < 1) {
    return lang === "ar" ? "الآن" : "now";
  }

  // ⭐ أقل من ساعة
  if (diffMins < 60) {
    return lang === "ar" ? `قبل ${diffMins} د` : `${diffMins}m ago`;
  }

  // ⭐ اليوم
  if (isToday(d)) {
    return format(d, "HH:mm", { locale });
  }

  // ⭐ أمس
  if (isYesterday(d)) {
    const time = format(d, "HH:mm", { locale });
    return lang === "ar" ? `أمس ${time}` : `Yesterday ${time}`;
  }

  // ⭐ أقدم
  return format(d, "dd/MM/yyyy", { locale });
};

/**
 * "آخر ظهور قبل 5 دقائق"
 */
export const formatLastSeen = (date, lang = "en") => {
  if (!date) return "";
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: lang === "ar" ? ar : enUS,
  });
};

/**
 * تنسيق مدة الصوت/الفيديو (1:23)
 */
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * تقصير النص الطويل
 */
export const truncate = (text, length = 40) => {
  if (!text) return "";
  return text.length > length ? text.substring(0, length) + "..." : text;
};

/**
 * استخراج أحرف أولى من الاسم للـ Avatar
 */
export const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};
/**
 * ⭐ اسم العرض للمستخدم — يعرض "حساب محذوف" إذا كان الحساب محذوفاً.
 */
export const getDisplayName = (user, deletedLabel = "Deleted Account") => {
  if (!user) return deletedLabel;
  if (user.isDeleted) return deletedLabel;
  if (!user.username) return deletedLabel;
  return user.username;
};
