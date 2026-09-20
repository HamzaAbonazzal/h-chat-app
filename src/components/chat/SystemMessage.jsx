import { useTranslation } from "react-i18next";
import { getDisplayName } from "../../utils/formatters";

const SystemMessage = ({ message }) => {
  const { t } = useTranslation();

  if (!message?.systemMessage) return null;

  const { action, actor, target, metadata } = message.systemMessage;

  const actorName = getDisplayName(actor, t("chat.deletedAccount"));
  const targetName = getDisplayName(target, t("chat.deletedAccount"));

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