// ⭐ regex للاسم — يقبل العربية والإنجليزية
const USERNAME_REGEX = /^[\u0600-\u06FF\u0750-\u077Fa-zA-Z0-9_ ]+$/;

export const validators = {
  email: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  username: (username) => {
    if (!username) return false;
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 30) return false;
    return USERNAME_REGEX.test(trimmed);
  },

  password: (password) => {
    return password && password.length >= 6;
  },
};
