import { Image } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { getInitials, getDisplayName } from "../../utils/formatters";

const Avatar = ({ user, size = 40, showOnline = false, isOnline = false }) => {
  const { t } = useTranslation();

  const displayName = getDisplayName(user, t("chat.deletedAccount"));
  const avatarUrl = user?.isDeleted ? "" : user?.avatar;

  const containerStyle = {
    width: size,
    height: size,
    position: "relative",
    flexShrink: 0,
  };

  const imageStyle = {
    width: size,
    height: size,
    borderRadius: "50%",
    objectFit: "cover",
  };

  const onlineDotStyle = {
    width: size * 0.3,
    height: size * 0.3,
    position: "absolute",
    bottom: 0,
    right: 0,
    borderRadius: "50%",
    border: "2px solid var(--bs-body-bg)",
    backgroundColor: isOnline ? "#25d366" : "#8696a0",
  };

  return (
    <div style={containerStyle}>
      {avatarUrl ? (
        <Image src={avatarUrl} style={imageStyle} alt={displayName} roundedCircle />
      ) : (
        <div
          style={{
            ...imageStyle,
            backgroundColor: user?.isDeleted ? "#6c757d" : "#008069",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: size * 0.4,
          }}
        >
          {user?.isDeleted ? (
            <i className="bi bi-person-x" style={{ fontSize: size * 0.5 }}></i>
          ) : (
            getInitials(displayName)
          )}
        </div>
      )}
      {showOnline && !user?.isDeleted && <div style={onlineDotStyle} />}
    </div>
  );
};

export default Avatar;