import { useState, useEffect } from "react";
import { Button, Spinner, ListGroup, Alert, Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { blockService } from "../../services/blockService";
import Avatar from "../common/Avatar";
import EmptyState from "../common/EmptyState";

const BlockedUsersList = () => {
  const { t } = useTranslation();
  const [blocked, setBlocked] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unblocking, setUnblocking] = useState(null);

  const fetchBlocked = async () => {
    setLoading(true);
    try {
      const data = await blockService.getBlockedUsers();
      setBlocked(data);
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocked();
  }, []);

  const handleUnblock = async (userId) => {
    setUnblocking(userId);
    try {
      await blockService.unblockUser(userId);
      setBlocked((prev) =>
        prev.filter((item) => item.user._id !== userId)
      );
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setUnblocking(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="success" />
      </div>
    );
  }

  const filtered = blocked.filter((item) =>
    item.user.username.toLowerCase().includes(search.toLowerCase())
  );

  if (blocked.length === 0) {
    return (
      <EmptyState
        icon="bi-shield-check"
        title={t("settings.blockedUsers")}
        description="No blocked users"
      />
    );
  }

  return (
    <div>
      {error && (
        <Alert variant="danger" className="small py-2">
          {error}
        </Alert>
      )}

      <Form.Control
        type="text"
        placeholder={t("common.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3"
      />

      <ListGroup variant="flush" className="border rounded">
        {filtered.map(({ user }) => (
          <ListGroup.Item
            key={user._id}
            className="d-flex align-items-center gap-3"
          >
            <Avatar user={user} size={42} />
            <div className="flex-grow-1">
              <div className="fw-semibold">{user.username}</div>
              <div className="text-muted small text-truncate">
                {user.bio || ""}
              </div>
            </div>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => handleUnblock(user._id)}
              disabled={unblocking === user._id}
            >
              {unblocking === user._id ? (
                <Spinner animation="border" size="sm" />
              ) : (
                t("common.delete")
              )}
            </Button>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </div>
  );
};

export default BlockedUsersList;