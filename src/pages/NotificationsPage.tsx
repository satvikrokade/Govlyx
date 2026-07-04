import React, { useState } from "react";
import { Inbox, CheckCheck, Settings, ExternalLink, Trash2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useNotifications, useNotificationActions } from "../hooks/useNotification";
import NotificationItem from "../components/layout/NotificationItem";
import type { Notification } from "../types/notification";
import axiosInstance from "../api/axiosConfig";

const NotificationsPage: React.FC = () => {
  const { data: notifications = [], isLoading } = useNotifications(50);
  const { markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } = useNotificationActions();
  const navigate = useNavigate();

  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<number>>(new Set());
  const [declinedIds, setDeclinedIds] = useState<Set<number>>(new Set());

  const handleAcceptInvite = async (n: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    const inviteToken = n.actionUrl?.split("/invite/")[1];
    if (!inviteToken) return;

    setAcceptingId(n.id);
    try {
      const res = await axiosInstance.post(`/api/communities/invites/accept/${inviteToken}`, {});
      if (res.status === 200 || res.status === 201) {
        setAcceptedIds(prev => new Set(prev).add(n.id));
        if (!n.isRead) markAsRead.mutate(n.id);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Could not accept invite.";
      if (msg.toLowerCase().includes("already")) {
        setAcceptedIds(prev => new Set(prev).add(n.id));
        if (!n.isRead) markAsRead.mutate(n.id);
      } else {
        alert(msg);
      }
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDeclineInvite = (n: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeclinedIds(prev => new Set(prev).add(n.id));
    if (!n.isRead) markAsRead.mutate(n.id);
  };

  const handleNotificationClick = (n: Notification) => {
    if (n.notificationType === "COMMUNITY_INVITE" && !acceptedIds.has(n.id) && !declinedIds.has(n.id)) {
      return;
    }
    if (!n.isRead) markAsRead.mutate(n.id);
    if (n.actionUrl) {
      let targetUrl = n.actionUrl;
      if (targetUrl.startsWith("/community/")) {
        targetUrl = targetUrl.replace("/community/", "/communities/");
      }
      navigate(targetUrl);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              className="btn btn-ghost btn-sm text-emerald-500 hover:bg-emerald-500/10 gap-2 px-2 sm:px-3"
            >
              {markAllAsRead.isPending ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <CheckCheck size={16} />
              )}
              <span className="hidden sm:inline">Mark all as read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={() => {
                deleteAllNotifications.mutate();
              }}
              disabled={deleteAllNotifications.isPending}
              className="btn btn-ghost btn-sm text-error hover:bg-error/10 gap-2 px-2 sm:px-3"
            >
              {deleteAllNotifications.isPending ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Trash2 size={16} />
              )}
              <span className="hidden sm:inline">Clear all</span>
            </button>
          )}

          <Link
            to="/settings"
            className="btn btn-ghost btn-sm opacity-50 hover:opacity-100 gap-2 px-2 sm:px-3"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Settings</span>
            <ExternalLink size={14} className="hidden sm:inline" />
          </Link>
        </div>
      </div>

      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-300 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <span className="loading loading-spinner loading-lg text-[#1D4ED8]"></span>
            <p className="text-sm opacity-50">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center mb-4 text-base-content/20">
              <Inbox size={40} />
            </div>
            <h3 className="text-lg font-bold">No notifications yet</h3>
            <p className="text-sm opacity-50 mt-1 max-w-xs">
              When you get tagged, mentioned, or invited, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-base-200">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={(id) => markAsRead.mutate(id)}
                onDelete={(id, e) => {
                  e.stopPropagation();
                  deleteNotification.mutate(id);
                }}
                onAcceptInvite={handleAcceptInvite}
                onDeclineInvite={handleDeclineInvite}
                onClick={handleNotificationClick}
                isAccepting={acceptingId === n.id}
                isAccepted={acceptedIds.has(n.id)}
                isDeclined={declinedIds.has(n.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
