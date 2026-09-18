import { Image } from "react-bootstrap";
import { getInitials } from "../../utils/formatters";

const Avatar = ({ user, size = 40, showOnline = false, isOnline = false }) => {
  const avatarUrl = user?.avatar;
  const name = user?.username || "?";

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
        <Image src={avatarUrl} style={imageStyle} alt={name} roundedCircle />
      ) : (
        <div
          style={{
            ...imageStyle,
            backgroundColor: "#008069",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: size * 0.4,
          }}
        >
          {getInitials(name)}
        </div>
      )}
      {showOnline && <div style={onlineDotStyle} />}
    </div>
  );
};

export default Avatar;