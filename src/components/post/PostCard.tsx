import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  Globe,
  Building2,
  AlertCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  ImageIcon,
  UserPlus,
  Play,
  Volume2,
  VolumeX,
  Link,
  Instagram,
  Flag,
  MoreVertical,
  Maximize2,
  MessageSquare,
  EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CommentSection from "./CommentSection";
import { apiUrl } from "../../utils/apiUrl";
import type { PostType } from "./CommentSection";
import { resolveMediaUrl, toPostCardPost } from "../../utils/postUtils";
import ConfirmModal from "./ConfirmModal";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "../../hooks/useUser";
import ReportModal from "../modals/ReportModal";
import UserProfileModal from "../modals/UserProfileModal";
import { checkProfanity } from "../../utils/profanity";
import { showToast } from "../../utils/toast";
import { parseError } from "../../utils/error-handler";
import { useTheme } from "../../hooks/useTheme";
import { getAuthToken } from "../../utils/auth";
import { translateText } from "../../context/LanguageContext";
import KarmaBadge from "../ui/KarmaBadge";

const POST_ACTION_ACTIVE_CLASS = "text-[#1d4ed8] dark:text-white bg-[#1d4ed8]/10 border-[#1d4ed8]/30 dark:border-white";
const POST_ACTION_HOVER_GLOW = "rgba(29,78,216,0.65)";

const POST_ACTION_ICONS = {
  like: {
    light: "/icons/post-actions/like_light.gif",
    dark: "/icons/post-actions/like_dark.gif",
  },
  dislike: {
    light: "/icons/post-actions/like_light.gif",
    dark: "/icons/post-actions/like_dark.gif",
  },
  comment: {
    light: "/icons/post-actions/comment_light.gif",
    dark: "/icons/post-actions/comment_dark.gif",
  },
  share: {
    light: "/icons/post-actions/share_light.gif",
    dark: "/icons/post-actions/share_dark.gif",
  },
  bookmark: {
    light: "/icons/post-actions/bookmark_light.gif",
    dark: "/icons/post-actions/bookmark_dark.gif",
  },
} as const;

function PostActionGif({
  name,
  active = false,
  vertical = false,
}: {
  name: keyof typeof POST_ACTION_ICONS;
  active?: boolean;
  vertical?: boolean;
}) {
  const { theme } = useTheme();
  const src = POST_ACTION_ICONS[name][theme === "dark" ? "dark" : "light"];
  const isDislike = name === "dislike";

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
      style={isDislike ? { transform: `scaleY(-1) ${active ? "scale(1.1)" : "scale(1)"}` } : undefined}
      className={`${vertical ? "h-5 w-5 sm:h-6 sm:w-6" : "h-7 w-7 sm:h-8 sm:w-8"} ${active && !isDislike ? "scale-110" : ""} pointer-events-none shrink-0 object-contain transition-transform duration-200`}
    />
  );
}

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(url: string, method: string, body?: unknown): Promise<unknown> {
  const token = getAuthToken();
  const res = await fetch(apiUrl(url), {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 204) return null;

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!res.ok) {
    const errorMsg = json?.message || json?.error || text || `${res.status}`;
    throw new Error(`${res.status} - ${errorMsg}`);
  }

  return json?.data ?? json;
}

const apiPost = (url: string, body: unknown) => apiFetch(url, "POST", body);
const apiPut = (url: string, body?: unknown) => apiFetch(url, "PUT", body);
const apiDelete = (url: string) => apiFetch(url, "DELETE");

async function recordShare(postType: "posts" | "social-posts", id: number, skipApi?: boolean, method: string = "copy") {
  if (method === "copy") {
    const url = `${window.location.origin}/post/${id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy link:", url);
    }
  }
  if (!skipApi) {
    const typeStr = method === "copy" ? "LINK_COPY" : "EXTERNAL_SHARE";
    apiPost(`/api/interactions/${postType}/${id}/share?shareType=${typeStr}`, {}).catch(() => { });
  }
}

function useCopied() {
  const [copied, setCopied] = useState(false);
  function flash() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return { copied, flash };
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type PostVariant = "issue" | "social" | "community" | "government" | "poll";
export type PostStatus = "ACTIVE" | "RESOLVED" | "DELETED" | "FLAGGED";
export type BroadcastScope = "AREA" | "DISTRICT" | "STATE" | "COUNTRY";

export type CurrentUser = {
  id: number;
  role: "ROLE_USER" | "ROLE_DEPARTMENT" | "ROLE_ADMIN";
  taggedUsernames?: string[];
  username: string;
};

type BasePost = {
  id: number;
  content: string;
  // Auto-translate fields returned by the backend
  translatedContent?: string;
  isTranslated?: boolean;
  timeAgo?: string;
  username: string;
  userDisplayName?: string;
  userProfileImage?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  contentHidden?: boolean;
  hiddenReason?: string;
  isViewedByCurrentUser?: boolean;
  karmaScore?: number;
  authorKarmaScore?: number;
  communitySewaScore?: number;
  communityFlair?: string;
  isPendingSync?: boolean;
};

export type IssuePost = BasePost & {
  variant: "issue";
  status: PostStatus;
  broadcastScope?: BroadcastScope;
  broadcastScopeDescription?: string;
  targetPincodes?: string[];
  isResolved: boolean;
  resolvedAt?: string;
  canBeResolved?: boolean;
  dislikeCount: number;
  viewCount: number;
  taggedUsernames: string[];
  imageName?: string;
  hasImage?: boolean;
  isLikedByCurrentUser?: boolean;
  isDislikedByCurrentUser?: boolean;
  isSaved?: boolean;
  isReopened?: boolean;
  reopened?: boolean;
  reopenReason?: string | null;
  reopenedReason?: string | null;
};

export type SocialPost = BasePost & {
  variant: "social";
  isSaved?: boolean;
  isSavedByCurrentUser?: boolean;
  hashtags?: string[];
  mediaUrls?: string[];
  communityId?: number | null;
  isLikedByCurrentUser?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  isPoll?: boolean;
  pollId?: number;
};

export type CommunityPost = BasePost & {
  variant: "community";
  communityId: number;
  communityName: string;
  communityAvatar?: string;
  communityMemberCount?: string;
  isMember?: boolean;
  authorRole?: string;
  isSaved?: boolean;
  isSavedByCurrentUser?: boolean;
  hashtags?: string[];
  mediaUrls?: string[];
  isLikedByCurrentUser?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
};

export type GovernmentPost = BasePost & {
  variant: "government";
  department: string;
  isSaved?: boolean;
  isSavedByCurrentUser?: boolean;
  broadcastScope?: BroadcastScope;
  broadcastScopeDescription?: string;
  isGovernmentBroadcast: true;
  isLikedByCurrentUser?: boolean;
  isDislikedByCurrentUser?: boolean;
  dislikeCount: number;
};

export type PollOption = {
  id: number;
  optionText: string;
  voteCount: number;
  percentage: number;
};

export type PollPost = BasePost & {
  variant: "poll";
  pollId: number;
  question: string;
  options: PollOption[];
  totalVotes: number;
  allowMultipleVotes: boolean;
  isExpired: boolean;
  expiresAt?: string;
  timeLeft?: string;
  userHasVoted: boolean;
  votedOptionIds: number[];
  showResults: boolean;
  isSaved?: boolean;
  communityId?: number;
  communityName?: string;
  communityAvatar?: string;
  communityMemberCount?: string;
  isMember?: boolean;
  authorRole?: string;
  isLikedByCurrentUser?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
};

export type AnyPost = IssuePost | SocialPost | CommunityPost | GovernmentPost | PollPost;

type PostCardProps = {
  post: AnyPost;
  currentUser?: CurrentUser;
  onLike?: (postId: number, liked: boolean) => void;
  onDislike?: (postId: number, disliked: boolean) => void;
  onSave?: (postId: number, saved: boolean) => void;
  onShare?: (postId: number) => void;
  onComment?: (postId: number) => void;
  onResolve?: (postId: number, isResolved: boolean, message: string) => void;
  onVote?: (pollId: number, optionIds: number[]) => void;
  onDelete?: (postId: number) => void;
  hideCommunityStrip?: boolean;
  hideDelete?: boolean;
  onShareToCommunity?: (postId: number, content: string) => void;
  onNotInterested?: (postId: number) => void;
};

const postTranslationCache = new Map<string, string>();

interface GlobalInteractionState {
  liked?: boolean;
  likeCount?: number;
  disliked?: boolean;
  dislikeCount?: number;
  saved?: boolean;
}
const globalInteractionCache = new Map<string, GlobalInteractionState>();

function getGlobalCacheKey(post: AnyPost): string {
  const isIssue = post.variant === "issue";
  const isGovt = post.variant === "government";
  const type = (isIssue || isGovt) ? "posts" : "social-posts";
  return `${type}-${post.id}`;
}

function updateGlobalCache(post: AnyPost, updates: GlobalInteractionState) {
  const key = getGlobalCacheKey(post);
  const current = globalInteractionCache.get(key) || {};
  globalInteractionCache.set(key, { ...current, ...updates });
}

function canUpdateResolution(post: IssuePost, currentUser?: CurrentUser): boolean {
  if (!currentUser) return false;
  if (currentUser.role === "ROLE_ADMIN") return true;
  if (currentUser.role === "ROLE_DEPARTMENT")
    return post.taggedUsernames?.includes(currentUser.username) ?? false;
  return false;
}

function commentPostType(variant: PostVariant): PostType {
  return (variant === "issue" || variant === "government") ? "posts" : "social-posts";
}

function isCommunityPost(post: AnyPost): boolean {
  if (post.variant === "community") return true;
  if (post.variant === "poll" && !!(post as PollPost).communityId) return true;
  if (post.variant === "social" && !!(post as SocialPost).communityId) return true;
  return false;
}

function getCommunityId(post: AnyPost): number | null {
  if (post.variant === "community") return (post as CommunityPost).communityId;
  if (post.variant === "poll") return (post as PollPost).communityId ?? null;
  if (post.variant === "social") return (post as SocialPost).communityId ?? null;
  return null;
}

function getIssueMilestone(likes: number, resolved?: boolean) {
  if (resolved) return { label: "Civic Victory", target: Math.max(likes, 100), progress: 100, cta: "Share Victory to Ward Group" };
  if (likes >= 100) return { label: "District Priority", target: 100, progress: 100, cta: "Share to Local Politics Group" };
  if (likes >= 50) return { label: "Ward Momentum", target: 100, progress: Math.min(100, likes), cta: "Share to RWA Group" };
  if (likes >= 10) return { label: "Mohalla Traction", target: 50, progress: Math.min(100, (likes / 50) * 100), cta: "Share to Family Group" };
  return { label: "Needs Mohalla Traction", target: 10, progress: Math.min(100, (likes / 10) * 100), cta: "Share to WhatsApp" };
}

// ─── Zoom Viewer (Fullscreen Lightbox with Zoom) ─────────────────────────────
function ZoomViewer({
  mediaUrls,
  startIndex,
  onClose,
}: {
  mediaUrls: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  const isVideo = (url: string) => /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(url);

  const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const zoomIn  = () => setZoom(z => Math.min(z + 0.5, 5));
  const zoomOut = () => setZoom(z => { const next = Math.max(z - 0.5, 1); if (next === 1) setPan({ x: 0, y: 0 }); return next; });

  const goNext = () => { setIndex(i => (i + 1) % mediaUrls.length); resetZoom(); };
  const goPrev = () => { setIndex(i => (i - 1 + mediaUrls.length) % mediaUrls.length); resetZoom(); };

  // Mouse-wheel zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  // Drag / pan support
  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setPan({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
  };
  const onMouseUp = () => { setDragging(false); dragStart.current = null; };

  // Touch pan
  const touchStart = useRef<{ tx: number; ty: number; px: number; py: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    touchStart.current = { tx: e.touches[0].clientX, ty: e.touches[0].clientY, px: pan.x, py: pan.y };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || e.touches.length !== 1) return;
    setPan({
      x: touchStart.current.px + (e.touches[0].clientX - touchStart.current.tx),
      y: touchStart.current.py + (e.touches[0].clientY - touchStart.current.ty),
    });
  };
  const onTouchEnd = () => { touchStart.current = null; };

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, zoom]);

  useEffect(() => {
    const video = modalVideoRef.current;
    if (!video) return;

    const handleVideoClick = (e: MouseEvent) => {
      const isFullscreen = document.fullscreenElement === video ||
        (document as any).webkitFullscreenElement === video ||
        (document as any).mozFullScreenElement === video ||
        (document as any).msFullscreenElement === video;

      if (isFullscreen) {
        const rect = video.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const controlsHeight = 60;
        if (y < rect.height - controlsHeight) {
          e.preventDefault();
          e.stopPropagation();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
        }
      }
    };

    video.addEventListener("click", handleVideoClick);
    return () => {
      video.removeEventListener("click", handleVideoClick);
    };
  }, [index]);

  const current = mediaUrls[index];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col bg-black/95 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0">
        <span className="text-white/50 text-xs font-mono">
          {mediaUrls.length > 1 ? `${index + 1} / ${mediaUrls.length}` : ""}
        </span>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={zoomOut}
            disabled={zoom <= 1}
            title="Zoom out (−)"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-white text-lg font-bold transition-all"
          >−</motion.button>

          <button
            onClick={resetZoom}
            title="Reset zoom"
            className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-all min-w-[52px] text-center"
          >
            {Math.round(zoom * 100)}%
          </button>

          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={zoomIn}
            disabled={zoom >= 5}
            title="Zoom in (+)"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-white text-lg font-bold transition-all"
          >+</motion.button>
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
        >
          <X size={18} />
        </motion.button>
      </div>

      {/* Media area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden relative select-none"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="max-h-[80vh] max-w-[90vw] flex items-center justify-center"
          >
            <div
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: "center center",
                transition: dragging ? "none" : "transform 0.18s ease",
              }}
              className="flex items-center justify-center w-full h-full"
            >
              {isVideo(current) ? (
                <div className="relative max-h-[80vh] max-w-[90vw] rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
                  <video
                    ref={modalVideoRef}
                    src={current}
                    controls
                    autoPlay
                    className="max-h-[80vh] max-w-[90vw]"
                    style={{ pointerEvents: zoom > 1 ? "none" : "auto" }}
                  />
                  {zoom <= 1 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const video = modalVideoRef.current;
                        if (video) {
                          if (video.paused) {
                            video.play();
                          } else {
                            video.pause();
                          }
                        }
                      }}
                      className="absolute inset-x-0 top-0 bottom-[55px] cursor-pointer z-10"
                    />
                  )}
                </div>
              ) : (
                <img
                  src={current}
                  alt={`Media ${index + 1}`}
                  draggable={false}
                  className="max-h-[80vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Prev / Next navigation */}
        {mediaUrls.length > 1 && (
          <>
            <motion.button
              whileHover={{ scale: 1.1, x: -3 }} whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 flex items-center justify-center text-white shadow-lg z-10"
            >
              <ChevronLeft size={22} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1, x: 3 }} whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 flex items-center justify-center text-white shadow-lg z-10"
            >
              <ChevronRight size={22} />
            </motion.button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {mediaUrls.length > 1 && (
        <div className="flex justify-center gap-2 pb-4 shrink-0">
          {mediaUrls.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIndex(i); resetZoom(); }}
              className={`rounded-full transition-all duration-300 ${i === index ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/30 hover:bg-white/60"}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Modern Carousel Component ───────────────────────────────────────────────
function ModernMediaCarousel({
  mediaUrls,
  onExpand,
}: {
  mediaUrls: string[];
  onExpand: (index: number) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(url);
  const currentMedia = mediaUrls[activeIndex];
  const isCurrentVideo = isVideoUrl(currentMedia);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((i) => (i === 0 ? mediaUrls.length - 1 : i - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((i) => (i === mediaUrls.length - 1 ? 0 : i + 1));
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  useEffect(() => {
    if (!isCurrentVideo) setIsPlaying(false);
  }, [activeIndex, isCurrentVideo]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, activeIndex]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVideoClick = (e: MouseEvent) => {
      const isFullscreen = document.fullscreenElement === video ||
        (document as any).webkitFullscreenElement === video ||
        (document as any).mozFullScreenElement === video ||
        (document as any).msFullscreenElement === video;

      if (isFullscreen) {
        const rect = video.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const controlsHeight = 60;
        if (y < rect.height - controlsHeight) {
          e.preventDefault();
          e.stopPropagation();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
        }
      }
    };

    video.addEventListener("click", handleVideoClick);
    return () => {
      video.removeEventListener("click", handleVideoClick);
    };
  }, [activeIndex]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-base-300 shadow-inner group">
      <motion.div
        className="relative h-64 sm:h-80 w-full bg-black/50 flex items-center justify-center cursor-pointer"
        onClick={isCurrentVideo ? togglePlay : () => onExpand(activeIndex)}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence mode="wait">
          {!imgError[activeIndex] ? (
            isCurrentVideo ? (
              <motion.div
                key={`video-container-${activeIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative h-full w-full flex items-center justify-center"
              >
                <video
                  ref={videoRef}
                  src={currentMedia}
                  controls={isPlaying}
                  muted={isMuted}
                  loop
                  playsInline
                  className="h-full w-full object-contain"
                  onClick={togglePlay}
                  onError={() =>
                    setImgError((prev) => ({ ...prev, [activeIndex]: true }))
                  }
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                {isPlaying && (
                  <div
                    onClick={togglePlay}
                    className="absolute inset-x-0 top-0 bottom-[55px] cursor-pointer z-10"
                  />
                )}
              </motion.div>
            ) : (
              <motion.img
                key={`img-${activeIndex}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                src={currentMedia}
                alt={`Media ${activeIndex + 1}`}
                className="h-full w-full object-cover"
                onError={() =>
                  setImgError((prev) => ({ ...prev, [activeIndex]: true }))
                }
              />
            )
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full w-full bg-slate-800/50"
            >
              <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mb-2">
                <ImageIcon size={24} className="stroke-slate-400" />
              </div>
              <p className="text-xs font-medium text-slate-400 px-6 text-center">
                Legacy media unavailable
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play Icon Overlay for Videos */}
        <AnimatePresence>
          {isCurrentVideo && !isPlaying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-2xl">
                <Play size={32} className="text-white fill-white ml-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </motion.div>

      {/* Navigation arrows */}
      {mediaUrls.length > 1 && (
        <>
          <motion.button
            onClick={handlePrev}
            whileHover={{ scale: 1.1, x: -4 }}
            whileTap={{ scale: 0.95 }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all z-20 text-white shadow-lg"
          >
            <ChevronLeft size={18} />
          </motion.button>
          <motion.button
            onClick={handleNext}
            whileHover={{ scale: 1.1, x: 4 }}
            whileTap={{ scale: 0.95 }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all z-20 text-white shadow-lg"
          >
            <ChevronRight size={18} />
          </motion.button>
        </>
      )}

      {/* Indicator dots */}
      {mediaUrls.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {mediaUrls.map((_, i) => (
            <motion.button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex(i);
              }}
              whileTap={{ scale: 0.8 }}
              className={`rounded-full transition-all duration-300 ${i === activeIndex
                  ? "w-6 h-2 bg-white shadow-lg"
                  : "w-2 h-2 bg-white/50 hover:bg-white/80"
                }`}
            />
          ))}
        </div>
      )}

      {/* Counter, Video controls & Zoom button */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
        {isCurrentVideo && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 flex items-center justify-center text-white transition-all"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </motion.button>
        )}
        {mediaUrls.length > 1 && (
          <div className="rounded-full bg-black/40 backdrop-blur-sm px-3 py-1.5 text-xs text-white font-semibold font-mono">
            {activeIndex + 1}/{mediaUrls.length}
          </div>
        )}
        {/* Zoom / fullscreen button */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onExpand(activeIndex);
          }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          title="View fullscreen"
          className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/35 flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100"
        >
          <Maximize2 size={15} />
        </motion.button>
      </div>
    </div>
  );
}

// ─── Community Strip ─────────────────────────────────────────────────────────
function CommunityStrip({
  post,
  isJoined,
  onJoin,
}: {
  post: AnyPost;
  isJoined: boolean;
  onJoin: (cid: number) => void;
}) {
  const navigate = useNavigate();
  const communityId = getCommunityId(post);
  const communityName =
    (post as CommunityPost).communityName ||
    (post as PollPost).communityName ||
    "Community";
  const communityAvatar =
    (post as CommunityPost).communityAvatar || (post as PollPost).communityAvatar;
  const memberCount =
    (post as CommunityPost).communityMemberCount ||
    (post as PollPost).communityMemberCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-gradient-to-r from-sky-500/5 to-transparent border border-sky-500/10 mb-2"
    >
      <div
        onClick={async () => {
          if (communityId) {
            let targetSlug = (post as any).communitySlug || (post as any).slug;
            if (!targetSlug) {
              try {
                const resData = await apiFetch(`/api/communities/search?q=${encodeURIComponent(communityName)}`, "GET") as any;
                const list = resData?.data?.content ?? resData?.data?.data ?? resData?.data ?? resData?.content ?? [];
                if (Array.isArray(list)) {
                  const match = list.find((c: any) => c.id === communityId);
                  if (match && match.slug) {
                    targetSlug = match.slug;
                  }
                }
              } catch (err) {
                console.error("Failed to fetch community slug:", err);
              }
            }
            navigate(`/communities?community=${targetSlug || communityId}`);
          }
        }}
        className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
      >
        {communityAvatar ? (
          <motion.img
            src={communityAvatar}
            className="w-9 h-9 rounded-lg object-cover shrink-0 ring-2 ring-blue-500/20"
            alt=""
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
            <Users size={16} className="text-sky-500" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-black text-sky-500 truncate uppercase tracking-tighter">{communityName}</p>
          {memberCount && (
            <p className="text-[9px] font-medium text-base-content/50 mt-0.5">{memberCount} members</p>
          )}
        </div>
      </div>
      {communityId && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            onJoin(communityId);
          }}
          className={`shrink-0 text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-wider transition-all border ${isJoined
              ? "bg-base-200 text-base-content/70 border-base-300"
              : "bg-rose-50 text-rose-500 border-rose-100/50 hover:bg-rose-100 shadow-sm shadow-rose-200/20"
            }`}
        >
          {isJoined ? <CheckCircle2 size={12} className="inline mr-1" /> : <UserPlus size={12} className="inline mr-1" />}
          {isJoined ? "Joined" : "Join"}
        </motion.button>
      )}
    </motion.div>
  );
}

function AuthorRow({
  post,
  badge,
  onDelete,
  isDeleting,
  showDelete,
  hideDelete,
  rightAction,
  onProfileClick,
}: {
  post: AnyPost;
  badge?: string;
  onDelete?: () => void;
  isDeleting?: boolean;
  showDelete?: boolean;
  hideDelete?: boolean;
  rightAction?: React.ReactNode;
  onProfileClick?: (username: string) => void;
}) {
  const navigate = useNavigate();
  const karmaScore = post.karmaScore ?? post.authorKarmaScore;
  const sewaScore = post.communitySewaScore ?? 0;
  const communityFlair = post.communityFlair || (sewaScore >= 1000 ? "Pramukh" : sewaScore >= 500 ? "Margdarshak" : sewaScore >= 150 ? "Rakshak" : "");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 w-full min-w-0"
    >
      <motion.div
        className="relative shrink-0 cursor-pointer"
        onClick={() => {
          if (post.username && onProfileClick) {
            onProfileClick(post.username);
          } else if (post.username) {
            navigate(`/profile?username=${encodeURIComponent(post.username)}`);
          }
        }}
      >
        {post.userProfileImage ? (
          <img
            src={post.userProfileImage}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/10 ring-offset-2 ring-offset-base-100"
            alt=""
          />
        ) : (
          <img
            src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(
              post.username || "?"
            )}`}
            className="w-10 h-10 rounded-full object-cover bg-base-200 ring-2 ring-primary/10 ring-offset-2 ring-offset-base-100"
            alt="Avatar"
          />
        )}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-base-100 shadow-sm"
        />
      </motion.div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span 
            className="text-xs font-black text-base-content uppercase tracking-tight notranslate truncate cursor-pointer hover:underline"
            onClick={() => {
              if (post.username && onProfileClick) {
                onProfileClick(post.username);
              } else if (post.username) {
                navigate(`/profile?username=${encodeURIComponent(post.username)}`);
              }
            }}
          >
            {post.userDisplayName || post.username}
          </span>
          {badge && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 shrink-0"
            >
              {badge}
            </motion.span>
          )}
          {typeof karmaScore === "number" && (
            <KarmaBadge score={karmaScore} compact />
          )}
          {communityFlair && (
            <span className="shrink-0 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter text-amber-700">
              {communityFlair}
            </span>
          )}
        </div>
        <p className="text-[10px] text-base-content/50 mt-0.5 font-bold uppercase tracking-tighter flex items-center gap-1">
          {post.timeAgo ?? "just now"}
          {post.isPendingSync && (
            <span className="inline-flex items-center gap-0.5 text-[8px] text-base-content/40 font-bold uppercase tracking-tighter bg-base-300/40 px-1.5 py-0.5 rounded">
              <Clock size={10} className="animate-pulse" />
              Pending Sync
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {rightAction}
        {showDelete && !hideDelete && onDelete && (
          <motion.button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={isDeleting}
            whileHover={{ scale: 1.12, y: -1 }}
            whileTap={{ scale: 0.94 }}
            className="group/del relative flex h-9 w-9 items-center justify-center rounded-xl border border-transparent bg-base-300/40 text-base-content/40 transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-600 hover:shadow-lg hover:shadow-red-500/10 backdrop-blur-md disabled:opacity-30"
            title="Delete post"
          >
            <div className="absolute inset-0 rounded-xl bg-red-500/0 transition-all duration-300 group-hover/del:bg-red-500/5" />
            {isDeleting ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Trash2 size={16} className="relative z-10 transition-transform duration-300 group-hover/del:rotate-6" />
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────
function StatusBadge({ status, reopened }: { status: PostStatus; reopened?: boolean }) {
  if (status === "RESOLVED")
    return (
      <motion.span
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.1)]"
      >
        <CheckCircle2 size={13} /> Resolved
      </motion.span>
    );
  if (reopened)
    return (
      <motion.span
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)] animate-pulse"
      >
        <AlertCircle size={13} className="text-red-500" /> Reopened
      </motion.span>
    );
  if (status === "ACTIVE")
    return (
      <motion.span
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
      >
        <Clock size={13} /> Active
      </motion.span>
    );
  return null;
}

// ─── Resolve Modal ───────────────────────────────────────────────────────────
function ResolveModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (message: string) => void;
}) {
  const [msg, setMsg] = useState("");

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            className="w-full max-w-sm rounded-2xl border border-base-300 bg-base-100 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.h3
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 flex items-center gap-2 text-lg font-bold text-base-content"
            >
              <CheckCircle2 size={20} className="text-emerald-600" />
              Mark Issue Resolved
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-4 text-sm text-base-content/70"
            >
              Provide an update message for the citizen who raised this issue.
            </motion.p>
            <motion.textarea
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="w-full p-3 rounded-lg border border-base-300 bg-base-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none text-sm font-medium placeholder-base-content/40 transition-all"
              rows={4}
              placeholder="e.g. Road repair completed on 15 Jan 2025…"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-5 flex justify-end gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-4 py-2 rounded-lg font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!msg.trim()}
                onClick={() => onConfirm(msg.trim())}
                className="px-4 py-2 rounded-lg font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/30"
              >
                Confirm
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Reopen Modal ───────────────────────────────────────────────────────────
function ReopenModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            className="w-full max-w-sm rounded-2xl border border-base-300 bg-base-100 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.h3
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 flex items-center gap-2 text-lg font-bold text-base-content"
            >
              <AlertCircle size={20} className="text-red-600 animate-pulse" />
              Reopen Resolved Issue
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-4 text-sm text-base-content/70 font-medium"
            >
              Are you sure you want to reopen this issue? Please provide a reason.
            </motion.p>
            <motion.textarea
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="w-full p-3 rounded-lg border border-base-300 bg-base-100 focus:border-red-500 focus:ring-2 focus:ring-red-200 resize-none text-sm font-medium placeholder-base-content/40 transition-all text-base-content"
              rows={4}
              placeholder="Provide a reason why the resolution is insufficient…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-5 flex justify-end gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-4 py-2 rounded-lg font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!reason.trim()}
                onClick={() => onConfirm(reason.trim())}
                className="px-4 py-2 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-600/30"
              >
                Reopen
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Share Modal ─────────────────────────────────────────────────────────────
function ShareModal({
  isOpen,
  onClose,
  post,
  onShareAction,
  onShareToCommunity
}: {
  isOpen: boolean;
  onClose: () => void;
  post: AnyPost;
  onShareAction: (method: string) => void;
  onShareToCommunity?: (postId: number, content: string) => void;
}) {
  const url = `${window.location.origin}/post/${post.id}`;
  const rawText = post.content || "";
  const shortened = rawText.length > 50 ? rawText.slice(0, 50) + "..." : rawText;
  const text = encodeURIComponent(`Check out this post on Govlyx:\n"${shortened}"\n\n`);
  
  const [showSocialOptions, setShowSocialOptions] = useState(!onShareToCommunity);

  useEffect(() => {
    if (isOpen) {
      setShowSocialOptions(!onShareToCommunity);
    }
  }, [isOpen, onShareToCommunity]);

  const handleCopy = () => {
    onShareAction("copy");
    onClose();
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${text}${encodeURIComponent(url)}`, "_blank");
    onShareAction("whatsapp");
    onClose();
  };

  const handleTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, "_blank");
    onShareAction("twitter");
    onClose();
  };

  const handleInstagram = () => {
    navigator.clipboard.writeText(url).catch(() => {});
    showToast.success("Link copied! Opening Instagram...");
    window.open("https://instagram.com", "_blank");
    onShareAction("instagram");
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
           onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            className="w-full max-w-xs rounded-3xl border border-base-300 bg-base-100 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 relative">
              {showSocialOptions && onShareToCommunity && (
                <button 
                  onClick={() => setShowSocialOptions(false)} 
                  className="btn btn-ghost btn-xs btn-square text-base-content/60 hover:text-base-content absolute left-0"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <h3 className="text-center text-lg font-bold text-base-content w-full">
                {showSocialOptions ? "Share Post via" : "Share Post"}
              </h3>
            </div>
            
            {!showSocialOptions && onShareToCommunity ? (
              <div className="flex flex-col gap-3">
                {/* Share to Community */}
                <button 
                  onClick={() => {
                    onShareToCommunity(post.id, post.content || "");
                    onShareAction("community_chat");
                    onClose();
                  }} 
                  className="flex items-center gap-3 w-full p-3 rounded-2xl bg-[#1D4ED8]/10 hover:bg-[#1D4ED8]/15 border border-[#1D4ED8]/25 text-[#1D4ED8] transition-all cursor-pointer font-bold text-sm text-left"
                >
                  <div className="p-2 rounded-xl bg-[#1D4ED8] text-white">
                    <MessageSquare size={18} />
                  </div>
                  <span>Share to Community</span>
                </button>

                {/* Share to Social Handles */}
                <button 
                  onClick={() => setShowSocialOptions(true)} 
                  className="flex items-center gap-3 w-full p-3 rounded-2xl bg-base-200 hover:bg-base-300 text-base-content transition-all cursor-pointer font-bold text-sm text-left border-none"
                >
                  <div className="p-2 rounded-xl bg-base-content/10 text-base-content">
                    <Globe size={18} />
                  </div>
                  <span>Share to Social Handles</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-5">
                {/* Copy */}
                <button onClick={handleCopy} className="flex flex-col items-center w-14 gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-105 transition-all shadow-sm shrink-0 aspect-square">
                    <Link size={24} className="text-slate-600" />
                  </div>
                  <span className="text-[11px] font-semibold text-center text-base-content/80">Copy</span>
                </button>
                
                {/* WhatsApp */}
                <button onClick={handleWhatsApp} className="flex flex-col items-center w-14 gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center group-hover:scale-105 transition-all shadow-sm shrink-0 aspect-square">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-green-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <span className="text-[11px] font-semibold text-center text-base-content/80">WhatsApp</span>
                </button>

                {/* Twitter / X */}
                <button onClick={handleTwitter} className="flex flex-col items-center w-14 gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center group-hover:scale-105 transition-all shadow-sm shrink-0 aspect-square">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </div>
                  <span className="text-[11px] font-semibold text-center text-base-content/80">X</span>
                </button>
                
                {/* Instagram */}
                <button onClick={handleInstagram} className="flex flex-col items-center w-14 gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center group-hover:scale-105 transition-all shadow-sm shrink-0 aspect-square">
                    <Instagram size={24} className="text-white" />
                  </div>
                  <span className="text-[11px] font-semibold text-center text-base-content/80">Insta</span>
                </button>
              </div>
            )}
            
            <button 
               onClick={onClose}
               className="mt-6 w-full py-3 rounded-2xl bg-base-200 text-sm font-bold opacity-80 hover:bg-base-300 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ActionPill({
  onClick,
  active = false,
  disabled = false,
  children,
  vertical = false,
  activeClass = "bg-primary/10 border-primary/20 text-primary dark:text-white",
  hoverGlow = "rgba(99,102,241,0.5)",
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  vertical?: boolean;
  activeClass?: string;
  hoverGlow?: string;
}) {
  const [burst, setBurst] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    setBurst(true);
    setTimeout(() => setBurst(false), 400);
    onClick();
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.08 }}
      whileTap={disabled ? {} : { scale: 0.88 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      style={{
        position: "relative",
        overflow: "hidden",
      }}
      className={`flex items-center gap-1 sm:gap-1.5 rounded-2xl transition-colors duration-200 disabled:opacity-30 select-none border ${
        vertical ? "p-2 sm:p-2.5 flex-col min-w-[48px] sm:min-w-[54px]" : "px-2 sm:px-3 py-1 sm:py-2"
      } text-[9px] sm:text-[10px] font-black uppercase tracking-tighter group/pill ${
        active
          ? `${activeClass} shadow-sm`
          : "text-base-content/70 dark:text-white bg-base-200 border-base-content/5"
      }`}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1.5px ${hoverGlow}, 0 0 12px 2px ${hoverGlow}55`;
          (e.currentTarget as HTMLElement).style.borderColor = hoverGlow;
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "";
        (e.currentTarget as HTMLElement).style.borderColor = "";
      }}
    >
      {/* Burst ripple on click */}
      {burst && (
        <motion.span
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 3.5, opacity: 0 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            background: hoverGlow,
            pointerEvents: "none",
          }}
        />
      )}
      {children}
    </motion.button>
  );
}

// ─── Poll Body ───────────────────────────────────────────────────────────────
function PollBody({
  post,
  onVote,
}: {
  post: PollPost;
  onVote?: (pollId: number, ids: number[]) => void;
  isProcessing?: boolean;
}) {
  const [votedIds, setVotedIds] = useState<number[]>(post?.votedOptionIds || []);
  const debounceTimerRef = useRef<any>(null);
  const inFlightCountRef = useRef<number>(0);
  const activeRequestPromiseRef = useRef<Promise<any> | null>(null);
  const nextPendingVoteRef = useRef<number[] | null>(null);
  const prevPollIdRef = useRef<number>(post?.pollId);

  useEffect(() => {
    // If pollId changed, reset completely
    if (prevPollIdRef.current !== post?.pollId) {
      prevPollIdRef.current = post?.pollId;
      setVotedIds(post?.votedOptionIds || []);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      activeRequestPromiseRef.current = null;
      nextPendingVoteRef.current = null;
      return;
    }

    // Otherwise, only sync from props if we are not actively debouncing and there are no in-flight or pending requests
    if (
      !debounceTimerRef.current && 
      inFlightCountRef.current === 0 && 
      !activeRequestPromiseRef.current && 
      !nextPendingVoteRef.current
    ) {
      setVotedIds(post?.votedOptionIds || []);
    }
  }, [post?.votedOptionIds, post?.pollId]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  if (!post || !post.options || !Array.isArray(post.options) || post.options.length === 0) {
    return null;
  }

  const showResults = post.showResults || post.userHasVoted || post.isExpired || votedIds.length > 0;

  const sendVoteSequentially = async (ids: number[]) => {
    if (activeRequestPromiseRef.current) {
      nextPendingVoteRef.current = ids;
      return;
    }

    inFlightCountRef.current += 1;
    const currentPromise = onVote?.(post.pollId, ids);
    activeRequestPromiseRef.current = Promise.resolve(currentPromise);

    try {
      await activeRequestPromiseRef.current;
    } finally {
      activeRequestPromiseRef.current = null;
      inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1);

      if (nextPendingVoteRef.current) {
        const nextIds = nextPendingVoteRef.current;
        nextPendingVoteRef.current = null;
        sendVoteSequentially(nextIds);
      } else {
        if (inFlightCountRef.current === 0 && !debounceTimerRef.current) {
          setVotedIds(post?.votedOptionIds || []);
        }
      }
    }
  };

  const handleVote = (optionId: number) => {
    if (post.isExpired) return;
    
    // For single-choice, if they have already voted, do nothing
    if (!post.allowMultipleVotes && (post.userHasVoted || votedIds.length > 0)) return;
    
    // If the option is already selected, do nothing (cannot deselect)
    if (votedIds.includes(optionId)) return;

    const next = post.allowMultipleVotes
      ? [...votedIds, optionId]
      : [optionId];
      
    setVotedIds(next);

    // Debounce the call to onVote
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      sendVoteSequentially(next);
    }, 500);
  };

  // ─── Optimistic Updates ──────────────────────────────────────────
  const { displayedOptions, displayedTotalVotes } = useMemo(() => {
    const adjustedOptions = post.options.map((opt) => {
      const wasServerVoted = (post.votedOptionIds || []).includes(opt.id);
      const isLocallyVoted = votedIds.includes(opt.id);
      
      let count = opt.voteCount || 0;
      if (isLocallyVoted && !wasServerVoted) {
        count += 1;
      } else if (!isLocallyVoted && wasServerVoted) {
        count = Math.max(0, count - 1);
      }
      return { ...opt, voteCount: count };
    });

    const total = adjustedOptions.reduce((sum, opt) => sum + opt.voteCount, 0);

    const mappedOptions = adjustedOptions.map((opt) => {
      const pct = total > 0 ? (opt.voteCount / total) * 100 : 0;
      return { ...opt, percentage: pct };
    });

    return { displayedOptions: mappedOptions, displayedTotalVotes: total };
  }, [post.options, post.votedOptionIds, votedIds]);
  // ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2 w-full mt-2">
      <div className="space-y-2">
        {displayedOptions.map((opt) => {
          const isSelected = votedIds.includes(opt.id);
          const canClick = !post.isExpired && 
            (post.allowMultipleVotes 
              ? !isSelected 
              : !post.userHasVoted && votedIds.length === 0
            );
          return (
            <motion.div
              key={opt.id}
              onClick={() => canClick && handleVote(opt.id)}
              whileHover={canClick ? { y: -1 } : undefined}
              whileTap={canClick ? { scale: 0.98 } : undefined}
              className={`relative overflow-hidden rounded-lg border transition-all ${
                canClick ? "cursor-pointer" : "cursor-default"
              } ${isSelected ? "border-blue-500/50 shadow-sm shadow-blue-500/10" : "border-base-content/10"}`}
            >
              {/* Progress */}
              <motion.div
                initial={false}
                animate={{ width: showResults ? `${opt.percentage}%` : "0%" }}
                transition={{ type: "spring", stiffness: 80, damping: 20 }}
                className={`absolute left-0 top-0 h-full transition-colors duration-300 ${
                  isSelected ? "bg-blue-500/10" : "bg-base-content/5"
                }`}
              />

              {/* Content */}
              <div className="relative z-10 flex items-center justify-between px-3.5 py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  {/* Selection Indicator */}
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isSelected ? "border-blue-500 bg-blue-500" : "border-base-content/20"
                    }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>

                  <span className={`font-semibold ${isSelected ? "text-blue-400" : "text-base-content/80 text-[13px]"}`}>
                    {opt.optionText}
                  </span>
                </div>
                {showResults && (
                  <span className="font-bold opacity-60 text-xs text-base-content">
                    {Math.round(opt.percentage)}%
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Meta */}
      <div className="mt-3 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-60 px-1 text-base-content">
        <span>{displayedTotalVotes.toLocaleString()} {displayedTotalVotes === 1 ? "vote" : "votes"}</span>
        <span className="flex items-center gap-1.5">
          <Clock size={12} />
          {post.isExpired ? "Ended" : (post.timeLeft || "Active")}
        </span>
      </div>
    </div>
  );
}



// Module-level set to prevent concurrent duplicate view requests in the same browser session
const sessionTrackedViews = new Set<string>();

const renderFormattedContent = (text: string) => {
  if (!text) return "";
  const parts = text.split(/(\#[a-zA-Z0-9_\u00C0-\u00FF\u0100-\u017F\u0400-\u04FF]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith("#")) {
      return (
        <span
          key={index}
          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors notranslate"
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

export default function PostCard({
  post,
  currentUser,
  onLike,
  onDislike,
  onSave,
  onShare,
  onResolve,
  onVote,
  onDelete,
  hideCommunityStrip,
  hideDelete,
  onShareToCommunity,
  onNotInterested,
}: PostCardProps) {
  const queryClient = useQueryClient();
  const { data: currentUserProfile } = useCurrentUser();
  
  const cachedState = post ? globalInteractionCache.get(getGlobalCacheKey(post)) : undefined;

  const [liked, setLiked] = useState(
    cachedState?.liked !== undefined
      ? cachedState.liked
      : !!(post as AnyPost)?.isLikedByCurrentUser
  );
  const [disliked, setDisliked] = useState(
    cachedState?.disliked !== undefined
      ? cachedState.disliked
      : !!(post as any)?.isDislikedByCurrentUser
  );
  const [saved, setSaved] = useState(
    cachedState?.saved !== undefined
      ? cachedState.saved
      : !!((post as any).isSavedByCurrentUser ?? (post as any).isSaved ?? false)
  );
  const [likeCount, setLikeCount] = useState<number>(
    cachedState?.likeCount !== undefined
      ? cachedState.likeCount
      : (post?.likeCount ?? 0)
  );
  const [dislikeCount, setDislikeCount] = useState<number>(
    cachedState?.dislikeCount !== undefined
      ? cachedState.dislikeCount
      : ((post as any)?.dislikeCount ?? 0)
  );
  const [shareCount, setShareCount] = useState(post?.shareCount ?? 0);
  const [commentCount, setCommentCount] = useState(post?.commentCount ?? 0);
  const [hasSharedLocally, setHasSharedLocally] = useState(() => {
    if (!post) return false;
    const isIssue = post.variant === "issue";
    const isGovt = post.variant === "government";
    const type = (isIssue || isGovt) ? "posts" : "social-posts";
    const userId = currentUserProfile?.id || currentUser?.id || currentUserProfile?.username || currentUser?.username || "guest";
    const key = `govlyx_shared_${userId}_${type}_${post.id}`;
    try {
      return localStorage.getItem(key) === "true";
    } catch {
      return false;
    }
  });
  const [resolveOpen, setResolveOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmNotInterestedOpen, setConfirmNotInterestedOpen] = useState(false);
  const [isJoined, setIsJoined] = useState((post as any).isMember ?? false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isContentRevealed, setIsContentRevealed] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [locallyHidden, setLocallyHidden] = useState(false);
  // Translation toggle — when true shows the original untranslated text
  const [showOriginal, setShowOriginal] = useState(false);
  const [dynamicTranslation, setDynamicTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalUsername, setProfileModalUsername] = useState("");
  const [profileModalDisplayName, setProfileModalDisplayName] = useState("");
  const [profileModalAvatar, setProfileModalAvatar] = useState<string | null>(null);
  const { copied, flash } = useCopied();
  const instanceId = useRef(Math.random().toString()).current;

  const handleTranslateDynamic = async () => {
    const preferredLang = currentUserProfile?.preferredLanguage || "en";
    const cacheKey = `${post.variant}_${post.id}_${preferredLang}`;

    if (dynamicTranslation) {
      setShowOriginal((v) => !v);
      return;
    }

    if (postTranslationCache.has(cacheKey)) {
      setDynamicTranslation(postTranslationCache.get(cacheKey)!);
      setShowOriginal(false);
      return;
    }

    setIsTranslating(true);
    try {
      const translatedText = await translateText(post.content || "", preferredLang);
      if (translatedText && translatedText !== post.content) {
        postTranslationCache.set(cacheKey, translatedText);
        setDynamicTranslation(translatedText);
        setShowOriginal(false);
      } else {
        throw new Error("Translation failed or returned original text");
      }
    } catch (err: any) {
      console.error("Translation failed", err);
      showToast.error("Failed to translate post. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  // Synced backend states to resolve optimistic updates on network errors / debouncing
  const syncedLikedRef = useRef(
    cachedState?.liked !== undefined
      ? cachedState.liked
      : !!(post as AnyPost)?.isLikedByCurrentUser
  );
  const syncedLikeCountRef = useRef(
    cachedState?.likeCount !== undefined
      ? cachedState.likeCount
      : (post?.likeCount ?? 0)
  );
  const syncedDislikedRef = useRef(
    cachedState?.disliked !== undefined
      ? cachedState.disliked
      : !!(post as any)?.isDislikedByCurrentUser
  );
  const syncedDislikeCountRef = useRef(
    cachedState?.dislikeCount !== undefined
      ? cachedState.dislikeCount
      : ((post as any)?.dislikeCount ?? 0)
  );
  const syncedSavedRef = useRef(
    cachedState?.saved !== undefined
      ? cachedState.saved
      : !!((post as any).isSavedByCurrentUser ?? (post as any).isSaved ?? false)
  );

  // Store callbacks in ref to avoid event listener churn when callbacks are unstable
  const callbacksRef = useRef({ onLike, onDislike, onSave, onShare });
  useEffect(() => {
    callbacksRef.current = { onLike, onDislike, onSave, onShare };
  }, [onLike, onDislike, onSave, onShare]);

  // Debounce timers
  const pendingLikeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDislikeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to prevent duplicate simultaneous share clicks
  const isSharingRef = useRef(false);

  // Active sync flags to handle consecutive clicks when request is in flight
  const isLikeDislikeSyncingRef = useRef(false);
  const hasPendingLikeDislikeSyncRef = useRef(false);
  const isSaveSyncingRef = useRef(false);
  const hasPendingSaveSyncRef = useRef(false);

  // Ref tracking visual state for debounce closure safety
  const currentLikedValueRef = useRef(liked);
  const currentDislikedValueRef = useRef(disliked);
  const currentSavedValueRef = useRef(saved);
  const currentLikeCountValueRef = useRef(likeCount);
  const currentDislikeCountValueRef = useRef(dislikeCount);

  useEffect(() => {
    currentLikedValueRef.current = liked;
  }, [liked]);

  useEffect(() => {
    currentDislikedValueRef.current = disliked;
  }, [disliked]);

  useEffect(() => {
    currentSavedValueRef.current = saved;
  }, [saved]);

  useEffect(() => {
    return () => {
      if (pendingLikeTimerRef.current) clearTimeout(pendingLikeTimerRef.current);
      if (pendingDislikeTimerRef.current) clearTimeout(pendingDislikeTimerRef.current);
      if (pendingSaveTimerRef.current) clearTimeout(pendingSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (post) {
      const cached = globalInteractionCache.get(getGlobalCacheKey(post));
      const isLiked = cached?.liked !== undefined ? cached.liked : !!(post as AnyPost)?.isLikedByCurrentUser;
      const isSaved = cached?.saved !== undefined ? cached.saved : !!((post as any).isSavedByCurrentUser ?? (post as any).isSaved ?? false);
      const isDisliked = cached?.disliked !== undefined ? cached.disliked : (post.variant === "issue" ? !!(post as any).isDislikedByCurrentUser : false);
      const pLikeCount = cached?.likeCount !== undefined ? cached.likeCount : (post.likeCount ?? 0);
      const pDislikeCount = cached?.dislikeCount !== undefined ? cached.dislikeCount : (post.variant === "issue" ? ((post as any).dislikeCount ?? 0) : 0);

      // Only sync if there is no pending optimistic interaction and no active API call syncing
      if (!pendingLikeTimerRef.current && !isLikeDislikeSyncingRef.current) {
        setLiked(isLiked);
        syncedLikedRef.current = isLiked;
        currentLikedValueRef.current = isLiked;
        setLikeCount(pLikeCount);
        syncedLikeCountRef.current = pLikeCount;
        currentLikeCountValueRef.current = pLikeCount;
      }
      if (!pendingDislikeTimerRef.current && !isLikeDislikeSyncingRef.current) {
        if (post.variant === "issue") {
          setDislikeCount(pDislikeCount);
          syncedDislikeCountRef.current = pDislikeCount;
          currentDislikeCountValueRef.current = pDislikeCount;
        }
        if (post.variant === "issue") {
          setDisliked(isDisliked);
          syncedDislikedRef.current = isDisliked;
          currentDislikedValueRef.current = isDisliked;
        }
      }
      if (!pendingSaveTimerRef.current && !isSaveSyncingRef.current) {
        setSaved(isSaved);
        syncedSavedRef.current = isSaved;
        currentSavedValueRef.current = isSaved;
      }

      setShareCount(post.shareCount ?? 0);
      setIsJoined((post as any).isMember ?? false);
      setCommentCount(post.commentCount ?? 0);
      setIsContentRevealed(false);
      setDynamicTranslation(null);
      setShowOriginal(false);
      
      const isIssue = post.variant === "issue";
      const isGovt = post.variant === "government";
      const type = (isIssue || isGovt) ? "posts" : "social-posts";
      const userId = currentUserProfile?.id || currentUser?.id || currentUserProfile?.username || currentUser?.username || "guest";
      const key = `govlyx_shared_${userId}_${type}_${post.id}`;
      try {
        setHasSharedLocally(localStorage.getItem(key) === "true");
      } catch {
        setHasSharedLocally(false);
      }
    }
  }, [post, currentUserProfile, currentUser]);

  useEffect(() => {
    if (post?.id) {
      const viewKey = `${post.variant}-${post.id}`;
      // Skip view recording if post was already viewed by the current user or already tracked in this session
      if (post.isViewedByCurrentUser || sessionTrackedViews.has(viewKey)) {
        return;
      }

      // Mark as tracked immediately to block concurrent mounts from repeating the request
      sessionTrackedViews.add(viewKey);

      const isIssue = post.variant === "issue";
      const isGovt = post.variant === "government";
      const type: "posts" | "social-posts" = (isIssue || isGovt) ? "posts" : "social-posts";
      apiPost(`/api/interactions/${type}/${post.id}/view`, {}).catch(() => {});
    }
  }, [post?.id, post?.variant, post?.isViewedByCurrentUser]);

  useEffect(() => {
    const handlePostSync = (e: any) => {
      if (e.detail.postId !== post?.id) return;
      if (e.detail.emitterId === instanceId) return;
      if (e.detail.source === 'like') {
        setLiked(e.detail.liked);
        syncedLikedRef.current = e.detail.liked;
        currentLikedValueRef.current = e.detail.liked;
        if (e.detail.likeCount !== undefined) {
          setLikeCount(e.detail.likeCount);
          syncedLikeCountRef.current = e.detail.likeCount;
          currentLikeCountValueRef.current = e.detail.likeCount;
        }
        if (e.detail.liked) {
          setDisliked(false);
          syncedDislikedRef.current = false;
          currentDislikedValueRef.current = false;
          if (e.detail.dislikeCount !== undefined) {
            setDislikeCount(e.detail.dislikeCount);
            syncedDislikeCountRef.current = e.detail.dislikeCount;
            currentDislikeCountValueRef.current = e.detail.dislikeCount;
          }
        }
        
        // Update global cache
        updateGlobalCache(post, {
          liked: e.detail.liked,
          likeCount: e.detail.likeCount,
          ...(e.detail.liked ? { disliked: false, dislikeCount: e.detail.dislikeCount } : {})
        });

        // Notify parent to sync cache and avoid state reversion on re-renders
        callbacksRef.current.onLike?.(post.id, e.detail.liked);
        if (e.detail.liked && callbacksRef.current.onDislike) {
          callbacksRef.current.onDislike(post.id, false);
        }
      } else if (e.detail.source === 'dislike') {
        setDisliked(e.detail.disliked);
        syncedDislikedRef.current = e.detail.disliked;
        currentDislikedValueRef.current = e.detail.disliked;
        if (e.detail.dislikeCount !== undefined) {
          setDislikeCount(e.detail.dislikeCount);
          syncedDislikeCountRef.current = e.detail.dislikeCount;
          currentDislikeCountValueRef.current = e.detail.dislikeCount;
        }
        if (e.detail.disliked) {
          setLiked(false);
          syncedLikedRef.current = false;
          currentLikedValueRef.current = false;
          if (e.detail.likeCount !== undefined) {
            setLikeCount(e.detail.likeCount);
            syncedLikeCountRef.current = e.detail.likeCount;
            currentLikeCountValueRef.current = e.detail.likeCount;
          }
        }

        // Update global cache
        updateGlobalCache(post, {
          disliked: e.detail.disliked,
          dislikeCount: e.detail.dislikeCount,
          ...(e.detail.disliked ? { liked: false, likeCount: e.detail.likeCount } : {})
        });

        // Notify parent to sync cache
        callbacksRef.current.onDislike?.(post.id, e.detail.disliked);
        if (e.detail.disliked && callbacksRef.current.onLike) {
          callbacksRef.current.onLike(post.id, false);
        }
      } else if (e.detail.source === 'save') {
        setSaved(e.detail.saved);
        syncedSavedRef.current = e.detail.saved;
        currentSavedValueRef.current = e.detail.saved;

        // Update global cache
        updateGlobalCache(post, { saved: e.detail.saved });

        // Notify parent to sync cache
        callbacksRef.current.onSave?.(post.id, e.detail.saved);
      } else if (e.detail.source === 'share') {
        if (e.detail.shareCount !== undefined) {
          setShareCount(e.detail.shareCount);
          setHasSharedLocally(true);
          // Notify parent to sync cache
          callbacksRef.current.onShare?.(post.id);
        }
      } else if (e.detail.source === 'comment') {
        if (e.detail.commentCount !== undefined) setCommentCount(e.detail.commentCount);
      }
    };
    window.addEventListener('POST_SYNC', handlePostSync);
    return () => window.removeEventListener('POST_SYNC', handlePostSync);
  }, [post?.id]);

  const handleCommentCountChange = useCallback((newCount: number) => {
    setCommentCount(newCount);
    window.dispatchEvent(new CustomEvent('POST_SYNC', {
      detail: { postId: post.id, source: 'comment', commentCount: newCount, emitterId: instanceId }
    }));
  }, [post.id, instanceId]);

  if (!post) return null;
  if (locallyHidden) return null;
  if ((post as any).status === "DELETED") {
    return null;
  }

  const isIssue = post.variant === "issue";
  const isGovt = post.variant === "government";
  const isCommunity = post.variant === "community";
  const interactionType: "posts" | "social-posts" = (isIssue || isGovt) ? "posts" : "social-posts";
  const isResolved = isIssue && (post as IssuePost).status === "RESOLVED";

  const govCanResolve =
    isIssue &&
    (post as IssuePost).status === "ACTIVE" &&
    canUpdateResolution(post as IssuePost, currentUser);

  const showStatusBadge = isIssue;

  const postHasCommunity = isCommunityPost(post);

  // Media handling
  const allMediaUrls: string[] = (() => {
    const urls: string[] = [];
    if ("mediaUrls" in post && Array.isArray(post.mediaUrls)) {
      (post.mediaUrls as string[]).filter(Boolean).forEach((u) => {
        urls.push(resolveMediaUrl(u, "social-posts"));
      });
    }
    if (urls.length === 0 && "imageName" in post && typeof post.imageName === "string" && post.imageName.length > 0) {
      urls.push(resolveMediaUrl(post.imageName, "posts"));
    }
    return urls;
  })();
  const hasMedia = allMediaUrls.length > 0;

  // Handlers
  async function syncLikeDislike() {
    if (isLikeDislikeSyncingRef.current) {
      hasPendingLikeDislikeSyncRef.current = true;
      return;
    }

    const targetLiked = currentLikedValueRef.current;
    const targetDisliked = currentDislikedValueRef.current;
    const syncedLiked = syncedLikedRef.current;
    const syncedDisliked = syncedDislikedRef.current;

    // Check if we actually need to sync anything
    if (targetLiked === syncedLiked && targetDisliked === syncedDisliked) {
      return;
    }

    isLikeDislikeSyncingRef.current = true;

    let endpoint: string | null = null;
    let actionType: 'like' | 'dislike' | null = null;

    if (targetLiked && !syncedLiked) {
      endpoint = `/api/interactions/${interactionType}/${post.id}/like`;
      actionType = 'like';
    } else if (targetDisliked && !syncedDisliked) {
      endpoint = `/api/interactions/${interactionType}/${post.id}/dislike`;
      actionType = 'dislike';
    } else if (!targetLiked && !targetDisliked) {
      if (syncedLiked) {
        endpoint = `/api/interactions/${interactionType}/${post.id}/like`;
        actionType = 'like';
      } else if (syncedDisliked) {
        endpoint = `/api/interactions/${interactionType}/${post.id}/dislike`;
        actionType = 'dislike';
      }
    }

    if (!endpoint || !actionType) {
      isLikeDislikeSyncingRef.current = false;
      return;
    }

    try {
      const res = await apiPost(endpoint, {});
      const data = (res as any)?.data ?? res;

      let serverLiked = targetLiked;
      let serverLikeCount = currentLikeCountValueRef.current;
      let serverDisliked = targetDisliked;
      let serverDislikeCount = currentDislikeCountValueRef.current;

      if (data) {
        if (typeof data.liked === "boolean") {
          serverLiked = data.liked;
        } else if (actionType === 'like') {
          serverLiked = targetLiked;
        }
        // Do NOT overwrite serverLikeCount and serverDislikeCount with data from the API response.
        // The backend processes database increments/decrements asynchronously via @Async,
        // which means the counts retrieved immediately here are stale/pre-transaction values.
        // We preserve our correct optimistic counts instead.

        if (typeof data.disliked === "boolean") {
          serverDisliked = data.disliked;
        } else if (actionType === 'dislike') {
          serverDisliked = targetDisliked;
        }
      }

      if (actionType === 'like' && serverLiked) {
        serverDisliked = false;
      }
      if (actionType === 'dislike' && serverDisliked) {
        serverLiked = false;
      }

      syncedLikedRef.current = serverLiked;
      syncedLikeCountRef.current = serverLikeCount;
      currentLikeCountValueRef.current = serverLikeCount;

      syncedDislikedRef.current = serverDisliked;
      syncedDislikeCountRef.current = serverDislikeCount;
      currentDislikeCountValueRef.current = serverDislikeCount;

      // Update global cache
      updateGlobalCache(post, {
        liked: serverLiked,
        likeCount: serverLikeCount,
        disliked: serverDisliked,
        dislikeCount: serverDislikeCount
      });

      if (currentLikedValueRef.current === targetLiked && currentDislikedValueRef.current === targetDisliked) {
        setLiked(serverLiked);
        setLikeCount(serverLikeCount);
        setDisliked(serverDisliked);
        setDislikeCount(serverDislikeCount);

        window.dispatchEvent(new CustomEvent('POST_SYNC', {
          detail: {
            postId: post.id,
            source: actionType,
            liked: serverLiked,
            likeCount: serverLikeCount,
            disliked: serverDisliked,
            dislikeCount: serverDislikeCount,
            emitterId: instanceId
          }
        }));
      }
    } catch (err) {
      console.error(`Failed to sync ${actionType} interaction`, err);
      if (currentLikedValueRef.current === targetLiked && currentDislikedValueRef.current === targetDisliked) {
        setLiked(syncedLiked);
        setLikeCount(syncedLikeCountRef.current);
        currentLikeCountValueRef.current = syncedLikeCountRef.current;

        setDisliked(syncedDisliked);
        setDislikeCount(syncedDislikeCountRef.current);
        currentDislikeCountValueRef.current = syncedDislikeCountRef.current;

        // Revert global cache
        updateGlobalCache(post, {
          liked: syncedLiked,
          likeCount: syncedLikeCountRef.current,
          disliked: syncedDisliked,
          dislikeCount: syncedDislikeCountRef.current
        });

        if (actionType === 'like') {
          onLike?.(post.id, syncedLiked);
        } else {
          onDislike?.(post.id, syncedDisliked);
        }

        window.dispatchEvent(new CustomEvent('POST_SYNC', {
          detail: {
            postId: post.id,
            source: actionType,
            liked: syncedLiked,
            likeCount: syncedLikeCountRef.current,
            disliked: syncedDisliked,
            dislikeCount: syncedDislikeCountRef.current,
            emitterId: instanceId
          }
        }));
      }
    } finally {
      isLikeDislikeSyncingRef.current = false;
      if (hasPendingLikeDislikeSyncRef.current) {
        hasPendingLikeDislikeSyncRef.current = false;
        syncLikeDislike();
      }
    }
  }

  async function handleLike() {
    if (isResolved) return;
    
    const nextLiked = !currentLikedValueRef.current;
    const nextLikeCount = nextLiked ? currentLikeCountValueRef.current + 1 : Math.max(0, currentLikeCountValueRef.current - 1);
    
    let nextDislikeCount = currentDislikeCountValueRef.current;
    const hasDislike = isIssue;
    if (hasDislike && nextLiked && currentDislikedValueRef.current) {
      nextDislikeCount = Math.max(0, currentDislikeCountValueRef.current - 1);
    }
    
    // 1. Synchronously update Refs for instant response to successive clicks
    currentLikedValueRef.current = nextLiked;
    currentLikeCountValueRef.current = nextLikeCount;
    if (hasDislike && nextLiked) {
      currentDislikedValueRef.current = false;
      currentDislikeCountValueRef.current = nextDislikeCount;
    }

    // 2. Optimistic state updates
    setLiked(nextLiked);
    setLikeCount(nextLikeCount);
    if (hasDislike && nextLiked) {
      setDisliked(false);
      setDislikeCount(nextDislikeCount);
    }

    // Update global cache immediately on optimistic update
    updateGlobalCache(post, {
      liked: nextLiked,
      likeCount: nextLikeCount,
      ...(hasDislike && nextLiked ? { disliked: false, dislikeCount: nextDislikeCount } : {})
    });
    
    // 3. Notify parent and sync instances
    onLike?.(post.id, nextLiked);
    window.dispatchEvent(new CustomEvent('POST_SYNC', {
      detail: { 
        postId: post.id, 
        source: 'like', 
        liked: nextLiked, 
        likeCount: nextLikeCount, 
        disliked: nextLiked ? false : currentDislikedValueRef.current,
        dislikeCount: nextDislikeCount,
        emitterId: instanceId 
      }
    }));

    // 4. Debounce API call
    if (pendingLikeTimerRef.current) {
      clearTimeout(pendingLikeTimerRef.current);
    }
    if (pendingDislikeTimerRef.current) {
      clearTimeout(pendingDislikeTimerRef.current);
      pendingDislikeTimerRef.current = null;
    }

    pendingLikeTimerRef.current = setTimeout(async () => {
      pendingLikeTimerRef.current = null;
      syncLikeDislike();
    }, 400);
  }

  async function handleDislike() {
    if (!isIssue || isResolved) return;
    
    const nextDisliked = !currentDislikedValueRef.current;
    const nextDislikeCount = nextDisliked ? currentDislikeCountValueRef.current + 1 : Math.max(0, currentDislikeCountValueRef.current - 1);
    
    let nextLikeCount = currentLikeCountValueRef.current;
    if (nextDisliked && currentLikedValueRef.current) {
      nextLikeCount = Math.max(0, currentLikeCountValueRef.current - 1);
      currentLikedValueRef.current = false;
      currentLikeCountValueRef.current = nextLikeCount;
    }
    
    // 1. Synchronously update Refs
    currentDislikedValueRef.current = nextDisliked;
    currentDislikeCountValueRef.current = nextDislikeCount;

    // 2. Optimistic state updates
    setDisliked(nextDisliked);
    setDislikeCount(nextDislikeCount);
    if (nextDisliked) {
      setLiked(false);
      setLikeCount(nextLikeCount);
    }

    // Update global cache immediately on optimistic update
    updateGlobalCache(post, {
      disliked: nextDisliked,
      dislikeCount: nextDislikeCount,
      ...(nextDisliked ? { liked: false, likeCount: nextLikeCount } : {})
    });
    
    // 3. Notify parent and sync instances
    onDislike?.(post.id, nextDisliked);
    window.dispatchEvent(new CustomEvent('POST_SYNC', {
      detail: { 
        postId: post.id, 
        source: 'dislike', 
        disliked: nextDisliked, 
        dislikeCount: nextDislikeCount, 
        liked: nextDisliked ? false : currentLikedValueRef.current,
        likeCount: nextLikeCount,
        emitterId: instanceId 
      }
    }));

    // 4. Debounce API call
    if (pendingDislikeTimerRef.current) {
      clearTimeout(pendingDislikeTimerRef.current);
    }
    if (pendingLikeTimerRef.current) {
      clearTimeout(pendingLikeTimerRef.current);
      pendingLikeTimerRef.current = null;
    }

    pendingDislikeTimerRef.current = setTimeout(async () => {
      pendingDislikeTimerRef.current = null;
      syncLikeDislike();
    }, 400);
  }

  async function syncSave() {
    if (isSaveSyncingRef.current) {
      hasPendingSaveSyncRef.current = true;
      return;
    }

    const finalSavedState = currentSavedValueRef.current;
    const originalSyncedState = syncedSavedRef.current;

    if (finalSavedState === originalSyncedState) {
      return;
    }

    isSaveSyncingRef.current = true;
    try {
      const res = await apiPost(`/api/interactions/${interactionType}/${post.id}/save`, {});
      const data = (res as any)?.data ?? res;
      
      let serverSaved = finalSavedState;
      if (data && typeof data.saved === "boolean") serverSaved = data.saved;
      else if (data && typeof data.isSaved === "boolean") serverSaved = data.isSaved;

      syncedSavedRef.current = serverSaved;
      currentSavedValueRef.current = serverSaved;

      updateGlobalCache(post, { saved: serverSaved });

      if (currentSavedValueRef.current === finalSavedState) {
        setSaved(serverSaved);
        window.dispatchEvent(new CustomEvent('POST_SYNC', {
          detail: { postId: post.id, source: 'save', saved: serverSaved, emitterId: instanceId }
        }));
      }
    } catch (err) {
      console.error("Failed to sync save interaction", err);
      if (currentSavedValueRef.current === finalSavedState) {
        setSaved(originalSyncedState);
        currentSavedValueRef.current = originalSyncedState;

        // Revert global cache
        updateGlobalCache(post, { saved: originalSyncedState });

        onSave?.(post.id, originalSyncedState);
        window.dispatchEvent(new CustomEvent('POST_SYNC', {
          detail: { postId: post.id, source: 'save', saved: originalSyncedState, emitterId: instanceId }
        }));
      }
    } finally {
      isSaveSyncingRef.current = false;
      if (hasPendingSaveSyncRef.current) {
        hasPendingSaveSyncRef.current = false;
        syncSave();
      }
    }
  }

  async function handleSave() {
    const nextSaved = !currentSavedValueRef.current;
    
    // 1. Synchronously update Ref
    currentSavedValueRef.current = nextSaved;

    // 2. Optimistic state updates
    setSaved(nextSaved);

    // Update global cache immediately on optimistic update
    updateGlobalCache(post, { saved: nextSaved });
    
    // 3. Notify parent and sync instances
    onSave?.(post.id, nextSaved);
    window.dispatchEvent(new CustomEvent('POST_SYNC', {
      detail: { postId: post.id, source: 'save', saved: nextSaved, emitterId: instanceId }
    }));

    // 4. Debounce API call
    if (pendingSaveTimerRef.current) {
      clearTimeout(pendingSaveTimerRef.current);
    }

    pendingSaveTimerRef.current = setTimeout(async () => {
      pendingSaveTimerRef.current = null;
      syncSave();
    }, 400);
  }

  async function actuallyTriggerShare(method: string) {
    if (isSharingRef.current) return;
    isSharingRef.current = true;
    if (method === "copy") flash();
    try {
      if (!hasSharedLocally) {
        const nextShareCount = shareCount + 1;
        setShareCount(nextShareCount);
        setHasSharedLocally(true);
        if (post) {
          const isIssue = post.variant === "issue";
          const isGovt = post.variant === "government";
          const type = (isIssue || isGovt) ? "posts" : "social-posts";
          const userId = currentUserProfile?.id || currentUser?.id || currentUserProfile?.username || currentUser?.username || "guest";
          const key = `govlyx_shared_${userId}_${type}_${post.id}`;
          try {
            localStorage.setItem(key, "true");
          } catch (e) {
            console.error("Failed to save share to localStorage", e);
          }
        }
        onShare?.(post.id);
        
        window.dispatchEvent(new CustomEvent('POST_SYNC', {
          detail: { postId: post.id, source: 'share', shareCount: nextShareCount, emitterId: instanceId }
        }));
      }

      await recordShare(interactionType, post.id, hasSharedLocally, method);
    } catch (err) {
      console.error("Failed to log share", err);
    } finally {
      isSharingRef.current = false;
    }
  }


  async function handleResolveConfirm(message: string) {
    if (checkProfanity(message)) {
      showToast.error("Content contains prohibited language/profanity. Please check your words.");
      return;
    }
    setResolving(true);
    try {
      await apiPut(
        `/api/posts/${post.id}/resolution?isResolved=true&updateMessage=${encodeURIComponent(
          message
        )}`
      );
      setResolveOpen(false);
      onResolve?.(post.id, true, message);
      showToast.success("Issue resolved successfully!");
    } catch (err) {
      console.error("Resolve error:", err);
      showToast.error(parseError(err));
    } finally {
      setResolving(false);
    }
  }

  async function handleReopenConfirm(reason: string) {
    if (checkProfanity(reason)) {
      showToast.error("Content contains prohibited language/profanity. Please check your words.");
      return;
    }
    setReopening(true);
    try {
      await apiPut(`/api/posts/${post.id}/reopen`, { reason });
      setReopenOpen(false);
      onResolve?.(post.id, false, reason);
      showToast.success("Issue reopened successfully!");
    } catch (err) {
      console.error("Reopen error:", err);
      showToast.error(parseError(err));
    } finally {
      setReopening(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      // Correctly route to either /api/social-posts/ or /api/posts/
      const isSocial = post.variant === "social" || post.variant === "community" || post.variant === "poll";
      const ep = isSocial ? `/api/social-posts/${post.id}` : `/api/posts/${post.id}`;
      
      await apiDelete(ep);
      setConfirmDeleteOpen(false);
      
      // Notify parent to remove it from the list without a full page reload if possible
      if (onDelete) {
        onDelete(post.id);
      } else {
        // Fallback for cases where onDelete isn't provided (unlikely in modern feeds)
        window.location.reload();
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Failed to delete post. Please try again later.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleJoinCommunity(cid: number) {
    if (isProcessing) return;
    setIsProcessing(true);
    const next = !isJoined;
    setIsJoined(next);
    try {
      await apiPost(`/api/communities/${cid}/join`, {});
      queryClient.invalidateQueries({ queryKey: ["my-communities"] });
    } catch {
      setIsJoined(!next);
      alert("Could not join community.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handlePollVote(pollId: number, optionIds: number[]) {
    setIsProcessing(true);
    try {
      // 1. Notify parent if needed
      onVote?.(pollId, optionIds);

      // 2. Perform API call
      const res = (await apiPost(`/api/polls/${pollId}/vote`, optionIds)) as any;

      // 3. Update the post data locally if we're in a poll variant
      if (post.variant === "poll" && res) {
        res.isPoll = true;
        const updatedPoll = toPostCardPost(res) as PollPost;
        // Selectively merge poll-specific and response fields, keeping original author/metadata
        post.options = updatedPoll.options;
        post.totalVotes = updatedPoll.totalVotes;
        post.userHasVoted = updatedPoll.userHasVoted;
        post.votedOptionIds = updatedPoll.votedOptionIds;
        post.showResults = updatedPoll.showResults;
        post.timeLeft = updatedPoll.timeLeft || post.timeLeft;
        post.expiresAt = updatedPoll.expiresAt;
        post.isExpired = updatedPoll.isExpired;
      }
    } catch (err: any) {
      console.error("Poll vote failed:", err);
      alert(err.message === "403" || err.message === "401" ? "Please login to vote." : "Failed to submit vote. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  const borderClass = isGovt
    ? "border-[#1D4ED8]/25 bg-base-100"
    : isResolved
      ? "border-emerald-500/20 bg-base-100"
      : "border-base-300 bg-base-100";

  const hasBackendTranslation = !!(post as BasePost).isTranslated && !!(post as BasePost).translatedContent;
  const hasTranslation = hasBackendTranslation || !!dynamicTranslation;
  const displayText = hasTranslation && !showOriginal
    ? (dynamicTranslation || (post as BasePost).translatedContent!)
    : post.content;
  const canShowDelete = !hideDelete && ((post as any).canDelete !== undefined ? !!(post as any).canDelete : !!(currentUser && post.username === currentUser.username));
  const translateLabel = hasTranslation ? (showOriginal ? "See Translation" : "Show Original") : "Translate";

  const handleMenuTranslate = () => {
    if (isTranslating) return;
    setMoreMenuOpen(false);
    if (hasTranslation) {
      setShowOriginal((v) => !v);
      return;
    }
    handleTranslateDynamic();
  };

  const headerMoreMenu = (
    <div className="relative shrink-0">
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          setMoreMenuOpen((open) => !open);
        }}
        whileHover={{ scale: 1.08, y: -1 }}
        whileTap={{ scale: 0.94 }}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-transparent bg-base-300/40 text-base-content/50 transition-all duration-300 hover:border-base-content/20 hover:bg-base-300/10 hover:text-base-content backdrop-blur-md"
        title="More options"
        aria-haspopup="menu"
        aria-expanded={moreMenuOpen}
      >
        <MoreVertical size={17} />
      </motion.button>

      <AnimatePresence>
        {moreMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="menu"
          >
            {canShowDelete && (
              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  setConfirmDeleteOpen(true);
                }}
                disabled={isDeleting}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-500/10 disabled:opacity-40"
                role="menuitem"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
            <button
              onClick={handleMenuTranslate}
              disabled={isTranslating}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-base-content/75 hover:bg-base-200 disabled:opacity-40"
              role="menuitem"
            >
              {isTranslating ? <span className="loading loading-spinner w-3 h-3" /> : <Globe size={14} />}
              {isTranslating ? "Translating..." : translateLabel}
            </button>
            <button
              onClick={() => {
                setMoreMenuOpen(false);
                showToast.success("Marked as interested.");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-base-content/75 hover:bg-base-200"
              role="menuitem"
            >
              <CheckCircle2 size={14} />
              Interested
            </button>
            <button
              onClick={() => {
                setMoreMenuOpen(false);
                setConfirmNotInterestedOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-base-content/75 hover:bg-base-200"
              role="menuitem"
            >
              <EyeOff size={14} />
              Not Interested
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -6 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className={`rounded-[2rem] border-2 ${borderClass} shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col backdrop-blur-md relative group/card transition-all duration-500 notranslate`}
      >
        <div className="p-5 sm:p-6 flex flex-col gap-4 flex-1 relative">

          {/* Community Strip at top */}
          {postHasCommunity && !hideCommunityStrip && (
            <CommunityStrip post={post} isJoined={isJoined} onJoin={handleJoinCommunity} />
          )}

          {/* Header Row: Author + Join */}
          <div className="flex items-start justify-between gap-3">
            {isGovt ? (
              <>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 min-w-0"
                >
                  <div 
                    className="relative shrink-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (post.username) {
                        setProfileModalUsername(post.username);
                        setProfileModalDisplayName((post as GovernmentPost).department || post.username);
                        setProfileModalAvatar(post.userProfileImage || null);
                        setProfileModalOpen(true);
                      }
                    }}
                  >
                    {post.userProfileImage ? (
                      <img
                        src={post.userProfileImage}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-red-500/20 ring-offset-2 ring-offset-base-100"
                        alt=""
                      />
                    ) : (
                      <img
                        src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(
                          post.username || "?"
                        )}`}
                        className="w-10 h-10 rounded-full object-cover bg-red-500/5 ring-2 ring-red-500/20 ring-offset-2 ring-offset-base-100"
                        alt="Avatar"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span 
                        className="font-bold text-[#EF4444] dark:text-[#F87171] text-sm truncate tracking-tight notranslate cursor-pointer hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (post.username) {
                            setProfileModalUsername(post.username);
                            setProfileModalDisplayName((post as GovernmentPost).department || post.username);
                            setProfileModalAvatar(post.userProfileImage || null);
                            setProfileModalOpen(true);
                          }
                        }}
                      >
                        {(post as GovernmentPost).department || post.username}
                      </span>
                      <BadgeCheck size={16} className="text-red-500 fill-red-500/10 shrink-0" />
                    </div>
                    <p className="text-[10px] text-base-content/50 mt-0.5 flex items-center gap-1">
                      {post.timeAgo ?? "just now"}
                      {post.isPendingSync && (
                        <span className="inline-flex items-center gap-0.5 text-[8px] text-base-content/40 font-bold uppercase tracking-tighter bg-base-300/40 px-1.5 py-0.5 rounded">
                          <Clock size={10} className="animate-pulse" />
                          Pending Sync
                        </span>
                      )}
                    </p>
                  </div>
                </motion.div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {headerMoreMenu}
                </div>
              </>
            ) : (
              <AuthorRow
                post={post}
                badge={isCommunity ? (post as CommunityPost).authorRole : undefined}
                onDelete={undefined}
                isDeleting={isDeleting}
                showDelete={false}
                hideDelete={true}
                onProfileClick={(uname) => {
                  setProfileModalUsername(uname);
                  setProfileModalDisplayName(post.userDisplayName || uname);
                  setProfileModalAvatar(post.userProfileImage || null);
                  setProfileModalOpen(true);
                }}
                rightAction={
                  <div className="flex items-center gap-1.5">
                    {headerMoreMenu}
                    {currentUser && post.username !== currentUser.username && (
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportOpen(true);
                        }}
                        whileHover={{ scale: 1.12, y: -1 }}
                        whileTap={{ scale: 0.94 }}
                        className="group/report relative flex h-9 w-9 items-center justify-center rounded-xl border border-transparent bg-base-300/40 text-base-content/40 transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-600 hover:shadow-lg hover:shadow-red-500/10 backdrop-blur-md"
                        title="Report content"
                      >
                        <Flag size={16} className="relative z-10 transition-transform duration-300 group-hover/report:rotate-6" />
                      </motion.button>
                    )}
                  </div>
                }
              />
            )}
          </div>

          {/* Meta row */}
          {(isIssue || isGovt) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-center gap-2">
              {isIssue && showStatusBadge && (
                <StatusBadge status={(post as IssuePost).status} reopened={(post as IssuePost).reopened || (post as IssuePost).isReopened} />
              )}
              {(post as any).targetPincodes && (post as any).targetPincodes.length > 0 && (
                <div className="flex items-center gap-1 bg-[#1D4ED8]/5 text-[#1D4ED8] dark:text-[#60A5FA] dark:bg-[#1D4ED8]/20 text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#1D4ED8]/10">
                  <MapPin size={10} />
                  <span>Pincode: {(post as any).targetPincodes.join(", ")}</span>
                </div>
              )}
            </motion.div>
          )}

          {isIssue && (() => {
            const milestone = getIssueMilestone(likeCount, isResolved);
            return (
              <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 px-3 py-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    {milestone.label}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      window.open(`https://wa.me/?text=${encodeURIComponent(`${milestone.label}: ${post.content}\n${window.location.origin}/post/${post.id}`)}`, "_blank", "noopener,noreferrer");
                    }}
                    className="text-[10px] font-bold text-green-700 hover:underline dark:text-green-300"
                  >
                    {milestone.cta}
                  </button>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-base-300">
                  <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${milestone.progress}%` }} />
                </div>
                <p className="mt-1 text-[10px] font-semibold text-base-content/50">
                  {isResolved ? "Resolved and ready to celebrate" : `${likeCount}/${milestone.target} neighbors supporting`}
                </p>
              </div>
            );
          })()}

          {/* Mark Resolved banner */}
          {govCanResolve && !resolving && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              onClick={() => setResolveOpen(true)}
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-amber-500">
                <AlertCircle size={14} /> Assigned to your department
              </span>
              <span className="text-[10px] font-black uppercase text-amber-600">Resolve Now →</span>
            </motion.button>
          )}

          {/* Content: Text Always Above */}
          <motion.div className="space-y-1.5 relative overflow-hidden">
            {post.contentHidden && !isContentRevealed && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsContentRevealed(true);
                }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-base-300/30 backdrop-blur-sm cursor-pointer rounded-xl border border-warning/10 hover:bg-base-300/40 transition-colors p-3 text-center select-none"
              >
                <AlertCircle className="text-warning mb-1 shrink-0" size={16} />
                <p className="text-[11px] font-black uppercase tracking-wider text-warning">
                  Content Moderated
                </p>
                <p className="text-[10px] text-base-content/80 font-bold mt-0.5 line-clamp-1">
                  Reason: {post.hiddenReason || "Violates community guidelines"}
                </p>
                <p className="text-[9px] text-base-content/50 uppercase tracking-widest font-black mt-1">
                  Click to reveal
                </p>
              </div>
            )}

            <motion.p className={`text-[13px] leading-relaxed font-medium text-base-content/90 notranslate ${!expanded ? "line-clamp-3" : ""} ${post.contentHidden && !isContentRevealed ? "blur-sm opacity-50 select-none" : ""}`}>
              {renderFormattedContent(displayText)}
            </motion.p>
            {(!post.contentHidden || isContentRevealed) && (displayText?.length ?? 0) > 160 && (
              <button onClick={() => setExpanded(!expanded)} className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline">
                {expanded ? "Less ↑" : "More ↓"}
              </button>
            )}
          </motion.div>

          {/* Tagged depts */}
          {isIssue && ((post as IssuePost).taggedUsernames?.length ?? 0) > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap gap-2"
            >
              {(post as IssuePost).taggedUsernames?.map((name) => (
                <motion.span
                  key={name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 notranslate"
                >
                  <Building2 size={12} /> @{name}
                </motion.span>
              ))}
            </motion.div>
          )}

          {/* Conditional Body Layout */}
          <div className={hasMedia ? "flex flex-col lg:flex-row gap-4 items-start" : "flex flex-col gap-4"}>
            <div className="flex-1 min-w-0 flex flex-col gap-4 w-full lg:order-1">
              {hasMedia && (
                <div className="-mx-1">
                  <ModernMediaCarousel mediaUrls={allMediaUrls} onExpand={(idx) => { setLightboxIndex(idx); setLightboxOpen(true); }} />
                </div>
              )}

              {/* Poll Variant Rendering */}
              {post.variant === "poll" && (post as any).options && (
                <PollBody post={post as PollPost} onVote={handlePollVote} isProcessing={isProcessing} />
              )}

              {isResolved && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.05)]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-blue-500" /> Issue resolved
                  </div>
                  {currentUser && post.username === currentUser.username && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={reopening}
                      onClick={(e) => {
                        e.stopPropagation();
                        setReopenOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-semibold text-[11px] hover:bg-red-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      {reopening && <span className="loading loading-spinner loading-xs" />}
                      Reopen Issue
                    </motion.button>
                  )}
                </div>
              )}

              {((post as IssuePost).reopened || (post as IssuePost).isReopened) && !isResolved && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400">
                  <AlertCircle size={14} className="text-red-500" /> Issue Reopened: {((post as IssuePost).reopenedReason || (post as IssuePost).reopenReason) ?? "Reason not specified"}
                </div>
              )}

              {/* Horizontal Action Bar */}
              <div className={`flex items-center gap-1 sm:gap-2 border-t border-base-300 pt-3 ${hasMedia ? "lg:hidden" : "flex"}`}>
                <ActionPill onClick={handleLike} active={liked} disabled={isResolved} activeClass={POST_ACTION_ACTIVE_CLASS} hoverGlow={POST_ACTION_HOVER_GLOW}>
                  <PostActionGif name="like" active={liked} />
                  <span>{likeCount || "0"}</span>
                </ActionPill>
                <ActionPill onClick={() => setCommentsOpen(!commentsOpen)} active={commentsOpen} activeClass={POST_ACTION_ACTIVE_CLASS} hoverGlow={POST_ACTION_HOVER_GLOW}>
                  <PostActionGif name="comment" active={commentsOpen} />
                  <span>{commentCount ?? 0}</span>
                </ActionPill>
                <ActionPill onClick={() => setShareMenuOpen(true)} active={copied} activeClass={POST_ACTION_ACTIVE_CLASS} hoverGlow={POST_ACTION_HOVER_GLOW}>
                  <PostActionGif name="share" active={copied} />
                  <span>{copied ? "Copied!" : (shareCount || "0")}</span>
                </ActionPill>
                <div className="flex-1" />
                {isIssue ? (
                  <ActionPill onClick={handleDislike} active={disliked} disabled={isResolved} activeClass={POST_ACTION_ACTIVE_CLASS} hoverGlow={POST_ACTION_HOVER_GLOW}>
                    <PostActionGif name="dislike" active={disliked} />
                    <span>{dislikeCount || "0"}</span>
                  </ActionPill>
                ) : (
                  <ActionPill onClick={handleSave} active={saved} activeClass={POST_ACTION_ACTIVE_CLASS} hoverGlow={POST_ACTION_HOVER_GLOW}>
                    <PostActionGif name="bookmark" active={saved} />
                  </ActionPill>
                )}
              </div>
            </div>

            {/* Desktop Sidebar: Visible only when media exists and on lg: screens */}
            {hasMedia && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="hidden lg:flex flex-col gap-2 p-1 rounded-2xl bg-base-200/50 border border-base-300 lg:order-2 shrink-0 sticky top-0"
              >
                <ActionPill onClick={handleLike} active={liked} disabled={isResolved} vertical activeClass={POST_ACTION_ACTIVE_CLASS} hoverGlow={POST_ACTION_HOVER_GLOW}>
                  <PostActionGif name="like" active={liked} vertical />
                  <span>{likeCount || "0"}</span>
                </ActionPill>
                <ActionPill onClick={() => setCommentsOpen(!commentsOpen)} active={commentsOpen} vertical activeClass={POST_ACTION_ACTIVE_CLASS} hoverGlow={POST_ACTION_HOVER_GLOW}>
                  <PostActionGif name="comment" active={commentsOpen} vertical />
                  <span>{commentCount ?? 0}</span>
                </ActionPill>
                <ActionPill onClick={() => setShareMenuOpen(true)} active={copied} vertical activeClass={POST_ACTION_ACTIVE_CLASS} hoverGlow={POST_ACTION_HOVER_GLOW}>
                  <PostActionGif name="share" active={copied} vertical />
                  <span className="text-[9px] leading-tight mt-0.5">{copied ? "Copied" : (shareCount || "0")}</span>
                </ActionPill>
                {isIssue ? (
                  <ActionPill onClick={handleDislike} active={disliked} disabled={isResolved} vertical activeClass={POST_ACTION_ACTIVE_CLASS} hoverGlow={POST_ACTION_HOVER_GLOW}>
                    <PostActionGif name="dislike" active={disliked} vertical />
                    <span>{dislikeCount || "0"}</span>
                  </ActionPill>
                ) : (
                  <ActionPill onClick={handleSave} active={saved} vertical activeClass={POST_ACTION_ACTIVE_CLASS} hoverGlow={POST_ACTION_HOVER_GLOW}>
                    <PostActionGif name="bookmark" active={saved} vertical />
                  </ActionPill>
                )}
              </motion.div>
            )}
          </div>

          {/* Comments section */}
          <AnimatePresence>
            {commentsOpen && (
              <div className="mt-2 border-t border-base-300 pt-4">
                <CommentSection
                  postId={post.id}
                  postType={commentPostType(post.variant)}
                  commentCount={commentCount}
                  currentUsername={currentUser?.username}
                  currentRole={currentUser?.role}
                  defaultOpen={true}
                  onCommentCountChange={handleCommentCountChange}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <ResolveModal
        isOpen={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onConfirm={handleResolveConfirm}
      />

      <ReopenModal
        isOpen={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onConfirm={handleReopenConfirm}
      />

      <ShareModal
        isOpen={shareMenuOpen}
        onClose={() => setShareMenuOpen(false)}
        post={post}
        onShareAction={actuallyTriggerShare}
        onShareToCommunity={onShareToCommunity}
      />

      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        isLoading={isDeleting}
      />

      <ConfirmModal
        isOpen={confirmNotInterestedOpen}
        onClose={() => setConfirmNotInterestedOpen(false)}
        onConfirm={() => {
          setConfirmNotInterestedOpen(false);
          if (onNotInterested) {
            onNotInterested(post.id);
          } else {
            setLocallyHidden(true);
          }
        }}
        title="Not Interested"
        message="Are you sure you want to mark this post as 'Not Interested'? This post will be hidden from your feed."
        confirmLabel="Not Interested"
        cancelLabel="Interested"
        isCancelSuccess={true}
        isDanger={true}
      />

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType={isIssue ? "POST" : "SOCIAL_POST"}
        targetId={post.id}
      />

      {/* Lightbox / Zoom Viewer */}
      <AnimatePresence>
        {lightboxOpen && hasMedia && (
          <ZoomViewer
            mediaUrls={allMediaUrls}
            startIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </AnimatePresence>

      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        username={profileModalUsername}
        fallbackDisplayName={profileModalDisplayName}
        fallbackProfileImage={profileModalAvatar}
      />
    </>
  );
}
