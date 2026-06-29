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
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, type JSX } from "react";
import { createPortal } from "react-dom";
import { useCurrentUser } from "../../hooks/useUser";
import { useCreatePost, useCreatePoll } from "../../hooks/usePostInteractions";
import { MdLocationOn } from "react-icons/md";
import {
  RiAttachment2,
  RiBold,
  RiItalic,
  RiCodeLine,
  RiHashtag,
  RiAtLine,
  RiEmotionHappyLine,
} from "react-icons/ri";

import { apiUrl } from "../../utils/apiUrl";
import { showToast } from "../../utils/toast";
import { getAuthToken } from "../../utils/auth";

const authHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const generateUUID = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
  data?: any; // the created post/poll from backend (or duplicate post data on 409)
  status?: number;
}

// ─── JACCARD SIMILARITY MATCHING (FRONTEND DUPLICATE CHECK) ───────────────────
const STOP_WORDS = new Set([
  // English
  "a", "an", "and", "are", "as", "at", "be", "but", "by",
  "for", "if", "in", "into", "is", "it",
  "no", "not", "of", "on", "or", "such",
  "that", "the", "their", "then", "there", "these",
  "they", "this", "to", "was", "will", "with",
  "please", "fix", "issue", "problem", "resolve", "help",
  "near", "outside", "behind", "front", "very", "too", "much",
  // Hindi / Hinglish
  "hai", "ki", "ka", "ke", "ko", "se", "mein", "par",
  "karo", "kijiye", "bhi", "toh", "hi", "aur", "ya", "ye",
  "wo", "kya", "kab", "kaise", "idhar", "udhar",
  "yahan", "wahan", "sir", "madam", "ji"
]);

function tokenizeAndClean(text: string): Set<string> {
  if (!text || !text.trim()) return new Set();
  const words = text.toLowerCase().split(/\W+/);
  const resultSet = new Set<string>();
  for (const word of words) {
    if (word.length > 2 && !STOP_WORDS.has(word)) {
      resultSet.add(word);
    }
  }
  return resultSet;
}

function calculateSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0.0;
  if (text1.toLowerCase() === text2.toLowerCase()) return 1.0;

  const set1 = tokenizeAndClean(text1);
  const set2 = tokenizeAndClean(text2);

  if (set1.size === 0 && set2.size === 0) return 1.0;
  if (set1.size === 0 || set2.size === 0) return 0.0;

  let intersectionSize = 0;
  for (const item of set1) {
    if (set2.has(item)) {
      intersectionSize++;
    }
  }

  const unionSize = set1.size + set2.size - intersectionSize;
  return intersectionSize / unionSize;
}

/**
 * Fetches recent active posts — GET /api/posts/active (not cached in backend)
 */
async function apiGetActivePosts(limit: number = 40): Promise<ApiResult> {
  const res = await fetch(apiUrl(`/api/posts/active?limit=${limit}`), {
    method: "GET",
    headers: { ...authHeaders() },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: json?.message ?? `HTTP ${res.status}`,
    };
  }
  return { ok: true, data: json?.data?.data ?? [], status: res.status };
}


// ─── API CALLS ────────────────────────────────────────────────────────────────


// ─── MEDIA UPLOAD ZONE ────────────────────────────────────────────────────────
function MediaUploadZone({
  accent = "blue",
  files,
  onChange,
}: {
  accent?: "blue" | "green";
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Dynamic colors that work perfectly in both light & dark themes
  const accentBorder = accent === "green" 
    ? "border-green-500/20 dark:border-green-500/30" 
    : "border-neutral-300 dark:border-white/30";
  const accentBg = accent === "green" 
    ? "bg-green-500/[0.02] dark:bg-green-500/[0.04]" 
    : "bg-white/[0.01] dark:bg-white/[0.02]";
  const accentText = accent === "green" 
    ? "text-green-500 dark:text-green-400" 
    : "text-[#1D4ED8] dark:text-blue-400";
  const accentHover = accent === "green" 
    ? "hover:border-green-500/40 hover:bg-green-500/[0.05] dark:hover:border-green-500/50" 
    : "hover:border-neutral-400 dark:hover:border-white/50 hover:bg-white/[0.03] dark:hover:bg-white/[0.04]";

  const handleFiles = async (incoming: FileList | null) => {
    if (!incoming) return;
    
    const validFiles: File[] = [];
    let hasTooLongVideo = false;

    for (let i = 0; i < incoming.length; i++) {
      const file = incoming[i];
      if (file.type.startsWith("video/")) {
        try {
          const duration = await new Promise<number>((resolve, reject) => {
            const video = document.createElement("video");
            video.preload = "metadata";
            video.onloadedmetadata = () => {
              window.URL.revokeObjectURL(video.src);
              resolve(video.duration);
            };
            video.onerror = () => reject();
            video.src = URL.createObjectURL(file);
          });

          if (duration > 300) {
            hasTooLongVideo = true;
            continue;
          }
        } catch (e) {
          console.error("Error reading video duration:", e);
        }
      }
      validFiles.push(file);
    }

    if (hasTooLongVideo) {
      showToast.error("check the file size it must be lesser than equal to 5 min");
    }

    if (validFiles.length > 0) {
      const arr = validFiles.slice(0, 4 - files.length);
      onChange([...files, ...arr].slice(0, 4));
    }
  };

  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const removeFile = (i: number) => onChange(files.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dotted p-6 cursor-pointer transition-all duration-200 ${accentBorder} ${accentBg} ${accentHover} ${dragging ? "opacity-80 scale-[0.99] border-solid" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        <div className="flex gap-4 mb-1">
          <div className={`p-2 rounded-xl bg-base-200/50 border border-base-content/5 ${accentText}`}>
            <ImagePlus size={18} />
          </div>
          <div className={`p-2 rounded-xl bg-base-200/50 border border-base-content/5 ${accentText}`}>
            <FileVideo size={18} />
          </div>
          <div className={`p-2 rounded-xl bg-base-200/50 border border-base-content/5 ${accentText}`}>
            <Paperclip size={18} />
          </div>
        </div>
        
        <p className={`text-xs font-bold tracking-tight ${accentText}`}>
          Drag & drop or <span className="underline decoration-2 underline-offset-2 hover:opacity-80">browse</span> to attach media
        </p>
        <p className="text-base-content/40 text-[10px] font-bold uppercase tracking-wider">
          Photos, videos, documents · up to 4 files
        </p>
        
        <div className="mt-1 flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-500/10">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
          <span>Max 5 min video clips</span>
        </div>
        
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
        <div className="grid grid-cols-4 md:grid-cols-2 gap-3 mt-1 overflow-hidden">
          <AnimatePresence initial={false}>
            {files.map((f, i) => {
              const isImage = f.type.startsWith("image/");
              const isVideo = f.type.startsWith("video/");

              return (
                <motion.div
                  key={f.name + "-" + i}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="relative aspect-square rounded-xl overflow-hidden border border-base-content/10 bg-base-200/50 group/preview shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.03] cursor-default"
                >
                  {isImage && previews[i] && (
                    <img src={previews[i]} alt="Preview" className="w-full h-full object-cover" />
                  )}
                  {isVideo && previews[i] && (
                    <>
                      <video src={previews[i]} className="w-full h-full object-cover" muted playsInline />
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-sm">
                          <FileVideo size={12} />
                        </div>
                      </div>
                    </>
                  )}
                  {!isImage && !isVideo && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-base-200/30">
                      <Paperclip size={20} className="opacity-40 mb-1" />
                      <span className="text-[9px] font-bold opacity-60 truncate w-full px-1">{f.name}</span>
                    </div>
                  )}

                  {/* Remove Overlay Button */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md hover:bg-red-600 hover:scale-110 text-white flex items-center justify-center transition-all shadow-md cursor-pointer z-10 border border-white/5"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
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
    network: { bg: "bg-yellow-500/10 border-yellow-500/30 text-[#1D4EED]", icon: <WifiOff size={14} /> },
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
  const { data: currentUser } = useCurrentUser();
  const createPostMutation = useCreatePost();

  const [content, setContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [targetPincode, setTargetPincode] = useState("");
  const [isReportingIssue, setIsReportingIssue] = useState(false);
  const [pincodeDetails, setPincodeDetails] = useState<string | null>(null);
  const [fetchingPincode, setFetchingPincode] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<{ type: "error" | "network"; msg: string } | null>(null);

  // Smart Pre-Submit Warnings duplicate handling state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicatePostData, setDuplicatePostData] = useState<any>(null);
  const [upvoting, setUpvoting] = useState(false);

  // Pre-fetch active posts cache
  const [cachedActivePosts, setCachedActivePosts] = useState<any[] | null>(null);
  const preFetchPromiseRef = useRef<Promise<ApiResult> | null>(null);

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
  const handlePost = async (force: boolean = false) => {
    setError(null);
    if (!validate()) return;
    setLoading(true);

    const shouldForce = force === true;

    try {
      // Client-Side Duplicate Checking
      if (isReportingIssue && !shouldForce) {
        let posts: any[] = [];
        if (cachedActivePosts) {
          posts = cachedActivePosts;
        } else if (preFetchPromiseRef.current) {
          const res = await preFetchPromiseRef.current;
          if (res.ok && Array.isArray(res.data)) {
            posts = res.data;
          }
        } else {
          const res = await apiGetActivePosts(40);
          if (res.ok && Array.isArray(res.data)) {
            posts = res.data;
          }
        }

        const pin = targetPincode.trim();
        // Filter active posts targeting this specific pincode and ensure they are government/civic type posts
        const activePincodePosts = posts.filter((p: any) => {
          const statusOk = p.status && String(p.status).toUpperCase() === "ACTIVE";
          const pincodesList = Array.isArray(p.targetPincodes) ? p.targetPincodes : [];
          const pincodeOk = pincodesList.includes(pin) || p.userPincode === pin || p.targetPincode === pin;
          const isGovtType = p.broadcastScope !== undefined && p.broadcastScope !== null;
          return statusOk && pincodeOk && isGovtType;
        });

          let duplicateFound: any = null;
          for (const post of activePincodePosts) {
            const similarity = calculateSimilarity(content.trim(), post.content || "");
            if (similarity >= 0.60) {
              duplicateFound = post;
              break;
            }
          }

          if (duplicateFound) {
            // Set duplicate post data and show warning modal
            setDuplicatePostData(duplicateFound);
            setShowDuplicateModal(true);
            setLoading(false);
            return;
          }
      }

      const idempotencyKey = generateUUID();
      createPostMutation.mutate({
        isReportingIssue,
        content: content.trim(),
        targetPincode: targetPincode.trim(),
        files,
        communityId,
        forceSubmit: isReportingIssue ? true : undefined,
        idempotencyKey,
        currentUser: {
          username: currentUser?.username || "unknown",
          actualUsername: currentUser?.actualUsername,
          profileImage: currentUser?.profileImage || null,
        }
      }, {
        onSuccess: (res) => {
          const syncedData = res.data ?? res;
          if (onPostCreated) onPostCreated(syncedData);
          window.dispatchEvent(new CustomEvent("postCreated", { detail: { post: syncedData, communityId } }));
        },
        onError: (err: any) => {
          setError({ type: "error", msg: err.message ?? "Something went wrong. Please try again." });
          setLoading(false);
        }
      });

      setSubmitted(true);
      onClose();

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

  // Upvotes the duplicate issue and cancels the current post creation
  const handleUpvoteDuplicate = async () => {
    if (!duplicatePostData) return;
    setUpvoting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/interactions/posts/${duplicatePostData.id}/like`), {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? json?.message ?? "Failed to upvote duplicate post.");
      }
      showToast.success("Upvoted! You've joined this issue report.");
      setShowDuplicateModal(false);
      onClose(); // Close the main create post modal
    } catch (e: any) {
      setError({ type: "error", msg: e.message || "Failed to upvote duplicate issue. Please try again." });
    } finally {
      setUpvoting(false);
    }
  };

  // ── Mentions ──
  const handleContentChange = (val: string) => {
    setContent(val);
    setError(null);

    if (!isReportingIssue) {
      setMentionSearch(false);
      return;
    }

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

  const applyFormatting = (formatType: "bold" | "italic" | "mono") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    if (!selectedText) return;

    interface DecodedChar {
      char: string;
      bold: boolean;
      italic: boolean;
      mono: boolean;
    }

    const decodeChar = (codePoint: number): DecodedChar => {
      // Bold Italic
      if (codePoint >= 0x1d468 && codePoint <= 0x1d481) return { char: String.fromCharCode(codePoint - 0x1d468 + 65), bold: true, italic: true, mono: false };
      if (codePoint >= 0x1d482 && codePoint <= 0x1d49b) return { char: String.fromCharCode(codePoint - 0x1d482 + 97), bold: true, italic: true, mono: false };

      // Bold
      if (codePoint >= 0x1d400 && codePoint <= 0x1d419) return { char: String.fromCharCode(codePoint - 0x1d400 + 65), bold: true, italic: false, mono: false };
      if (codePoint >= 0x1d41a && codePoint <= 0x1d433) return { char: String.fromCharCode(codePoint - 0x1d41a + 97), bold: true, italic: false, mono: false };
      if (codePoint >= 0x1d7ce && codePoint <= 0x1d7d7) return { char: String.fromCharCode(codePoint - 0x1d7ce + 48), bold: true, italic: false, mono: false };

      // Italic
      if (codePoint >= 0x1d434 && codePoint <= 0x1d44d) return { char: String.fromCharCode(codePoint - 0x1d434 + 65), bold: false, italic: true, mono: false };
      if (codePoint >= 0x1d44e && codePoint <= 0x1d467) return { char: String.fromCharCode(codePoint - 0x1d44e + 97), bold: false, italic: true, mono: false };
      if (codePoint === 0x210e) return { char: "h", bold: false, italic: true, mono: false };

      // Monospace
      if (codePoint >= 0x1d670 && codePoint <= 0x1d689) return { char: String.fromCharCode(codePoint - 0x1d670 + 65), bold: false, italic: false, mono: true };
      if (codePoint >= 0x1d68a && codePoint <= 0x1d6a3) return { char: String.fromCharCode(codePoint - 0x1d68a + 97), bold: false, italic: false, mono: true };
      if (codePoint >= 0x1d7f6 && codePoint <= 0x1d7ff) return { char: String.fromCharCode(codePoint - 0x1d7f6 + 48), bold: false, italic: false, mono: true };

      // Normal
      return { char: String.fromCodePoint(codePoint), bold: false, italic: false, mono: false };
    };

    const encodeChar = (char: string, bold: boolean, italic: boolean, mono: boolean): string => {
      const code = char.charCodeAt(0);
      
      if (mono) {
        if (code >= 65 && code <= 90) return String.fromCodePoint(code - 65 + 0x1d670);
        if (code >= 97 && code <= 122) return String.fromCodePoint(code - 97 + 0x1d68a);
        if (code >= 48 && code <= 57) return String.fromCodePoint(code - 48 + 0x1d7f6);
        return char;
      }

      if (bold && italic) {
        if (code >= 65 && code <= 90) return String.fromCodePoint(code - 65 + 0x1d468);
        if (code >= 97 && code <= 122) return String.fromCodePoint(code - 97 + 0x1d482);
        if (code >= 48 && code <= 57) return String.fromCodePoint(code - 48 + 0x1d7ce);
        return char;
      }

      if (bold) {
        if (code >= 65 && code <= 90) return String.fromCodePoint(code - 65 + 0x1d400);
        if (code >= 97 && code <= 122) return String.fromCodePoint(code - 97 + 0x1d41a);
        if (code >= 48 && code <= 57) return String.fromCodePoint(code - 48 + 0x1d7ce);
        return char;
      }

      if (italic) {
        if (code >= 65 && code <= 90) return String.fromCodePoint(code - 65 + 0x1d434);
        if (code === 104) return 'ℎ';
        if (code >= 97 && code <= 122) return String.fromCodePoint(code - 97 + 0x1d44e);
        return char;
      }

      return char;
    };

    const decoded = Array.from(selectedText).map(char => {
      const cp = char.codePointAt(0) || 0;
      return decodeChar(cp);
    });

    const canApplyBold = decoded.some(c => /[A-Za-z0-9]/.test(c.char) && !c.bold);
    const canApplyItalic = decoded.some(c => /[A-Za-z]/.test(c.char) && !c.italic);
    const canApplyMono = decoded.some(c => /[A-Za-z0-9]/.test(c.char) && !c.mono);

    let formatted = "";

    if (formatType === "bold") {
      const turnOn = canApplyBold;
      formatted = decoded.map(c => {
        if (/[A-Za-z0-9]/.test(c.char)) {
          return encodeChar(c.char, turnOn, c.italic, false);
        }
        return c.char;
      }).join('');
    } else if (formatType === "italic") {
      const turnOn = canApplyItalic;
      formatted = decoded.map(c => {
        if (/[A-Za-z]/.test(c.char)) {
          return encodeChar(c.char, c.bold, turnOn, false);
        }
        return c.char;
      }).join('');
    } else if (formatType === "mono") {
      const turnOn = canApplyMono;
      formatted = decoded.map(c => {
        if (/[A-Za-z0-9]/.test(c.char)) {
          return encodeChar(c.char, false, false, turnOn);
        }
        return c.char;
      }).join('');
    }

    const newContent = content.substring(0, start) + formatted + content.substring(end);
    setContent(newContent);

    // Refocus and restore selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + formatted.length);
    }, 50);
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

  // Pre-fetch active posts as soon as user enables reporting and types a pincode
  useEffect(() => {
    if (isReportingIssue) {
      if (/^\d{6}$/.test(targetPincode.trim()) && !preFetchPromiseRef.current) {
        const promise = apiGetActivePosts(40);
        preFetchPromiseRef.current = promise;
        promise.then(res => {
          if (res.ok && Array.isArray(res.data)) {
            setCachedActivePosts(res.data);
          }
        }).catch(err => {
          console.error("Error pre-fetching active posts:", err);
        });
      }
    } else {
      setCachedActivePosts(null);
      preFetchPromiseRef.current = null;
    }
  }, [targetPincode, isReportingIssue]);

  // Fetch place name for pincode (Scenario B / Civic Issue)
  useEffect(() => {
    if (isReportingIssue && /^[1-9]\d{5}$/.test(targetPincode)) {
      const fetchPincodeDetails = async () => {
        setFetchingPincode(true);
        setPincodeDetails(null);
        try {
          const res = await fetch(apiUrl(`/api/pincode/${targetPincode}`), {
            headers: authHeaders(),
          });
          const json = await res.json();
          if (json?.success && json?.data) {
            const data = json.data;
            const locationStr = `${data.areaName ? data.areaName + ", " : ""}${data.city || data.district}, ${data.state}`;
            setPincodeDetails(locationStr);
          } else {
            setPincodeDetails("Invalid location");
          }
        } catch (err) {
          setPincodeDetails("Location not found");
        } finally {
          setFetchingPincode(false);
        }
      };
      fetchPincodeDetails();
    } else {
      setPincodeDetails(null);
    }
  }, [targetPincode, isReportingIssue]);

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
          <CheckCircle2 size={48} className={isReportingIssue ? "text-green-500" : "text-[#1D4ED8]"} />
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
            className={`btn btn-sm ${isReportingIssue ? "bg-green-500 hover:bg-green-600" : "bg-[#1D4ED8] hover:bg-[#1D4ED8]/90"} text-white`}
            onClick={() => {
              setSubmitted(false);
              setContent("");
              setFiles([]);
              setTargetPincode("");
              setPincodeDetails(null);
              setError(null);
              setCachedActivePosts(null);
              preFetchPromiseRef.current = null;
            }}
          >
            Post Again
          </button>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-3 min-h-[300px]">
      <AnimatePresence>
        {error && <StatusBanner status={error.type} message={error.msg} />}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-3">
          {!communityId && (
        <div
          className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 shadow-sm ${
            isReportingIssue 
              ? "bg-green-500/[0.04] border-green-500/20 dark:bg-green-500/[0.08] dark:border-green-500/30" 
              : "bg-base-200/50 border-base-content/5 hover:border-base-content/10"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border transition-colors ${
              isReportingIssue 
                ? "bg-green-500/10 border-green-500/20 text-green-500 dark:text-green-400" 
                : "bg-base-300/40 border-base-content/5 text-base-content/40"
            }`}>
              <AlertTriangle size={16} />
            </div>
            <div>
              <p className={`text-xs font-black uppercase tracking-wider transition-colors ${isReportingIssue ? "text-green-500 dark:text-green-400" : "text-base-content/75"}`}>
                Report to Government
              </p>
              <p className="text-base-content/40 text-[10px] leading-tight font-bold uppercase tracking-wider mt-0.5">Flag issue to authorities</p>
            </div>
          </div>
          <div className="flex-shrink-0 ml-2">
            <div
              className={`relative w-9 h-5.5 rounded-full cursor-pointer transition-all duration-300 border flex items-center p-0.5 ${
                isReportingIssue 
                  ? "bg-green-500 border-green-500 shadow-inner" 
                  : "bg-base-300 border-base-content/10"
              }`}
              onClick={() => { setIsReportingIssue(!isReportingIssue); setError(null); }}
            >
              <motion.div
                layout
                animate={{ x: isReportingIssue ? 14 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="w-4 h-4 rounded-full bg-white shadow-md"
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
              <label className="text-[10px] font-black text-green-500/70 uppercase tracking-widest flex items-center gap-1">
                <MdLocationOn size={12} /> Area Pincode <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="e.g. 400001 (Mumbai)"
                className="input input-bordered input-sm focus:border-green-500 focus:outline-none w-full bg-base-100/50"
                value={targetPincode}
                onChange={(e) => { setTargetPincode(e.target.value.replace(/\D/g, "")); setError(null); }}
              />
              <div className="text-[10px] min-h-[14px] mt-0.5">
                {fetchingPincode ? (
                  <span className="flex items-center gap-1 text-base-content/60">
                    <Loader2 size={11} className="animate-spin text-green-500 dark:text-green-400" />
                    <span>Fetching location details...</span>
                  </span>
                ) : pincodeDetails ? (
                  <span className="flex items-center gap-1 text-green-500 dark:text-green-400 font-semibold">
                    <MdLocationOn size={11} className="text-green-500 shrink-0" />
                    <span>{pincodeDetails}</span>
                  </span>
                ) : (
                  <span className="text-base-content/40 font-semibold">
                    6-digit Indian pincode — used for local content
                  </span>
                )}
              </div>
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
          className={`textarea textarea-bordered w-full min-h-[90px] text-sm resize-none transition-colors bg-base-100/50 focus:outline-none ${isReportingIssue ? "border-green-500/40 focus:border-green-500" : "focus:border-primary"
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
        />        {/* Rich formatting toolbar */}
        <div className={`flex items-center gap-1.5 px-3 py-2 bg-base-200/30 border rounded-2xl mt-3 mb-2 select-none flex-wrap transition-all duration-200 ${isReportingIssue ? "border-green-500/20 bg-green-500/[0.01]" : "border-base-content/10 bg-base-200/20"}`}>
          <button 
            type="button"
            onClick={() => applyFormatting("bold")}
            title="Bold"
            className={`btn btn-ghost btn-xs btn-square hover:scale-105 text-base-content/70 cursor-pointer transition-all duration-150 font-black ${
              isReportingIssue 
                ? "hover:text-green-500 hover:bg-green-500/10 dark:hover:text-green-400" 
                : "hover:text-primary hover:bg-primary/5 dark:hover:text-blue-400"
            }`}
          >
            <RiBold size={14} />
          </button>
          <button 
            type="button"
            onClick={() => applyFormatting("italic")}
            title="Italic"
            className={`btn btn-ghost btn-xs btn-square hover:scale-105 text-base-content/70 cursor-pointer transition-all duration-150 italic font-black ${
              isReportingIssue 
                ? "hover:text-green-500 hover:bg-green-500/10 dark:hover:text-green-400" 
                : "hover:text-primary hover:bg-primary/5 dark:hover:text-blue-400"
            }`}
          >
            <RiItalic size={14} />
          </button>
          <button 
            type="button"
            onClick={() => applyFormatting("mono")}
            title="Monospace"
            className={`btn btn-ghost btn-xs btn-square hover:scale-105 text-base-content/70 cursor-pointer transition-all duration-150 font-bold ${
              isReportingIssue 
                ? "hover:text-green-500 hover:bg-green-500/10 dark:hover:text-green-400" 
                : "hover:text-primary hover:bg-primary/5 dark:hover:text-blue-400"
            }`}
          >
            <RiCodeLine size={14} />
          </button>
          
          <div className="w-[1px] h-4 bg-base-content/10 mx-1" />

          <button 
            type="button"
            onClick={() => {
              const textarea = textareaRef.current;
              if (!textarea) return;
              const start = textarea.selectionStart;
              const newContent = content.substring(0, start) + "#" + content.substring(start);
              setContent(newContent);
              setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + 1, start + 1);
              }, 50);
            }}
            title="Add Hashtag"
            className={`btn btn-ghost btn-xs btn-square hover:scale-105 text-base-content/70 cursor-pointer transition-all duration-150 ${
              isReportingIssue 
                ? "hover:text-green-500 hover:bg-green-500/10 dark:hover:text-green-400" 
                : "hover:text-primary hover:bg-primary/5 dark:hover:text-blue-400"
            }`}
          >
            <RiHashtag size={14} />
          </button>

          <button 
            type="button"
            onClick={() => {
              const textarea = textareaRef.current;
              if (!textarea) return;
              const start = textarea.selectionStart;
              const newContent = content.substring(0, start) + "@" + content.substring(start);
              setContent(newContent);
              handleContentChange(newContent);
              setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + 1, start + 1);
              }, 50);
            }}
            title="Mention User"
            className={`btn btn-ghost btn-xs btn-square hover:scale-105 text-base-content/70 cursor-pointer transition-all duration-150 ${
              isReportingIssue 
                ? "hover:text-green-500 hover:bg-green-500/10 dark:hover:text-green-400" 
                : "hover:text-primary hover:bg-primary/5 dark:hover:text-blue-400"
            }`}
          >
            <RiAtLine size={14} />
          </button>

          <div className="relative">
            <button 
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Insert Emoji"
              className={`btn btn-ghost btn-xs btn-square text-base-content/70 hover:scale-105 cursor-pointer transition-all duration-150 ${
                showEmojiPicker 
                  ? (isReportingIssue ? "text-green-500 bg-green-500/10 dark:text-green-400 dark:bg-green-500/20" : "text-[#1D4ED8] bg-primary/10 dark:text-blue-400 dark:bg-primary/20") 
                  : (isReportingIssue ? "hover:text-green-500 hover:bg-green-500/10 dark:hover:text-green-400" : "hover:text-primary hover:bg-primary/5 dark:hover:text-blue-400")
              }`}
            >
              <RiEmotionHappyLine size={14} />
            </button>
            {/* Quick Emojis Dropdown - Box with grid layout to prevent horizontal/vertical overflow */}
            {showEmojiPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                <div className="absolute left-0 bottom-full mb-2 bg-base-100 border border-base-300 shadow-2xl rounded-2xl p-2.5 z-50 w-44">
                  <div className="grid grid-cols-5 gap-1.5 justify-items-center">
                    {["😊", "👍", "🔥", "🙌", "💡", "⚠️", "📌", "📢", "👏", "❤️"].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          const textarea = textareaRef.current;
                          if (!textarea) return;
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const newContent = content.substring(0, start) + emoji + content.substring(end);
                          setContent(newContent);
                          setShowEmojiPicker(false);
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + emoji.length, start + emoji.length);
                          }, 50);
                        }}
                        className={`transition-all duration-150 text-lg p-1 rounded-lg cursor-pointer w-7 h-7 flex items-center justify-center hover:scale-110 ${
                          isReportingIssue 
                            ? "hover:bg-green-500/15 dark:hover:bg-green-500/25" 
                            : "hover:bg-primary/10 dark:hover:bg-[#1D4ED8]/20"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>        {/* Suggestion Dropdown */}
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
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        i === selectedIndex
                          ? (isReportingIssue
                              ? "bg-green-500/10 text-green-500 dark:text-green-400 dark:bg-green-500/20"
                              : "bg-[#1D4ED8]/10 text-[#1D4ED8]")
                          : "hover:bg-base-200"
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
        </div>

        <div className="flex flex-col justify-start space-y-3">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1 ${isReportingIssue ? "text-green-500" : "text-base-content/70"}`}>
              <RiAttachment2 size={12} /> Attach Media <span className="text-base-content/40 font-bold tracking-tighter ml-1 uppercase">(optional)</span>
            </p>
            <MediaUploadZone accent={isReportingIssue ? "green" : "blue"} files={files} onChange={setFiles} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-content/5">
        <button onClick={onClose} className="btn btn-sm btn-ghost rounded-xl px-4" disabled={loading}>Cancel</button>
        <button
          disabled={loading}
          className={`btn btn-sm text-white min-w-[90px] sm:min-w-[100px] rounded-xl transition-all duration-300 ${isReportingIssue ? "bg-green-500 hover:bg-green-600 shadow-green-500/20" : "bg-primary hover:bg-primary/90 shadow-primary/20"
            } ${loading ? "opacity-70" : "shadow-lg"}`}
          onClick={() => handlePost()}
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

      {/* Smart Pre-Submit Warning Modal Overlay */}
      <AnimatePresence>
        {showDuplicateModal && duplicatePostData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-base-100/98 backdrop-blur-sm z-50 flex flex-col justify-between p-5 rounded-2xl overflow-y-auto"
          >
            <div className="flex flex-col gap-3.5">
              <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 p-3 rounded-xl text-warning">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Wait! Is this issue already reported?</h3>
                  <p className="text-[10px] opacity-80 leading-normal font-medium mt-0.5">
                    We found a very similar issue recently reported in your area. Please check if this matches your report:
                  </p>
                </div>
              </div>

              {/* Duplicate Post Card Preview */}
              <div className="border border-base-content/10 bg-base-200/50 rounded-xl p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider opacity-60">
                  <span>Pincode: {duplicatePostData.targetPincodes?.[0] || duplicatePostData.targetPincode || targetPincode}</span>
                  <span>
                    {duplicatePostData.createdAt || duplicatePostData.timestamp ? (
                      new Date(duplicatePostData.createdAt || duplicatePostData.timestamp).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    ) : (
                      "Recently reported"
                    )}
                  </span>
                </div>
                <p className="text-xs text-base-content leading-relaxed whitespace-pre-wrap font-medium">
                  {duplicatePostData.content}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-4 border-t border-base-content/5 mt-4">
              <button
                disabled={upvoting}
                onClick={handleUpvoteDuplicate}
                className="btn btn-sm bg-green-500 hover:bg-green-600 text-white w-full rounded-xl transition-all font-bold"
              >
                {upvoting ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <Loader2 size={13} className="animate-spin" /> Upvoting...
                  </span>
                ) : (
                  "Yes, \"Me Too!\" (Upvote)"
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  disabled={upvoting}
                  onClick={() => {
                    setShowDuplicateModal(false);
                    handlePost(true); // retry with forceSubmit = true
                  }}
                  className="btn btn-sm btn-outline btn-ghost flex-1 text-[11px] font-black uppercase tracking-wider rounded-xl"
                >
                  No, Post Anyway
                </button>
                <button
                  disabled={upvoting}
                  onClick={() => {
                    setShowDuplicateModal(false);
                    setDuplicatePostData(null);
                  }}
                  className="btn btn-sm btn-ghost flex-1 text-[11px] font-black uppercase tracking-wider rounded-xl text-base-content/50"
                >
                  Go Back
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [files, setFiles] = useState<File[]>([]);
  const { data: currentUser } = useCurrentUser();
  const createPollMutation = useCreatePoll();

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeField, setActiveField] = useState<{ type: "question" | "option"; index?: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateOption = (i: number, val: string) => {
    const u = [...options];
    u[i] = val;
    setOptions(u);
  };
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

      const idempotencyKey = generateUUID();
      createPollMutation.mutate({
        payload,
        files,
        idempotencyKey,
        currentUser: {
          username: currentUser?.username || "unknown",
          actualUsername: currentUser?.actualUsername,
          profileImage: currentUser?.profileImage || null,
        }
      }, {
        onSuccess: (res) => {
          const syncedData = res.data ?? res;
          const augmentedPoll = {
            ...syncedData,
            variant: "poll",
            actualUsername: currentUser?.actualUsername,
            username: currentUser?.actualUsername ?? currentUser?.username,
            userDisplayName: currentUser?.actualUsername ?? currentUser?.username,
            userProfileImage: currentUser?.profileImage,
            poll: syncedData,
          };
          if (onPostCreated) onPostCreated(augmentedPoll);
          window.dispatchEvent(
            new CustomEvent("postCreated", {
              detail: { post: augmentedPoll, communityId },
            })
          );
        },
        onError: (err: any) => {
          setApiError(err.message ?? "Failed to create poll. Please try again.");
          setLoading(false);
        }
      });

      setSubmitted(true);
      setTimeout(() => onClose(), 1500);
    } catch (e: unknown) {
      const isNet = e instanceof TypeError && (e as TypeError).message?.toLowerCase().includes("fetch");
      setApiError(isNet ? "Server unreachable — please check your connection." : "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const applyPollFormatting = (formatType: "bold" | "italic" | "mono") => {
    const field = activeField || { type: "question" };
    let element: HTMLTextAreaElement | HTMLInputElement | null = null;
    let currentText = "";

    if (field.type === "question") {
      element = textareaRef.current;
      currentText = pollQuestion;
    } else if (field.type === "option" && typeof field.index === "number") {
      element = document.getElementById(`poll-opt-input-${field.index}`) as HTMLInputElement;
      currentText = options[field.index] || "";
    }

    if (!element) return;

    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    const selectedText = currentText.substring(start, end);

    if (!selectedText) return;

    interface DecodedChar {
      char: string;
      bold: boolean;
      italic: boolean;
      mono: boolean;
    }

    const decodeChar = (codePoint: number): DecodedChar => {
      // Bold Italic
      if (codePoint >= 0x1d468 && codePoint <= 0x1d481) return { char: String.fromCharCode(codePoint - 0x1d468 + 65), bold: true, italic: true, mono: false };
      if (codePoint >= 0x1d482 && codePoint <= 0x1d49b) return { char: String.fromCharCode(codePoint - 0x1d482 + 97), bold: true, italic: true, mono: false };

      // Bold
      if (codePoint >= 0x1d400 && codePoint <= 0x1d419) return { char: String.fromCharCode(codePoint - 0x1d400 + 65), bold: true, italic: false, mono: false };
      if (codePoint >= 0x1d41a && codePoint <= 0x1d433) return { char: String.fromCharCode(codePoint - 0x1d41a + 97), bold: true, italic: false, mono: false };
      if (codePoint >= 0x1d7ce && codePoint <= 0x1d7d7) return { char: String.fromCharCode(codePoint - 0x1d7ce + 48), bold: true, italic: false, mono: false };

      // Italic
      if (codePoint >= 0x1d434 && codePoint <= 0x1d44d) return { char: String.fromCharCode(codePoint - 0x1d434 + 65), bold: false, italic: true, mono: false };
      if (codePoint >= 0x1d44e && codePoint <= 0x1d467) return { char: String.fromCharCode(codePoint - 0x1d44e + 97), bold: false, italic: true, mono: false };
      if (codePoint === 0x210e) return { char: "h", bold: false, italic: true, mono: false };

      // Monospace
      if (codePoint >= 0x1d670 && codePoint <= 0x1d689) return { char: String.fromCharCode(codePoint - 0x1d670 + 65), bold: false, italic: false, mono: true };
      if (codePoint >= 0x1d68a && codePoint <= 0x1d6a3) return { char: String.fromCharCode(codePoint - 0x1d68a + 97), bold: false, italic: false, mono: true };
      if (codePoint >= 0x1d7f6 && codePoint <= 0x1d7ff) return { char: String.fromCharCode(codePoint - 0x1d7f6 + 48), bold: false, italic: false, mono: true };

      // Normal
      return { char: String.fromCodePoint(codePoint), bold: false, italic: false, mono: false };
    };

    const encodeChar = (char: string, bold: boolean, italic: boolean, mono: boolean): string => {
      const code = char.charCodeAt(0);
      
      if (mono) {
        if (code >= 65 && code <= 90) return String.fromCodePoint(code - 65 + 0x1d670);
        if (code >= 97 && code <= 122) return String.fromCodePoint(code - 97 + 0x1d68a);
        if (code >= 48 && code <= 57) return String.fromCodePoint(code - 48 + 0x1d7f6);
        return char;
      }

      if (bold && italic) {
        if (code >= 65 && code <= 90) return String.fromCodePoint(code - 65 + 0x1d468);
        if (code >= 97 && code <= 122) return String.fromCodePoint(code - 97 + 0x1d482);
        if (code >= 48 && code <= 57) return String.fromCodePoint(code - 48 + 0x1d7ce);
        return char;
      }

      if (bold) {
        if (code >= 65 && code <= 90) return String.fromCodePoint(code - 65 + 0x1d400);
        if (code >= 97 && code <= 122) return String.fromCodePoint(code - 97 + 0x1d41a);
        if (code >= 48 && code <= 57) return String.fromCodePoint(code - 48 + 0x1d7ce);
        return char;
      }

      if (italic) {
        if (code >= 65 && code <= 90) return String.fromCodePoint(code - 65 + 0x1d434);
        if (code === 104) return 'ℎ';
        if (code >= 97 && code <= 122) return String.fromCodePoint(code - 97 + 0x1d44e);
        return char;
      }

      return char;
    };

    const decoded = Array.from(selectedText).map(char => {
      const cp = char.codePointAt(0) || 0;
      return decodeChar(cp);
    });

    const canApplyBold = decoded.some(c => /[A-Za-z0-9]/.test(c.char) && !c.bold);
    const canApplyItalic = decoded.some(c => /[A-Za-z]/.test(c.char) && !c.italic);
    const canApplyMono = decoded.some(c => /[A-Za-z0-9]/.test(c.char) && !c.mono);

    let formatted = "";

    if (formatType === "bold") {
      const turnOn = canApplyBold;
      formatted = decoded.map(c => {
        if (/[A-Za-z0-9]/.test(c.char)) {
          return encodeChar(c.char, turnOn, c.italic, false);
        }
        return c.char;
      }).join('');
    } else if (formatType === "italic") {
      const turnOn = canApplyItalic;
      formatted = decoded.map(c => {
        if (/[A-Za-z]/.test(c.char)) {
          return encodeChar(c.char, c.bold, turnOn, false);
        }
        return c.char;
      }).join('');
    } else if (formatType === "mono") {
      const turnOn = canApplyMono;
      formatted = decoded.map(c => {
        if (/[A-Za-z0-9]/.test(c.char)) {
          return encodeChar(c.char, false, false, turnOn);
        }
        return c.char;
      }).join('');
    }

    const newText = currentText.substring(0, start) + formatted + currentText.substring(end);

    if (field.type === "question") {
      setPollQuestion(newText);
    } else if (field.type === "option" && typeof field.index === "number") {
      updateOption(field.index, newText);
    }

    setTimeout(() => {
      element?.focus();
      element?.setSelectionRange(start, start + formatted.length);
    }, 50);
  };

  const insertHashtag = () => {
    const field = activeField || { type: "question" };
    let element: HTMLTextAreaElement | HTMLInputElement | null = null;
    let currentText = "";

    if (field.type === "question") {
      element = textareaRef.current;
      currentText = pollQuestion;
    } else if (field.type === "option" && typeof field.index === "number") {
      element = document.getElementById(`poll-opt-input-${field.index}`) as HTMLInputElement;
      currentText = options[field.index] || "";
    }

    if (!element) return;
    const start = element.selectionStart ?? 0;
    const newText = currentText.substring(0, start) + "#" + currentText.substring(start);

    if (field.type === "question") {
      setPollQuestion(newText);
    } else if (field.type === "option" && typeof field.index === "number") {
      updateOption(field.index, newText);
    }

    setTimeout(() => {
      element?.focus();
      element?.setSelectionRange(start + 1, start + 1);
    }, 50);
  };

  const insertAtSign = () => {
    const field = activeField || { type: "question" };
    let element: HTMLTextAreaElement | HTMLInputElement | null = null;
    let currentText = "";

    if (field.type === "question") {
      element = textareaRef.current;
      currentText = pollQuestion;
    } else if (field.type === "option" && typeof field.index === "number") {
      element = document.getElementById(`poll-opt-input-${field.index}`) as HTMLInputElement;
      currentText = options[field.index] || "";
    }

    if (!element) return;
    const start = element.selectionStart ?? 0;
    const newText = currentText.substring(0, start) + "@" + currentText.substring(start);

    if (field.type === "question") {
      setPollQuestion(newText);
    } else if (field.type === "option" && typeof field.index === "number") {
      updateOption(field.index, newText);
    }

    setTimeout(() => {
      element?.focus();
      element?.setSelectionRange(start + 1, start + 1);
    }, 50);
  };

  const insertEmoji = (emoji: string) => {
    const field = activeField || { type: "question" };
    let element: HTMLTextAreaElement | HTMLInputElement | null = null;
    let currentText = "";

    if (field.type === "question") {
      element = textareaRef.current;
      currentText = pollQuestion;
    } else if (field.type === "option" && typeof field.index === "number") {
      element = document.getElementById(`poll-opt-input-${field.index}`) as HTMLInputElement;
      currentText = options[field.index] || "";
    }

    if (!element) return;
    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    const newText = currentText.substring(0, start) + emoji + currentText.substring(end);

    if (field.type === "question") {
      setPollQuestion(newText);
    } else if (field.type === "option" && typeof field.index === "number") {
      updateOption(field.index, newText);
    }

    setShowEmojiPicker(false);
    setTimeout(() => {
      element?.focus();
      element?.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 50);
  };

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
          onClick={() => { setSubmitted(false); setPollQuestion(""); setOptions(["", ""]); setApiError(null); setFiles([]); }}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-3">
          <div className="relative group">
        <textarea
          ref={textareaRef}
          className={`textarea textarea-bordered w-full min-h-[90px] bg-base-100/50 border-base-content/10 focus:border-[#1D4ED8] focus:outline-none focus:bg-base-100 transition-all duration-200 resize-none text-sm font-medium ${errors.pollQuestion ? "border-red-500/50" : ""}`}
          placeholder="Ask your poll question..."
          value={pollQuestion}
          onChange={(e) => setPollQuestion(e.target.value)}
          onFocus={() => setActiveField({ type: "question" })}
        />
      </div>

      {/* Rich formatting toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-base-200/20 border border-base-content/10 rounded-2xl mt-1 mb-2 select-none flex-wrap transition-all duration-200">
        <button 
          type="button"
          onClick={() => applyPollFormatting("bold")}
          title="Bold"
          className="btn btn-ghost btn-xs btn-square hover:scale-105 text-base-content/70 cursor-pointer transition-all duration-150 font-black hover:text-[#1D4ED8] hover:bg-[#1D4ED8]/5 dark:hover:text-blue-400"
        >
          <RiBold size={14} />
        </button>
        <button 
          type="button"
          onClick={() => applyPollFormatting("italic")}
          title="Italic"
          className="btn btn-ghost btn-xs btn-square hover:scale-105 text-base-content/70 cursor-pointer transition-all duration-150 italic font-black hover:text-[#1D4ED8] hover:bg-[#1D4ED8]/5 dark:hover:text-blue-400"
        >
          <RiItalic size={14} />
        </button>
        <button 
          type="button"
          onClick={() => applyPollFormatting("mono")}
          title="Monospace"
          className="btn btn-ghost btn-xs btn-square hover:scale-105 text-base-content/70 cursor-pointer transition-all duration-150 font-bold hover:text-[#1D4ED8] hover:bg-[#1D4ED8]/5 dark:hover:text-blue-400"
        >
          <RiCodeLine size={14} />
        </button>
        
        <div className="w-[1px] h-4 bg-base-content/10 mx-1" />

        <button 
          type="button"
          onClick={insertHashtag}
          title="Add Hashtag"
          className="btn btn-ghost btn-xs btn-square hover:scale-105 text-base-content/70 cursor-pointer transition-all duration-150 hover:text-[#1D4ED8] hover:bg-[#1D4ED8]/5 dark:hover:text-blue-400"
        >
          <RiHashtag size={14} />
        </button>

        <button 
          type="button"
          onClick={insertAtSign}
          title="Mention User"
          className="btn btn-ghost btn-xs btn-square hover:scale-105 text-base-content/70 cursor-pointer transition-all duration-150 hover:text-[#1D4ED8] hover:bg-[#1D4ED8]/5 dark:hover:text-blue-400"
        >
          <RiAtLine size={14} />
        </button>

        <div className="relative">
          <button 
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Insert Emoji"
            className={`btn btn-ghost btn-xs btn-square text-base-content/70 hover:scale-105 cursor-pointer transition-all duration-150 ${
              showEmojiPicker 
                ? "text-[#1D4ED8] bg-primary/10 dark:text-blue-400 dark:bg-primary/20" 
                : "hover:text-[#1D4ED8] hover:bg-[#1D4ED8]/5 dark:hover:text-blue-400"
            }`}
          >
            <RiEmotionHappyLine size={14} />
          </button>
          {showEmojiPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
              <div className="absolute left-0 bottom-full mb-2 bg-base-100 border border-base-300 shadow-2xl rounded-2xl p-2.5 z-50 w-44">
                <div className="grid grid-cols-5 gap-1.5 justify-items-center">
                  {["😊", "👍", "🔥", "🙌", "💡", "⚠️", "📌", "📢", "👏", "❤️"].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="transition-all duration-150 text-lg p-1 rounded-lg cursor-pointer w-7 h-7 flex items-center justify-center hover:scale-110 hover:bg-primary/10 dark:hover:bg-[#1D4ED8]/20"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Poll Character Count Banner ── */}
      <div className="flex justify-between items-center text-[10px] px-1 text-base-content/40 -mt-1 font-bold uppercase tracking-tight">
        <span>Requirement: Max 500 chars</span>
        <span className={pollQuestion.length > 500 ? "text-red-500 font-black" : ""}>
          {pollQuestion.length}/500
        </span>
      </div>

      <div className="space-y-2.5 animate-in fade-in duration-300">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-3 group/opt animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex-1 relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-base-content/30 uppercase tracking-widest hidden sm:block">
                Choice {i + 1}
              </span>
              <input
                id={`poll-opt-input-${i}`}
                type="text"
                className={`input input-bordered w-full h-[42px] transition-all duration-200 focus:border-[#1D4ED8] focus:outline-none bg-base-100/50 sm:pl-20 ${errors[`opt${i}`] ? "border-red-500/50" : "border-base-content/5"}`}
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                onFocus={() => setActiveField({ type: "option", index: i })}
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
        </div>

        <div className="flex flex-col justify-start space-y-3">
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

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1 text-base-content/70">
              <RiAttachment2 size={12} /> Attach Media <span className="text-base-content/40 font-bold tracking-tighter ml-1 uppercase">(optional)</span>
            </p>
            <MediaUploadZone accent="blue" files={files} onChange={setFiles} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-base-content/5 gap-2">
        <button onClick={onClose} className="btn btn-sm btn-ghost rounded-xl px-4 animate-all" disabled={loading}>Cancel</button>
        <button
          className="btn btn-sm bg-[#1D4ED8] text-white min-w-[120px] rounded-xl font-bold shadow-lg shadow-[#1D4ED8]/20 hover:bg-[#1D4ED8]/90 h-10 border-none animate-all"
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

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            style={{ maxHeight: 'calc(100vh - 120px)' }}
            className="w-full max-w-sm sm:max-w-xl md:max-w-3xl rounded-3xl bg-base-100 border border-base-300 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden"
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
    </AnimatePresence>,
    document.body
  );
};

export default CreatePost;