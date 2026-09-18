/**
 * يحوّل خطأ Axios أو Error إلى نص مترجم حسب اللغة الحالية.
 *
 * @param {Error} error - كائن الخطأ من catch
 * @param {Function} t - دالة الترجمة من useTranslation
 * @returns {string} - رسالة الخطأ المترجمة
 */
export const translateError = (error, t) => {
  // 1) خطأ شبكة (لا يوجد response)
  if (error?.message === "Network Error" || !error?.response) {
    if (error?.message === "Network Error") {
      return t("errorCodes.NETWORK_ERROR");
    }
  }

  // 2) خطأ من الخادم مع code
  const responseData = error?.response?.data;
  if (responseData?.code && t) {
    const key = `errorCodes.${responseData.code}`;
    const translated = t(key);
    // إذا وُجدت الترجمة، أرجعها
    if (translated !== key) return translated;
  }

  // 3) خطأ من الخادم برسالة فقط
  if (responseData?.message) {
    return responseData.message;
  }

  // 4) خطأ من الـ JS نفسه (رميناه بأنفسنا)
  if (error?.message) {
    return error.message;
  }

  // 5) الافتراضي
  return t ? t("errorCodes.UNKNOWN") : "An unexpected error occurred";
};
