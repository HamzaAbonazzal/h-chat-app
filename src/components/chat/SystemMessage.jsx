import { useTranslation } from "react-i18next";

const SystemMessage = ({ message }) => {
  const { t } = useTranslation();

  if (!message?.systemMessage) return null;

  const { action, actor, target, metadata } = message.systemMessage;

  const actorName = actor?.username || "?";
  const targetName = target?.username || "?";

  const getText = () => {
    switch (action) {
      case "group_created":
        return (
          <>
            <strong>{actorName}</strong> {t("systemMessages.groupCreated")}
          </>
        );
      case "user_added":
        return (
          <>
            <strong>{actorName}</strong> {t("systemMessages.userAdded")}{" "}
            <strong>{targetName}</strong>
          </>
        );
      case "user_left":
        return (
          <>
            <strong>{actorName}</strong> {t("systemMessages.userLeft")}
          </>
        );
      case "user_removed":
        return (
          <>
            <strong>{actorName}</strong> {t("systemMessages.userRemoved")}{" "}
            <strong>{targetName}</strong>
          </>
        );
      case "admin_promoted":
        return (
          <>
            <strong>{targetName}</strong> {t("systemMessages.adminPromoted")}
          </>
        );
      case "admin_demoted":
        return (
          <>
            <strong>{targetName}</strong> {t("systemMessages.adminDemoted")}
          </>
        );
      case "group_name_changed":
        return (
          <>
            <strong>{actorName}</strong>{" "}
            {t("systemMessages.groupNameChanged")}
          </>
        );
      case "group_photo_changed":
        return (
          <>
            <strong>{actorName}</strong>{" "}
            {t("systemMessages.groupPhotoChanged")}
          </>
        );
      case "group_description_changed":
        return (
          <>
            <strong>{actorName}</strong>{" "}
            {t("systemMessages.groupDescriptionChanged")}
          </>
        );
      case "permissions_changed":
        return (
          <>
            <strong>{actorName}</strong>{" "}
            {t("systemMessages.permissionsChanged")}
          </>
        );
            case "disappearing_changed": {
        const dur = metadata?.duration || 0;
        if (dur === 0) {
          return (
            <>
              <strong>{actorName}</strong>{" "}
              {t("systemMessages.disappearingDisabled")}
            </>
          );
        }
        const labels = {
          86400: t("chat.disappearing24h"),
          604800: t("chat.disappearing7d"),
          7776000: t("chat.disappearing90d"),
        };
        return (
          <>
            <strong>{actorName}</strong>{" "}
            {t("systemMessages.disappearingEnabled")}:{" "}
            <strong>{labels[dur] || `${dur}s`}</strong>
          </>
        );
      }      case "message_pinned":
        return (
          <>
            <strong>{actorName}</strong> {t("systemMessages.messagePinned")}
          </>
        );
      case "message_unpinned":
        return (
          <>
            <strong>{actorName}</strong> {t("systemMessages.messageUnpinned")}
          </>
        );
      default:
        return t("systemMessages.unknown");
    }
  };

  return (
    <div className="d-flex justify-content-center my-2">
      <div
        className="small text-muted px-3 py-1 rounded-pill"
        style={{
          backgroundColor: "var(--bs-body-bg)",
          border: "1px solid var(--bs-border-color)",
          maxWidth: "80%",
          textAlign: "center",
          fontSize: "0.72rem",
        }}
      >
        <i className="bi bi-info-circle me-1"></i>
        {getText()}
      </div>
    </div>
  );
};

export default SystemMessage;