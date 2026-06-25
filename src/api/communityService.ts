import axiosInstance from "./axiosConfig";

export const communityService = {
  getCommunities: async (params?: Record<string, unknown>) => {
    const response = await axiosInstance.get("/api/communities", { params });
    return response.data;
  },

  getCommunityById: async (id: number) => {
    const response = await axiosInstance.get(`/api/communities/${id}`);
    return response.data;
  },

  joinCommunity: async (id: number) => {
    const response = await axiosInstance.post(`/api/communities/${id}/join`);
    return response.data;
  },

  leaveCommunity: async (id: number) => {
    const response = await axiosInstance.post(`/api/communities/${id}/leave`);
    return response.data;
  },

  getMembers: async (id: number, params?: Record<string, unknown>) => {
    const response = await axiosInstance.get(`/api/communities/${id}/members`, { params });
    return response.data;
  },

  getJoinRequests: async (id: number, params?: Record<string, unknown>) => {
    const response = await axiosInstance.get(`/api/communities/${id}/join-requests`, { params });
    return response.data;
  },

  handleJoinRequest: async (communityId: number, requestId: number, approve: boolean) => {
    const response = await axiosInstance.post(
      `/api/communities/${communityId}/join-requests/${requestId}/${approve ? "approve" : "reject"}`
    );
    return response.data;
  },

  uploadCommunityImage: async (id: number, file: File, type: "avatar" | "cover" = "avatar") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    const response = await axiosInstance.post(`/api/communities/${id}/image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  getChatMessages: async (id: number, cursor?: string | null, limit: number = 20) => {
    const response = await axiosInstance.get(`/api/communities/${id}/chat/messages`, {
      params: { cursor, limit },
    });
    return response.data;
  },

  getChatSettings: async (id: number) => {
    const response = await axiosInstance.get(`/api/communities/${id}/chat/settings`);
    return response.data;
  },

  updateChatSettings: async (id: number, settings: { isGroupChatEnabled: boolean; chatRetentionDays: number }) => {
    const response = await axiosInstance.put(`/api/communities/${id}/chat/settings`, settings);
    return response.data;
  },

  reportChatMessage: async (id: number, messageId: string, payload: { category: string; description: string }) => {
    const response = await axiosInstance.post(`/api/communities/${id}/chat/messages/${messageId}/report`, payload);
    return response.data;
  },

  deleteChatMessage: async (id: number, messageId: number | string) => {
    const response = await axiosInstance.delete(`/api/communities/${id}/chat/messages/${messageId}`);
    return response.data;
  },

  pinChatMessage: async (id: number, messageId: number | string) => {
    const response = await axiosInstance.post(`/api/communities/${id}/chat/messages/${messageId}/pin`);
    return response.data;
  },

  getPinnedMessages: async (id: number) => {
    const response = await axiosInstance.get(`/api/communities/${id}/chat/pinned`);
    return response.data;
  }
};
