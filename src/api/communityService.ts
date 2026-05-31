import axiosInstance from "./axiosConfig";

export const communityService = {
  getCommunities: async (params?: Record<string, any>) => {
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

  getMembers: async (id: number, params?: Record<string, any>) => {
    const response = await axiosInstance.get(`/api/communities/${id}/members`, { params });
    return response.data;
  },

  getJoinRequests: async (id: number, params?: Record<string, any>) => {
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
  }
};
