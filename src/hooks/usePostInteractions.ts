import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postService } from "../api/postService";

export function usePostInteractions(postId: number, postType: "posts" | "social-posts") {
  const queryClient = useQueryClient();

  // Like Mutation
  const likeMutation = useMutation({
    mutationFn: () => postService.likePost(postId, postType),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["post", postId] });
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: ["social-posts"] });

      // Snapshot previous value
      // In a real app, we'd update the specific post in the list cache
      // For now, we'll return a rollback function or just handle it in the component
      return { prevPosts: queryClient.getQueryData(["posts"]) };
    },
    onSuccess: () => {
      // Invalidate queries to sync state across the app
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
    onError: () => {
      // Rollback if needed
    },
  });

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: () => postService.savePost(postId, postType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: () => postService.deletePost(postId, postType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
    },
  });

  return {
    like: likeMutation.mutate,
    isLiking: likeMutation.isPending,
    save: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    remove: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
