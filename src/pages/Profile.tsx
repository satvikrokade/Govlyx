import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../api/axiosConfig";
import { showToast } from "../utils/toast";
import ImageEditorModal from "../components/modals/ImageEditorModal";
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  Edit,
  Camera,
  X,
  Heart,
  Bookmark,
  MessageSquare,
  List,
} from "lucide-react";
import EmptyState from "../components/ui/EmptyState";
import ProfileTabs from "../components/profile/ProfileTabs";
import PostCard from "../components/post/PostCard";
import PostSkeleton from "../components/post/PostSkeleton";
import type { AnyPost, CurrentUser } from "../components/post/PostCard";
import { useCurrentUser } from "../hooks/useUser";
import { toPostCardPost, resolveMediaUrl } from "../utils/postUtils";
import { apiUrl } from "../utils/apiUrl";

// ─── auth helpers ─────────────────────────────────────────────────────────────
function authHeaders(): HeadersInit {
  const token =
    localStorage.getItem("authToken") ?? localStorage.getItem("token") ?? "";
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function apiFetch(url: string) {
  const res = await fetch(apiUrl(url), { headers: authHeaders() });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}



// ─── share helper ─────────────────────────────────────────────────────────────

// ─── date helpers ─────────────────────────────────────────────────────────────
function formatDate(raw: any): string {
  if (raw === null || raw === undefined || raw === "") return "Unknown";
  let d: Date;
  if (Array.isArray(raw)) {
    d = new Date(
      raw[0],
      raw[1] - 1,
      raw[2] ?? 1,
      raw[3] ?? 0,
      raw[4] ?? 0,
      raw[5] ?? 0
    );
  } else {
    const ms = Number(raw);
    d = isNaN(ms) ? new Date(raw as string) : new Date(ms);
  }
  if (isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}


// ─── types ────────────────────────────────────────────────────────────────────
type PostFilter = "all" | "active" | "resolved";
type Tab = "posts" | "social" | "activity";
type ActivityFilter = "all" | "liked" | "saved" | "commented";

// ─── shared ActionBtn ─────────────────────────────────────────────────────────

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl bg-base-200 p-3 text-center">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  );
}

// Removed redundant local IssuePostCard, GovernmentBroadcastCard, PollCard, SocialPostCard

// ─── shared post mappers ──────────────────────────────────────────────────────
function mapSocialPost(p: any): AnyPost {
  return toPostCardPost(p);
}

function mapIssuePost(p: any): AnyPost {
  return toPostCardPost({ ...p, variant: "issue" });
}


// ═══════════════════════════════════════════════════════════════════════════════
// Profile page
// ═══════════════════════════════════════════════════════════════════════════════
const Profile = () => {
  const queryClient = useQueryClient();

  // Profile Details Edit State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editPincode, setEditPincode] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  // Profile Photo Upload State
  const [uploadingImg, setUploadingImg] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("posts");
  const [postFilter, setPostFilter] = useState<PostFilter>("all");
  const [hasLoadedSocial, setHasLoadedSocial] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

  const openEditModal = () => {
    setEditEmail(user?.email || "");
    setEditPincode(user?.pincode || "");
    setEditModalOpen(true);
  };

  // Save details
  const handleSaveDetails = async () => {
    if (editEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail)) {
      return showToast.error("Enter a valid email address");
    }
    if (editPincode && !/^[1-9]\d{5}$/.test(editPincode)) {
      return showToast.error("Enter a valid 6-digit Indian pincode");
    }

    setSavingDetails(true);
    try {
      // 1. Update Pincode
      if (editPincode) {
        await axiosInstance.put("/api/users/update-pincode", { pincode: editPincode });
      }
      
      // 2. Update Email
      if (editEmail) {
        await axiosInstance.put("/api/users/profile", {
          email: editEmail || undefined,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setEditModalOpen(false);
      showToast.success("Changes saved successfully");
    } catch (err: any) {
      showToast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingDetails(false);
    }
  };

  // Image Upload Methods
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return showToast.error("Upload a JPEG, PNG, or WebP image");
    }
    if (file.size > 5 * 1024 * 1024) {
      return showToast.error("Image must be under 5 MB");
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditorImageSrc(reader.result as string);
      setEditorOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleEditorSave = async (editedBlob: Blob) => {
    setUploadingImg(true);
    setEditorOpen(false);
    try {
      const fd = new FormData();
      const file = new File([editedBlob], "profile.jpg", { type: "image/jpeg" });
      fd.append("file", file);
      
      await axiosInstance.post("/api/users/profile-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      showToast.success("Profile photo updated");
    } catch (err: any) {
      showToast.error(err.response?.data?.message || "Failed to upload photo");
    } finally {
      setUploadingImg(false);
      setEditorImageSrc(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (type: 'posts' | 'social-posts', id: number) => {
    // Parent only handles state removal. PostCard handles confirm + API.
    if (type === 'posts') {
      setAllPosts(prev => prev.filter(p => p.id !== id));
      setActivePosts(prev => prev.filter(p => p.id !== id));
      setResolvedPosts(prev => prev.filter(p => p.id !== id));
      setIssueCount(n => n !== null ? Math.max(0, n - 1) : null);
    } else {
      setSocialPosts(prev => prev.filter(p => p.id !== id));
      setSocialCount(n => n !== null ? Math.max(0, n - 1) : null);
    }
  };

  const applyResolveUpdate = (prev: AnyPost[], id: number, resolved: boolean, message: string): AnyPost[] =>
    prev.map((p) => {
      if (p.id === id && p.variant === "issue") {
        return {
          ...p,
          status: resolved ? "RESOLVED" : "ACTIVE",
          isResolved: resolved,
          resolutionMessage: resolved ? message : (p as any).resolutionMessage,
          reopened: !resolved,
          isReopened: !resolved,
          reopenedReason: !resolved ? message : (p as any).reopenedReason,
        } as any as AnyPost;
      }
      return p;
    });

  const handleResolve = (id: number, resolved: boolean, message: string) => {
    setAllPosts(prev => applyResolveUpdate(prev, id, resolved, message));
    // Keep active/resolved filtered arrays in sync too
    if (resolved) {
      // Move from activePosts → resolvedPosts
      setActivePosts(prev => prev.filter(p => p.id !== id));
      setResolvedPosts(prev => {
        const existing = prev.find(p => p.id === id);
        const updated = allPosts.find(p => p.id === id);
        if (existing || !updated) return prev.map(p => p.id === id ? applyResolveUpdate([p], id, resolved, message)[0] : p);
        return [applyResolveUpdate([updated], id, resolved, message)[0], ...prev];
      });
    } else {
      // Move from resolvedPosts → activePosts
      setResolvedPosts(prev => prev.filter(p => p.id !== id));
      setActivePosts(prev => {
        const existing = prev.find(p => p.id === id);
        const updated = allPosts.find(p => p.id === id);
        if (existing || !updated) return prev.map(p => p.id === id ? applyResolveUpdate([p], id, resolved, message)[0] : p);
        return [applyResolveUpdate([updated], id, resolved, message)[0], ...prev];
      });
    }
  };

  const [username, setUsername] = useState<string>("...");
  const [memberSince, setMemberSince] = useState("");
  const [location, setLocation] = useState("India");
  const [currentUser, setCurrentUser] = useState<CurrentUser | undefined>();

  const [issueCount, setIssueCount] = useState<number | null>(null);
  const [socialCount, setSocialCount] = useState<number | null>(null);
  const [communityCount, setCommunityCount] = useState<number | null>(null);
  const allCountsLoaded = issueCount !== null && socialCount !== null && communityCount !== null;

  const [allPosts, setAllPosts] = useState<AnyPost[]>([]);
  const [activePosts, setActivePosts] = useState<AnyPost[]>([]);
  const [resolvedPosts, setResolvedPosts] = useState<AnyPost[]>([]);
  const [hasLoadedActive, setHasLoadedActive] = useState(false);
  const [hasLoadedResolved, setHasLoadedResolved] = useState(false);
  const [socialPosts, setSocialPosts] = useState<AnyPost[]>([]);
  const [activityItems, setActivityItems] = useState<{ post: AnyPost; type: "liked" | "saved" | "commented"; time: number }[]>([]);

  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingFilteredPosts, setLoadingFilteredPosts] = useState(false);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const { data: user } = useCurrentUser();

  const updatePostState = useCallback((postId: number, variant: string, updater: Partial<AnyPost> | ((p: AnyPost) => Partial<AnyPost>)) => {
    const updateListItem = (prev: AnyPost[]) =>
      prev.map((p) => {
        if (p.id === postId && p.variant === variant) {
          const changes = typeof updater === "function" ? updater(p) : updater;
          return { ...p, ...changes } as AnyPost;
        }
        return p;
      });

    setAllPosts(updateListItem);
    setSocialPosts(updateListItem);
    setActivityItems((prev) =>
      prev.map((item) => {
        if (item.post.id === postId && item.post.variant === variant) {
          const changes = typeof updater === "function" ? updater(item.post) : updater;
          return { ...item, post: { ...item.post, ...changes } as AnyPost };
        }
        return item;
      })
    );
  }, []);

  const handleLike = useCallback((postId: number, variant: string, liked: boolean) => {
    updatePostState(postId, variant, (post) => {
      const hasDislikeSupport = post.variant === "issue";
      const isPreviouslyDisliked = hasDislikeSupport && !!(post as any).isDislikedByCurrentUser;
      return {
        isLikedByCurrentUser: liked,
        likeCount: post.likeCount + (liked ? 1 : -1),
        ...(isPreviouslyDisliked && liked && {
          isDislikedByCurrentUser: false,
          dislikeCount: Math.max(0, ((post as any).dislikeCount ?? 0) - 1)
        })
      } as Partial<AnyPost>;
    });
  }, [updatePostState]);

  const handleDislike = useCallback((postId: number, variant: string, disliked: boolean) => {
    updatePostState(postId, variant, (post) => {
      const isPreviouslyLiked = !!post.isLikedByCurrentUser;
      return {
        isDislikedByCurrentUser: disliked,
        dislikeCount: ((post as any).dislikeCount ?? 0) + (disliked ? 1 : -1),
        ...(isPreviouslyLiked && disliked && {
          isLikedByCurrentUser: false,
          likeCount: Math.max(0, post.likeCount - 1)
        })
      } as Partial<AnyPost>;
    });
  }, [updatePostState]);

  const handleSave = useCallback((postId: number, variant: string, saved: boolean) => {
    updatePostState(postId, variant, {
      isSaved: saved,
      isSavedByCurrentUser: saved
    } as Partial<AnyPost>);
  }, [updatePostState]);

  useEffect(() => {
    if (!user) return;
    const name = user.actualUsername ?? user.username ?? "User";
    setUsername(name);
    
    if (user.createdAt)
      setMemberSince(formatDate(user.createdAt));
    if (user.pincode) setLocation(user.pincode);
    else if (user.address) setLocation(user.address);

    setCurrentUser({
      id: user.id,
      username: name,
      role: user.role,
    });
  }, [user]);

  // Fetch counts + pre-populate lists
  useEffect(() => {
    if (!user?.id) return;

    setLoadingPosts(true);
    apiFetch("/api/posts/my-posts?limit=500")
      .then((b) => {
        const posts: AnyPost[] = (b?.data?.data ?? []).map(mapIssuePost);
        setAllPosts(posts);
        setIssueCount(posts.length);
      })
      .catch((err) => {
        console.error("Failed to fetch user issue posts:", err);
        setIssueCount(0);
      })
      .finally(() => {
        setLoadingPosts(false);
      });

    apiFetch("/api/social-posts/my-posts?limit=500")
      .then((b) => {
        const rawPosts: any[] = b?.data?.data ?? [];
        const mapped = rawPosts.map(mapSocialPost);
        setSocialPosts(mapped);
        setSocialCount(mapped.length);
        setHasLoadedSocial(true);
      })
      .catch(() => {
        setSocialCount(0);
      });

    Promise.allSettled([
      apiFetch("/api/communities/me?limit=100"),
      apiFetch("/api/communities/owned"),
    ])
      .then(([meRes, ownedRes]) => {
        let joined: any[] = [];
        if (meRes.status === "fulfilled" && meRes.value?.success) {
          joined = meRes.value?.data?.data ?? [];
        }
        let owned: any[] = [];
        if (ownedRes.status === "fulfilled" && ownedRes.value?.success) {
          owned = ownedRes.value?.data ?? [];
        }
        const seen = new Set<number>();
        for (const c of [...owned, ...joined]) {
          if (c?.id) {
            seen.add(c.id);
          }
        }
        setCommunityCount(seen.size);
      })
      .catch(() => {
        setCommunityCount(0);
      });
  }, [user?.id]);

  // ── Lazy-fetch active / resolved posts when filter is selected ──────────────
  useEffect(() => {
    if (tab !== "posts") return;

    if (postFilter === "active" && !hasLoadedActive) {
      setLoadingFilteredPosts(true);
      apiFetch("/api/posts/my-posts/active?limit=100")
        .then((b) => {
          setActivePosts((b?.data?.data ?? []).map(mapIssuePost));
          setHasLoadedActive(true);
        })
        .catch((err) => console.error("Failed to fetch active posts:", err))
        .finally(() => setLoadingFilteredPosts(false));
    }

    if (postFilter === "resolved" && !hasLoadedResolved) {
      setLoadingFilteredPosts(true);
      apiFetch("/api/posts/my-posts/resolved?limit=100")
        .then((b) => {
          setResolvedPosts((b?.data?.data ?? []).map(mapIssuePost));
          setHasLoadedResolved(true);
        })
        .catch((err) => console.error("Failed to fetch resolved posts:", err))
        .finally(() => setLoadingFilteredPosts(false));
    }
  }, [postFilter, tab, hasLoadedActive, hasLoadedResolved]);

  // Fetch social posts on tab open
  useEffect(() => {
    if (tab !== "social") return;
    if (hasLoadedSocial) return;
    if (socialPosts.length > 0) return;
    setLoadingSocial(true);
    apiFetch("/api/social-posts/my-posts?limit=50")
      .then((b) => {
        setSocialPosts((b?.data?.data ?? []).map(mapSocialPost));
        setHasLoadedSocial(true);
      })
      .catch(() => {})
      .finally(() => setLoadingSocial(false));
  }, [tab, hasLoadedSocial]);

  // Fetch activity — show saved, liked, and commented posts
  useEffect(() => {
    if (tab !== "activity") return;
    if (activityItems.length > 0) return;
    setLoadingActivity(true);

    Promise.allSettled([
      apiFetch("/api/interactions/saved/social-posts?page=0&size=30"),
      apiFetch("/api/interactions/saved/posts?page=0&size=30"),
      apiFetch("/api/interactions/liked?page=0&size=30"),
      apiFetch("/api/interactions/commented?page=0&size=30"),
    ])
      .then(async ([savedSocialRes, savedPostsRes, likedRes, commentedRes]) => {
        const items: { post: AnyPost; time: number; type: string }[] = [];

        // 1. Process Saved Social
        let savedSocialPromises: Promise<any>[] = [];
        if (savedSocialRes.status === "fulfilled") {
          const rows = savedSocialRes.value?.data?.content ?? [];
          savedSocialPromises = rows.map(async (row: any) => {
            let raw = row.socialPost || row;
            if (!raw.createdAt && row.socialPostId) {
              try {
                const fullPostRes = await apiFetch(`/api/social-posts/${row.socialPostId}`);
                raw = fullPostRes?.data ?? fullPostRes ?? raw;
              } catch (e) {
                console.error("Failed to fetch full social post details", e);
              }
            }
            if (!raw?.id) return null;
            const { id: _, socialPost, post, ...interactionData } = row;
            const mapped = toPostCardPost({
              ...raw,
              ...interactionData,
              id: raw.id,
              isSaved: true,
              isSavedByCurrentUser: true,
            });
            if (!mapped.username) mapped.username = username;
            return {
              post: mapped,
              time: new Date(row.savedAt || raw.createdAt || 0).getTime(),
              type: "saved"
            };
          });
        }

        // 2. Process Saved Regular
        let savedPostsPromises: Promise<any>[] = [];
        if (savedPostsRes.status === "fulfilled") {
          const rows = savedPostsRes.value?.data?.content ?? [];
          savedPostsPromises = rows.map(async (row: any) => {
            let raw = row.post || row;
            if (!raw.createdAt && row.postId) {
              try {
                const fullPostRes = await apiFetch(`/api/posts/${row.postId}`);
                raw = fullPostRes?.data ?? fullPostRes ?? raw;
              } catch (e) {
                console.error("Failed to fetch full broadcast post details", e);
              }
            }
            if (!raw?.id) return null;
            const { id: _, socialPost, post, ...interactionData } = row;
            const mapped = toPostCardPost({
              ...raw,
              ...interactionData,
              id: raw.id,
              isSaved: true,
              isSavedByCurrentUser: true,
            });
            if (!mapped.username) mapped.username = username;
            return {
              post: mapped,
              time: new Date(row.savedAt || raw.createdAt || 0).getTime(),
              type: "saved"
            };
          });
        }

        const resolvedSavedSocial = await Promise.all(savedSocialPromises);
        const resolvedSavedPosts = await Promise.all(savedPostsPromises);

        resolvedSavedSocial.forEach((item) => {
          if (item) items.push(item);
        });
        resolvedSavedPosts.forEach((item) => {
          if (item) items.push(item);
        });

        // 3. Process Liked
        if (likedRes.status === "fulfilled") {
          const data = likedRes.value?.data || {};
          const socialLikes = data.socialLikes?.content || [];
          const issueLikes = data.issueLikes?.content || [];

          socialLikes.forEach((row: any) => {
            if (!row.socialPost) return;
            const { id: _, socialPost, post, ...interactionData } = row;
            const mapped = toPostCardPost({
              ...row.socialPost,
              ...interactionData,
              id: row.socialPost.id,
              isLikedByCurrentUser: true,
            });
            if (!mapped.username) mapped.username = username;
            items.push({
              post: mapped,
              time: new Date(row.createdAt || 0).getTime(),
              type: "liked"
            });
          });
          issueLikes.forEach((row: any) => {
            if (!row.post) return;
            const { id: _, socialPost, post, ...interactionData } = row;
            const mapped = toPostCardPost({
              ...row.post,
              ...interactionData,
              id: row.post.id,
              isLikedByCurrentUser: row.post?.isLikedByCurrentUser ?? true,
              isDislikedByCurrentUser: row.post?.isDislikedByCurrentUser ?? false,
            });
            if (!mapped.username) mapped.username = username;
            items.push({
              post: mapped,
              time: new Date(row.createdAt || 0).getTime(),
              type: "liked"
            });
          });
        }

        // 4. Process Commented
        if (commentedRes.status === "fulfilled") {
          const data = commentedRes.value?.data || {};
          const socialComments = data.socialComments?.content || [];
          const issueComments = data.issueComments?.content || [];

          socialComments.forEach((row: any) => {
            if (!row.socialPost) return;
            const { id: _, socialPost, post, ...interactionData } = row;
            const mapped = toPostCardPost({
              ...row.socialPost,
              ...interactionData,
              id: row.socialPost.id,
            });
            if (!mapped.username) mapped.username = username;
            items.push({
              post: mapped,
              time: new Date(row.createdAt || 0).getTime(),
              type: "commented"
            });
          });
          issueComments.forEach((row: any) => {
            if (!row.post) return;
            const { id: _, socialPost, post, ...interactionData } = row;
            const mapped = toPostCardPost({
              ...row.post,
              ...interactionData,
              id: row.post.id,
            });
            if (!mapped.username) mapped.username = username;
            items.push({
              post: mapped,
              time: new Date(row.createdAt || 0).getTime(),
              type: "commented"
            });
          });
        }

        // Sort by most recent activity
        items.sort((a, b) => b.time - a.time);
        setActivityItems(items as any);
      })
      .catch((err) => console.error("Failed to fetch activity", err))
      .finally(() => setLoadingActivity(false));
  }, [tab]);

  const displayedActivity = useMemo(() => {
    let filtered = activityItems;
    if (activityFilter !== "all") {
      filtered = activityItems.filter((item) => item.type === activityFilter);
    }

    const uniquePosts: AnyPost[] = [];
    const seenIds = new Set<string>();
    filtered.forEach((item) => {
      const key = `${item.post.variant}-${item.post.id}`;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        uniquePosts.push(item.post);
      }
    });
    return uniquePosts;
  }, [activityItems, activityFilter]);

  const displayedPosts = useMemo(() => {
    if (postFilter === "active")   return activePosts;
    if (postFilter === "resolved") return resolvedPosts;
    return allPosts;
  }, [allPosts, activePosts, resolvedPosts, postFilter]);

  return (
    <div className="space-y-4 pt-2 sm:pt-0">
      {/* Profile Header */}
      <div className="rounded-xl border border-base-300 bg-base-200 p-3 sm:p-4">
        <div className="flex items-center gap-4">
          <div className="relative group/avatar shrink-0">
            <div className="avatar">
              <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-red-500 dark:border-red-400 shadow-lg bg-base-300 relative">
                 <img 
                  src={resolveMediaUrl(user?.profileImage, "social-posts") || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(username)}`} 
                  alt="Profile Avatar" 
                  className="w-full h-full object-cover" 
                />
                {uploadingImg && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                    <span className="loading loading-spinner loading-sm" />
                  </div>
                )}
              </div>
            </div>
            {!uploadingImg && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-red-500 hover:bg-red-600 dark:bg-red-400 dark:hover:bg-red-500 text-white shadow-md border border-base-100 hover:scale-110 transition cursor-pointer"
                title="Change profile photo"
              >
                <Camera size={11} />
              </button>
            )}
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploadingImg}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <h1 className="font-extrabold text-xs sm:text-sm md:text-lg truncate max-w-full leading-tight notranslate">{username}</h1>
              <ShieldCheck size={12} className="text-[#1D4ED8] shrink-0" />
            </div>
            <p className="text-[9px] sm:text-xs opacity-70 truncate line-clamp-1">
              <span className="notranslate">{memberSince ? `Member since ${memberSince}` : "Loading…"}</span> • <span className="notranslate">{location}</span>
            </p>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={openEditModal}
              className="btn btn-xs sm:btn-sm btn-outline rounded-xl border-base-300 hover:border-red-500 hover:bg-red-500/10 text-base-content hover:text-red-400 font-bold transition flex items-center gap-1 sm:gap-1.5 cursor-pointer"
            >
              <Edit size={12} className="sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Edit Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard value={allCountsLoaded ? issueCount : "..."} label="Issues" />
        <StatCard value={allCountsLoaded ? socialCount : "..."} label="S-Posts" />
        <StatCard value={allCountsLoaded ? communityCount : "..."} label="Groups" />
      </div>

      {/* Tabs */}
      <ProfileTabs 
        active={tab} 
        onChange={setTab} 
        issueCount={allCountsLoaded ? issueCount : null} 
        socialCount={allCountsLoaded ? socialCount : null} 
      />

      {/* Issues tab */}
      {tab === "posts" && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {(["all", "active", "resolved"] as PostFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setPostFilter(f)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition ${postFilter === f
                    ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                    : "border-base-300 hover:border-blue-400"
                  }`}
              >
                {f === "all" && <List size={11} />}
                {f === "active" && <Clock size={11} />}
                {f === "resolved" && <CheckCircle size={11} />}
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {(loadingPosts || loadingFilteredPosts) ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <PostSkeleton key={`sk-issues-${i}`} />
              ))}
            </div>
          ) : displayedPosts.length === 0 ? (
            <EmptyState
              title="No issues yet"
              description="Issue posts you create will appear here."
            />
          ) : (
            displayedPosts.map((p) => (
              <PostCard 
                key={p.id} 
                post={p} 
                currentUser={currentUser} 
                onDelete={(id) => handleDelete('posts', id)} 
                onResolve={handleResolve}
                onLike={(id, liked) => handleLike(id, p.variant, liked)}
                onDislike={(id, disliked) => handleDislike(id, p.variant, disliked)}
                onSave={(id, saved) => handleSave(id, p.variant, saved)}
              />
            ))
          )}
        </div>
      )}

      {/* Social Posts tab */}
      {tab === "social" && (
        <div className="space-y-4">
          {loadingSocial ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <PostSkeleton key={`sk-social-${i}`} />
              ))}
            </div>
          ) : socialPosts.length === 0 ? (
            <EmptyState
              title="No social posts yet"
              description="Social posts you publish will appear here."
            />
          ) : (
            socialPosts.map((p) => (
              <PostCard 
                key={p.id} 
                post={p} 
                currentUser={currentUser} 
                onDelete={(id) => handleDelete('social-posts', id)} 
                onLike={(id, liked) => handleLike(id, p.variant, liked)}
                onDislike={(id, disliked) => handleDislike(id, p.variant, disliked)}
                onSave={(id, saved) => handleSave(id, p.variant, saved)}
              />
            ))
          )}
        </div>
      )}

      {/* Activity tab — saved posts rendered as PostCards */}
      {tab === "activity" && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {(["all", "liked", "saved", "commented"] as ActivityFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setActivityFilter(f)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition ${activityFilter === f
                    ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                    : "border-base-300 hover:border-blue-400"
                  }`}
              >
                {f === "all" && <Clock size={11} />}
                {f === "liked" && <Heart size={11} />}
                {f === "saved" && <Bookmark size={11} />}
                {f === "commented" && <MessageSquare size={11} />}
                {f === "liked" ? "Like/Dislike" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loadingActivity ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <PostSkeleton key={`sk-activity-${i}`} />
              ))}
            </div>
          ) : displayedActivity.length === 0 ? (
            <EmptyState
              title={
                activityFilter === "all" ? "No activity yet" :
                activityFilter === "liked" ? "No liked/disliked posts yet" :
                activityFilter === "saved" ? "No saved posts yet" :
                "No commented posts yet"
              }
              description={
                activityFilter === "all" ? "Posts you interact with will appear here." :
                activityFilter === "liked" ? "Posts you like or dislike will appear here." :
                activityFilter === "saved" ? "Posts you save will appear here." :
                "Posts you comment on will appear here."
              }
            />
          ) : (
            displayedActivity.map((post: AnyPost) => (
              <PostCard
                key={`${post.id}-${post.variant}`}
                post={post}
                currentUser={currentUser}
                hideDelete={true}
                onResolve={handleResolve}
                onLike={(id, liked) => handleLike(id, post.variant, liked)}
                onDislike={(id, disliked) => handleDislike(id, post.variant, disliked)}
                onSave={(id, saved) => handleSave(id, post.variant, saved)}
              />
            ))
          )}
        </div>
      )}

      {/* Edit Profile Details Modal */}
      <AnimatePresence>
        {editModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40" onClick={() => setEditModalOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-base-content/10 pb-3">
                <h3 className="text-sm font-bold text-base-content uppercase tracking-wider">Edit Profile Details</h3>
                <button 
                  onClick={() => setEditModalOpen(false)}
                  className="btn btn-ghost btn-xs btn-circle bg-base-300 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black opacity-60 uppercase tracking-widest">Email Address</label>
                  <input
                    type="email"
                    className="input input-bordered input-sm w-full bg-base-200/50"
                    placeholder="Enter email address"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black opacity-60 uppercase tracking-widest">Pincode (Location)</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="input input-bordered input-sm w-full bg-base-200/50"
                    placeholder="Enter 6-digit pincode"
                    value={editPincode}
                    onChange={(e) => setEditPincode(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-base-content/5">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="btn btn-sm flex-1 bg-base-200 hover:bg-base-300 text-base-content border-none rounded-xl cursor-pointer"
                  disabled={savingDetails}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDetails}
                  className="btn btn-sm flex-1 bg-primary hover:bg-primary/95 text-white border-none rounded-xl font-bold cursor-pointer"
                  disabled={savingDetails}
                >
                  {savingDetails ? <span className="loading loading-spinner loading-xs" /> : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Editor Modal */}
      {editorOpen && editorImageSrc && (
        <ImageEditorModal
          isOpen={editorOpen}
          imageSrc={editorImageSrc}
          onSave={handleEditorSave}
          onClose={() => {
            setEditorOpen(false);
            setEditorImageSrc(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
      )}
    </div>
  );
};

export default Profile;