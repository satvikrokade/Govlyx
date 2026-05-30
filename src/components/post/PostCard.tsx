import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ThumbsDown,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CommentSection from "./CommentSection";
import { apiUrl } from "../../utils/apiUrl";
import type { PostType } from "./CommentSection";
import { resolveMediaUrl, toPostCardPost } from "../../utils/postUtils";
import ConfirmModal from "./ConfirmModal";
import ReportModal from "../modals/ReportModal";
import { checkProfanity } from "../../utils/profanity";
import { showToast } from "../../utils/toast";
import { parseError } from "../../utils/error-handler";

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(url: string, method: string, body?: unknown): Promise<unknown> {
  const token = localStorage.getItem("authToken") ?? localStorage.getItem("token");
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
  timeAgo?: string;
  username: string;
  userDisplayName?: string;
  userProfileImage?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  contentHidden?: boolean;
  hiddenReason?: string;
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
  onSave?: (postId: number, saved: boolean) => void;
  onShare?: (postId: number) => void;
  onComment?: (postId: number) => void;
  onResolve?: (postId: number, isResolved: boolean, message: string) => void;
  onVote?: (pollId: number, optionIds: number[]) => void;
  onDelete?: (postId: number) => void;
  hideCommunityStrip?: boolean;
  hideDelete?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scopeIcon(scope?: BroadcastScope) {
  return scope === "STATE" || scope === "COUNTRY" ? <Globe size={11} /> : <MapPin size={11} />;
}

function scopeLabel(scope?: BroadcastScope, desc?: string) {
  if (desc) return desc;
  const map: Record<string, string> = {
    AREA: "Area",
    DISTRICT: "District",
    STATE: "State",
    COUNTRY: "National",
  };
  return scope ? map[scope] ?? "Local" : "Local";
}

function canUpdateResolution(post: IssuePost, currentUser?: CurrentUser): boolean {
  if (!currentUser) return false;
  if (currentUser.role === "ROLE_ADMIN") return true;
  if (currentUser.role === "ROLE_DEPARTMENT")
    return post.taggedUsernames?.includes(currentUser.username) ?? false;
  return false;
}

function commentPostType(variant: PostVariant): PostType {
  return variant === "issue" ? "post" : "social-posts";
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

// ─── Modern Carousel Component ───────────────────────────────────────────────
function ModernMediaCarousel({
  mediaUrls,
  onExpand,
}: {
  mediaUrls: string[];
  onExpand: () => void;
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

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-base-300 shadow-inner group">
      <motion.div
        className="relative h-64 sm:h-80 w-full bg-black/50 flex items-center justify-center cursor-pointer"
        onClick={isCurrentVideo ? togglePlay : onExpand}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence mode="wait">
          {!imgError[activeIndex] ? (
            isCurrentVideo ? (
              <motion.video
                key={`video-${activeIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
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

      {/* Counter & Video controls */}
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
      <div className="flex items-center gap-2.5 min-w-0">
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
}: {
  post: AnyPost;
  badge?: string;
  onDelete?: () => void;
  isDeleting?: boolean;
  showDelete?: boolean;
  hideDelete?: boolean;
  rightAction?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3"
    >
      <motion.div
        className="relative shrink-0"
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-base-content uppercase tracking-tight">
            {post.userDisplayName || post.username}
          </span>
          {badge && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200"
            >
              {badge}
            </motion.span>
          )}
        </div>
        <p className="text-[10px] text-base-content/50 mt-0.5 font-bold uppercase tracking-tighter">
          {post.timeAgo ?? "just now"}
        </p>
      </div>
      <div className="flex items-center gap-2">
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
function StatusBadge({ status }: { status: PostStatus }) {
  if (status === "RESOLVED")
    return (
      <motion.span
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200"
      >
        <CheckCircle2 size={13} /> Resolved
      </motion.span>
    );
  if (status === "ACTIVE")
    return (
      <motion.span
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-200"
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

  return (
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
    </AnimatePresence>
  );
}

// ─── Share Modal ─────────────────────────────────────────────────────────────
function ShareModal({
  isOpen,
  onClose,
  post,
  onShareAction
}: {
  isOpen: boolean;
  onClose: () => void;
  post: AnyPost;
  onShareAction: (method: string) => void;
}) {
  const url = `${window.location.origin}/post/${post.id}`;
  const rawText = post.content || "";
  const shortened = rawText.length > 50 ? rawText.slice(0, 50) + "..." : rawText;
  const text = encodeURIComponent(`Check out this post on Govlyx:\n"${shortened}"\n\n`);
  
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
    alert("Post link copied to clipboard! Paste it into Instagram DMs or Stories.");
    window.open("https://instagram.com", "_blank");
    onShareAction("instagram");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
           onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            className="w-full max-w-xs rounded-3xl border border-base-300 bg-base-100 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-6 text-center text-lg font-bold text-base-content">Share Post via</h3>
            
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
            
            <button 
               onClick={onClose}
               className="mt-6 w-full py-3 rounded-2xl bg-base-200 text-sm font-bold opacity-80 hover:bg-base-300 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Action Pill ──────────────────────────────────────────────────────────────
function ActionPill({
  onClick,
  active = false,
  disabled = false,
  children,
  vertical = false,
  activeClass = "bg-blue-600/10 text-blue-600",
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  vertical?: boolean;
  activeClass?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.05, backgroundColor: "var(--base-200)" }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      className={`flex items-center gap-1 sm:gap-1.5 rounded-2xl transition-all duration-200 disabled:opacity-30 select-none border border-transparent ${vertical ? "p-2 sm:p-2.5 flex-col min-w-[48px] sm:min-w-[54px]" : "px-2 sm:px-3 py-1 sm:py-2"
        } text-[9px] sm:text-[10px] font-black uppercase tracking-tighter ${active
          ? `${activeClass} bg-current/5 border-current/10 shadow-sm`
          : "text-base-content/60 hover:text-base-content bg-base-200/50 hover:bg-base-300/80"
        }`}
    >
      {children}
    </motion.button>
  );
}

// ─── Poll Body ───────────────────────────────────────────────────────────────
function PollBody({
  post,
  onVote,
  isProcessing,
}: {
  post: PollPost;
  onVote?: (pollId: number, ids: number[]) => void;
  isProcessing?: boolean;
}) {
  const [votedIds, setVotedIds] = useState<number[]>(post?.votedOptionIds || []);

  useEffect(() => {
    setVotedIds(post?.votedOptionIds || []);
  }, [post?.votedOptionIds]);

  if (!post || !post.options || !Array.isArray(post.options) || post.options.length === 0) {
    return null;
  }

  const showResults = post.showResults || post.userHasVoted || post.isExpired || votedIds.length > 0;

  const handleVote = (optionId: number) => {
    if (post.isExpired || isProcessing) return;
    const next = post.allowMultipleVotes
      ? votedIds.includes(optionId)
        ? votedIds.filter((id) => id !== optionId)
        : [...votedIds, optionId]
      : votedIds.includes(optionId) ? [] : [optionId]; // toggle for single vote too
    setVotedIds(next);
    onVote?.(post.pollId, next);
  };

  // ─── Optimistic Updates ──────────────────────────────────────────
  const isOptimistic = !post.userHasVoted && votedIds.length > 0;
  const displayedTotalVotes = isOptimistic ? post.totalVotes + 1 : post.totalVotes;
  const displayedOptions = useMemo(() => {
    if (!isOptimistic) return post.options;
    return post.options.map((opt: PollOption) => {
      const isSelected = votedIds.includes(opt.id);
      const newCount = isSelected ? (opt.voteCount || 0) + 1 : (opt.voteCount || 0);
      const newPercent = displayedTotalVotes > 0 ? (newCount / displayedTotalVotes) * 100 : 0;
      return { ...opt, percentage: newPercent };
    });
  }, [post.options, votedIds, isOptimistic, displayedTotalVotes]);
  // ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2 w-full mt-2">
      <div className="space-y-2">
        {displayedOptions.map((opt) => {
          const isSelected = votedIds.includes(opt.id);
          return (
            <motion.div
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className={`relative overflow-hidden rounded-lg border transition-all cursor-pointer ${isSelected ? "border-blue-500/50 shadow-sm shadow-blue-500/10" : "border-base-content/10"
                }`}
            >
              {/* Progress */}
              <motion.div
                initial={false}
                animate={{ width: showResults ? `${opt.percentage}%` : "0%" }}
                className={`absolute left-0 top-0 h-full transition-all duration-500 ease-out ${isSelected ? "bg-blue-500/10" : "bg-base-content/5"
                  }`}
              />

              {/* Content */}
              <div className="relative z-10 flex items-center justify-between px-3.5 py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  {/* Radio Indicator */}
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
          {post.timeLeft || "Ended"}
        </span>
      </div>
    </div>
  );
}

// ─── Scope Pill ───────────────────────────────────────────────────────────────
function ScopePill({ scope, desc }: { scope?: BroadcastScope; desc?: string }) {
  const label = desc || scopeLabel(scope);
  const icon = scopeIcon(scope);

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 rounded-lg bg-base-200 px-3 py-1.5 text-xs font-semibold text-base-content/80"
    >
      {icon}
      {label}
    </motion.span>
  );
}

export default function PostCard({
  post,
  currentUser,
  onLike,
  onSave,
  onShare,
  onResolve,
  onVote,
  onDelete,
  hideCommunityStrip,
  hideDelete,
}: PostCardProps) {
  const [liked, setLiked] = useState(!!(post as AnyPost)?.isLikedByCurrentUser);
  const [disliked, setDisliked] = useState(!!(post as IssuePost)?.isDislikedByCurrentUser);
  const [saved, setSaved] = useState(
    !!((post as any).isSavedByCurrentUser ?? (post as any).isSaved ?? false)
  );
  const [likeCount, setLikeCount] = useState(post?.likeCount ?? 0);
  const [dislikeCount, setDislikeCount] = useState((post as IssuePost)?.dislikeCount ?? 0);
  const [shareCount, setShareCount] = useState(post?.shareCount ?? 0);
  const [commentCount, setCommentCount] = useState(post?.commentCount ?? 0);
  const [hasSharedLocally, setHasSharedLocally] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isJoined, setIsJoined] = useState((post as any).isMember ?? false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isContentRevealed, setIsContentRevealed] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { copied, flash } = useCopied();

  useEffect(() => {
    if (post) {
      setLiked(!!(post as AnyPost)?.isLikedByCurrentUser);
      setLikeCount(post.likeCount ?? 0);
      setShareCount(post.shareCount ?? 0);
      setSaved(!!((post as any).isSavedByCurrentUser ?? (post as any).isSaved ?? false));
      if ("dislikeCount" in post) setDislikeCount((post as IssuePost).dislikeCount ?? 0);
      if ("isDislikedByCurrentUser" in post) setDisliked(!!(post as IssuePost).isDislikedByCurrentUser);
      setIsJoined((post as any).isMember ?? false);
      setCommentCount(post.commentCount ?? 0);
      setIsContentRevealed(false);
    }
  }, [post]);

  useEffect(() => {
    const handlePostSync = (e: any) => {
      if (e.detail.postId !== post?.id) return;
      if (e.detail.source === 'like') {
        setLiked(e.detail.liked);
        if (e.detail.likeCount !== undefined) setLikeCount(e.detail.likeCount);
      } else if (e.detail.source === 'save') {
        setSaved(e.detail.saved);
      } else if (e.detail.source === 'share') {
        if (e.detail.shareCount !== undefined) setShareCount(e.detail.shareCount);
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
      detail: { postId: post.id, source: 'comment', commentCount: newCount }
    }));
  }, [post.id]);

  if (!post) return null;
  if ((post as any).status === "DELETED") {
    return null;
  }

  const isIssue = post.variant === "issue";
  const isGovt = post.variant === "government";
  const isCommunity = post.variant === "community";
  const interactionType: "posts" | "social-posts" = isIssue ? "posts" : "social-posts";
  const isResolved = isIssue && (post as IssuePost).status === "RESOLVED";

  const govCanResolve =
    isIssue &&
    (post as IssuePost).status === "ACTIVE" &&
    canUpdateResolution(post as IssuePost, currentUser);

  const showStatusBadge = isIssue && canUpdateResolution(post as IssuePost, currentUser);

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
  async function handleLike() {
    if (isResolved || isProcessing) return;
    setIsProcessing(true);
    const next = !liked;
    const nextLikeCount = next ? likeCount + 1 : Math.max(0, likeCount - 1);
    setLiked(next);
    if (next && disliked) {
      setDisliked(false);
      setDislikeCount((n) => Math.max(0, n - 1));
    }
    setLikeCount(nextLikeCount);
    onLike?.(post.id, next);

    window.dispatchEvent(new CustomEvent('POST_SYNC', {
      detail: { postId: post.id, source: 'like', liked: next, likeCount: nextLikeCount }
    }));

    const ep = `/api/interactions/${interactionType}/${post.id}/like`;
    try {
      const res = await apiPost(ep, {});
      const data = (res as any)?.data ?? res;
      if (data && typeof data.liked === "boolean") setLiked(data.liked);
      if (data && typeof data.likeCount === "number") setLikeCount(data.likeCount);
    } catch {
      const prevLikeCount = next ? Math.max(0, nextLikeCount - 1) : nextLikeCount + 1;
      setLiked(!next);
      setLikeCount(prevLikeCount);
      window.dispatchEvent(new CustomEvent('POST_SYNC', {
        detail: { postId: post.id, source: 'like', liked: !next, likeCount: prevLikeCount }
      }));
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDislike() {
    if (!isIssue || isResolved || isProcessing) return;
    alert("Dislike feature coming soon!");
  }

  async function handleSave() {
    if (isProcessing) return;
    setIsProcessing(true);
    const next = !saved;
    setSaved(next);
    onSave?.(post.id, next);
    
    window.dispatchEvent(new CustomEvent('POST_SYNC', {
      detail: { postId: post.id, source: 'save', saved: next }
    }));

    try {
      const res = await apiPost(`/api/interactions/${interactionType}/${post.id}/save`, {});
      const data = (res as any)?.data ?? res;
      if (data && typeof data.saved === "boolean") setSaved(data.saved);
      else if (data && typeof data.isSaved === "boolean") setSaved(data.isSaved);
    } catch {
      setSaved(!next);
      window.dispatchEvent(new CustomEvent('POST_SYNC', {
        detail: { postId: post.id, source: 'save', saved: !next }
      }));
    } finally {
      setIsProcessing(false);
    }
  }

  async function actuallyTriggerShare(method: string) {
    if (isProcessing) return;
    setIsProcessing(true);
    if (method === "copy") flash();
    try {
      if (!hasSharedLocally) {
        const nextShareCount = shareCount + 1;
        setShareCount(nextShareCount);
        setHasSharedLocally(true);
        onShare?.(post.id);
        
        window.dispatchEvent(new CustomEvent('POST_SYNC', {
          detail: { postId: post.id, source: 'share', shareCount: nextShareCount }
        }));
      }

      await recordShare(interactionType, post.id, hasSharedLocally, method);
    } finally {
      setIsProcessing(false);
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
    } catch {
      setIsJoined(!next);
      alert("Could not join community.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handlePollVote(pollId: number, optionIds: number[]) {
    if (isProcessing) return;
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
        // Merge the updated poll data into the current post object
        Object.assign(post, updatedPoll);
        // Force a re-render by updating a dummy state if needed, 
        // but here we just rely on PollBody's internal sync with post.votedOptionIds
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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -6 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className={`rounded-[2rem] border-2 ${borderClass} shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col backdrop-blur-md relative group/card transition-all duration-500`}
      >
        <div className="p-5 sm:p-6 flex flex-col gap-4 flex-1">
          {/* Community Strip at top */}
          {postHasCommunity && !hideCommunityStrip && (
            <CommunityStrip post={post} isJoined={isJoined} onJoin={handleJoinCommunity} />
          )}

          {/* Header Row: Author + Join */}
          <div className="flex items-start justify-between gap-3">
            {isGovt ? (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-red-400/10 flex items-center justify-center shrink-0">
                  <BadgeCheck size={18} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-red-500/80 truncate">
                    {(post as GovernmentPost).department}
                  </p>
                  <p className="text-[10px] text-base-content/50 mt-0.5">{post.timeAgo ?? "just now"}</p>
                </div>
              </motion.div>
            ) : (
              <AuthorRow
                post={post}
                badge={isCommunity ? (post as CommunityPost).authorRole : undefined}
                onDelete={() => setConfirmDeleteOpen(true)}
                isDeleting={isDeleting}
                showDelete={(post as any).canDelete !== undefined ? !!(post as any).canDelete : (currentUser && post.username === currentUser.username)}
                hideDelete={hideDelete}
                rightAction={
                  currentUser && post.username !== currentUser.username ? (
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
                  ) : undefined
                }
              />
            )}
          </div>

          {/* Meta row */}
          {isIssue && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-center gap-2">
              <ScopePill
                scope={"broadcastScope" in post ? (post as IssuePost).broadcastScope : undefined}
                desc={"broadcastScopeDescription" in post ? (post as IssuePost).broadcastScopeDescription : undefined}
              />
              {showStatusBadge && <StatusBadge status={(post as IssuePost).status} />}
            </motion.div>
          )}

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

            <motion.p className={`text-[13px] leading-relaxed font-medium text-base-content/90 ${!expanded ? "line-clamp-3" : ""} ${post.contentHidden && !isContentRevealed ? "blur-sm opacity-50 select-none" : ""}`}>
              {post.content}
            </motion.p>
            {(!post.contentHidden || isContentRevealed) && (post.content?.length ?? 0) > 160 && (
              <button onClick={() => setExpanded(!expanded)} className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline">
                {expanded ? "Less ↑" : "More ↓"}
              </button>
            )}
          </motion.div>

          {/* Hashtags / Tagged depts */}
          {((isIssue && ((post as IssuePost).taggedUsernames?.length ?? 0) > 0) ||
            ("hashtags" in post && ((post as SocialPost).hashtags?.length ?? 0) > 0)) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex flex-wrap gap-2"
              >
                {isIssue &&
                  (post as IssuePost).taggedUsernames?.map((name) => (
                    <motion.span
                      key={name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                    >
                      <Building2 size={12} /> @{name}
                    </motion.span>
                  ))}
                {("hashtags" in post) &&
                  (post as SocialPost).hashtags?.map((tag) => (
                    <motion.span
                      key={tag}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {tag}
                    </motion.span>
                  ))}
              </motion.div>
            )}

          {/* Conditional Body Layout */}
          <div className={hasMedia ? "flex flex-col lg:flex-row gap-4 items-start" : "flex flex-col gap-4"}>
            <div className="flex-1 min-w-0 flex flex-col gap-4 w-full lg:order-1">
              {hasMedia && (
                <div className="-mx-1">
                  <ModernMediaCarousel mediaUrls={allMediaUrls} onExpand={() => setLightboxOpen(true)} />
                </div>
              )}

              {/* Poll Variant Rendering */}
              {post.variant === "poll" && (post as any).options && (
                <PollBody post={post as PollPost} onVote={handlePollVote} isProcessing={isProcessing} />
              )}

              {isResolved && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs font-bold text-emerald-600">
                  <CheckCircle2 size={14} /> Issue resolved
                </div>
              )}

              {/* Horizontal Action Bar: Shown for all posts on mobile, and on desktop if NO media */}
              <div className={`flex items-center gap-1 sm:gap-2 border-t border-base-300 pt-3 ${hasMedia ? "lg:hidden" : "flex"}`}>
                <ActionPill onClick={handleLike} active={liked} disabled={isResolved || isProcessing} activeClass="text-pink-500">
                  <Heart size={16} className={liked ? "fill-current" : ""} />
                  <span>{likeCount || "0"}</span>
                </ActionPill>
                <ActionPill onClick={() => setCommentsOpen(!commentsOpen)} active={commentsOpen} activeClass="text-sky-500">
                  <MessageSquare size={16} className={commentsOpen ? "fill-current" : ""} />
                  <span>{commentCount ?? 0}</span>
                </ActionPill>
                <ActionPill onClick={() => setShareMenuOpen(true)} active={copied} disabled={isProcessing} activeClass="text-emerald-500">
                  <Share2 size={16} />
                  <span>{copied ? "Copied!" : (shareCount || "0")}</span>
                </ActionPill>
                <div className="flex-1" />
                <ActionPill onClick={handleSave} active={saved} disabled={isProcessing} activeClass="text-amber-500">
                  <Bookmark size={16} className={saved ? "fill-current" : ""} />
                </ActionPill>
                {isIssue && (
                  <ActionPill onClick={handleDislike} active={disliked} disabled={isResolved || isProcessing} activeClass="text-rose-500">
                    <ThumbsDown size={16} className={disliked ? "fill-current" : ""} />
                    <span>{dislikeCount || "0"}</span>
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
                <ActionPill onClick={handleLike} active={liked} disabled={isResolved || isProcessing} vertical activeClass="text-pink-500">
                  <Heart size={18} className={liked ? "fill-current" : ""} />
                  <span>{likeCount || "0"}</span>
                </ActionPill>
                <ActionPill onClick={() => setCommentsOpen(!commentsOpen)} active={commentsOpen} vertical activeClass="text-sky-500">
                  <MessageSquare size={18} className={commentsOpen ? "fill-current" : ""} />
                  <span>{commentCount ?? 0}</span>
                </ActionPill>
                <ActionPill onClick={() => setShareMenuOpen(true)} active={copied} disabled={isProcessing} vertical activeClass="text-emerald-500">
                  <Share2 size={18} />
                  <span className="text-[9px] leading-tight mt-0.5">{copied ? "Copied" : (shareCount || "0")}</span>
                </ActionPill>
                <ActionPill onClick={handleSave} active={saved} disabled={isProcessing} vertical activeClass="text-amber-500">
                  <Bookmark size={18} className={saved ? "fill-current" : ""} />
                </ActionPill>
                {isIssue && (
                  <ActionPill onClick={handleDislike} active={disliked} disabled={isResolved || isProcessing} vertical activeClass="text-rose-500">
                    <ThumbsDown size={18} className={disliked ? "fill-current" : ""} />
                    <span>{dislikeCount || "0"}</span>
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

      <ShareModal
        isOpen={shareMenuOpen}
        onClose={() => setShareMenuOpen(false)}
        post={post}
        onShareAction={actuallyTriggerShare}
      />

      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        isLoading={isDeleting}
      />

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType={isIssue ? "POST" : "SOCIAL_POST"}
        targetId={post.id}
      />

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && hasMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all z-10"
            >
              <X size={20} />
            </motion.button>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-h-[90vh] max-w-[90vw]"
            >
              <ModernMediaCarousel
                mediaUrls={allMediaUrls}
                onExpand={() => { }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}