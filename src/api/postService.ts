import axiosInstance from "./axiosConfig";

export const postService = {
  likePost: async (postId: number, postType: "posts" | "social-posts") => {
    const response = await axiosInstance.post(`/api/interactions/${postType}/${postId}/like`);
    return response.data;
  },

  savePost: async (postId: number, postType: "posts" | "social-posts") => {
    const response = await axiosInstance.post(`/api/interactions/${postType}/${postId}/save`);
    return response.data;
  },

  deletePost: async (postId: number, postType: "posts" | "social-posts") => {
    await axiosInstance.delete(`/api/${postType}/${postId}`);
  },

  resolveIssue: async (postId: number, message: string) => {
    const response = await axiosInstance.post(
      `/api/posts/${postId}/resolution?isResolved=true&updateMessage=${encodeURIComponent(message)}`
    );
    return response.data;
  },

  getPostCounts: async (postId: number, postType: "posts" | "social-posts") => {
    const response = await axiosInstance.get(`/api/interactions/${postType}/${postId}/counts`);
    return response.data;
  },

  getPostById: async (postId: number, postType: "posts" | "social-posts") => {
    const response = await axiosInstance.get(`/api/${postType}/${postId}`);
    return response.data;
  },

  voteInPoll: async (pollId: number, optionIds: number[]) => {
    const response = await axiosInstance.post(`/api/polls/${pollId}/vote`, {
      optionIds,
    });
    return response.data;
  },
};