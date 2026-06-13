import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../api/axiosConfig";

/**
 * Hook to fetch and cache the unread notification count.
 * Refetches every 60 seconds to maintain real-time-like updates.
 */
export const useUnreadNotificationsCount = () => {
  return useQuery({
    queryKey: ["unreadNotificationsCount"],
    queryFn: async () => {
      const response = await axiosInstance.get<{ count: number }>("/api/notifications/unread/count");
      return response.data.count || 0;
    },
    refetchInterval: 60 * 1000, // Refresh every minute
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to fetch the full list of notifications.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "../types/notification";

export const useNotifications = (limit = 20) => {
  return useQuery({
    queryKey: ["notifications", limit],
    queryFn: async () => {
      const response = await axiosInstance.get<{ data: Notification[] }>(`/api/notifications?limit=${limit}`);
      return response.data.data || [];
    },
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook for notification-related actions.
 */
export const useNotificationActions = () => {
  const queryClient = useQueryClient();

  // Mark a single notification as read
  const markAsRead = useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.put(`/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all notifications as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await axiosInstance.put("/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Delete a notification
  const deleteNotification = useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(`/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Delete all notifications
  const deleteAllNotifications = useMutation({
    mutationFn: async () => {
      await axiosInstance.delete("/api/notifications/all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  };
};
