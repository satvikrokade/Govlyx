import { useState, useEffect, useCallback, useRef } from "react";
import { Flame, Clock, ArrowUp, SlidersHorizontal, Sparkles, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import PostCard from "../components/post/PostCard";
import type { AnyPost } from "../components/post/PostCard";
import EmptyState from "../components/ui/EmptyState";
import LoadingAnimation from "../components/ui/LoadingAnimation";
import axiosInstance from "../api/axiosConfig";
import axios from "axios";
import { parseError } from "../utils/error-handler";

import { useCurrentUser } from "../hooks/useUser";
import { toPostCardPost } from "../utils/postUtils";

const FEED_SIZE = 10;

function useFeed(sourceTab: string, sortTab: string) {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const queryKey = ["feed", sourceTab, sortTab, sourceTab === "location" ? user?.pincode : undefined];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading: initialLoading,
    isError,
    error: queryError,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = null }: { pageParam?: number | null }) => {
      // /local and /official expect `beforeId` + `limit`; others expect `lastPostId` + `size`
      const usesCursorAndLimit = sourceTab === "location" || sourceTab === "official";

      const params: any = {
        sort: sortTab.toUpperCase(),
      };

      if (usesCursorAndLimit) {
        params.limit = FEED_SIZE;
        if (pageParam !== null) {
          params.beforeId = pageParam;
        }
      } else {
        params.size = FEED_SIZE;
        if (pageParam !== null) {
          params.lastPostId = pageParam;
        }
      }

      let endpoint = "/api/v1/feed/for-you";
      if (sourceTab === "location") {
        endpoint = "/api/v1/feed/local";
        if (user?.pincode) {
          params.pincode = user.pincode;
          params.targetPincode = user.pincode;
        }
      }
      else if (sourceTab === "following") endpoint = "/api/v1/feed/following";
      else if (sourceTab === "official") endpoint = "/api/v1/feed/official";

      const res = await axiosInstance.get(endpoint, { params });
      const json = res.data;

      const isWrapped = json.success !== undefined && json.data !== undefined;
      const container = isWrapped ? json.data : json;

      let items: any[] = [];
      if (Array.isArray(container)) {
        items = container;
      } else if (container && typeof container === "object") {
        items = container.data ?? container.content ?? [];
      }

      const mapped = items.map(toPostCardPost);

      return {
        posts: mapped,
        hasMore: container?.hasMore ?? false,
        nextCursor: container?.nextCursor ?? null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: null,
    placeholderData: (prev) => prev,
  });

  const map = new Map<string, AnyPost>();
  if (data?.pages) {
    data.pages.forEach((page) => {
      page.posts.forEach((item: AnyPost) => {
        map.set(item.id + "-" + item.variant, item);
      });
    });
  }
  const posts = Array.from(map.values());

  const loading = isFetching;
  const hasMore = hasNextPage;
  const error = isError ? parseError(queryError) : null;
  const fatalError =
    isError &&
    axios.isAxiosError(queryError) &&
    (queryError.response?.status === 401 || queryError.response?.status === 403);

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) fetchNextPage();
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const retry = useCallback(() => {
    refetch();
  }, [refetch]);

  const updatePost = useCallback((postId: number, updater: Partial<AnyPost> | ((p: AnyPost) => Partial<AnyPost>)) => {
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          posts: page.posts.map((p: AnyPost) => {
            if (p.id !== postId) return p;
            const changes = typeof updater === "function" ? updater(p) : updater;
            return { ...p, ...changes };
          })
        }))
      };
    });
  }, [queryClient, queryKey]);

  const prependPost = useCallback((rawPost: any) => {
    const mapped = toPostCardPost(rawPost);
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) {
        return {
          pages: [{ posts: [mapped], hasMore: false, nextCursor: null }],
          pageParams: [null]
        };
      }
      const firstPage = oldData.pages[0];
      return {
        ...oldData,
        pages: [
          { ...firstPage, posts: [mapped, ...firstPage.posts] },
          ...oldData.pages.slice(1)
        ]
      };
    });
  }, [queryClient, queryKey]);

  const deletePost = useCallback((postId: number) => {
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          posts: page.posts.filter((p: AnyPost) => p.id !== postId)
        }))
      };
    });
  }, [queryClient, queryKey]);

  return { posts, loading, initialLoading, hasMore, error, fatalError, loadMore, retry, updatePost, prependPost, deletePost };
}

function InfiniteScrollTrigger({ onIntersect }: { onIntersect: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cbRef = useRef(onIntersect);
  useEffect(() => { cbRef.current = onIntersect; }, [onIntersect]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) cbRef.current(); },
      { threshold: 0.1, rootMargin: "0px 0px 200px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className="h-4" />;
}

const SOURCE_TABS: { key: "all" | "location" | "following" | "official"; label: string }[] = [
  { key: "all", label: "For You" },
  { key: "location", label: "Location" },
  { key: "following", label: "Following" },
  { key: "official", label: "Official" },
];

const SORT_TABS: { key: "hot" | "new" | "top"; label: string; icon: any }[] = [
  { key: "hot", label: "Hot", icon: Flame },
  { key: "new", label: "New", icon: Clock },
  { key: "top", label: "Top", icon: ArrowUp },
];

const Home = () => {
  const [sourceTab, setSourceTab] = useState<"all" | "location" | "following" | "official">(() => {
    const saved = sessionStorage.getItem("active_home_tab");
    return (saved === "all" || saved === "location" || saved === "following" || saved === "official")
      ? saved
      : "all";
  });
  const [sortTab, setSortTab] = useState<"hot" | "new" | "top">("hot");

  useEffect(() => {
    sessionStorage.setItem("active_home_tab", sourceTab);
  }, [sourceTab]);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(event.target as Node)) {
        setSourceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: user } = useCurrentUser();
  const { posts, loading, initialLoading, hasMore, error, fatalError, loadMore, retry, updatePost, prependPost, deletePost } =
    useFeed(sourceTab, sortTab);

  const currentUser = user ? {
    id: user.id,
    username: user.actualUsername || user.username,
    role: user.role
  } : undefined;

  const handleLike = useCallback((postId: number, liked: boolean) => {
    updatePost(postId, (post) => {
      if (!!post.isLikedByCurrentUser === liked) return {};
      const hasDislikeSupport = post.variant === "issue";
      const isPreviouslyDisliked = hasDislikeSupport && !!(post as any).isDislikedByCurrentUser;
      return {
        isLikedByCurrentUser: liked,
        likeCount: (post.likeCount ?? 0) + (liked ? 1 : -1),
        ...(isPreviouslyDisliked && liked && {
          isDislikedByCurrentUser: false,
          dislikeCount: Math.max(0, ((post as any).dislikeCount ?? 0) - 1)
        })
      } as Partial<AnyPost>;
    });
  }, [updatePost]);

  const handleDislike = useCallback((postId: number, disliked: boolean) => {
    updatePost(postId, (post) => {
      if (!!(post as any).isDislikedByCurrentUser === disliked) return {};
      const isPreviouslyLiked = !!post.isLikedByCurrentUser;
      return {
        isDislikedByCurrentUser: disliked,
        dislikeCount: ((post as any).dislikeCount ?? 0) + (disliked ? 1 : -1),
        ...(isPreviouslyLiked && disliked && {
          isLikedByCurrentUser: false,
          likeCount: Math.max(0, (post.likeCount ?? 0) - 1)
        })
      } as Partial<AnyPost>;
    });
  }, [updatePost]);

  const handleSave = useCallback((postId: number, saved: boolean) => {
    updatePost(postId, (post) => {
      const isSaved = !!((post as any).isSavedByCurrentUser ?? (post as any).isSaved ?? false);
      if (isSaved === saved) return {};
      return {
        isSaved: saved,
        isSavedByCurrentUser: saved
      } as Partial<AnyPost>;
    });
  }, [updatePost]);

  const handleShare = useCallback((postId: number) => {
    updatePost(postId, (post) => ({
      shareCount: (post.shareCount ?? 0) + 1
    }));
  }, [updatePost]);

  const handleComment = useCallback((postId: number) => {
    window.location.href = `/post/${postId}`;
  }, []);

  const handleDelete = useCallback((postId: number) => {
    deletePost(postId);
  }, [deletePost]);

  const handleNotInterested = useCallback(async (postId: number) => {
    deletePost(postId);
    try {
      await axiosInstance.post("/api/v1/feed/signal/not-interested", { postId });
    } catch (err) {
      console.error("Failed to submit not interested signal:", err);
    }
  }, [deletePost]);

  useEffect(() => {
    const onPostCreated = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newPostData = customEvent.detail?.post;
      if (newPostData) prependPost(newPostData);
      else retry();
    };
    window.addEventListener("postCreated", onPostCreated);
    return () => window.removeEventListener("postCreated", onPostCreated);
  }, [retry, prependPost]);

  return (
    <div className="space-y-4">
      <div className="sticky top-2 z-30">
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-base-300 bg-base-100/90 p-1.5 backdrop-blur-md shadow-sm">
          {/* Desktop Scrollable Feed Tabs */}
          <div className="hidden sm:flex gap-1 bg-base-200/50 p-1 rounded-xl overflow-x-auto scrollbar-hide flex-1">
            {SOURCE_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setSourceTab(t.key)}
                className={`shrink-0 rounded-lg px-4 py-1.5 text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${sourceTab === t.key ? "bg-[#1D4ED8] text-white shadow-sm" : "text-base-content/70 hover:text-base-content hover:bg-base-300/50"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Mobile Source Dropdown */}
          <div className="relative flex-1 sm:hidden z-40" ref={sourceDropdownRef}>
            <button
              onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)}
              className="flex items-center justify-between w-full px-4 py-2 h-[36px] sm:h-[38px] rounded-xl border border-base-300 bg-base-200/50 hover:bg-base-300/50 transition-all text-sm font-bold text-base-content cursor-pointer"
            >
              <span key={sourceTab}>{SOURCE_TABS.find((t) => t.key === sourceTab)?.label}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${sourceDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {sourceDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute left-0 mt-1.5 z-40 w-full overflow-hidden rounded-xl border border-base-300 bg-base-100 p-1 shadow-lg"
                >
                  {SOURCE_TABS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => {
                        setSourceTab(t.key);
                        setSourceDropdownOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold transition-all cursor-pointer ${sourceTab === t.key ? "bg-[#1D4ED8] text-white" : "text-base-content/70 hover:bg-base-200/60 hover:text-base-content"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sort Dropdown */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 h-[36px] sm:h-[38px] rounded-xl border border-base-300 bg-base-200/50 hover:bg-base-300/50 transition-all text-xs sm:text-sm font-bold text-base-content/70 hover:text-base-content cursor-pointer ${sortDropdownOpen ? "border-[#1D4ED8]/30 bg-[#1D4ED8]/5 text-[#1D4ED8]" : ""}`}
            >
              <SlidersHorizontal size={14} className="sm:w-4 sm:h-4" />
              <span key={sortTab} className="capitalize">{sortTab}</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${sortDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {sortDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 mt-1.5 z-40 overflow-hidden rounded-xl border border-base-300 bg-base-100 p-1 shadow-lg min-w-[120px]"
                >
                  {SORT_TABS.map((t) => {
                    const ActiveIcon = t.icon;
                    return (
                      <button
                        key={t.key}
                        onClick={() => {
                          setSortTab(t.key);
                          setSortDropdownOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs sm:text-sm font-bold transition-all cursor-pointer ${sortTab === t.key ? "bg-[#1D4ED8] text-white" : "text-base-content/70 hover:bg-base-200/60 hover:text-base-content"}`}
                      >
                        <ActiveIcon size={14} />
                        {t.label}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {user?.hasInvalidPincode && (
        <div className="alert alert-warning shadow-sm rounded-2xl border border-warning/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-bold text-sm">Location Verification Failed</h4>
              <p className="text-xs opacity-85">We couldn't verify your location. Please update your pincode in Settings to access local features.</p>
            </div>
          </div>
          <a href="/settings" className="btn btn-xs sm:btn-sm btn-outline border-warning-content/30 hover:bg-warning-content/10 shrink-0 self-end sm:self-auto font-bold">
            Update Pincode
          </a>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error flex items-center justify-between gap-3">
          <span>{error}</span>
          {fatalError ? (
            <a href="/login" className="shrink-0 underline font-medium">Log in</a>
          ) : (
            <button className="shrink-0 underline font-medium" onClick={retry}>Retry</button>
          )}
        </div>
      )}

      {/* Single Column Feed Layout */}
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
        {initialLoading ? (
          <div className="relative min-h-[360px] rounded-3xl">
            <LoadingAnimation overlay label="Loading posts" />
          </div>
        ) : posts.length === 0 && !loading && !error ? (
          <div className="w-full">
            <EmptyState title="Nothing here yet" description="Be the first to post, or try a different tab." />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {posts.map((post) => (
              <PostCard
                key={`${post.id}-${post.variant}`}
                post={post}
                currentUser={currentUser}
                onLike={handleLike}
                onDislike={handleDislike}
                onSave={handleSave}
                onShare={handleShare}
                onComment={handleComment}
                onDelete={handleDelete}
                onNotInterested={handleNotInterested}
                onResolve={(id, resolved, message) => {
                  updatePost(id, {
                    status: resolved ? "RESOLVED" : "ACTIVE",
                    isResolved: resolved,
                    resolutionMessage: resolved ? message : undefined,
                    reopened: !resolved,
                    isReopened: !resolved,
                    reopenedReason: !resolved ? message : undefined,
                  } as Partial<AnyPost>);
                }}
              />
            ))}
          </div>
        )}

        {!initialLoading && loading && (
          <LoadingAnimation label="Loading more posts" />
        )}

        {!initialLoading && hasMore && !loading && !error && (
          <div className="w-full pt-8">
            <InfiniteScrollTrigger onIntersect={loadMore} />
          </div>
        )}

        {!hasMore && posts.length > 0 && !error && (
          <div className="w-full py-20 flex flex-col items-center justify-center gap-4 group/end">
            <div className="flex items-center gap-4 w-full px-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-base-content/5 to-transparent" />
              <div className="p-3 rounded-2xl bg-base-200/30 backdrop-blur-sm border border-base-content/5 group-hover/end:scale-110 group-hover/end:bg-base-200/50 transition-all duration-500">
                <Sparkles size={20} className="text-amber-400 group-hover/end:rotate-12 transition-transform" />
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-base-content/5 to-transparent" />
            </div>
            <p className="text-[10px] sm:text-xs opacity-30 font-black tracking-[0.2em] uppercase text-center max-w-[280px] leading-relaxed">
              You've officially reached the end of the feed
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
