export const MESSAGE_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
  FILE: "file",
};

export const MESSAGE_STATUS = {
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
};

export const PRIVACY_OPTIONS = [
  { value: "everyone", labelKey: "settings.everyone" },
  { value: "contacts", labelKey: "settings.contacts" },
  { value: "nobody", labelKey: "settings.nobody" },
];

export const THEMES = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
};

export const LANGUAGES = [
  { code: "en", name: "English", dir: "ltr" },
  { code: "ar", name: "العربية", dir: "rtl" },
];

export const SOCKET_EVENTS = {
  SETUP: "setup",
  JOIN_CONVERSATION: "joinConversation",
  LEAVE_CONVERSATION: "leaveConversation",
  TYPING: "typing",
  STOP_TYPING: "stopTyping",
  NEW_MESSAGE: "newMessage",
  MESSAGE_DELIVERED: "messageDelivered",
  MESSAGE_READ: "messageRead",
  MESSAGES_READ: "messagesRead",
  CONVERSATION_OPENED: "conversationOpened",
  UNREAD_COUNT_UPDATED: "unreadCountUpdated",
  USER_ONLINE: "userOnline",
  USER_OFFLINE: "userOffline",
  CONTACTS_STATUS: "contactsStatus",
  INCOMING_CALL: "incomingCall",
  CALL_ACCEPTED: "callAccepted",
  CALL_ENDED: "callEnded",
  CALL_REJECTED: "callRejected",
  ICE_CANDIDATE: "iceCandidate",
};
