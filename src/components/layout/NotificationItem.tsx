import React from "react";
import { Trash2, UserPlus, X as XIcon, Check } from "lucide-react";
import type { Notification } from "../../types/notification";

const Spin = ({ xs }: { xs?: boolean }) => (
  <span className={`loading loading-spinner ${xs ? "loading-xs" : "loading-sm"}`} />
);

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: number) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
  onAcceptInvite: (n: Notification, e: React.MouseEvent) => void;
  onDeclineInvite: (n: Notification, e: React.MouseEvent) => void;
  onClick: (n: Notification) => void;
  isAccepting: boolean;
  isAccepted: boolean;
  isDeclined: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRead,
  onDelete,
  onAcceptInvite,
  onDeclineInvite,
  onClick,
  isAccepting,
  isAccepted,
  isDeclined,
}) => {
  const isInvite = notification.notificationType === "COMMUNITY_INVITE";
  const { id, title, message, timeAgo, isRead, triggeredByProfileImage, triggeredByUsername } = notification;

  const handleContainerClick = () => {
    if (!isRead && !isInvite) {
      onRead(id);
    }
    onClick(notification);
  };

  return (
    <div
      onClick={handleContainerClick}
      className={`p-4 flex gap-3 transition-colors relative group ${
        isInvite && !isAccepted && !isDeclined ? "" : "cursor-pointer hover:bg-base-200"
      } ${!isRead && !isAccepted && !isDeclined ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
    >
      {!isRead && !isAccepted && !isDeclined && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#1D4ED8] rounded-full" />
      )}
      
      <div className="shrink-0">
        <div className={`w-10 h-10 rounded-full overflow-hidden border bg-base-300 ${
          isInvite && !isAccepted && !isDeclined
            ? "border-[#1D4ED8]/50 ring-2 ring-[#1D4ED8]/20"
            : "border-base-300"
        }`}>
          <img
            src={
              triggeredByProfileImage ||
              `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(
                triggeredByUsername || "sys"
              )}`
            }
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-bold text-base-content leading-tight line-clamp-1 notranslate">
            {isInvite && (
              <UserPlus size={12} className="inline mr-1 text-[#1D4ED8]" />
            )}
            {title}
          </p>
          <span className="text-[10px] opacity-40 whitespace-nowrap notranslate">
             {timeAgo}
          </span>
        </div>
        <p className="text-xs mt-1 opacity-70 line-clamp-2 leading-relaxed notranslate">
          {message}
        </p>

        {/* ── Invite action buttons ── */}
        {isInvite && !isAccepted && !isDeclined && (
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={(e) => onAcceptInvite(notification, e)}
              disabled={isAccepting}
              className="flex-1 btn btn-xs bg-[#1D4ED8] text-white border-none hover:bg-[#1D4ED8]/90 gap-1 font-semibold rounded-lg h-7 min-h-0"
            >
              {isAccepting ? (
                <Spin xs />
              ) : (
                <>
                  <Check size={12} />
                  Accept
                </>
              )}
            </button>
            <button
              onClick={(e) => onDeclineInvite(notification, e)}
              className="flex-1 btn btn-xs btn-ghost border border-base-300 gap-1 font-medium rounded-lg h-7 min-h-0 hover:bg-error/10 hover:text-error hover:border-error/30"
            >
              <XIcon size={12} />
              Decline
            </button>
          </div>
        )}

        {/* ── Accepted state ── */}
        {isInvite && isAccepted && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-success">
            <Check size={14} />
            Joined successfully!
          </div>
        )}

        {/* ── Declined state ── */}
        {isInvite && isDeclined && (
          <div className="mt-2 flex items-center gap-1.5 text-xs opacity-40">
            <XIcon size={12} />
            Invite declined
          </div>
        )}
      </div>

      {/* Delete button — hide for active invite notifications */}
      {!(isInvite && !isAccepted && !isDeclined) && (
        <div className="shrink-0 flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => onDelete(id, e)}
            className="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/10"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationItem;
