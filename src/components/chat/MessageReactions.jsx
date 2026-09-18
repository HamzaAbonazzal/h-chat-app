import { useTranslation } from "react-i18next";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

const MessageReactions = ({
  reactions = [],
  currentUserId,
  isMine,
  onToggleReaction,
}) => {
  const { t } = useTranslation();

  if (!reactions || reactions.length === 0) return null;

  // ⭐ تجميع حسب الإيموجي
  const grouped = {};
  reactions.forEach((r) => {
    const userId = r.user?._id || r.user;
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = {
        emoji: r.emoji,
        count: 0,
        users: [],
        hasMe: false,
      };
    }
    grouped[r.emoji].count++;
    grouped[r.emoji].users.push({
      _id: userId,
      username: r.user?.username || "User",
    });
    if (userId === currentUserId) {
      grouped[r.emoji].hasMe = true;
    }
  });

  const groupedList = Object.values(grouped);

  // ⭐ tooltip يعرض أسماء المتفاعلين
  const buildTooltip = (users) => {
    const names = users.map((u) => u.username);
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  };

  return (
    <div
      className={`d-flex flex-wrap gap-1 mt-1 ${
        isMine ? "justify-content-end" : "justify-content-start"
      }`}
    >
      {groupedList.map((group) => (
        <OverlayTrigger
          key={group.emoji}
          placement="top"
          overlay={
            <Tooltip id={`tooltip-${group.emoji}`}>
              {buildTooltip(group.users)}
            </Tooltip>
          }
        >
          <button
            type="button"
            className={`reaction-pill ${group.hasMe ? "reaction-pill-mine" : ""}`}
            onClick={() => onToggleReaction?.(group.emoji)}
            style={{
              cursor: "pointer",
              border: "none",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "0.78rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              backgroundColor: group.hasMe
                ? "rgba(0, 128, 105, 0.15)"
                : "var(--bs-body-bg)",
              border: group.hasMe
                ? "1px solid #008069"
                : "1px solid var(--bs-border-color)",
              color: "var(--bs-body-color)",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: "0.9rem" }}>{group.emoji}</span>
            {group.count > 1 && (
              <span className="fw-semibold">{group.count}</span>
            )}
          </button>
        </OverlayTrigger>
      ))}
    </div>
  );
};

export default MessageReactions;