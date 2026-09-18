import { useMemo, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";
import { messageService } from "../../services/messageService";
import { conversationService } from "../../services/conversationService";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import ForwardModal from "./ForwardModal";
import SearchBar from "./SearchBar";
import GroupInfoModal from "./GroupInfoModal";
import MessageInfoModal from "./MessageInfoModal";
import DisappearingModal from "./DisappearingModal";
import PinnedMessagesBar from "./PinnedMessagesBar";
import PinnedMessagesModal from "./PinnedMessagesModal";
import MediaLightbox from "./MediaLightbox";
import EmptyState from "../common/EmptyState";

const ChatWindow = ({
  conversation,
  onBack,
  onConversationDeleted,
  onLeft,
  onConversationUpdated,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  const {
    messages,
    pendingUploads,
    firstUnreadMessageId,
    clearFirstUnread,
    loading,
    hasMore,
    typingUsers,
    contextMode,
    pinnedMessages,
    sendMessage,
    sendMediaMessage,
    forwardMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    toggleStar,
    togglePinMessage,
    loadContext,
    exitContext,
    clearChat,
    loadMore,
    startTyping,
    stopTyping,
  } = useChat(conversation?._id);

  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [infoMessage, setInfoMessage] = useState(null);
  const [showDisappearing, setShowDisappearing] = useState(false);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [currentPinIndex, setCurrentPinIndex] = useState(0);

  // ⭐ حالة Media Lightbox الموحّد (صور + فيديو)
  const [lightboxMedia, setLightboxMedia] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);

  const messageListRef = useRef(null);

  const typingList = useMemo(() => {
    return Object.entries(typingUsers)
      .filter(([uid]) => uid !== user._id)
      .map(([uid, username]) => ({ userId: uid, username }));
  }, [typingUsers, user._id]);

  const pinnedIds = useMemo(
    () => new Set(pinnedMessages.map((m) => m._id)),
    [pinnedMessages]
  );

  useEffect(() => {
    setReplyingTo(null);
    setForwardingMessage(null);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setCurrentResultIndex(0);
    setShowGroupInfo(false);
    setInfoMessage(null);
    setShowDisappearing(false);
    setShowPinnedModal(false);
    setCurrentPinIndex(0);
    setLightboxMedia([]);
    setLightboxIndex(0);
  }, [conversation?._id]);

  useEffect(() => {
    const messageId = location.state?.messageId;
    if (!messageId || !messages.length) return;

    const timer = setTimeout(() => {
      messageListRef.current?.scrollToMessage(messageId);
    }, 500);

    window.history.replaceState({}, "");

    return () => clearTimeout(timer);
  }, [location.state, messages.length]);

  const handleReply = (message) => setReplyingTo(message);
  const handleCancelReply = () => setReplyingTo(null);
  const handleForward = (message) => setForwardingMessage(message);

  const handleConfirmForward = async (targetConversationId) => {
    if (!forwardingMessage) return;
    await forwardMessage(forwardingMessage._id, targetConversationId);
    setForwardingMessage(null);
  };

  const handleTogglePin = async () => {
    if (!conversation) return;
    try {
      const result = await conversationService.togglePin(conversation._id);
      onConversationUpdated?.({
        ...conversation,
        isPinned: result.isPinned,
      });
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === "PIN_LIMIT_REACHED") {
        alert(t("errorCodes.PIN_LIMIT_REACHED"));
      } else {
        console.error("Pin failed:", err);
      }
    }
  };

  const handleToggleMute = async (duration) => {
    if (!conversation) return;
    try {
      const result = await conversationService.toggleMute(
        conversation._id,
        duration
      );
      onConversationUpdated?.({
        ...conversation,
        isMuted: result.isMuted,
        muteUntil: result.muteUntil,
      });
    } catch (err) {
      console.error("Mute failed:", err);
    }
  };

  const handleToggleArchive = async () => {
    if (!conversation) return;
    try {
      const result = await conversationService.toggleArchive(conversation._id);
      onConversationUpdated?.({
        ...conversation,
        isArchived: result.isArchived,
        isPinned: result.isArchived ? false : conversation.isPinned,
      });
      if (result.isArchived) {
        onBack?.();
      }
    } catch (err) {
      console.error("Archive failed:", err);
    }
  };

  const handleClearChat = async () => {
    if (!conversation) return;
    try {
      await clearChat();
    } catch (err) {
      console.error("Clear chat failed:", err);
    }
  };

  const handleNavigatePin = (direction) => {
    if (pinnedMessages.length === 0) return;
    const newIndex =
      (currentPinIndex + direction + pinnedMessages.length) %
      pinnedMessages.length;
    setCurrentPinIndex(newIndex);
    messageListRef.current?.scrollToMessage(pinnedMessages[newIndex]._id);
  };

  const handleJumpToPinned = (messageId) => {
    messageListRef.current?.scrollToMessage(messageId);
  };

  const handleUnpinFromModal = async (messageId) => {
    try {
      await togglePinMessage(messageId);
    } catch (err) {
      console.error("Unpin failed:", err);
    }
  };

  // ⭐ فتح وسائط (صورة/فيديو) في Lightbox الموحّد
  const handleOpenImage = (mediaMessage) => {
    const mediaMessages = messages.filter(
      (m) =>
        (m.type === "image" || m.type === "video") &&
        (m.mediaUrl || m._localPreviewUrl) &&
        !m.isDeleted &&
        !m._isPending
    );

    const allMedia = mediaMessages.map((m) => ({
      type: m.type,
      url: m._localPreviewUrl || m.mediaUrl,
      filename: `media-${m._id}`,
      _id: m._id,
      sender: m.sender,
      createdAt: m.createdAt,
    }));

    if (allMedia.length === 0) return;

    const index = allMedia.findIndex((m) => m._id === mediaMessage._id);

    setLightboxMedia(allMedia);
    setLightboxIndex(index >= 0 ? index : 0);
  };

  const handleCloseLightbox = () => {
    setLightboxMedia([]);
    setLightboxIndex(0);
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (!query) {
      setSearchResults([]);
      setCurrentResultIndex(0);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await messageService.searchInConversation(
        conversation._id,
        query,
        1,
        50
      );
      setSearchResults(res.data || []);
      setCurrentResultIndex(0);

      if (res.data && res.data.length > 0) {
        setTimeout(() => {
          messageListRef.current?.scrollToMessage(res.data[0]._id);
        }, 100);
      }
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleNavigate = (direction) => {
    if (searchResults.length === 0) return;

    const newIndex =
      (currentResultIndex + direction + searchResults.length) %
      searchResults.length;

    setCurrentResultIndex(newIndex);
    messageListRef.current?.scrollToMessage(searchResults[newIndex]._id);
  };

  const handleCloseSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setCurrentResultIndex(0);
  };

  if (!conversation) {
    return (
      <EmptyState
        icon="bi-chat-text"
        title={t("chat.selectChat")}
        description={t("chat.startConversation")}
      />
    );
  }

  return (
    <div className="h-100 d-flex flex-column">
      {searchOpen ? (
        <SearchBar
          onSearch={handleSearch}
          onClose={handleCloseSearch}
          resultsCount={searchResults.length}
          currentIndex={currentResultIndex}
          onNavigate={handleNavigate}
          loading={searchLoading}
        />
      ) : (
        <>
          <ChatHeader
            conversation={conversation}
            currentUserId={user._id}
            onBack={onBack}
            onConversationDeleted={onConversationDeleted}
            onOpenSearch={() => setSearchOpen(true)}
            onOpenGroupInfo={() => setShowGroupInfo(true)}
            onTogglePin={handleTogglePin}
            onToggleMute={handleToggleMute}
            onToggleArchive={handleToggleArchive}
            onOpenDisappearing={() => setShowDisappearing(true)}
            onClearChat={handleClearChat}
          />

          {pinnedMessages.length > 0 && (
            <PinnedMessagesBar
              pinnedMessages={pinnedMessages}
              currentIndex={currentPinIndex}
              onJumpTo={handleJumpToPinned}
              onShowAll={() => setShowPinnedModal(true)}
              onNavigate={handleNavigatePin}
            />
          )}
        </>
      )}

      <div className="flex-grow-1 position-relative overflow-hidden">
        <MessageList
          ref={messageListRef}
          messages={messages}
          pendingUploads={pendingUploads}
          firstUnreadMessageId={firstUnreadMessageId}
          onClearFirstUnread={clearFirstUnread}
          loading={loading}
          currentUserId={user._id}
          onDelete={deleteMessage}
          onEdit={editMessage}
          onReply={handleReply}
          onForward={handleForward}
          onToggleReaction={toggleReaction}
          onToggleStar={toggleStar}
          onTogglePin={togglePinMessage}
          pinnedIds={pinnedIds}
          onShowInfo={setInfoMessage}
          onLoadMore={loadMore}
          hasMore={hasMore}
          highlightQuery={searchQuery}
          contextMode={contextMode}
          onLoadContext={loadContext}
          onExitContext={exitContext}
          onImageClick={handleOpenImage}
        />
      </div>

      <TypingIndicator users={typingList} />

      <MessageInput
        onSendText={sendMessage}
        onSendMedia={sendMediaMessage}
        onTyping={startTyping}
        onStopTyping={stopTyping}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
        conversationId={conversation._id}
      />

      <ForwardModal
        show={!!forwardingMessage}
        onHide={() => setForwardingMessage(null)}
        message={forwardingMessage}
        onConfirm={handleConfirmForward}
      />

      {conversation.isGroup && (
        <GroupInfoModal
          show={showGroupInfo}
          onHide={() => setShowGroupInfo(false)}
          conversation={conversation}
          onLeft={onLeft}
        />
      )}

      <MessageInfoModal
        show={!!infoMessage}
        onHide={() => setInfoMessage(null)}
        message={infoMessage}
      />

      <DisappearingModal
        show={showDisappearing}
        onHide={() => setShowDisappearing(false)}
        conversation={conversation}
        onUpdated={(duration) => {
          onConversationUpdated?.({
            ...conversation,
            disappearingDuration: duration,
          });
        }}
      />

      <PinnedMessagesModal
        show={showPinnedModal}
        onHide={() => setShowPinnedModal(false)}
        pinnedMessages={pinnedMessages}
        onJumpTo={handleJumpToPinned}
        onUnpin={handleUnpinFromModal}
        currentUserId={user._id}
      />

      {/* ⭐ Media Lightbox الموحّد (صور + فيديو) */}
      {lightboxMedia.length > 0 && (
        <MediaLightbox
          media={lightboxMedia}
          initialIndex={lightboxIndex}
          senderInfo={
            lightboxMedia[lightboxIndex]?.sender
              ? {
                  username: lightboxMedia[lightboxIndex].sender.username,
                  avatar: lightboxMedia[lightboxIndex].sender.avatar,
                  createdAt: lightboxMedia[lightboxIndex].createdAt,
                }
              : null
          }
          onClose={handleCloseLightbox}
        />
      )}
    </div>
  );
};

export default ChatWindow;