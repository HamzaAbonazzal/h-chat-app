/**
 * ⭐ Safe localStorage wrapper
 * — يتعامل مع JSON.parse بأمان
 */

// ⭐ دالة قراءة آمنة
const safeGet = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);

    // ⭐ تجاهل: null، فارغ، "undefined"، "null"
    if (raw === null || raw === "" || raw === "undefined" || raw === "null") {
      return fallback;
    }

    return JSON.parse(raw);
  } catch (err) {
    console.warn(`⚠️ Failed to parse localStorage["${key}"]:`, err.message);
    // ⭐ نظّف القيمة التالفة
    try {
      localStorage.removeItem(key);
    } catch {}
    return fallback;
  }
};

// ⭐ دالة كتابة آمنة
const safeSet = (key, value) => {
  try {
    // ⭐ تجاهل undefined
    if (value === undefined) {
      localStorage.removeItem(key);
      return;
    }

    // ⭐ تجاهل null
    if (value === null) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`❌ Failed to save localStorage["${key}"]:`, err.message);
  }
};

export const storage = {
  // ═══════════════════════════════════════════════════════
  //  Access Token
  // ═══════════════════════════════════════════════════════
  getToken: () => {
    try {
      const token = localStorage.getItem("accessToken");
      // ⭐ تحقق من القيم التالفة
      if (!token || token === "undefined" || token === "null") {
        return null;
      }
      return token;
    } catch {
      return null;
    }
  },

  setToken: (token) => {
    try {
      if (!token || typeof token !== "string") {
        localStorage.removeItem("accessToken");
        return;
      }
      localStorage.setItem("accessToken", token);
    } catch (err) {
      console.error("Failed to save token:", err.message);
    }
  },

  // ═══════════════════════════════════════════════════════
  //  Refresh Token
  // ═══════════════════════════════════════════════════════
  getRefreshToken: () => {
    try {
      const token = localStorage.getItem("refreshToken");
      if (!token || token === "undefined" || token === "null") {
        return null;
      }
      return token;
    } catch {
      return null;
    }
  },

  setRefreshToken: (token) => {
    try {
      if (!token || typeof token !== "string") {
        localStorage.removeItem("refreshToken");
        return;
      }
      localStorage.setItem("refreshToken", token);
    } catch (err) {
      console.error("Failed to save refresh token:", err.message);
    }
  },

  // ═══════════════════════════════════════════════════════
  //  User Object
  // ═══════════════════════════════════════════════════════
  getUser: () => {
    return safeGet("user", null);
  },

  setUser: (user) => {
    safeSet("user", user);
  },

  // ═══════════════════════════════════════════════════════
  //  Clear All
  // ═══════════════════════════════════════════════════════
  clear: () => {
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    } catch (err) {
      console.error("Failed to clear storage:", err.message);
    }
  },
};
