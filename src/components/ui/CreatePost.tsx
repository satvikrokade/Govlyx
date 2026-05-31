import {
  X,
  BarChart2,
  FileTypeCorner,
  AlertTriangle,
  ImagePlus,
  FileVideo,
  Paperclip,
  Loader2,
  CheckCircle2,
  WifiOff,
} from "lucide-react";
import { MdLocationOn } from "react-icons/md";
import { RiAttachment2 } from "react-icons/ri";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, type JSX } from "react";

// ─── API CONFIG ───────────────────────────────────────────────────────────────
import { apiUrl } from "../../utils/apiUrl";

/**
 * Gets the JWT stored by your auth flow (localStorage key is configurable).
 */
const getAuthToken = (): string | null =>
  localStorage.getItem("authToken") ?? localStorage.getItem("token") ?? null;

const authHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
type PostType = "post" | "poll";
type Props = {
  open: boolean;
  onClose: () => void;
  communityId?: number;
  communityName?: string;
  onPostCreated?: (post: any) => void;
};

interface ApiResult {
  ok: boolean;
  message?: string;
  data?: any; // the created post/poll from backend
}

// ─── API CALLS ────────────────────────────────────────────────────────────────

/**
 * Civic / Issue Post — POST /api/posts
 */
async function apiCreatePost(content: string, targetPincode: string): Promise<ApiResult> {
  const res = await fetch(apiUrl(`/api/posts`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      content,
      targetPincode,
      broadcastScope: "AREA",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: json?.error ?? json?.message ?? `HTTP ${res.status}` };
  return { ok: true, message: json?.message, data: json?.data ?? null };
}

/**
 * Civic / Issue Post WITH media — POST /api/posts/with-media (multipart)
 */
async function apiCreatePostWithMedia(
  content: string,
  targetPincode: string,
  mediaFile: File
): Promise<ApiResult> {
  const form = new FormData();
  form.append("content", content);
  form.append("targetPincode", targetPincode);
  form.append("media", mediaFile);

  const res = await fetch(apiUrl(`/api/posts/with-media`), {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: json?.error ?? json?.message ?? `HTTP ${res.status}` };
  return { ok: true, message: json?.message, data: json?.data ?? null };
}

/**
 * Social Post (text-only) — POST /api/social-posts/text
 */
async function apiCreateSocialPost(content: string, communityId?: number): Promise<ApiResult> {
  const res = await fetch(apiUrl(`/api/social-posts/text`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ content, allowComments: true, communityId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: json?.error ?? json?.message ?? `HTTP ${res.status}` };
  return { ok: true, message: json?.message, data: json?.data ?? null };
}

/**
 * Social Post WITH media — POST /api/social-posts/with-media (multipart)
 */
async function apiCreateSocialPostWithMedia(
  content: string,
  files: File[],
  communityId?: number
): Promise<ApiResult> {
  const form = new FormData();
  form.append(
    "post",
    new Blob([JSON.stringify({ content, allowComments: true, communityId })], {
      type: "application/json",
    })
  );
  files.forEach((f) => form.append("media", f));

  const res = await fetch(apiUrl(`/api/social-posts/with-media`), {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: json?.error ?? json?.message ?? `HTTP ${res.status}` };
  return { ok: true, message: json?.message, data: json?.data ?? null };
}

/**
 * Poll Post — POST /api/polls/create
 */
async function apiCreatePoll(payload: {
  question: string;
  options: string[];
  expiresIn: string;
  allowMultipleVotes: boolean;
  showResultsBeforeExpiry?: boolean;
  communityId?: number;
}): Promise<ApiResult> {
  const res = await fetch(apiUrl(`/api/polls/create`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: json?.error ?? json?.message ?? `HTTP ${res.status}` };
  return { ok: true, message: json?.message, data: json?.data ?? null };
}


// ─── MEDIA UPLOAD ZONE ────────────────────────────────────────────────────────
function MediaUploadZone({
  accent = "blue",
  files,
  onChange,
}: {
  accent?: "blue" | "orange";
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accentBorder = accent === "orange" ? "border-orange-500/50" : "border-white/20";
  const accentBg = accent === "orange" ? "bg-orange-500/8" : "bg-white/5";
  const accentText = accent === "orange" ? "text-orange-400" : "text-white/90";
  const accentHover = accent === "orange" ? "hover:border-orange-400/80" : "hover:border-white/40";

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).slice(0, 4 - files.length);
    onChange([...files, ...arr].slice(0, 4));
  };

  const removeFile = (i: number) => onChange(files.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 cursor-pointer transition-colors duration-200 ${accentBorder} ${accentBg} ${accentHover} ${dragging ? "opacity-80 scale-[0.99]" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        <div className="flex gap-3">
          <ImagePlus size={20} className={`${accentText} opacity-70`} />
          <FileVideo size={20} className={`${accentText} opacity-70`} />
          <Paperclip size={20} className={`${accentText} opacity-70`} />
        </div>
        <p className={`text-xs font-medium ${accentText}`}>
          Drag & drop or <span className="underline">browse</span> to attach media
        </p>
        <p className="text-base-content/50 text-xs">
          Photos, videos, documents · up to 4 files
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-base-300/60 border border-base-300 rounded-full text-xs text-base-content/60 max-w-[160px]"
            >
              <span className="truncate">{f.name}</span>
              <button
                className="text-base-content/30 hover:text-red-400 flex-shrink-0"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── STATUS BANNER ─────────────────────────────────────────────────────────────
function StatusBanner({ status, message }: { status: "error" | "success" | "network"; message: string }) {
  const map = {
    error: { bg: "bg-red-500/10 border-red-500/30 text-red-400", icon: <X size={14} /> },
    success: { bg: "bg-green-500/10 border-green-500/30 text-green-400", icon: <CheckCircle2 size={14} /> },
    network: { bg: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400", icon: <WifiOff size={14} /> },
  };
  const s = map[status];
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${s.bg}`}
    >
      {s.icon}
      <span>{message}</span>
    </motion.div>
  );
}

// ─── POST FORM (Civic issue + regular post, wired to backend) ─────────────────
function PostForm({
  onClose,
  communityId,
  onPostCreated,
}: {
  onClose: () => void;
  communityId?: number;
  onPostCreated?: (post: any) => void;
}) {
  const [content, setContent] = useState("");
  const [targetPincode, setTargetPincode] = useState("");
  const [isReportingIssue, setIsReportingIssue] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<{ type: "error" | "network"; msg: string } | null>(null);

  // ── Suggestions ──
  const [mentionSearch, setMentionSearch] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionLoading, setMentionLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Validation ──
  const validate = () => {
    if (!content.trim()) {
      setError({ type: "error", msg: "Please write something before posting." });
      return false;
    }
    // Character length validation rules matched with the backend
    if (isReportingIssue) {
      if (content.trim().length < 3) {
        setError({ type: "error", msg: "Civic issue description must be at least 3 characters long." });
        return false;
      }
      if (content.length > 2000) {
        setError({ type: "error", msg: "Civic issue description cannot exceed 2000 characters." });
        return false;
      }
    } else {
      if (content.length > 3000) {
        setError({ type: "error", msg: "Post content cannot exceed 3000 characters." });
        return false;
      }
    }
    if (isReportingIssue && !targetPincode.trim()) {
      setError({ type: "error", msg: "Pincode is required when reporting an issue." });
      return false;
    }
    if (isReportingIssue && !/^\d{6}$/.test(targetPincode.trim())) {
      setError({ type: "error", msg: "Please enter a valid 6-digit pincode." });
      return false;
    }
    return true;
  };

  // ── Submit ──
  const handlePost = async () => {
    setError(null);
    if (!validate()) return;
    setLoading(true);

    try {
      let result: ApiResult;

      if (isReportingIssue) {
        if (files.length > 0) {
          result = await apiCreatePostWithMedia(content.trim(), targetPincode.trim(), files[0]);
        } else {
          result = await apiCreatePost(content.trim(), targetPincode.trim());
        }
      } else {
        if (files.length > 0) {
          result = await apiCreateSocialPostWithMedia(content.trim(), files, communityId);
        } else {
          result = await apiCreateSocialPost(content.trim(), communityId);
        }
      }

      if (!result.ok) {
        setError({ type: "error", msg: result.message ?? "Something went wrong. Please try again." });
        return;
      }

      setSubmitted(true);
      if (onPostCreated) onPostCreated(result.data);
      window.dispatchEvent(new CustomEvent("postCreated", { detail: { post: result.data, communityId } }));

    } catch (e: unknown) {
      const isNetwork = e instanceof TypeError && e.message.toLowerCase().includes("fetch");
      setError({
        type: isNetwork ? "network" : "error",
        msg: isNetwork
          ? "Server unreachable — please check your connection."
          : "Unexpected error. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Mentions ──
  const handleContentChange = (val: string) => {
    setContent(val);
    setError(null);

    const cursor = textareaRef.current?.selectionStart ?? 0;
    const textBefore = val.slice(0, cursor);
    const lastAtPos = textBefore.lastIndexOf("@");

    if (lastAtPos !== -1) {
      const queryText = textBefore.slice(lastAtPos + 1);
      // Ensure no spaces between @ and cursor
      if (!queryText.includes(" ")) {
        setMentionSearch(true);
        setMentionQuery(queryText);
        setSelectedIndex(0);
        return;
      }
    }
    setMentionSearch(false);
  };

  const insertMention = (user: any) => {
    const cursor = textareaRef.current?.selectionStart ?? 0;
    const textBefore = content.slice(0, cursor);
    const textAfter = content.slice(cursor);
    const lastAtPos = textBefore.lastIndexOf("@");

    const newContent = textBefore.slice(0, lastAtPos) + "@" + user.username + " " + textAfter;
    setContent(newContent);
    setMentionSearch(false);
    textareaRef.current?.focus();
  };

  const fetchSuggestions = async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    console.log("[Mentions] Fetching for:", q, "isReporting:", isReportingIssue);
    setMentionLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/user-tagging/suggestions?query=${encodeURIComponent(q)}&limit=5`), {
        headers: authHeaders(),
      });
      if (!res.ok) {
        console.error("[Mentions] API Error:", res.status);
        throw new Error();
      }
      const json = await res.json();
      console.log("[Mentions] Raw Response:", json);
      const list = json.data?.data ?? json.data ?? [];

      let raw = Array.isArray(list) ? list : [];
      // Conditional filtering
      if (isReportingIssue) {
        raw = raw.filter((u: any) => u.role === "ROLE_DEPARTMENT");
      }
      console.log("[Mentions] Final Suggestions:", raw);
      setSuggestions(raw);
    } catch (err) {
      console.error("[Mentions] Fetch failed:", err);
      setSuggestions([]);
    } finally {
      setMentionLoading(false);
    }
  };

  // Debounced fetch
  const timerRef = useRef<any>(null);
  useEffect(() => {
    if (mentionSearch) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fetchSuggestions(mentionQuery), 200);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [mentionSearch, mentionQuery]);

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
          <CheckCircle2 size={48} className={isReportingIssue ? "text-orange-400" : "text-[#1D4ED8]"} />
        </motion.div>
        <p className="text-base-content font-bold text-lg">
          {isReportingIssue ? "Issue Reported!" : "Post Published!"}
        </p>
        <p className="text-base-content/50 text-sm">
          {isReportingIssue
            ? "Your report has been submitted to the relevant government department."
            : "Your post is now live in the community feed."}
        </p>
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${isReportingIssue ? "bg-orange-500 hover:bg-orange-600" : "bg-[#1D4ED8] hover:bg-[#1D4ED8]/90"} text-white`}
            onClick={() => { setSubmitted(false); setContent(""); setFiles([]); setTargetPincode(""); setError(null); }}
          >
            Post Again
          </button>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence>
        {error && <StatusBanner status={error.type} message={error.msg} />}
      </AnimatePresence>

      {!communityId && (
        <div
          className={`flex items-center justify-between p-3 rounded-lg border transition-colors duration-200 ${isReportingIssue ? "bg-orange-500/10 border-orange-500/40" : "bg-base-300/40 border-base-300"
            }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className={`transition-colors flex-shrink-0 ${isReportingIssue ? "text-orange-400" : "text-base-content/30"}`} />
            <div>
              <p className={`text-[11px] font-black uppercase tracking-tight ${isReportingIssue ? "text-orange-400" : "text-base-content/60"}`}>
                Report to Government
              </p>
              <p className="text-base-content/40 text-[9px] leading-tight font-medium uppercase tracking-tighter">Flag issue to authorities</p>
            </div>
          </div>
          <div className="flex-shrink-0 ml-2">
            <div
              className={`relative w-8 h-4.5 rounded-full cursor-pointer transition-all duration-300 border ${isReportingIssue ? "bg-orange-500 border-orange-600 shadow-inner" : "bg-base-300 border-base-content/10"}`}
              onClick={() => { setIsReportingIssue(!isReportingIssue); setError(null); }}
            >
              <motion.div
                animate={{ x: isReportingIssue ? 16 : 2 }}
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isReportingIssue && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-orange-400/70 uppercase tracking-widest flex items-center gap-1">
                <MdLocationOn size={12} /> Area Pincode <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="e.g. 400001 (Mumbai)"
                className="input input-bordered input-sm focus:border-orange-500 w-full bg-base-100/50"
                value={targetPincode}
                onChange={(e) => { setTargetPincode(e.target.value.replace(/\D/g, "")); setError(null); }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <textarea
          ref={textareaRef}
          placeholder={
            isReportingIssue
              ? "Describe the issue..."
              : "What's on your mind?"
          }
          className={`textarea textarea-bordered w-full min-h-[90px] text-sm resize-none transition-colors bg-base-100/50 ${isReportingIssue ? "border-orange-500/40 focus:border-orange-500" : "focus:border-primary"
            }`}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={(e) => {
            if (mentionSearch && suggestions.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % suggestions.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
              } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertMention(suggestions[selectedIndex]);
              } else if (e.key === "Escape") {
                setMentionSearch(false);
              }
            }
          }}
        />

        {/* Suggestion Dropdown */}
        <AnimatePresence>
          {mentionSearch && (suggestions.length > 0 || mentionLoading || mentionQuery.length < 2) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute z-50 bottom-full left-0 w-full mb-2 bg-base-100 border border-base-300 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-2 border-b border-base-300 bg-base-200/50 flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase opacity-40">
                  {isReportingIssue ? "Suggested Departments" : "Mention People"}
                </span>
                {mentionLoading && <Loader2 size={10} className="animate-spin opacity-40" />}
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {mentionQuery.length < 2 ? (
                  <div className="px-4 py-3 text-xs text-base-content/40 italic">
                    Type at least 2 characters to search...
                  </div>
                ) : !mentionLoading && suggestions.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-base-content/40 italic">
                    No results found for "@{mentionQuery}"
                  </div>
                ) : (
                  suggestions.map((u, i) => (
                    <div
                      key={u.id}
                      onClick={() => insertMention(u)}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${i === selectedIndex ? "bg-[#1D4ED8]/10 text-[#1D4ED8]" : "hover:bg-base-200"
                        }`}
                    >
                      <img
                        src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(u.username)}`}
                        className="w-7 h-7 rounded-full bg-base-300 border border-base-300"
                        alt=""
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{u.displayName}</p>
                        <p className="text-[10px] opacity-40 truncate">@{u.username} • {u.role?.replace("ROLE_", "").toLowerCase()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Character Count Banner ── */}
      <div className="flex justify-between items-center text-[10px] px-1 text-base-content/40 -mt-1 font-bold uppercase tracking-tight">
        <span>
          {isReportingIssue
            ? "Requirement: Min 3, max 2000 chars"
            : "Requirement: Max 3000 chars"}
        </span>
        <span className={content.length > (isReportingIssue ? 2000 : 3000) ? "text-red-500 font-black" : ""}>
          {content.length}/{isReportingIssue ? 2000 : 3000}
        </span>
      </div>

      <div>
        <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1 ${isReportingIssue ? "text-orange-400" : "text-base-content/70"}`}>
          <RiAttachment2 size={12} /> Attach Media <span className="text-base-content/40 font-bold tracking-tighter ml-1 uppercase">(optional)</span>
        </p>
        <MediaUploadZone accent={isReportingIssue ? "orange" : "blue"} files={files} onChange={setFiles} />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-content/5">
        <button onClick={onClose} className="btn btn-sm btn-ghost rounded-xl px-4" disabled={loading}>Cancel</button>
        <button
          disabled={loading}
          className={`btn btn-sm text-white min-w-[90px] sm:min-w-[100px] rounded-xl transition-all duration-300 ${isReportingIssue ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20" : "bg-primary hover:bg-primary/90 shadow-primary/20"
            } ${loading ? "opacity-70" : "shadow-lg"}`}
          onClick={handlePost}
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 size={13} className="animate-spin" />
              <span className="hidden sm:inline">Submitting...</span>
              <span className="sm:hidden">...</span>
            </span>
          ) : (
            "Post"
          )}
        </button>
      </div>
    </div>
  );
}

// ─── POLL FORM (wired to backend) ─────────────────────────────────────────────
function PollForm({
  communityId,
  onClose,
  onPostCreated,
}: {
  communityId?: number;
  onClose: () => void;
  onPostCreated?: (post: any) => void;
}) {
  const [pollQuestion, setPollQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [errors, setErrors] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [expiresIn, setExpiresIn] = useState("1d");

  // ── Suggestions ──
  const [mentionSearch, setMentionSearch] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionLoading, setMentionLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateOption = (i: number, val: string) => { const u = [...options]; u[i] = val; setOptions(u); };
  const addOption = () => { if (options.length < 4) setOptions([...options, ""]); };
  const removeOption = (i: number) => { if (options.length <= 2) return; setOptions(options.filter((_, idx) => idx !== i)); };

  const validate = () => {
    const errs: Record<string, string | boolean> = {};
    if (!pollQuestion.trim()) {
      errs.pollQuestion = "Poll question is required";
    } else if (pollQuestion.length > 500) {
      errs.pollQuestion = "Poll question cannot exceed 500 characters";
    }
    options.forEach((o, i) => { if (!o.trim()) errs[`opt${i}`] = true; });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePost = async () => {
    if (!validate()) return;
    setApiError(null);
    setLoading(true);
    try {
      const payload = {
        question: pollQuestion.trim(),
        options: options.filter((o) => o.trim()),
        expiresIn,
        allowMultipleVotes,
        showResultsBeforeExpiry: true,
        communityId,
      };
      const result = await apiCreatePoll(payload);
      if (!result.ok) {
        setApiError(result.message ?? "Failed to create poll. Please try again.");
        return;
      }
      setSubmitted(true);
      if (onPostCreated) onPostCreated(result.data);
      // Wait a bit to show success animation then close
      setTimeout(() => onClose(), 1500);
    } catch (e: unknown) {
      const isNet = e instanceof TypeError && (e as TypeError).message?.toLowerCase().includes("fetch");
      setApiError(isNet ? "Server unreachable — please check your connection." : "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const handleQuestionChange = (val: string) => {
    setPollQuestion(val);
    const cursor = textareaRef.current?.selectionStart ?? 0;
    const textBefore = val.slice(0, cursor);
    const lastAtPos = textBefore.lastIndexOf("@");
    if (lastAtPos !== -1) {
      const q = textBefore.slice(lastAtPos + 1);
      if (!q.includes(" ")) {
        setMentionSearch(true);
        setMentionQuery(q);
        setSelectedIndex(0);
        return;
      }
    }
    setMentionSearch(false);
  };

  const insertMention = (user: any) => {
    const cursor = textareaRef.current?.selectionStart ?? 0;
    const textBefore = pollQuestion.slice(0, cursor);
    const textAfter = pollQuestion.slice(cursor);
    const lastAtPos = textBefore.lastIndexOf("@");
    setPollQuestion(textBefore.slice(0, lastAtPos) + "@" + user.username + " " + textAfter);
    setMentionSearch(false);
    textareaRef.current?.focus();
  };

  const fetchSuggestions = async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    console.log("[Poll Mentions] Fetching for:", q);
    setMentionLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/user-tagging/suggestions?query=${encodeURIComponent(q)}&limit=5`), {
        headers: authHeaders(),
      });
      if (!res.ok) {
        console.error("[Poll Mentions] API Error:", res.status);
        throw new Error();
      }
      const json = await res.json();
      console.log("[Poll Mentions] Response:", json);
      const list = json.data?.data ?? json.data ?? [];
      const final = Array.isArray(list) ? list : [];
      console.log("[Poll Mentions] Final List:", final);
      setSuggestions(final);
    } catch (err) {
      console.error("[Poll Mentions] Fetch failed:", err);
      setSuggestions([]);
    } finally {
      setMentionLoading(false);
    }
  };

  const timerRef = useRef<any>(null);
  useEffect(() => {
    if (mentionSearch) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fetchSuggestions(mentionQuery), 200);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [mentionSearch, mentionQuery]);

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
          <CheckCircle2 size={52} className="text-[#1D4ED8]" />
        </motion.div>
        <p className="font-bold text-lg">Poll Posted!</p>
        <p className="text-sm text-base-content/50">Your poll is now live in the community feed.</p>
        <button
          className="btn btn-sm bg-[#1D4ED8] text-white"
          onClick={() => { setSubmitted(false); setPollQuestion(""); setOptions(["", ""]); setApiError(null); }}
        >Post Another</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence>
        {apiError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium"
          >
            <X size={13} className="shrink-0" /> <span>{apiError}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative group">
        <textarea
          ref={textareaRef}
          className={`textarea textarea-bordered w-full min-h-[90px] bg-base-100/50 border-base-content/10 focus:border-[#1D4ED8] focus:bg-base-100 transition-all duration-200 resize-none text-sm font-medium ${errors.pollQuestion ? "border-red-500/50" : ""}`}
          placeholder="Ask your poll question..."
          value={pollQuestion}
          onChange={(e) => handleQuestionChange(e.target.value)}
          onKeyDown={(e) => {
            if (mentionSearch && suggestions.length > 0) {
              if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(p => (p + 1) % suggestions.length); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(p => (p - 1 + suggestions.length) % suggestions.length); }
              else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(suggestions[selectedIndex]); }
              else if (e.key === "Escape") { setMentionSearch(false); }
            }
          }}
        />

        {/* Suggestion Dropdown */}
        <AnimatePresence>
          {mentionSearch && (suggestions.length > 0 || mentionLoading || mentionQuery.length < 2) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute z-50 bottom-full left-0 w-full mb-2 bg-base-100 border border-base-300 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-2 border-b border-base-300 bg-base-200/50 flex justify-between items-center text-[10px] font-bold uppercase opacity-40">
                Mention People
                {mentionLoading && <Loader2 size={10} className="animate-spin" />}
              </div>
              <div className="max-h-[160px] overflow-y-auto">
                {mentionQuery.length < 2 ? (
                  <div className="px-4 py-3 text-xs text-base-content/40 italic">
                    Type at least 2 characters to search...
                  </div>
                ) : !mentionLoading && suggestions.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-base-content/40 italic">
                    No results found for "@{mentionQuery}"
                  </div>
                ) : (
                  suggestions.map((u, i) => (
                    <div
                      key={u.id}
                      onClick={() => insertMention(u)}
                      className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${i === selectedIndex ? "bg-[#1D4ED8]/10 text-[#1D4ED8]" : "hover:bg-base-200"}`}
                    >
                      <img src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(u.username)}`} className="w-6 h-6 rounded-full bg-base-300" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{u.displayName}</p>
                        <p className="text-[10px] opacity-40 truncate">@{u.username}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Poll Character Count Banner ── */}
      <div className="flex justify-between items-center text-[10px] px-1 text-base-content/40 -mt-1 font-bold uppercase tracking-tight">
        <span>Requirement: Max 500 chars</span>
        <span className={pollQuestion.length > 500 ? "text-red-500 font-black" : ""}>
          {pollQuestion.length}/500
        </span>
      </div>

      <div className="space-y-2.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-3 group/opt animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex-1 relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-base-content/30 uppercase tracking-widest hidden sm:block">
                Choice {i + 1}
              </span>
              <input
                type="text"
                className={`input input-bordered w-full h-[42px] transition-all duration-200 focus:border-[#1D4ED8] bg-base-100/50 sm:pl-20 ${errors[`opt${i}`] ? "border-red-500/50" : "border-base-content/5"}`}
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
              />
            </div>
            {options.length > 2 && (
              <button
                className="btn btn-ghost btn-xs w-8 h-8 rounded-full text-base-content/30 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0"
                onClick={() => removeOption(i)}
                title="Remove option"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {options.length < 4 && (
        <button
          className="btn btn-ghost btn-sm w-full font-bold text-[11px] uppercase tracking-widest text-[#1D4ED8] hover:bg-[#1D4ED8]/5 border-none h-10 min-h-0 transition-all rounded-xl"
          onClick={addOption}
        >
          + Add Option ({4 - options.length} remaining)
        </button>
      )}


      <div className="flex flex-col sm:flex-row items-center gap-3 bg-base-300/50 p-2.5 rounded-xl border border-base-content/5 mt-1">
        <div className="flex-1 flex items-center justify-between gap-4 px-2 w-full sm:w-auto">
          <span className="text-[10px] font-bold text-base-content/60 uppercase tracking-widest">Duration</span>
          <select
            className="select select-xs select-bordered focus:border-[#1D4ED8] font-bold bg-base-100 h-8 min-h-0 rounded-lg text-[11px]"
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value)}
          >
            <option value="1h">1 Hour</option>
            <option value="1d">1 Day</option>
            <option value="3d">3 Days</option>
            <option value="7d">7 Days</option>
          </select>
        </div>

        <div className="w-px h-6 bg-base-content/10 hidden sm:block" />

        <div className="flex-1 flex items-center justify-between gap-4 px-2 w-full sm:w-auto">
          <label className="flex items-center gap-3 cursor-pointer group">
            <span className="text-[10px] font-bold text-base-content/60 uppercase tracking-widest group-hover:text-base-content transition-colors">Multiple Votes</span>
            <div
              className={`relative w-8 h-4.5 rounded-full transition-colors duration-200 border border-base-content/10 ${allowMultipleVotes ? "bg-[#1D4ED8] border-[#1D4ED8]" : "bg-base-200"}`}
              onClick={() => setAllowMultipleVotes(!allowMultipleVotes)}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${allowMultipleVotes ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          className="btn btn-sm bg-[#1D4ED8] text-white min-w-[120px] rounded-xl font-bold shadow-lg shadow-[#1D4ED8]/20 hover:bg-[#1D4ED8]/90 h-10 border-none"
          onClick={handlePost}
          disabled={loading}
        >
          {loading ? <><Loader2 size={14} className="animate-spin" /> Publishing...</> : "Publish Poll"}
        </button>
      </div>
    </div>
  );
}

// ─── MAIN MODAL ───────────────────────────────────────────────────────────────
const CreatePost = ({ open, onClose, communityId, communityName, onPostCreated }: Props) => {
  const [type, setType] = useState<PostType>("post");

  const postTypes: { key: PostType; label: string; icon: JSX.Element }[] = [
    { key: "post", label: "Post", icon: <FileTypeCorner size={16} /> },
    { key: "poll", label: "Poll", icon: <BarChart2 size={16} /> },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-12 sm:pt-16 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            style={{ maxHeight: 'calc(100vh - 120px)' }}
            className="w-full max-w-lg rounded-3xl bg-base-100 border border-base-300 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden"
            initial={{ scale: 0.97, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-none px-6 py-4 border-b border-base-content/10 bg-base-200/60">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-base-content leading-tight">
                  {communityId ? `Post to ${communityName}` : "Create New Post"}
                </h2>
                <button onClick={onClose} className="btn btn-ghost btn-xs btn-circle bg-base-300"><X size={16} /></button>
              </div>

              {!communityId && (
                <div className="grid grid-cols-2 gap-2 bg-base-300 rounded-xl p-1">
                  {postTypes.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setType(item.key)}
                      className={`btn btn-sm flex-1 ${type === item.key ? "bg-[#1D4ED8] text-white shadow-md" : "btn-ghost text-base-content/60"}`}
                    >
                      {item.icon}
                      <span className="ml-1 text-[10px] sm:text-[11px] font-black uppercase tracking-tight whitespace-nowrap">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 pt-4 bg-base-100">
              {type === "post" && (
                <PostForm
                  onClose={onClose}
                  communityId={communityId}
                  onPostCreated={onPostCreated}
                />
              )}
              {type === "poll" && (
                <PollForm
                  communityId={communityId}
                  onClose={onClose}
                  onPostCreated={onPostCreated}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreatePost;