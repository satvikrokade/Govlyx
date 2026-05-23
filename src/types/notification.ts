/**
 * src/types/notification.ts
 *
 * Frontend interfaces for the Notification system,
 * matching the backend NotificationDto and NotificationType.
 */

export type NotificationType =
  | "POST_LIKE"
  | "POST_COMMENT"
  | "COMMENT_REPLY"
  | "FOLLOW"
  | "MENTION"
  | "COMMUNITY_INVITE"
  | "COMMUNITY_JOIN_REQUEST"
  | "COMMUNITY_JOIN_ACCEPT"
  | "SYSTEM_ANNOUNCEMENT"
  | "BROADCAST";

export interface Notification {
  id: number;
  notificationType: NotificationType;
  title: string;
  message: string;
  referenceId?: number;
  referenceType?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  actionUrl?: string;
  timeAgo: string;
  category?: string;
  typeDescription?: string;

  // Triggered by user information
  triggeredByUserId?: number;
  triggeredByUsername?: string;
  triggeredByDisplayName?: string;
  triggeredByProfileImage?: string;
}

export interface UnreadCountResponse {
  count: number;
  hasUnread: boolean;
}
