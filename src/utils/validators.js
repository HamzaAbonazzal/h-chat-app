export const validators = {
  email: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  username: (username) => {
    return /^[a-zA-Z0-9_]{3,30}$/.test(username);
  },

  password: (password) => {
    return password && password.length >= 6;
  },
};
