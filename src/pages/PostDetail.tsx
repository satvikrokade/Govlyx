import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, AlertCircle, Loader2 } from "lucide-react";
import { postService } from "../api/postService";
import PostCard from "../components/post/PostCard";
import type { AnyPost } from "../components/post/PostCard";
import { toPostCardPost } from "../utils/postUtils";
import { useCurrentUser } from "../hooks/useUser";

const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<AnyPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: user } = useCurrentUser();

  const currentUser = user ? {
    id: user.id,
    username: user.actualUsername || user.username,
    role: user.role
  } : undefined;

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);

      const postId = parseInt(id, 10);
      if (isNaN(postId)) {
        setError("Invalid post ID.");
        setLoading(false);
        return;
      }

      try {
        // We attempt to fetch from social-posts first as most notifications 
        // (likes, comments) are from the social feed.
        let data;
        try {
          data = await postService.getPostById(postId, "social-posts");
        } catch (socialErr: any) {
          // If social-posts fails with 404, try the regular posts endpoint
          if (socialErr.response?.status === 404 || socialErr.message === "404") {
            data = await postService.getPostById(postId, "posts");
          } else {
            throw socialErr;
          }
        }

        // The response might be wrapped in ApiResponse: { success: true, data: { ... } }
        const actualPostData = data?.data || data;
        if (!actualPostData) {
          throw new Error("Post not found.");
        }

        setPost(toPostCardPost(actualPostData));
      } catch (err: any) {
        console.error("Error fetching post:", err);
        setError(err.response?.data?.message || err.message || "Failed to load post.");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm opacity-50 font-medium">Loading post...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-red-900">Oops! Something went wrong</h2>
          <p className="text-red-700 max-w-sm">{error || "We couldn't find the post you're looking for."}</p>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost btn-sm text-red-700 hover:bg-red-100 border-red-200"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="btn btn-ghost btn-sm gap-2 opacity-50 hover:opacity-100 -ml-2"
      >
        <ChevronLeft size={18} />
        Back
      </button>

      <div className="w-full">
        <PostCard
          post={post}
          currentUser={currentUser}
          onLike={(likedId, liked) => {
            setPost(prev => prev && prev.id === likedId ? { ...prev, isLikedByCurrentUser: liked, likeCount: prev.likeCount + (liked ? 1 : -1) } : prev);
          }}
          onSave={(savedId, saved) => {
            setPost(prev => prev && prev.id === savedId ? { ...prev, isSaved: saved } as any : prev);
          }}
          onDelete={() => {
            navigate("/", { replace: true });
          }}
        />
      </div>
    </div>
  );
};

export default PostDetail;