import { useState, useEffect, useCallback, useRef } from "react";
import { Flame, Clock, ArrowUp, SlidersHorizontal, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import PostCard from "../components/post/PostCard";
import type { AnyPost } from "../components/post/PostCard";
import EmptyState from "../components/ui/EmptyState";
import PostSkeleton from "../components/post/PostSkeleton";
import axiosInstance from "../api/axiosConfig";

import { useCurrentUser } from "../hooks/useUser";
import { toPostCardPost } from "../utils/postUtils";

const FEED_SIZE = 20;

function useFeed(sourceTab: string, sortTab: string) {
  const queryClient = useQueryClient();
  const queryKey = ["feed", sourceTab, sortTab];

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
      const params = {
        sort: sortTab.toUpperCase(),
        size: FEED_SIZE,
        ...(pageParam !== null && { lastPostId: pageParam })
      };

      let endpoint = "/api/v1/feed/for-you";
      if (sourceTab === "location") endpoint = "/api/v1/feed/local";
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
  const error = isError ? (queryError as Error).message : null;
  const fatalError = isError;

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) fetchNextPage();
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const retry = useCallback(() => {
    refetch();
  }, [refetch]);

  const updatePost = useCallback((postId: number, changes: Partial<AnyPost>) => {
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          posts: page.posts.map((p: AnyPost) =>
            p.id === postId ? { ...p, ...changes } : p
          )
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
  const [sourceTab, setSourceTab] = useState<"all" | "location" | "following" | "official">("all");
  const [sortTab, setSortTab] = useState<"hot" | "new" | "top">("hot");
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const { data: user } = useCurrentUser();
  const { posts, loading, initialLoading, hasMore, error, fatalError, loadMore, retry, updatePost, prependPost, deletePost } =
    useFeed(sourceTab, sortTab);

  const currentUser = user ? {
    id: user.id,
    username: user.actualUsername || user.username,
    role: user.role
  } : undefined;

  const handleLike = useCallback((postId: number, liked: boolean) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    updatePost(postId, { isLikedByCurrentUser: liked, likeCount: post.likeCount + (liked ? 1 : -1) });
  }, [posts, updatePost]);

  const handleSave = useCallback((postId: number, saved: boolean) => {
    updatePost(postId, { isSaved: saved } as Partial<AnyPost>);
  }, [updatePost]);

  const handleShare = useCallback((postId: number) => {
    navigator.clipboard?.writeText(`${window.location.origin}/post/${postId}`).catch(() => { });
  }, []);

  const handleComment = useCallback((postId: number) => {
    window.location.href = `/post/${postId}`;
  }, []);

  const handleDelete = useCallback((postId: number) => {
    deletePost(postId);
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
        <div className="flex flex-col gap-2 rounded-2xl border border-base-300 bg-base-100/90 p-2 backdrop-blur-md shadow-sm lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="flex lg:hidden items-center justify-between px-2 py-1">
            <span className="text-sm font-bold opacity-60">Feed Filters</span>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-sm font-bold ${showFilters ? "bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-md" : "bg-base-200 border-base-300 text-base-content/70"}`}
            >
              <SlidersHorizontal size={16} />
              {showFilters ? "Hide" : "Explore"}
            </button>
          </div>
          <AnimatePresence>
            {(showFilters || window.innerWidth >= 1024) && (
              <motion.div
                initial={window.innerWidth < 1024 ? { height: 0, opacity: 0 } : false}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:w-full lg:gap-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1 bg-base-200/50 p-1 rounded-xl w-full lg:w-auto overflow-x-auto scrollbar-hide">
                    {SOURCE_TABS.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setSourceTab(t.key)}
                        className={`shrink-0 lg:flex-none rounded-lg px-4 py-1.5 text-sm font-bold transition-all whitespace-nowrap ${sourceTab === t.key ? "bg-[#1D4ED8] text-white shadow-md" : "text-base-content/70 hover:text-base-content hover:bg-base-300/50"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowSort(!showSort)}
                    className={`lg:hidden flex items-center justify-center p-2 h-[38px] w-[38px] rounded-xl border transition-all ${showSort ? "bg-[#1D4ED8]/10 border-[#1D4ED8]/30 text-[#1D4ED8]" : "bg-base-200 border-base-300 text-base-content/60"}`}
                  >
                    <Clock size={18} />
                  </button>
                </div>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4 lg:flex-1 lg:justify-end">
                  <AnimatePresence>
                    {(showSort || window.innerWidth >= 1024) && (
                      <motion.div
                        initial={window.innerWidth < 1024 ? { height: 0, opacity: 0 } : false}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex gap-1 bg-base-200/50 p-1 rounded-xl lg:bg-transparent lg:p-0 overflow-hidden"
                      >
                        <div className="flex gap-1 bg-base-200/50 p-1 rounded-xl w-full lg:w-auto overflow-x-auto scrollbar-hide">
                          {SORT_TABS.map((t) => (
                            <button
                              key={t.key}
                              onClick={() => { setSortTab(t.key); if (window.innerWidth < 1024) setShowSort(false); }}
                              className={`flex shrink-0 lg:flex-none items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-sm font-bold transition-all ${sortTab === t.key ? "bg-[#1D4ED8] text-white shadow-md" : "text-base-content/70 hover:text-base-content hover:bg-base-300/50"}`}
                            >
                              <t.icon size={16} />
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
          Array.from({ length: 6 }).map((_, i) => (
            <PostSkeleton key={`sk-${i}`} />
          ))
        ) : posts.length === 0 && !loading && !error ? (
          <div className="w-full">
            <EmptyState title="Nothing here yet" description="Be the first to post, or try a different tab." />
          </div>
        ) : (
          posts.map((post) => (
            <div key={`${post.id}-${post.variant}`} className="w-full">
              <PostCard
                post={post}
                currentUser={currentUser}
                onLike={handleLike}
                onSave={handleSave}
                onShare={handleShare}
                onComment={handleComment}
                onDelete={handleDelete}
              />
            </div>
          ))
        )}

        {!initialLoading && loading && (
          Array.from({ length: 2 }).map((_, i) => (
            <PostSkeleton key={`more-sk-${i}`} />
          ))
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