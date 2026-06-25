import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useUser";
import { useCommunityChat } from "../../hooks/useCommunityChat";
import { communityService } from "../../api/communityService";
import { showToast } from "../../utils/toast";
import { resolveMediaUrl } from "../../utils/postUtils";
import {
  Send,
  MoreVertical,
  Reply,
  Pin,
  Trash2,
  AlertTriangle,
  Lock,
  Settings,
  Clock,
  X,
  ChevronDown,
  ExternalLink,
  MessageSquare,
  Smile,
  Crown,
} from "lucide-react";
import { OPENMOJI_STICKERS } from "../../utils/stickers";
import { useMyBilling } from "../../hooks/useBilling";
import PricingModal from "../billing/PricingModal";
import type { CommunityMessage } from "../../types/CommunityChat.types";

interface CommunityChatProps {
  communityId: number;
  isAdmin: boolean;
}

// Message expiry countdown utility (moved outside to prevent unmount/flicker)
const ExpiryTimer = React.memo(({ expiresAt }: { expiresAt: string }) => {
  const getInitialTimeLeft = () => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const totalSecs = Math.floor(diff / 1000);
    if (totalSecs > 86400) {
      return `${Math.floor(totalSecs / 86400)}d left`;
    }
    const secs = totalSecs % 60;
    const mins = Math.floor(totalSecs / 60) % 60;
    const hrs = Math.floor(totalSecs / 3600);
    const parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0 || hrs > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    return parts.join(" ");
  };

  const [timeLeft, setTimeLeft] = useState(getInitialTimeLeft);

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const totalSecs = Math.floor(diff / 1000);
      if (totalSecs > 86400) {
        setTimeLeft(`${Math.floor(totalSecs / 86400)}d left`);
        return;
      }

      const secs = totalSecs % 60;
      const mins = Math.floor(totalSecs / 60) % 60;
      const hrs = Math.floor(totalSecs / 3600);

      const parts = [];
      if (hrs > 0) parts.push(`${hrs}h`);
      if (mins > 0 || hrs > 0) parts.push(`${mins}m`);
      parts.push(`${secs}s`);
      setTimeLeft(parts.join(" "));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className="flex items-center gap-1 text-[10px] opacity-60 text-warning font-mono">
      <Clock size={10} />
      {timeLeft}
    </span>
  );
});

export default function CommunityChat({ communityId, isAdmin }: CommunityChatProps) {
  const { data: billing } = useMyBilling();
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const navigate = useNavigate();
  const [showStickerMenu, setShowStickerMenu] = useState(false);
  const { data: userProfile } = useCurrentUser();
  const usernameWatermark = userProfile?.actualUsername || userProfile?.username || "Govlyx User";
  const {
    messages,
    typingUsers,
    isLoading,
    isFetchingMore,
    hasMore,
    error,
    setError,
    sendMessage,
    sendTyping,
    loadMoreMessages,
    fetchInitialMessages,
    deleteMessage,
    pinnedMessage,
  } = useCommunityChat(communityId, userProfile || null);

  const [inputText, setInputText] = useState("");
  const [replyMessage, setReplyMessage] = useState<CommunityMessage | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [chatSettings, setChatSettings] = useState({
    isGroupChatEnabled: true,
    chatRetentionDays: 30,
  });
  const [tempSettings, setTempSettings] = useState({
    isGroupChatEnabled: true,
    chatRetentionDays: 30,
  });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [reportModalMessage, setReportModalMessage] = useState<CommunityMessage | null>(null);
  const [reportCategory, setReportCategory] = useState("SPAM");
  const [reportDescription, setReportDescription] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // ── 1. Fetch Chat Settings on Load ──
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (communityService.getChatSettings) {
          const res = await communityService.getChatSettings(communityId);
          if (res?.data) {
            setChatSettings(res.data);
          }
        }
      } catch (err) {
        console.debug("Chat settings GET endpoint fallback:", err);
      }
    };
    loadSettings();
  }, [communityId]);

  // ── 2. Handle Scroll behaviors ──
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    chatEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      scrollToBottom("auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Scroll to bottom on new message if user is close to bottom
  const previousMessageCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > previousMessageCount.current) {
      const container = chatContainerRef.current;
      if (container) {
        const isNearBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 300;
        if (isNearBottom) {
          setTimeout(() => scrollToBottom("smooth"), 100);
        } else {
          setShowScrollBottom(true);
        }
      }
    }
    previousMessageCount.current = messages.length;
  }, [messages]);

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    // Trigger fetch older messages when hitting top
    if (container.scrollTop === 0 && hasMore && !isFetchingMore) {
      const prevScrollHeight = container.scrollHeight;
      loadMoreMessages().then(() => {
        // Retain scroll position relative to content loaded
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
              chatContainerRef.current.scrollHeight - prevScrollHeight;
          }
        }, 50);
      });
    }

    // Show/hide scroll to bottom button
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    setShowScrollBottom(!isNearBottom);
  };

  // ── 3. Find Pinned Message ──
  // Pinned message is loaded and kept up to date by the useCommunityChat hook

  const scrollToPinned = () => {
    if (!pinnedMessage) return;
    const element = document.getElementById(`msg-${pinnedMessage.id || pinnedMessage.messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-yellow-500/20");
      setTimeout(() => {
        element.classList.remove("bg-yellow-500/20");
      }, 2000);
    } else {
      showToast.error("Message is further up, scroll to load more history");
    }
  };

  // ── 4. Message send action ──
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendMessage(inputText.trim(), replyMessage?.id || undefined);
    setInputText("");
    setReplyMessage(null);
  };

  // ── 5. Admin Settings Actions ──
  const handleOpenSettings = () => {
    setTempSettings(chatSettings);
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    const payload = {
      isGroupChatEnabled: tempSettings.isGroupChatEnabled,
      chatRetentionDays: tempSettings.chatRetentionDays,
    };

    try {
      await communityService.updateChatSettings(communityId, payload);
      setChatSettings(tempSettings);
      showToast.success("Chat settings updated successfully");
      setIsSettingsOpen(false);
      setError(null);
      fetchInitialMessages();
    } catch (err) {
      console.error(err);
      showToast.error("Failed to update chat settings");
    }
  };

  // ── 6. Message actions (Pin/Delete/Report) ──
  const handlePinToggle = async (msg: CommunityMessage) => {
    setActiveDropdown(null);
    const msgId = msg.id ?? msg.messageId;
    if (!msgId) return;
    try {
      await communityService.pinChatMessage(communityId, msgId);
    } catch (err: any) {
      showToast.error(err.response?.data?.message || "Failed to pin/unpin message");
    }
  };

  const handleReportSubmit = async () => {
    if (!reportModalMessage) return;
    try {
      await communityService.reportChatMessage(communityId, String(reportModalMessage.id || reportModalMessage.messageId), {
        category: reportCategory,
        description: reportDescription,
      });
      showToast.success("Message reported successfully");
      setReportModalMessage(null);
      setReportDescription("");
    } catch {
      showToast.error("Failed to report message");
    }
  };

  // ── 7. Helpers to check bubble attributes ──
  const getSenderColor = (userId: number) => {
    const colors = [
      "text-emerald-500",
      "text-sky-500",
      "text-pink-500",
      "text-amber-500",
      "text-violet-500",
      "text-indigo-500",
      "text-teal-500",
      "text-rose-500",
    ];
    return colors[userId % colors.length];
  };

  const isComposerLocked = !chatSettings.isGroupChatEnabled && !isAdmin;

  return (
    <div className="flex flex-col h-[600px] rounded-2xl bg-base-200 border border-base-300 overflow-hidden relative">
      {/* ── Chat Header ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-base-100 border-b border-base-300">
        <div className="flex flex-col">
          <span className="font-semibold text-sm">Community Chat</span>
          {typingUsers.length > 0 ? (
            <span className="text-xs text-primary animate-pulse">
              {typingUsers.map((u) => u.username).join(", ")}{" "}
              {typingUsers.length === 1 ? "is" : "are"} typing...
            </span>
          ) : (
            <span className="text-xs opacity-60">Real-time group messaging</span>
          )}
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenSettings}
            className="btn btn-ghost btn-circle btn-sm text-base-content/85 hover:text-primary transition-colors"
          >
            <Settings size={18} />
          </button>
        )}
      </div>

      {/* ── Frozen Community Banner ── */}
      {error?.toLowerCase().includes("frozen") && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-xs text-amber-500 font-semibold animate-pulse shrink-0">
          <AlertTriangle size={14} className="shrink-0" />
          <span>This Secret community is frozen because the owner's pass expired. Group chat is read-only.</span>
        </div>
      )}

      {/* ── Pinned Message Banner ── */}
      {pinnedMessage && (
        <div
          onClick={scrollToPinned}
          className="shrink-0 flex items-center justify-between px-4 py-2 bg-primary/10 border-b border-primary/20 cursor-pointer hover:bg-primary/15 transition-all text-xs"
        >
          <div className="flex items-center gap-2 overflow-hidden mr-4">
            <Pin size={12} className="text-primary shrink-0" />
            <div className="truncate text-base-content/80">
              <span className="font-semibold text-primary">Pinned Message: </span>
              {pinnedMessage.content || "Shared Content"}
            </div>
          </div>
          <span className="text-[10px] opacity-60 shrink-0">Click to view</span>
        </div>
      )}

      {/* ── Chat Messages Container ── */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-1.5 py-3 space-y-3 scrollbar-hide scroll-smooth relative"
      >
        {userProfile && <WatermarkOverlay username={usernameWatermark} />}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <span className="loading loading-spinner loading-md text-primary"></span>
            <span className="text-xs opacity-50">Loading chat history...</span>
          </div>
        ) : error && !error.toLowerCase().includes("frozen") ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 p-6">
            <AlertTriangle className="text-error" size={32} />
            <p className="text-sm font-semibold">{error}</p>
            <button onClick={fetchInitialMessages} className="btn btn-xs btn-primary btn-outline">
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40 p-6 space-y-2">
            <MessageSquare size={40} />
            <p className="text-sm">No messages yet. Send a message to start the conversation!</p>
          </div>
        ) : (
          <>
            {isFetchingMore && (
              <div className="flex justify-center py-2">
                <span className="loading loading-spinner loading-xs text-primary"></span>
              </div>
            )}

            {messages.map((msg, index) => {
              if (msg.messageType === "SYSTEM") {
                return (
                  <div key={msg.id || msg.messageId || index} className="flex justify-center my-2 w-full">
                    <div className="bg-base-300/80 text-base-content/70 px-4 py-1.5 rounded-full text-xs font-semibold max-w-[85%] text-center shadow-sm border border-base-300">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              const isMe = userProfile && msg.sender.id === userProfile.id;
              const isSenderAdmin = msg.sender.roleName === "ADMIN" || msg.sender.roleName === "OWNER";
              const showAvatar =
                index === 0 || messages[index - 1].sender.id !== msg.sender.id;

              return (
                <div
                  key={msg.id || msg.messageId || index}
                  id={`msg-${msg.id || msg.messageId}`}
                  className={`flex items-start gap-1.5 group transition-colors rounded-lg ${
                    isMe ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Avatar (for incoming messages) */}
                  {!isMe && (
                    <div className="w-8 shrink-0">
                      {showAvatar && (
                        <img
                          src={resolveMediaUrl(msg.sender.profileImage, "social-posts") || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender.username}`}
                          alt={msg.sender.username}
                          className="w-8 h-8 rounded-full border border-base-300 object-cover"
                        />
                      )}
                    </div>
                  )}

                  {/* Message Bubble Block */}
                  <div className={`flex flex-col max-w-[85%] ${isMe ? "items-end" : "items-start"}`}>
                    {/* Sender Display Name */}
                    {showAvatar && !isMe && (
                      <span className={`text-xs font-semibold mb-1 ml-1 ${getSenderColor(msg.sender.id)}`}>
                        {msg.sender.actualUsername || msg.sender.username}
                        {isSenderAdmin && (
                          <span className="badge badge-warning badge-xs ml-1 font-bold text-[8px]">
                            Admin
                          </span>
                        )}
                      </span>
                    )}

                    {/* The Bubble */}
                    <div
                      className={`relative px-3 py-1.5 rounded-xl shadow-sm transition-all duration-200 border ${
                        msg.content && msg.content.startsWith("/openmoji-svg-color/") && !msg.isDeleted
                          ? "bg-transparent border-transparent shadow-none"
                          : msg.isDeleted
                          ? "bg-base-200/40 text-base-content/40 border-base-300/60 rounded-xl"
                          : isMe
                          ? "bg-primary text-primary-content border-primary/20 rounded-tr-none"
                          : "bg-base-100 text-base-content border-base-300 rounded-tl-none"
                      }`}
                    >
                      {/* Reply preview inside bubble */}
                      {!msg.isDeleted && msg.replyToId && (() => {
                        const target = messages.find((m) => m.id === msg.replyToId);
                        if (!target) return null;
                        return (
                          <div
                            onClick={() => {
                              const el = document.getElementById(`msg-${msg.replyToId}`);
                              if (el) {
                                el.scrollIntoView({ behavior: "smooth", block: "center" });
                                el.classList.add("bg-blue-500/20");
                                setTimeout(() => {
                                  el.classList.remove("bg-blue-500/20");
                                }, 2000);
                              }
                            }}
                            className={`mb-2 py-1 px-2.5 border-l-2 text-xs rounded bg-black/5 dark:bg-white/5 cursor-pointer hover:opacity-80 transition-opacity flex flex-col ${
                              isMe ? "border-primary-content/40" : "border-primary/50"
                            }`}
                          >
                            <span className="font-semibold opacity-80">
                              {target.sender.actualUsername || target.sender.username}
                            </span>
                            <span className="truncate max-w-xs opacity-60">
                              {target.content || "Attachment"}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Message Content */}
                      {msg.isDeleted ? (
                        <p className="text-xs sm:text-[13px] italic opacity-60 select-none flex items-center gap-1.5 py-0.5">
                          <Trash2 size={12} className="opacity-50" />
                          <span>{msg.deletedByType === "ADMINISTRATOR" ? "This message was deleted by the administrator" : "This message was deleted by the user"}</span>
                        </p>
                      ) : msg.messageType === "SHARE_POST" && msg.sharedPost ? (
                        <div
                          onClick={() => navigate(`/post/${msg.sharedPost?.id}`)}
                          className={`border rounded-xl p-3 cursor-pointer transition-colors space-y-2 mt-1 min-w-[200px] ${
                            isMe
                              ? "bg-black/15 hover:bg-black/25 border-primary-content/10"
                              : "bg-base-200/50 hover:bg-base-200 border-base-300"
                          }`}
                        >
                          <div className={`flex items-center gap-1.5 text-xs font-semibold ${isMe ? "text-blue-100" : "text-primary"}`}>
                            <ExternalLink size={12} />
                            <span>Shared Post by @{msg.sharedPost.authorUsername}</span>
                          </div>
                          <p className="text-xs line-clamp-3 opacity-80">
                            {msg.sharedPost.content}
                          </p>
                        </div>
                      ) : msg.content && msg.content.startsWith("/openmoji-svg-color/") ? (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-0.5">
                          <img
                            src={msg.content}
                            alt="Sticker"
                            className="w-full h-full object-contain drop-shadow-sm select-none"
                          />
                        </div>
                      ) : (
                        <p className="text-xs sm:text-[13px] whitespace-pre-wrap break-words leading-relaxed select-text">
                          {msg.content}
                        </p>
                      )}

                      {/* Bubble footer details (time + status + expiry) */}
                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        {msg.expiresAt && <ExpiryTimer expiresAt={msg.expiresAt} />}
                        <span className="text-[10px] opacity-50 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isMe && msg.clientSideId?.startsWith("opt-") && (
                          <Clock size={10} className="text-primary-content/60 animate-spin" />
                        )}
                      </div>

                      {/* Actions Trigger (Hover menu) */}
                      {!msg.isDeleted && (
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-base-100 rounded-full border border-base-300 shadow-md p-0.5 z-10 ${
                            isMe ? "-left-14" : "-right-14"
                          }`}
                        >
                          <button
                            onClick={() => setReplyMessage(msg)}
                            className="btn btn-ghost btn-circle btn-xs text-base-content/70 hover:text-primary"
                            title="Reply"
                          >
                            <Reply size={12} />
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => {
                                const mId = String(msg.id || msg.messageId);
                                setActiveDropdown(activeDropdown === mId ? null : mId);
                              }}
                              className="btn btn-ghost btn-circle btn-xs text-base-content/70 hover:text-primary"
                            >
                              <MoreVertical size={12} />
                            </button>

                            {activeDropdown === String(msg.id || msg.messageId) && (
                              <div
                                className={`absolute mt-1 w-28 bg-base-100 rounded-lg shadow-xl border border-base-300 py-1 z-20 ${
                                  isMe ? "left-0" : "right-0"
                                }`}
                              >
                                {isAdmin && (
                                  <button
                                    onClick={() => {
                                      if (billing?.currentTier !== "GOVLYX_VIP") {
                                        showToast.error("Message pinning requires a Govlyx VIP Pass");
                                        setIsPricingModalOpen(true);
                                        setActiveDropdown(null);
                                        return;
                                      }
                                      handlePinToggle(msg);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-base-content hover:bg-base-200 flex items-center justify-between font-medium"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <Pin size={12} />
                                      <span>{msg.isPinned ? "Unpin" : "Pin"}</span>
                                    </div>
                                    {billing?.currentTier !== "GOVLYX_VIP" && (
                                      <Crown size={10} className="text-amber-500 shrink-0" />
                                    )}
                                  </button>
                                )}
                                {!isMe && (
                                  <button
                                    onClick={() => {
                                      setActiveDropdown(null);
                                      setReportModalMessage(msg);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-warning hover:bg-base-200 flex items-center gap-1.5 font-medium"
                                  >
                                    <AlertTriangle size={12} />
                                    <span>Report</span>
                                  </button>
                                )}
                                {(isAdmin || isMe) && (
                                  <button
                                    onClick={async () => {
                                      setActiveDropdown(null);
                                      const messageId = msg.id || msg.messageId || msg.clientSideId;
                                      if (messageId) {
                                        try {
                                          await deleteMessage(messageId);
                                          showToast.success("Message deleted");
                                        } catch {
                                          showToast.error("Failed to delete message");
                                        }
                                      }
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-base-200 flex items-center gap-1.5 font-medium border-t border-base-300"
                                  >
                                    <Trash2 size={12} />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* Floating scroll to bottom button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-20 right-4 btn btn-circle btn-primary btn-sm shadow-lg border border-primary/20 z-10"
        >
          <ChevronDown size={18} />
        </button>
      )}

      {/* ── Reply Bar Indicator ── */}
      {replyMessage && (() => {
        const latestMsg = messages.find((m) => {
          const mId = m.id || m.messageId;
          const rId = replyMessage.id || replyMessage.messageId;
          return mId && rId && String(mId) === String(rId);
        });
        const isMsgDeleted = latestMsg?.isDeleted;
        const displayContent = isMsgDeleted
          ? (latestMsg.deletedByType === "ADMINISTRATOR" ? "This message was deleted by the administrator" : "This message was deleted by the user")
          : replyMessage.content;

        return (
          <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-base-100 border-t border-base-300 text-xs">
            <div className="flex items-center gap-2 border-l-2 border-primary pl-2 overflow-hidden mr-4">
              <Reply size={12} className="text-primary shrink-0" />
              <div className="truncate text-base-content/85">
                <span className="font-semibold">
                  Replying to @{replyMessage.sender.actualUsername || replyMessage.sender.username}
                </span>
                <p className={`truncate opacity-60 max-w-xs ${isMsgDeleted ? "italic opacity-40 font-medium" : ""}`}>{displayContent}</p>
              </div>
            </div>
            <button
              onClick={() => setReplyMessage(null)}
              className="btn btn-ghost btn-circle btn-xs text-base-content/65 hover:text-error"
            >
              <X size={14} />
            </button>
          </div>
        );
      })()}

      {/* ── Input Composer ── */}
      <div className="shrink-0 p-3 bg-base-100 border-t border-base-300 backdrop-blur-md bg-base-100/90">
        {isComposerLocked ? (
          <div className="flex items-center justify-center gap-2 p-2 bg-base-200 text-base-content/60 rounded-xl text-xs font-semibold">
            <Lock size={14} />
            <span>Administrator has disabled group chat in this community</span>
          </div>
        ) : (
          <div className="relative w-full">
            {/* Sticker Menu Overlay */}
            {showStickerMenu && (
              <div className="absolute bottom-[52px] left-0 right-0 bg-base-100 border border-base-300 rounded-2xl shadow-2xl p-3 z-30 max-h-[180px] overflow-y-auto scrollbar-hide">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Stickers</p>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {OPENMOJI_STICKERS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        sendMessage(url, replyMessage?.id);
                        setReplyMessage(null);
                        setShowStickerMenu(false);
                      }}
                      className="p-1.5 hover:bg-base-200 rounded-lg transition-colors aspect-square flex items-center justify-center cursor-pointer"
                    >
                      <img
                        src={url}
                        alt="Sticker"
                        loading="lazy"
                        className="w-10 h-10 object-contain hover:scale-110 transition-transform"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSend} className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => setShowStickerMenu(!showStickerMenu)}
                className={`btn btn-ghost btn-circle btn-sm h-10 w-10 shrink-0 shadow-sm transition-colors rounded-xl bg-base-200 border-none ${showStickerMenu ? "text-primary bg-primary/10" : "text-base-content/65 hover:text-base-content"}`}
                title="Stickers"
              >
                <Smile size={18} />
              </button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  sendTyping();
                }}
                placeholder={error?.toLowerCase().includes("frozen") ? "This Secret community is frozen (owner pass expired)..." : "Write a message..."}
                className="input input-sm flex-1 bg-base-200 border-none rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary h-10 px-4"
                disabled={isLoading || !!error}
              />
              <button
                type="submit"
                disabled={isLoading || !!error || !inputText.trim()}
                className="btn btn-primary btn-circle btn-sm h-10 w-10 shrink-0 shadow-sm transition-transform active:scale-95"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── Admin Chat Settings Modal ── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-base-100 rounded-2xl max-w-md w-full p-6 space-y-4 border border-base-300 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Settings className="text-primary" size={20} />
                <span>Chat Admin Settings</span>
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="btn btn-ghost btn-circle btn-sm"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <span className="text-xs font-semibold opacity-75">Chat Permission</span>
                
                {/* Option 1: Allow members to chat */}
                <label className="flex items-center justify-between bg-base-200 p-3 rounded-xl cursor-pointer hover:bg-base-300/40 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Allow members to chat</span>
                    <span className="text-[10px] opacity-60">Everyone in the community can send messages</span>
                  </div>
                  <input
                    type="radio"
                    name="chatPermission"
                    checked={tempSettings.isGroupChatEnabled === true}
                    onChange={() => setTempSettings((prev) => ({ ...prev, isGroupChatEnabled: true }))}
                    className="radio radio-primary"
                  />
                </label>

                {/* Option 2: Only admin can send messages */}
                <label className="flex items-center justify-between bg-base-200 p-3 rounded-xl cursor-pointer hover:bg-base-300/40 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Only admin can send messages</span>
                    <span className="text-[10px] opacity-60">Members can only read announcements and updates</span>
                  </div>
                  <input
                    type="radio"
                    name="chatPermission"
                    checked={tempSettings.isGroupChatEnabled === false}
                    onChange={() => setTempSettings((prev) => ({ ...prev, isGroupChatEnabled: false }))}
                    className="radio radio-primary"
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold opacity-75">Message Retention Period</label>
                  {billing?.currentTier !== "GOVLYX_VIP" && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5 font-sans">
                      <Crown size={8} /> VIP
                    </span>
                  )}
                </div>
                <select
                  value={tempSettings.chatRetentionDays}
                  onChange={(e) => {
                    if (billing?.currentTier !== "GOVLYX_VIP") {
                      showToast.error("Disappearing messages require a Govlyx VIP Pass");
                      setIsPricingModalOpen(true);
                      return;
                    }
                    setTempSettings((prev) => ({ ...prev, chatRetentionDays: Number(e.target.value) }));
                  }}
                  className="select select-bordered select-sm w-full rounded-xl"
                >
                  <option value={7}>7 Days (1 Week)</option>
                  <option value={14}>14 Days (2 Weeks)</option>
                  <option value={30}>30 Days (1 Month)</option>
                  <option value={90}>90 Days (3 Months)</option>
                  <option value={0}>Forever (No Auto-Delete)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <button onClick={() => setIsSettingsOpen(false)} className="btn btn-sm btn-ghost">
                Cancel
              </button>
              <button onClick={handleSaveSettings} className="btn btn-sm btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report Message Modal ── */}
      {reportModalMessage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-base-100 rounded-2xl max-w-md w-full p-6 space-y-4 border border-base-300 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-warning flex items-center gap-2">
                <AlertTriangle size={20} />
                <span>Report Message</span>
              </h3>
              <button
                onClick={() => setReportModalMessage(null)}
                className="btn btn-ghost btn-circle btn-sm"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-base-200 p-3 rounded-xl text-xs space-y-1 opacity-70">
                <span className="font-semibold block">
                  Reported User: @
                  {reportModalMessage.sender.actualUsername || reportModalMessage.sender.username}
                </span>
                <p className="truncate">{reportModalMessage.content}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold opacity-75">Violation Category</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="select select-bordered select-sm w-full rounded-xl"
                >
                  <option value="SPAM">Spam</option>
                  <option value="HARASSMENT">Harassment or Abuse</option>
                  <option value="HATE_SPEECH">Hate Speech</option>
                  <option value="VIOLENCE">Violence or Harm</option>
                  <option value="OTHER">Other guidelines violation</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold opacity-75">Description (optional)</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Provide additional details..."
                  className="textarea textarea-bordered textarea-sm w-full rounded-xl h-20"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <button onClick={() => setReportModalMessage(null)} className="btn btn-sm btn-ghost">
                Cancel
              </button>
              <button onClick={handleReportSubmit} className="btn btn-sm btn-primary">
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pricing Modal ── */}
      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
    </div>
  );
}

function WatermarkOverlay({ 
  username, 
  className = "opacity-[0.03] dark:opacity-[0.02] text-base-content" 
}: { 
  username: string; 
  className?: string; 
}) {
  return (
    <div className={`absolute inset-0 pointer-events-none select-none overflow-hidden z-[5] ${className}`}>
      <div 
        className="w-[150%] h-[150%] -left-[25%] -top-[25%] absolute flex flex-col justify-around rotate-[-25deg]"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '40px',
        }}
      >
        {Array.from({ length: 15 }).map((_, i) => {
          const isEven = i % 2 === 0;
          return (
            <div 
              key={i} 
              className="whitespace-nowrap font-black uppercase text-[14px] tracking-[0.2em] flex gap-20"
              style={{
                animation: `watermark-scroll-${isEven ? 'left' : 'right'} ${30 + (i % 5) * 5}s linear infinite`,
                transform: `translateX(${isEven ? '0' : '-30'}%)`,
              }}
            >
              {Array.from({ length: 10 }).map((_, j) => (
                <span key={j}>{username}</span>
              ))}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes watermark-scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes watermark-scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
