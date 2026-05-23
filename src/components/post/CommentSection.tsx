import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  Send,
  Trash2,
  Pencil,
  ChevronDown,
  Loader2,
  MessageSquare,
  SmilePlus,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { apiUrl } from "../../utils/apiUrl";
import ConfirmModal from "./ConfirmModal";

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
  if (!res.ok) throw new Error(`${res.status}`);
  const data = await res.json();
  return data?.data ?? data;
}

async function apiPost(url: string, body: unknown) {
  const res = await fetch(apiUrl(url), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  
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

async function apiPut(url: string, body: unknown) {
  const res = await fetch(apiUrl(url), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  
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

async function apiDelete(url: string) {
  const res = await fetch(apiUrl(url), { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status}`);
}

// ─── types ────────────────────────────────────────────────────────────────────
export type PostType = "post" | "social-posts";

export type AuthorDto = {
  username: string; actualUsername?: string;
  displayName?: string;
  profileImageUrl?: string;
  pincode?: string;
};

export type CommentDto = {
  id: number;
  text: string;
  createdAt: string;
  updatedAt?: string;
  author: AuthorDto;
  parentCommentId?: number | null;
  replyCount?: number;
  replies?: CommentDto[];
};

// Unused PaginatedResponse removed to fix lint error

type CommentSectionProps = {
  postId: number;
  postType: PostType;
  commentCount?: number;
  currentUsername?: string;
  currentRole?: "ROLE_USER" | "ROLE_DEPARTMENT" | "ROLE_ADMIN";
  defaultOpen?: boolean;
  onCommentCountChange?: (count: number) => void;
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function timeAgo(raw: string | undefined): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function getDisplayName(c: CommentDto): string {
  return c.author?.displayName ?? c.author?.actualUsername ?? c.author?.username ?? "Unknown";
}

function getAvatarSrc(username: string | undefined, profileImageUrl?: string): string {
  return (
    profileImageUrl ??
    `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(
      username ?? "?"
    )}`
  );
}

const LIMIT = 10;

// ═══════════════════════════════════════════════════════════════════════════════
// Variants for animations
// ═══════════════════════════════════════════════════════════════════════════════
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Auto-grow textarea
// ═══════════════════════════════════════════════════════════════════════════════
function AutoTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  autoFocus,
  onFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  placeholder: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onFocus?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={onFocus}
      className="w-full resize-none overflow-hidden bg-transparent text-sm leading-relaxed outline-none placeholder:text-base-content/40 disabled:opacity-50"
      style={{ minHeight: "24px", maxHeight: "200px" }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CommentInput — premium pill-style composer
// ═══════════════════════════════════════════════════════════════════════════════
function CommentInput({
  placeholder,
  initialValue = "",
  onSubmit,
  onCancel,
  submitLabel = "Post",
  autoFocus = false,
  avatarSeed,
}: {
  placeholder: string;
  initialValue?: string;
  onSubmit: (text: string) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  autoFocus?: boolean;
  avatarSeed?: string;
}) {
  const [text, setText] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(autoFocus);

  const avatarUrl = getAvatarSrc(avatarSeed);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit(trimmed);
      setText("");
      setFocused(false);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") onCancel?.();
  }

  return (
    <div className="flex items-start gap-3">
      {/* Current user avatar */}
      <img
        src={avatarUrl}
        alt="You"
        className="w-9 h-9 rounded-full shrink-0 object-cover border-2 border-primary/10 shadow-sm mt-0.5"
      />

      <div className="flex-1 min-w-0">
        <div
          className={`relative rounded-2xl border transition-all duration-300 ${
            focused
              ? "border-primary/50 bg-base-100 shadow-[0_0_15px_-3px_rgba(29,78,216,0.1)] ring-4 ring-primary/5"
              : "border-base-content/10 bg-base-200/40 hover:border-base-content/20"
          }`}
        >
          <div className="px-4 pt-3.5 pb-2.5">
            <AutoTextarea
              value={text}
              onChange={setText}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              disabled={busy}
              autoFocus={autoFocus}
              onFocus={() => setFocused(true)}
            />
          </div>

          <AnimatePresence>
            {(focused || text.length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between gap-4 border-t border-base-content/5 px-4 py-2.5">
                  <div className="flex flex-col">
                    {error ? (
                      <p className="text-[10px] text-error font-medium animate-pulse">{error}</p>
                    ) : (
                      <p className="text-[10px] text-base-content/40 flex items-center gap-1">
                        <Sparkles size={10} className="text-primary/60" />
                        Ctrl+Enter to send
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {onCancel && (
                      <button
                        onClick={onCancel}
                        disabled={busy}
                        className="btn btn-ghost btn-xs rounded-full h-8 px-3 text-[11px] font-semibold text-base-content/60 hover:bg-base-200"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={submit}
                      disabled={busy || !text.trim()}
                      className="flex items-center gap-2 rounded-full bg-[#1D4ED8] h-8 px-4 text-[11px] font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-[#1D4ED8]/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:grayscale disabled:scale-100"
                    >
                      {busy ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Send size={12} />
                      )}
                      {submitLabel}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper functions to recursively count comments inside a subtree
// ═══════════════════════════════════════════════════════════════════════════════
function countCommentsInSubtree(comment: CommentDto): number {
  let count = 1;
  if (comment.replies && comment.replies.length > 0) {
    for (const reply of comment.replies) {
      count += countCommentsInSubtree(reply);
    }
  } else {
    count += comment.replyCount ?? 0;
  }
  return count;
}

function getCommentSubtreeCount(comment: CommentDto, repliesList: CommentDto[]): number {
  let total = 1;
  if (repliesList && repliesList.length > 0) {
    for (const r of repliesList) {
      total += countCommentsInSubtree(r);
    }
  } else {
    total += comment.replyCount ?? 0;
  }
  return total;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SingleComment
// ═══════════════════════════════════════════════════════════════════════════════
type SingleCommentProps = {
  comment: CommentDto;
  postId: number;
  postType: PostType;
  depth: number;
  currentUsername?: string;
  currentRole?: string;
  onDeleted: (id: number, countToRemove: number) => void;
  onUpdated: (updated: CommentDto) => void;
  onReplyAdded: (parentId: number, reply: CommentDto) => void;
};

function SingleComment({
  comment,
  postId,
  postType,
  depth,
  currentUsername,
  currentRole,
  onDeleted,
  onUpdated,
  onReplyAdded,
}: SingleCommentProps) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [editing, setEditing] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replies, setReplies] = useState<CommentDto[]>(comment.replies ?? []);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesCursor, setRepliesCursor] = useState<number | undefined>();
  const [hasMoreReplies, setHasMoreReplies] = useState(
    (comment.replyCount ?? 0) > 0 && (comment.replies ?? []).length === 0
  );
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  const isOwner = !!currentUsername && comment.author?.username === currentUsername;
  const isAdmin = currentRole === "ROLE_ADMIN";
  const replyCount = comment.replyCount ?? replies.length;
  const authorName = getDisplayName(comment);
  const avatarSrc = getAvatarSrc(comment.author?.username, comment.author?.profileImageUrl);

  async function loadReplies(cursor?: number) {
    setLoadingReplies(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT) });
      if (cursor) params.set("beforeId", String(cursor));
      const res = await apiFetch(`/api/comments/${comment.id}/replies?${params}`);
      
      // Robust extraction — handles ApiResponse wrapper and PaginatedResponse
      const container = res?.data ?? res;
      const fetched: CommentDto[] = Array.isArray(container)
        ? container
        : (container?.data ?? container?.content ?? []);
        
      setReplies((prev) => (cursor ? [...prev, ...fetched] : fetched));
      setHasMoreReplies(container?.hasMore ?? false);
      setRepliesCursor(container?.nextCursor);
    } catch {
      // ignore
    } finally {
      setLoadingReplies(false);
    }
  }

  function toggleReplies() {
    if (!repliesOpen && replies.length === 0 && (comment.replyCount ?? 0) > 0) {
      loadReplies();
    }
    setRepliesOpen((v) => !v);
  }

  async function handleReply(text: string) {
    const endpoint =
      postType === "post"
        ? `/api/comments/post/${postId}`
        : `/api/comments/social-posts/${postId}`;
    const res = await apiPost(endpoint, { text, parentCommentId: comment.id });
    const created: CommentDto = res?.data ?? res;
    setReplies((prev) => [created, ...prev]);
    setRepliesOpen(true);
    setShowReplyBox(false);
    onReplyAdded(comment.id, created);
  }

  async function handleEdit(text: string) {
    const res = await apiPut(`/api/comments/${comment.id}`, { text });
    const updated: CommentDto = res?.data ?? res;
    onUpdated({ ...comment, text: updated.text });
    setEditing(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiDelete(`/api/comments/${comment.id}`);
      const countToRemove = getCommentSubtreeCount(comment, replies);
      onDeleted(comment.id, countToRemove);
      setConfirmDeleteOpen(false);
    } catch {
      setDeleting(false);
    }
  }

  function handleReplyDeleted(replyId: number, countToRemove: number) {
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
    onDeleted(replyId, countToRemove);
  }

  function handleNestedReplyAdded(parentId: number, reply: CommentDto) {
    setReplies((prev) =>
      prev.map((r) =>
        r.id === parentId
          ? {
              ...r,
              replyCount: (r.replyCount ?? 0) + 1,
              replies: [reply, ...(r.replies ?? [])],
            }
          : r
      )
    );
    onReplyAdded(parentId, reply);
  }

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`${depth > 0 ? "border-l-[1.5px] border-base-content/8 pl-5 ml-4.5" : ""}`}
    >
      <div className="flex items-start gap-3 group">
        {/* Avatar with subtle glow */}
        <div className="relative shrink-0">
          <img
            src={avatarSrc}
            alt={authorName}
            className="w-8.5 h-8.5 rounded-full object-cover border border-base-content/5 bg-base-200 mt-0.5"
          />
          {depth === 0 && <div className="absolute inset-0 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.02)] pointer-events-none" />}
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="mt-0.5">
              <CommentInput
                placeholder="Update your thought…"
                initialValue={comment.text}
                onSubmit={handleEdit}
                onCancel={() => setEditing(false)}
                submitLabel="Update"
                autoFocus
                avatarSeed={currentUsername}
              />
            </div>
          ) : (
            <>
              {/* Comment bubble with Glassmorphism */}
              <div className="inline-block max-w-[95%] rounded-2xl rounded-tl-sm bg-base-200/50 backdrop-blur-sm border border-base-content/5 px-4 py-3 shadow-sm hover:bg-base-200/80 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-primary tracking-tight">{authorName}</span>
                  {comment.author?.username === "admin" && (
                    <span className="bg-[#1D4ED8]/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full">STAFF</span>
                  )}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-base-content/85">
                  {comment.text}
                </p>
              </div>

              {/* Meta + Actions */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[10px] font-semibold text-base-content/40 uppercase tracking-wider">
                <span className="font-medium normal-case tracking-normal">{timeAgo(comment.createdAt)}</span>
                
                {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                  <span className="italic normal-case opacity-60">Edited</span>
                )}

                <button
                  onClick={() => setShowReplyBox((v) => !v)}
                  className="hover:text-primary transition-colors hover:scale-105 active:scale-95"
                >
                  Reply
                </button>

                {isOwner && (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1 hover:text-primary transition-colors hover:scale-105 active:scale-95"
                  >
                    <Pencil size={10} /> Edit
                  </button>
                )}

                {(isOwner || isAdmin) && (
                  <button
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={deleting}
                    className="flex items-center gap-1 hover:text-error transition-colors hover:scale-105 active:scale-95 disabled:opacity-30"
                  >
                    {deleting ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Trash2 size={10} />
                    )}
                    Delete
                  </button>
                )}

                {replyCount > 0 && (
                  <button
                    onClick={toggleReplies}
                    className={`flex items-center gap-1.5 transition-all py-0.5 px-2 rounded-full ${
                      repliesOpen ? "bg-[#1D4ED8]/10 text-primary shadow-sm" : "hover:text-primary"
                    }`}
                  >
                    {repliesOpen ? <ChevronDown size={12} className="rotate-180" /> : <MessageSquare size={10} />}
                    {repliesOpen ? "Hide" : `${replyCount} ${replyCount === 1 ? "Reply" : "Replies"}`}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Reply Box */}
          <AnimatePresence>
            {showReplyBox && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <CommentInput
                  placeholder={`Replying to ${authorName}…`}
                  onSubmit={handleReply}
                  onCancel={() => setShowReplyBox(false)}
                  submitLabel="Reply"
                  autoFocus
                  avatarSeed={currentUsername}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Replies Container */}
          <AnimatePresence>
            {repliesOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden mt-4 space-y-4"
              >
                {loadingReplies && replies.length === 0 && (
                  <div className="flex items-center gap-2.5 py-1 text-xs opacity-60 ml-4">
                    <Loader2 size={12} className="animate-spin text-primary" />
                    <span className="font-medium">Fetching conversation…</span>
                  </div>
                )}
                
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {replies.map((reply) => (
                    <SingleComment
                      key={reply.id}
                      comment={reply}
                      postId={postId}
                      postType={postType}
                      depth={depth + 1}
                      currentUsername={currentUsername}
                      currentRole={currentRole}
                      onDeleted={handleReplyDeleted}
                      onUpdated={(updated) => setReplies((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))}
                      onReplyAdded={handleNestedReplyAdded}
                    />
                  ))}
                </motion.div>

                {hasMoreReplies && (
                  <button
                    onClick={() => loadReplies(repliesCursor)}
                    disabled={loadingReplies}
                    className="flex items-center gap-2 text-[11px] font-bold text-primary/80 hover:text-primary transition-all ml-8 py-1 hover:translate-x-1"
                  >
                    {loadingReplies ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                    View older replies
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        isLoading={deleting}
      />
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CommentSection — main export
// ═══════════════════════════════════════════════════════════════════════════════
export default function CommentSection({
  postId,
  postType,
  commentCount: initialCount = 0,
  currentUsername,
  currentRole,
  defaultOpen = false,
  onCommentCountChange,
}: CommentSectionProps) {
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<number | undefined>();
  const [count, setCount] = useState(initialCount);
  const [fetchedOnce, setFetchedOnce] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onCommentCountChange?.(count);
  }, [count, onCommentCountChange]);

  const fetchComments = useCallback(
    async (beforeId?: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(LIMIT) });
        if (beforeId) params.set("beforeId", String(beforeId));
        const endpoint =
          postType === "post"
            ? `/api/comments/post/${postId}/top-level?${params}`
            : `/api/comments/social-posts/${postId}/top-level?${params}`;

        const json = await apiFetch(endpoint);
        
        // ── Robust Data Mapping ───────────────────────────────────────────────
        /** 
         * Logic:
         * 1. If wrapped in ApiResponse: { success, data: { data: [...], hasMore: true } }
         * 2. If direct PaginatedResponse: { data: [...], hasMore: true } 
         */
        const isWrapped = json?.success !== undefined && json?.data !== undefined;
        const container = isWrapped ? json.data : json;

        
        let fetched: CommentDto[] = [];
        if (Array.isArray(container)) {
          fetched = container;
        } else if (container && typeof container === "object") {
          fetched = container.data ?? container.content ?? [];
        }
        


        const paginationInfo = (container && typeof container === "object" && "hasMore" in container)
          ? container
          : (json?.data ?? json);
        
        setComments((prev) => (beforeId ? [...prev, ...fetched] : fetched));
        setHasMore(paginationInfo?.hasMore ?? false);
        setCursor(paginationInfo?.nextCursor);
        setFetchedOnce(true);
      } catch (e) {

        setFetchedOnce(true); // Prevent UI from getting stuck if it fails
      } finally {
        setLoading(false);
      }
    },
    [postId, postType]
  );



  useEffect(() => {
    if (!fetchedOnce) fetchComments();
  }, [fetchedOnce, fetchComments]);

  useEffect(() => {
    if (defaultOpen && sectionRef.current) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 250);
    }
  }, [defaultOpen]);

  async function handleNewComment(text: string) {
    const endpoint =
      postType === "post"
        ? `/api/comments/post/${postId}`
        : `/api/comments/social-posts/${postId}`;
    const res = await apiPost(endpoint, { text });
    const created: CommentDto = res?.data ?? res;
    setComments((prev) => [created, ...prev]);
    setCount((n) => n + 1);
    setFetchedOnce(true);
  }

  function handleReplyAdded() {
    setCount((n) => n + 1);
  }

  function handleDeleted(id: number, countToRemove: number) {
    setComments((prev) => prev.filter((c) => c.id !== id));
    setCount((n) => Math.max(0, n - countToRemove));
  }

  function handleUpdated(updated: CommentDto) {
    setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  const isLoggedIn = !!(localStorage.getItem("authToken") || localStorage.getItem("token"));

  return (
    <motion.div
      ref={sectionRef}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="mt-2"
    >
      <div className="border-t border-base-content/5 pt-6 mb-5" />

      {/* Composer Area */}
      <div className="px-1 mb-7">
        {isLoggedIn ? (
          <CommentInput
            placeholder="Share your thoughts… (Ctrl+Enter to send)"
            onSubmit={handleNewComment}
            avatarSeed={currentUsername}
          />
        ) : (
          <div className="flex items-center gap-4 rounded-2xl border border-dashed border-base-content/20 bg-base-200/30 px-5 py-4 transition-all hover:bg-base-200/50">
            <div className="bg-base-100 p-2 rounded-full shadow-sm text-primary/60">
              <MessageSquare size={18} />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-bold text-base-content/70">Join the discussion</p>
              <p className="text-xs text-base-content/40">Please sign in to leave a comment.</p>
            </div>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {loading && comments.length === 0 && (
          <div className="space-y-6 px-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-base-200 shrink-0" />
                <div className="flex-1 space-y-3 pt-1">
                  <div className="h-2.5 w-24 rounded-full bg-base-200" />
                  <div className="h-10 w-full rounded-2xl bg-base-200/60" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && fetchedOnce && comments.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center gap-4 py-16 px-4"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-[#1D4ED8]/5 blur-2xl rounded-full" />
              <SmilePlus size={42} className="relative text-base-content/20" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-base font-bold text-base-content/50">Voices are echoing…</p>
              <p className="text-xs text-base-content/30 max-w-[200px]">Be the first one to start the conversation and share your perspective.</p>
            </div>
          </motion.div>
        )}

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {comments.map((c) => (
              <SingleComment
                key={c.id}
                comment={c}
                postId={postId}
                postType={postType}
                depth={0}
                currentUsername={currentUsername}
                currentRole={currentRole}
                onDeleted={handleDeleted}
                onUpdated={handleUpdated}
                onReplyAdded={handleReplyAdded}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {hasMore && (
          <div className="pt-2 px-1">
            <button
              onClick={() => fetchComments(cursor)}
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2.5 rounded-2xl border border-base-content/10 bg-base-200/40 py-3.5 text-[11px] font-bold text-base-content/50 transition-all hover:bg-base-200/80 hover:text-primary hover:border-primary/20 shadow-sm active:scale-[0.99] disabled:opacity-40"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
              )}
              {loading ? "Discovering more insights…" : `View ${count - comments.length} more comments`}
            </button>
          </div>
        )}

        {count > 0 && !hasMore && (
          <div className="flex items-center justify-center gap-4 pt-4 pb-2">
            <div className="h-px flex-1 bg-base-content/5" />
            <p className="text-[10px] font-bold text-base-content/20 uppercase tracking-[0.2em]">
              {count} {count === 1 ? "Comment" : "Comments"}
            </p>
            <div className="h-px flex-1 bg-base-content/5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
