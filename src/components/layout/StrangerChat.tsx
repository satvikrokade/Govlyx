// src/components/layout/StrangerChat.tsx
import { useEffect, useRef, useState, useCallback, useMemo, type KeyboardEvent } from "react";
import { Dices, Zap, Search, AlertTriangle, Plus, Image as ImageIcon, Video, X, Eye, EyeOff, Send, Trash2, LogOut, ChevronLeft, ChevronRight, Copy, Check, MoreVertical } from "lucide-react";
import { showToast } from "../../utils/toast";
import { FiSmile } from "react-icons/fi";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useChat } from "../../hooks/useChat";
import { sendMedia } from "../../api/chatApi.service";
import { API_BASE_URL } from "../../api/axiosConfig";
import type { ChatMessageDto, ChatStatus, MessageType } from "../../types/Chat.types";
import { OPENMOJI_STICKERS } from "../../utils/stickers";

// ── Icons & Config ──────────────────────────────────────────────────────────

const IconShield = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconReply = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
);

const DOT_CLASS: Record<ChatStatus, string> = {
  IDLE: "bg-base-content/20",
  SEARCHING: "bg-warning animate-pulse",
  CONNECTED: "bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]",
  PARTNER_LEFT: "bg-error",
  ERROR: "bg-error",
};

const STATUS_LABEL: Record<ChatStatus, string> = {
  IDLE: "Ready",
  SEARCHING: "Finding Match",
  CONNECTED: "Connected",
  PARTNER_LEFT: "Stranger Left",
  ERROR: "Error",
};

interface ReplyTo {
  messageId: string;
  senderId: string;
  content?: string;
  messageType: MessageType;
}

interface MediaPreview {
  file: File;
  url: string;
  type: "IMAGE" | "VIDEO";
  viewOnce: boolean;
}

// ── Image Compression Utility ────────────────────────────────────────────────
async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        // Returns base64
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// ── Data URL → Blob Utility ──────────────────────────────────────────────────
function dataURLtoBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ── Global Media Cache Helper ────────────────────────────────────────────────
export function getCachedMediaUrl(uuid: string): string {
  if (!uuid) return "";
  if (uuid.startsWith("data:") || uuid.startsWith("blob:") || uuid.startsWith("http")) {
    return uuid;
  }
  const globalCache = (window as any).__mediaCache;
  return globalCache?.get(uuid) || "";
}

// ── Safe Image Component with Authenticated Blob Fetching ────────────────────
export function SafeImage({
  mediaPayload,
  sessionId,
  className,
  onClick,
  isSticker,
  ...props
}: {
  mediaPayload?: string;
  sessionId: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  isSticker?: boolean;
  [key: string]: any;
}) {
  const [url, setUrl] = useState<string>("");
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!mediaPayload) return;
    if (mediaPayload.startsWith("data:") || mediaPayload.startsWith("blob:") || mediaPayload.startsWith("http") || mediaPayload.startsWith("/")) {
      setUrl(mediaPayload);
      return;
    }

    const globalCache = (window as any).__mediaCache || new Map();
    (window as any).__mediaCache = globalCache;

    if (globalCache.has(mediaPayload)) {
      setUrl(globalCache.get(mediaPayload));
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);

    const token = localStorage.getItem("authToken") || 
                  localStorage.getItem("token") || 
                  localStorage.getItem("jwt") || 
                  localStorage.getItem("access_token");
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${API_BASE_URL}/api/chat/${sessionId}/media/${mediaPayload}`, { headers })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        let blob = await res.blob();
        if (isSticker) {
          blob = new Blob([blob], { type: "image/svg+xml" });
        }
        if (!active) return;
        const objectUrl = URL.createObjectURL(blob);
        globalCache.set(mediaPayload, objectUrl);
        setUrl(objectUrl);
      })
      .catch((err) => {
        console.error("Failed to load image", err);
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mediaPayload, sessionId, isSticker]);

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-base-300 animate-pulse min-h-[150px]`}>
        <span className="loading loading-spinner loading-sm opacity-50" />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-base-300 text-error min-h-[150px] p-4 text-center`}>
        <AlertTriangle size={20} className="mb-1" />
        <span className="text-[10px] font-bold">Failed to load</span>
      </div>
    );
  }

  return <img src={url} className={className} onClick={onClick} {...props} />;
}

// ── Safe Video Component with Authenticated Blob Fetching ────────────────────
export function SafeVideo({
  mediaPayload,
  sessionId,
  className,
  ...props
}: {
  mediaPayload?: string;
  sessionId: string;
  className?: string;
  [key: string]: any;
}) {
  const [url, setUrl] = useState<string>("");
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!mediaPayload) return;
    if (mediaPayload.startsWith("data:") || mediaPayload.startsWith("blob:") || mediaPayload.startsWith("http")) {
      setUrl(mediaPayload);
      return;
    }

    const globalCache = (window as any).__mediaCache || new Map();
    (window as any).__mediaCache = globalCache;

    if (globalCache.has(mediaPayload)) {
      setUrl(globalCache.get(mediaPayload));
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);

    const token = localStorage.getItem("authToken") || 
                  localStorage.getItem("token") || 
                  localStorage.getItem("jwt") || 
                  localStorage.getItem("access_token");
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${API_BASE_URL}/api/chat/${sessionId}/media/${mediaPayload}`, { headers })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        const blob = await res.blob();
        if (!active) return;
        const objectUrl = URL.createObjectURL(blob);
        globalCache.set(mediaPayload, objectUrl);
        setUrl(objectUrl);
      })
      .catch((err) => {
        console.error("Failed to load video", err);
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mediaPayload, sessionId]);

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-base-300 animate-pulse min-h-[150px]`}>
        <span className="loading loading-spinner loading-sm opacity-50" />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-base-300 text-error min-h-[150px] p-4 text-center`}>
        <AlertTriangle size={20} className="mb-1" />
        <span className="text-[10px] font-bold">Failed to load</span>
      </div>
    );
  }

  return <video src={url} className={className} {...props} />;
}

// ── Private Media self-destruct overlay ───────────────────────────────────────
function PrivateMediaViewer({
  msg,
  sessionId,
  onClose,
  deleteMedia
}: {
  msg: ChatMessageDto;
  sessionId: string;
  onClose: () => void;
  deleteMedia: (id: string) => Promise<void>;
}) {
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const totalSeconds = msg.viewTimer ?? 10;
  const [timeLeft, setTimeLeft] = useState<number>(totalSeconds);
  const timerStartedRef = useRef<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deletedRef = useRef<boolean>(false);

  const triggerWipe = useCallback(async () => {
    if (deletedRef.current) return;
    deletedRef.current = true;
    try {
      await deleteMedia(msg.messageId);
    } catch (e) {
      console.error("Failed to wipe view-once media", e);
    }
  }, [deleteMedia, msg.messageId]);

  // Fetch media on mount
  useEffect(() => {
    let active = true;
    const uuid = msg.mediaPayload;
    if (!uuid) {
      setError("No media content found");
      setLoading(false);
      return;
    }

    if (uuid.startsWith("data:") || uuid.startsWith("blob:") || uuid.startsWith("http")) {
      setUrl(uuid);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("authToken") || 
                  localStorage.getItem("token") || 
                  localStorage.getItem("jwt") || 
                  localStorage.getItem("access_token");
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${API_BASE_URL}/api/chat/${sessionId}/media/${uuid}`, { headers })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load secure media");
        const blob = await res.blob();
        if (!active) return;
        const objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((err) => {
        console.error("Private media fetch failed", err);
        if (active) setError("Could not load private media");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [msg.mediaPayload, sessionId]);

  // Start the countdown timer when URL is loaded
  useEffect(() => {
    if (!url || loading || error || timerStartedRef.current) return;
    timerStartedRef.current = true;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          triggerWipe().then(() => onClose());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [url, loading, error, triggerWipe, onClose]);

  const handleClose = () => {
    triggerWipe().then(() => onClose());
  };

  const preventDefault = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  return (
    <div 
      className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 md:p-8 select-none"
      onContextMenu={preventDefault}
    >
      {/* Top Header: Timer and Close Button */}
      <div className="absolute top-10 inset-x-6 z-[160] flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl pointer-events-auto">
          {/* Circular Countdown Progress */}
          <div className="relative w-6 h-6 flex items-center justify-center font-black text-xs text-white">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle 
                cx="12" cy="12" r="10" 
                className="stroke-white/20 fill-none" 
                strokeWidth="2" 
              />
              <circle 
                cx="12" cy="12" r="10" 
                className="stroke-[#1D4ED8] fill-none transition-all duration-1000 ease-linear" 
                strokeWidth="2" 
                strokeDasharray="62.8"
                strokeDashoffset={62.8 - (62.8 * timeLeft) / totalSeconds}
              />
            </svg>
            <span className="relative z-10">{timeLeft}</span>
          </div>
          <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Viewing Private Media</span>
        </div>
        
        <button 
          onClick={handleClose}
          className="text-white p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md shadow-2xl border border-white/10 transition-all pointer-events-auto"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Container */}
      <div className="w-full h-full flex items-center justify-center relative touch-pan-x p-4 py-20 pb-24 md:p-12">
        {loading && (
          <div className="flex flex-col items-center gap-4 text-white/50">
            <span className="loading loading-spinner loading-lg text-[#1D4ED8]" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Decrypting Media...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 text-error max-w-sm text-center">
            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center shadow-inner border border-error/10"><AlertTriangle size={32} /></div>
            <div>
              <p className="text-lg font-black text-white">Wiped or Missing</p>
              <p className="text-xs text-white/40 mt-1">{error}</p>
            </div>
            <button onClick={handleClose} className="btn btn-sm btn-error px-6 rounded-xl mt-2 font-bold">Close</button>
          </div>
        )}

        {!loading && !error && url && (
          <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
            {msg.messageType === "IMAGE" ? (
              <img 
                src={url} 
                className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl border border-white/5 select-none" 
                onDragStart={preventDefault}
                alt="Secure media"
              />
            ) : (
              <video 
                src={url} 
                autoPlay 
                playsInline
                className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl bg-black/50 border border-white/5" 
              />
            )}
          </div>
        )}
      </div>
      
      {/* Anti-screenshot hint */}
      <div className="absolute bottom-8 text-center pointer-events-none">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Self-Destruct Active</p>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function StrangerChat({ onClose, standalone }: { onClose?: () => void; standalone?: boolean }) {
  const chat = useChat();
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showStickerMenu, setShowStickerMenu] = useState(false);
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  const [fullscreenMedia, setFullscreenMedia] = useState<{ items: { url: string, type: MessageType }[], index: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Custom states for view once media options and security overlay
  const [selectedTimer, setSelectedTimer] = useState<3 | 10 | 30>(10);
  const [privateMedia, setPrivateMedia] = useState<ChatMessageDto | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chat.status === "CONNECTED") {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [chat.status]);

  useEffect(() => {
    if (chat.status !== "CONNECTED") {
      setReplyTo(null);
      setMediaPreviews([]);
      setShowAttachMenu(false);
    }
  }, [chat.status]);

  // Auto-resize textarea height as user types
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [draft]);

  const handleSend = () => {
    if (!draft.trim()) return;
    chat.sendMessage(draft, replyTo?.messageId);
    setDraft("");
    setReplyTo(null);
  };

  const handleFileSelect = (type: "IMAGE" | "VIDEO") => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === "IMAGE" ? "image/*" : "video/*";
      fileInputRef.current.multiple = true;
      fileInputRef.current.click();
    }
    setShowAttachMenu(false);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const newPreviews: MediaPreview[] = [];
      for (const file of files) {
        let url: string;
        let type: "IMAGE" | "VIDEO" = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";

        if (type === "IMAGE") {
          // Compress and get base64 immediately for preview + faster send
          const compressedBase64 = await compressImage(file);
          url = compressedBase64;
        } else {
          url = URL.createObjectURL(file);
        }

        newPreviews.push({
          file,
          url,
          type,
          viewOnce: false
        });
      }
      setMediaPreviews(prev => [...prev, ...newPreviews]);
    } catch (err) {
      console.error("File processing failed", err);
      showToast.error("File processing failed. Please try a different file.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSendMedia = async () => {
    if (mediaPreviews.length === 0 || !chat.session) return;
    setIsUploading(true);
    try {
      for (const preview of mediaPreviews) {
        let blob: Blob;
        if (preview.type === "IMAGE") {
          // preview.url is a compressed base64 data-URI — convert to Blob
          blob = dataURLtoBlob(preview.url);
        } else {
          // VIDEO: use the original File directly as a Blob
          blob = preview.file;
        }

        const res = await sendMedia(chat.session.sessionId, {
          type: preview.type,
          file: blob,                     // ← CORRECT: sendMedia expects a Blob
          mimeType: preview.type === "IMAGE" ? "image/jpeg" : preview.file.type,
          mediaName: preview.file.name,
          viewOnce: preview.viewOnce,
          viewTimer: preview.viewOnce ? selectedTimer : undefined,
          replyToId: replyTo?.messageId
        });

        // Pre-seed sender's local URL in the global media cache for instant rendering
        if (res?.data?.messageId) {
          const fileId = res.data.messageId;
          const globalCache = (window as any).__mediaCache || new Map();
          (window as any).__mediaCache = globalCache;
          globalCache.set(fileId, preview.url);
        }
      }
      setMediaPreviews([]);
      setReplyTo(null);
    } catch (err) {
      console.error("Failed to send media", err);
      showToast.error("Failed to send media. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendSticker = async (stickerUrl: string) => {
    if (!chat.session) return;
    try {
      const response = await fetch(stickerUrl);
      const blob = await response.blob();

      const res = await sendMedia(chat.session.sessionId, {
        type: "STICKER",
        file: blob,                             // ← CORRECT: Blob directly
        mimeType: blob.type || "image/png",     // ← Safe fallback
        mediaName: "sticker",
        viewOnce: false,
        replyToId: replyTo?.messageId
      });

      // Pre-seed local sticker URL in cache for instant rendering
      if (res?.data?.messageId) {
        const fileId = res.data.messageId;
        const globalCache = (window as any).__mediaCache || new Map();
        (window as any).__mediaCache = globalCache;
        globalCache.set(fileId, stickerUrl);
      }

      setShowStickerMenu(false);
      setReplyTo(null);
    } catch (err) {
      console.error("Failed to send sticker", err);
      showToast.error("Failed to send sticker.");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setReplyTo(null);
      setMediaPreviews([]);
      setShowAttachMenu(false);
      setShowStickerMenu(false);
    }
  };

  const handleNext = useCallback(async () => {
    await chat.leaveSession();
    chat.startSearch();
  }, [chat]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && chat.status !== "CONNECTED" && onClose) onClose();
  };

  const containerBase = standalone
    ? "flex flex-col w-full h-full bg-base-200/50 backdrop-blur-2xl relative overflow-hidden"
    : "flex flex-col w-full md:max-w-2xl h-full md:h-[90vh] md:rounded-3xl overflow-hidden bg-base-200 shadow-2xl backdrop-blur-xl relative border border-base-300";

  const renderContent = () => (
    <div className={containerBase}>
      {/* ── Background Glows (Subtle and Theme-adaptive) ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1D4ED8]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] pointer-events-none" />

      {/* ── Header Area (Persistent & Sticky) ── */}
      {!standalone && (
        <div className="shrink-0 z-20 pt-[env(safe-area-inset-top,0px)]">
          <header className="flex items-center justify-between gap-3 px-4 md:px-6 pb-2 bg-base-300/90 backdrop-blur-xl border-b border-base-300 pt-3 md:pt-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1D4ED8] text-white shadow-lg shadow-[#1D4ED8]/20">
                <Dices size={16} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-[13px] font-black text-base-content uppercase tracking-tight leading-none">Stranger Chat</h1>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${DOT_CLASS[chat.status]}`} />
                  <span className="text-[8px] text-base-content/40 uppercase tracking-widest font-black">
                    {STATUS_LABEL[chat.status]}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onClose && (
                <button onClick={onClose} className="btn btn-ghost btn-sm btn-square opacity-60 hover:opacity-100">
                  <X size={20} />
                </button>
              )}
            </div>
          </header>

          {/* ── Persistent Info Banner ── */}
          {(chat.status === "CONNECTED" || chat.status === "PARTNER_LEFT") && (
            <div className="px-4 py-2 bg-base-200/50 backdrop-blur-md border-b border-base-content/5 flex items-center justify-center">
              <div className="flex items-center gap-2 text-base-content/30 font-black uppercase tracking-[0.2em] text-[8px]">
                <IconShield />
                <span>Identity Masked & Encrypted</span>
              </div>
            </div>
          )}
        </div>
      )}

            {/* ── Body: grows and shrinks dynamically ── */}
      <div className="flex-1 min-h-0 flex flex-col z-10">
        <AnimatePresence mode="wait">
          {chat.status === "IDLE" && (
            <motion.div key="idle" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="flex-1 min-h-0">
              <IdleScreen onStart={chat.startSearch} />
            </motion.div>
          )}
          {chat.status === "SEARCHING" && (
            <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-h-0">
              <SearchingScreen queueSize={chat.queueSize} onCancel={chat.cancelSearch} />
            </motion.div>
          )}
          {(chat.status === "CONNECTED" || chat.status === "PARTNER_LEFT") && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-h-0 flex flex-col">
              <MessageArea
                messages={chat.messages ?? []}
                myId={chat.session?.yourAnonymousId ?? ""}
                partnerTyping={chat.partnerTyping}
                onReply={(msg) => setReplyTo({ messageId: msg.messageId, senderId: msg.senderId, content: msg.content, messageType: msg.messageType })}
                onMediaClick={(items, index) => setFullscreenMedia({ items, index })}
                onUnlockPrivateMedia={(msg) => setPrivateMedia(msg)}
                sessionId={chat.session?.sessionId ?? ""}
              />
            </motion.div>
          )}
          {chat.status === "ERROR" && (
            <motion.div key="error" className="flex-1 min-h-0">
              <ErrorScreen error={chat.error} onRetry={chat.startSearch} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer: flex flow at bottom, matches layout dynamically ── */}
      {(chat.status === "CONNECTED" || chat.status === "PARTNER_LEFT") && (
        <footer className="relative z-30 p-2 md:p-3 pb-[max(env(safe-area-inset-bottom,0px),20px)] bg-base-200/95 backdrop-blur-xl border-t border-base-content/5 shrink-0 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-[1000px] mx-auto">
            <AnimatePresence>
              {replyTo && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mb-2 px-3 py-2 rounded-xl bg-base-300/50 backdrop-blur-xl border border-base-content/10 flex items-center gap-3">
                  <div className="w-1 rounded-full bg-[#1D4ED8] h-6 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-[#1D4ED8] font-black uppercase tracking-wider mb-0.5">
                      Replying to {replyTo.senderId === chat.session?.yourAnonymousId ? "yourself" : "stranger"}
                    </p>
                    <p className="text-xs text-base-content/60 truncate font-medium">
                      {replyTo.messageType === "TEXT" ? replyTo.content : `[${replyTo.messageType}]`}
                    </p>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="btn btn-ghost btn-xs btn-square">
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {chat.status === "CONNECTED" ? (
              <div className="flex flex-col gap-2 relative z-50">
                <div className="flex items-end gap-2 w-full px-1 md:px-0">
                  {/* WhatsApp style chat bar */}
                  <div className="flex-1 min-w-0 flex items-end bg-base-100 rounded-2xl min-h-[38px] shadow-sm border border-base-content/10 px-0.5 py-0.5 relative">
                    <button onClick={() => { setShowStickerMenu(!showStickerMenu); setShowAttachMenu(false); }} className={`btn btn-ghost btn-circle btn-xs shrink-0 mb-[1px] ml-0.5 transition-colors ${showStickerMenu ? "text-[#1D4ED8]" : "text-base-content/50 hover:text-base-content"}`}>
                      <FiSmile size={18} />
                    </button>

                    <AnimatePresence>
                      {showStickerMenu && (
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="absolute bottom-full left-0 mb-4 w-72 h-80 bg-base-200 border border-base-content/10 shadow-2xl rounded-2xl p-3 z-50 flex flex-col">
                          <p className="text-xs font-bold text-base-content/50 mb-2 uppercase tracking-widest px-1 shrink-0">Stickers</p>
                          <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-4 gap-2 pr-1">
                            {OPENMOJI_STICKERS.map((url, i) => (
                              <button key={i} onClick={() => handleSendSticker(url)} className="p-2 hover:bg-base-300 rounded-lg transition-colors aspect-square flex items-center justify-center">
                                <img src={url} alt="Sticker" loading="lazy" className="w-full h-full object-contain drop-shadow-sm hover:scale-110 transition-transform" />
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={draft}
                      onChange={(e) => { setDraft(e.target.value); chat.notifyTyping(); }}
                      onKeyDown={handleKeyDown}
                      placeholder="Message"
                      className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-base-content placeholder-base-content/40 resize-none py-[7px] px-2 text-[16px] md:text-[13px] max-h-32 min-h-[18px] leading-tight shadow-none"
                    />

                    <div className="relative group/attach flex items-end shrink-0 mb-[1px] right-0.5">
                      <button onClick={() => { setShowAttachMenu(!showAttachMenu); setShowStickerMenu(false); }} className={`btn btn-ghost btn-circle btn-xs transition-transform duration-300 ${showAttachMenu ? "rotate-45 text-[#1D4ED8]" : "text-base-content/50 hover:text-base-content"}`}>
                        <Plus size={18} />
                      </button>
                      <AnimatePresence>
                        {showAttachMenu && (
                          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="absolute bottom-full right-0 mb-4 flex flex-col gap-1 min-w-[200px] p-2 rounded-2xl bg-base-200 border border-base-content/10 shadow-2xl z-50 origin-bottom-right">
                            <button onClick={() => handleFileSelect("IMAGE")} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-base-300 text-base-content transition-colors">
                              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><ImageIcon size={18} /></div>
                              <span className="text-sm font-semibold">Photo</span>
                            </button>
                            <button onClick={() => handleFileSelect("VIDEO")} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-base-300 text-base-content transition-colors">
                              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500"><Video size={18} /></div>
                              <span className="text-sm font-semibold">Video</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Primary Action Button (Send) */}
                  <div className="flex items-end h-full pb-0.5 shrink-0">
                    <button onClick={handleSend} disabled={!draft.trim()} className="btn bg-[#1D4ED8] hover:bg-[#1e40af] disabled:bg-base-content/10 disabled:text-base-content/30 disabled:shadow-none text-white btn-circle shrink-0 h-[36px] w-[36px] shadow-lg shadow-[#1D4ED8]/20 border-none transition-all duration-200 flex items-center justify-center">
                      <Send size={15} className="ml-0.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between px-1 md:px-2 mt-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={handleNext} className="flex items-center gap-1 text-base-content/40 hover:text-[#1D4ED8] transition-colors text-[9px] font-black uppercase tracking-widest leading-none group">
                      <Zap size={12} className="group-hover:fill-current" /> Next
                    </button>
                    <button onClick={() => chat.clearMessages()} className="flex items-center gap-1 text-base-content/40 hover:text-warning transition-colors text-[9px] font-black uppercase tracking-widest leading-none">
                      <Trash2 size={12} /> Clear
                    </button>
                    <button onClick={chat.leaveSession} className="flex items-center gap-1 text-base-content/40 hover:text-red-400 transition-colors text-[9px] font-black uppercase tracking-widest leading-none">
                      <LogOut size={12} /> Leave
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 select-none pt-0.5 opacity-0 pointer-events-none">
                    {/* Hidden spacer to keep left alignment intact */}
                    <IconShield />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 bg-base-300/30 p-5 rounded-2xl border border-base-content/5 backdrop-blur-md max-w-sm mx-auto">
                <p className="text-[10px] text-base-content/50 font-black uppercase tracking-[0.2em]">Stranger disconnected</p>
                <div className="flex gap-2 w-full">
                  <button onClick={chat.startSearch} className="btn btn-sm bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white flex-1 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#1D4ED8]/20 border-none">Find New</button>
                  <button onClick={onClose} className="btn btn-sm bg-base-content/5 border-none flex-1 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest">Exit</button>
                </div>
              </div>
            )}
          </div>
        </footer>
      )}

      {/* ── Media Preview Sheet ── */}
      <AnimatePresence>
        {mediaPreviews.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm" onClick={() => setMediaPreviews([])}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="absolute bottom-0 left-0 right-0 z-[130] bg-base-200 shadow-[0_-20px_60px_rgba(0,0,0,0.3)] rounded-t-[32px] flex flex-col h-[85vh] max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 px-6 relative shrink-0">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-base-content/10" />
                <button onClick={() => setMediaPreviews([])} className="btn btn-ghost btn-sm btn-circle text-base-content/50 hover:text-base-content"><X size={20} /></button>
                <h2 className="text-base-content font-bold text-sm tracking-wide">Preview Media ({mediaPreviews.length})</h2>
                <div className="w-8" />
              </div>
              <div className="flex-1 min-h-0 w-full bg-base-300/30 flex items-center justify-start py-6 px-4 md:px-8 relative overflow-x-auto gap-4 md:gap-5 snap-x custom-scrollbar">
                <div className="absolute inset-0 pattern-dots pattern-base-content pattern-bg-transparent pattern-opacity-5 pattern-size-4 pointer-events-none" />
                {mediaPreviews.map((preview, i) => (
                  <div key={i} className="relative z-10 w-[82vw] max-w-[340px] shrink-0 h-full max-h-[100%] flex items-center justify-center p-2 md:p-3 snap-center bg-base-100 rounded-[24px] shadow-sm border border-base-content/5">
                    {preview.type === "IMAGE" ? (
                      <img src={preview.url} alt="preview" className="max-w-full max-h-full object-contain drop-shadow-md rounded-[16px]" />
                    ) : (
                      <video src={preview.url} controls className="max-w-full max-h-full object-contain drop-shadow-md rounded-[16px] bg-black/5" />
                    )}
                    <button onClick={() => setMediaPreviews(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 md:-top-3 md:-right-2 btn btn-circle btn-sm shadow-xl bg-base-100 hover:bg-error hover:text-white border-base-content/10 text-base-content z-20"><X size={16} /></button>
                  </div>
                ))}
                <div className="w-[8vw] shrink-0" />
              </div>
              <div className="p-4 md:p-6 shrink-0 bg-base-100 flex flex-col gap-3 rounded-t-[32px] relative z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] border-t border-base-content/5">
                <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-base-200 border border-base-content/5 cursor-pointer" onClick={() => setMediaPreviews(prev => { const val = !prev.some(p => p.viewOnce); return prev.map(p => ({ ...p, viewOnce: val })); })}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-colors ${mediaPreviews.some(p => p.viewOnce) ? "bg-warning/20 text-warning" : "bg-base-content/5 text-base-content/40"}`}>
                      {mediaPreviews.some(p => p.viewOnce) ? <EyeOff size={16} /> : <Eye size={16} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-base-content mb-0.5">View Once</p>
                      <p className="text-[10px] text-base-content/50 font-medium">{mediaPreviews.some(p => p.viewOnce) ? "Media vanishes after opening" : "Standard permanent view"}</p>
                    </div>
                  </div>
                  <input type="checkbox" className="toggle toggle-primary toggle-sm scale-90" checked={mediaPreviews.some(p => p.viewOnce)} readOnly />
                </div>

                {/* View Once Timer Selection */}
                {mediaPreviews.some(p => p.viewOnce) && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-base-200 border border-base-content/5 rounded-2xl mt-1">
                    <span className="text-xs font-bold text-base-content/60">Choose View Duration</span>
                    <div className="flex gap-1.5">
                      {([3, 10, 30] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setSelectedTimer(t)}
                          className={`btn btn-xs rounded-lg font-black text-[10px] transition-all px-3 h-7 ${
                            selectedTimer === t
                              ? "bg-[#1D4ED8] text-white hover:bg-[#1e40af] border-none shadow-sm"
                              : "bg-base-300 text-base-content/60 hover:bg-base-300/80 border-none"
                          }`}
                        >
                          {t}s
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={handleSendMedia} disabled={isUploading} className="btn bg-[#1D4ED8] hover:bg-[#1e40af] disabled:bg-[#1D4ED8]/50 disabled:text-white/50 text-white w-full h-12 rounded-2xl font-bold text-[14px] shadow-lg shadow-[#1D4ED8]/20 border-none flex items-center justify-center gap-2">
                  {isUploading ? <span className="loading loading-spinner loading-sm" /> : <>Send to Stranger <Send size={16} /></>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fullscreenMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-2xl flex flex-col items-center justify-center p-0 md:p-8" onClick={() => setFullscreenMedia(null)}>
            {/* Header controls */}
            <div className="absolute top-6 inset-x-4 md:inset-x-8 z-[110] flex items-center justify-between pointer-events-none">
              <div className="pointer-events-auto">
                {fullscreenMedia.items.length > 1 && (
                  <span className="text-white text-sm font-bold bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md shadow-2xl border border-white/20">
                    {fullscreenMedia.index + 1} / {fullscreenMedia.items.length}
                  </span>
                )}
              </div>
              <button className="text-white p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md shadow-2xl border border-white/20 transition-all pointer-events-auto" onClick={(e) => { e.stopPropagation(); setFullscreenMedia(null); }}><X size={24} /></button>
            </div>

            {/* Main Media */}
            <div className="w-full h-full flex items-center justify-center relative touch-pan-x p-4 py-20 pb-24 md:p-12">
              {fullscreenMedia.items[fullscreenMedia.index].type === "IMAGE" || fullscreenMedia.items[fullscreenMedia.index].type === "STICKER" ? (
                <img src={fullscreenMedia.items[fullscreenMedia.index].url} className="max-w-full max-h-full object-contain rounded-[24px] shadow-2xl" onClick={e => e.stopPropagation()} />
              ) : (
                <video src={fullscreenMedia.items[fullscreenMedia.index].url} controls className="max-w-full max-h-full object-contain rounded-[24px] shadow-2xl bg-black/50" onClick={e => e.stopPropagation()} />
              )}
            </div>

            {/* Carousel Buttons */}
            {fullscreenMedia.index > 0 && (
              <button onClick={(e) => { e.stopPropagation(); setFullscreenMedia(prev => ({ ...prev!, index: prev!.index - 1 })) }} className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md shadow-2xl border border-white/20 transition-all z-[110]">
                <ChevronLeft size={32} />
              </button>
            )}

            {fullscreenMedia.index < fullscreenMedia.items.length - 1 && (
              <button onClick={(e) => { e.stopPropagation(); setFullscreenMedia(prev => ({ ...prev!, index: prev!.index + 1 })) }} className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md shadow-2xl border border-white/20 transition-all z-[110]">
                <ChevronRight size={32} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <input type="file" ref={fileInputRef} className="hidden" onChange={onFileChange} />

      {/* View once self-destruct security overlay */}
      <AnimatePresence>
        {privateMedia && chat.session && (
          <PrivateMediaViewer 
            msg={privateMedia} 
            sessionId={chat.session.sessionId} 
            onClose={() => setPrivateMedia(null)} 
            deleteMedia={chat.deleteMedia} 
          />
        )}
      </AnimatePresence>
    </div>
  );

  if (chat.restoring) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-base-100 gap-4">
        <span className="loading loading-spinner loading-lg text-[#1D4ED8]" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-base-content/30">Syncing Session</p>
      </div>
    );
  }

  return (
    <div className={standalone ? "w-full h-full flex flex-col flex-1 min-h-0 bg-base-100" : "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm md:p-4"} onClick={handleBackdrop}>
      {renderContent()}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function IdleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 md:p-8 text-center bg-transparent">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-16 h-16 md:w-20 md:h-20 rounded-[24px] md:rounded-[32px] bg-gradient-to-br from-[#1D4ED8]/10 to-[#1D4ED8]/5 flex items-center justify-center text-[#1D4ED8] mb-6 md:mb-8 shadow-inner border border-[#1D4ED8]/10 relative shrink-0">
        <div className="absolute inset-0 bg-[#1D4ED8]/20 blur-2xl rounded-full scale-50 opacity-50" />
        <Dices size={24} className="md:w-8 md:h-8 relative z-10" />
      </motion.div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <h3 className="text-2xl md:text-4xl font-black text-base-content tracking-tighter mb-4">Connect with Neighbors.</h3>
        <p className="text-sm text-base-content/40 max-w-[280px] mx-auto leading-relaxed font-semibold">
          Secure, anonymous, and ephemeral connections with local people in your area.
        </p>
      </motion.div>
      <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onStart} className="btn bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white w-full max-w-[280px] h-14 md:h-16 rounded-2xl md:rounded-[24px] font-black text-sm uppercase tracking-[0.2em] mt-8 md:mt-12 shadow-2xl shadow-[#1D4ED8]/20 border-none">
        Start Chatting
      </motion.button>
      <div className="flex items-center justify-center gap-2 mt-12 md:mt-16 text-base-content/20 text-[10px] uppercase font-black tracking-[0.3em]"><IconShield /> <span>Private Relay Active</span></div>
    </div>
  );
}

function SearchingScreen({ queueSize, onCancel }: { queueSize: number | null; onCancel: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
      <div className="relative">
        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-[-60px] rounded-full bg-[#1D4ED8]/20 blur-3xl" />
        <div className="w-24 h-24 rounded-full bg-base-300 border border-base-content/5 flex items-center justify-center relative z-10 shadow-2xl">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="text-[#1D4ED8]"><Search size={40} /></motion.div>
        </div>
      </div>
      <div className="mt-12 space-y-3">
        <h3 className="text-2xl font-black text-base-content tracking-tight">Finding a match...</h3>
        <p className="text-sm text-base-content/40 font-bold uppercase tracking-widest">{queueSize != null ? `${queueSize} people discoverying` : "Scanning network..."}</p>
      </div>
      <button onClick={onCancel} className="btn btn-ghost mt-16 px-10 h-12 rounded-xl text-base-content/40 hover:text-base-content font-black text-[10px] uppercase tracking-[0.3em]">Stop Search</button>
    </div>
  );
}

function ErrorScreen({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 p-8 text-center bg-transparent">
      <div className="w-20 h-20 rounded-[28px] bg-error/10 flex items-center justify-center text-error shadow-inner border border-error/10"><AlertTriangle size={40} /></div>
      <div>
        <h3 className="text-2xl font-black text-base-content mb-3 tracking-tight">Connection Lost</h3>
        <p className="text-sm text-base-content/40 max-w-[280px] mx-auto leading-relaxed">{error ?? "There was a problem with the chat relay."}</p>
      </div>
      <button onClick={onRetry} className="btn btn-error btn-outline h-14 px-12 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:shadow-xl hover:shadow-error/20 transition-all">Retry Link</button>
    </div>
  );
}

function MessageArea({ 
  messages, 
  myId, 
  partnerTyping, 
  onReply, 
  onMediaClick,
  onUnlockPrivateMedia,
  sessionId
}: { 
  messages: ChatMessageDto[]; 
  myId: string; 
  partnerTyping: boolean; 
  onReply: (r: { messageId: string; senderId: string; content?: string; messageType: MessageType }) => void; 
  onMediaClick: (items: { url: string, type: MessageType }[], index: number) => void;
  onUnlockPrivateMedia: (msg: ChatMessageDto) => void;
  sessionId: string;
}) {
  const [contextMenu, setContextMenu] = useState<{
    messageId: string;
    x: number;
    y: number;
    content?: string;
    senderId: string;
    messageType: MessageType;
  } | null>(null);
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messageAreaRef = useRef<HTMLDivElement>(null);
  const isFirstScrollRef = useRef(true);

  // Scroll to bottom when messages or typing status updates
  useEffect(() => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTo({
        top: messageAreaRef.current.scrollHeight,
        behavior: isFirstScrollRef.current ? "auto" : "smooth"
      });
      isFirstScrollRef.current = false;
    }
  }, [messages, partnerTyping]);

  // Scroll to bottom on resize (e.g. when mobile keyboard opens/closes)
  useEffect(() => {
    const container = messageAreaRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Close context menu on click outside or scroll
  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    window.addEventListener("click", handleClose);
    
    const container = messageAreaRef.current;
    container?.addEventListener("scroll", handleClose);
    
    return () => {
      window.removeEventListener("click", handleClose);
      container?.removeEventListener("scroll", handleClose);
    };
  }, []);

  const handleCopyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast.success("Text copied to clipboard!");
    } catch (e) {
      console.error("Failed to copy", e);
      showToast.error("Failed to copy text.");
    }
  };

  const handleOpenMenu = (pos: { clientX: number; clientY: number }, msg: ChatMessageDto) => {
    const rect = messageAreaRef.current?.getBoundingClientRect();
    if (rect) {
      const x = pos.clientX - rect.left;
      const y = pos.clientY - rect.top;
      setContextMenu({
        messageId: msg.messageId,
        x,
        y,
        content: msg.content,
        senderId: msg.senderId,
        messageType: msg.messageType
      });
    }
  };

  const hasUserMessages = useMemo(() => {
    return messages.some(
      (m) =>
        m.senderId !== "SYSTEM" &&
        m.messageType !== "USER_LEFT" &&
        m.messageType !== "SYSTEM"
    );
  }, [messages]);

  // Chunk consecutive media messages sent within 60s
  const groupedMessages = useMemo(() => {
    const groups: ChatMessageDto[][] = [];
    let current: ChatMessageDto[] = [];

    for (const msg of messages) {
      if (current.length === 0) {
        current.push(msg);
        continue;
      }
      const prev = current[current.length - 1];
      const isMedia = (m: ChatMessageDto) => m.messageType === "IMAGE" || m.messageType === "VIDEO";
      const timeDiff = new Date(msg.timestamp).getTime() - new Date(prev.timestamp).getTime();

      if (prev.senderId === msg.senderId && isMedia(prev) && isMedia(msg) && !msg.viewOnce && !prev.viewOnce && !msg.replyToId && timeDiff < 60000) {
        current.push(msg);
      } else {
        groups.push(current);
        current = [msg];
      }
    }
    if (current.length > 0) groups.push(current);
    return groups;
  }, [messages]);

  return (
    <div 
      ref={messageAreaRef} 
      className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 md:p-4 scrollbar-hide flex flex-col gap-2 relative ${
        !hasUserMessages ? "justify-center" : ""
      }`}
    >
      {hasUserMessages && <div className="mt-auto" />}

      {groupedMessages.map((group, i) => (
        <Bubble 
          key={group[0].messageId ?? i} 
          msgGroup={group} 
          isMine={group[0].senderId === myId} 
          allMessages={messages} 
          onReply={onReply} 
          onMediaClick={onMediaClick} 
          onUnlockPrivateMedia={onUnlockPrivateMedia}
          sessionId={sessionId}
          onOpenMenu={handleOpenMenu}
        />
      ))}
      {partnerTyping && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start px-2 py-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-[24px] bg-base-300/80 backdrop-blur-md border border-base-content/5 shadow-sm">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8] animate-bounce [animation-duration:0.8s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8] animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8] animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/40">Stranger is typing</span>
          </div>
        </motion.div>
      )}
      <div className="h-4 shrink-0" />

      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.12 }}
            style={{ 
              position: "absolute",
              left: Math.min(contextMenu.x, (messageAreaRef.current?.clientWidth ?? 0) - 170),
              top: Math.min(contextMenu.y, (messageAreaRef.current?.clientHeight ?? 0) - 110),
              zIndex: 100
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-40 bg-base-300/90 backdrop-blur-md border border-base-content/10 shadow-2xl rounded-2xl p-1.5 flex flex-col gap-0.5"
          >
            <button
              onClick={() => {
                onReply({
                  messageId: contextMenu.messageId,
                  senderId: contextMenu.senderId,
                  content: contextMenu.content,
                  messageType: contextMenu.messageType
                });
                setContextMenu(null);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-base-content hover:bg-base-content/5 transition-colors cursor-pointer"
            >
              <IconReply />
              <span>Reply</span>
            </button>
            {contextMenu.messageType === "TEXT" && contextMenu.content && (
              <button
                onClick={() => {
                  handleCopyText(contextMenu.content || "", contextMenu.messageId);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-base-content hover:bg-base-content/5 transition-colors cursor-pointer"
              >
                {copiedId === contextMenu.messageId ? (
                  <>
                    <Check size={14} className="text-success" />
                    <span className="text-success">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function Bubble({ 
  msgGroup, 
  isMine, 
  allMessages, 
  onReply, 
  onMediaClick,
  onUnlockPrivateMedia,
  sessionId,
  onOpenMenu
}: { 
  msgGroup: ChatMessageDto[]; 
  isMine: boolean; 
  allMessages: ChatMessageDto[]; 
  onReply: (r: { messageId: string; senderId: string; content?: string; messageType: MessageType }) => void; 
  onMediaClick: (items: { url: string, type: MessageType }[], index: number) => void;
  onUnlockPrivateMedia: (msg: ChatMessageDto) => void;
  sessionId: string;
  onOpenMenu: (pos: { clientX: number; clientY: number }, msg: ChatMessageDto) => void;
}) {
  const msg = msgGroup[msgGroup.length - 1];

  const isSystem = msg.senderId === "SYSTEM" || msg.messageType === "USER_LEFT" || msg.messageType === "SYSTEM";

  if (isSystem) {
    return (
      <div className="flex justify-center w-full my-4 px-4 select-none">
        <div className="bg-base-300/40 backdrop-blur-md border border-base-content/10 px-5 py-3 rounded-2xl text-center max-w-[85%] shadow-sm">
          <p className="text-xs font-semibold text-base-content/70 leading-relaxed">
            {msg.content}
          </p>
        </div>
      </div>
    );
  }

  const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const repliedMsg = msg.replyToId ? allMessages.find(m => m.messageId === msg.replyToId || (m.messageId.startsWith('local-') && m.messageId === msg.replyToId)) : null;
  const truncate = (s: string, max = 50) => s.length > max ? s.slice(0, max) + "..." : s;

  const isSingleMedia = msgGroup.length === 1 && (msg.messageType === "IMAGE" || msg.messageType === "VIDEO" || msg.messageType === "STICKER");
  const isMultiMedia = msgGroup.length > 1;

  const dragX = useMotionValue(0);
  const [reachedThreshold, setReachedThreshold] = useState(false);

  const iconScale = useTransform(dragX, isMine ? [-60, 0] : [0, 60], isMine ? [1.2, 0.5] : [0.5, 1.2]);
  const iconOpacity = useTransform(dragX, isMine ? [-60, 0] : [0, 60], isMine ? [1, 0] : [0, 1]);

  const handleDrag = (_event: any, info: any) => {
    const x = info.offset.x;
    if (isMine) {
      setReachedThreshold(x < -50);
    } else {
      setReachedThreshold(x > 50);
    }
  };

  const handleDragEnd = (_event: any, info: any) => {
    const x = info.offset.x;
    const triggered = isMine ? x < -50 : x > 50;
    if (triggered) {
      onReply({ messageId: msg.messageId, senderId: msg.senderId, content: msg.content, messageType: msg.messageType });
    }
    setReachedThreshold(false);
    dragX.set(0);
  };

  const handleThreeDotsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenMenu({ clientX: e.clientX, clientY: e.clientY }, msg);
  };

  const handleScrollToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      
      // Flash highlight ring effect
      element.classList.add("scale-[1.02]", "shadow-lg", "ring-2", "ring-[#1D4ED8]", "transition-all", "duration-300");
      setTimeout(() => {
        element.classList.remove("scale-[1.02]", "shadow-lg", "ring-2", "ring-[#1D4ED8]");
      }, 1000);
    }
  };

  const renderSingleMedia = () => {
    if (msg.messageType === "STICKER") {
      return (
        <div className="relative">
          <SafeImage 
            mediaPayload={msg.mediaPayload} 
            sessionId={sessionId}
            className="w-32 h-32 object-contain drop-shadow-lg" 
            alt="Sticker" 
            isSticker={true}
          />
        </div>
      );
    }
    
    if (msg.isWiped) {
      return (
        <div className="relative w-64 h-16 rounded-2xl bg-base-300/40 border border-base-content/5 flex items-center gap-3 px-4 select-none pointer-events-none opacity-60">
          <div className="w-8 h-8 rounded-full bg-base-content/5 flex items-center justify-center text-base-content/40">
            <EyeOff size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-base-content/80">Private Media</span>
            <span className="text-[9px] text-base-content/40 font-bold uppercase tracking-wider">Opened and vanished</span>
          </div>
        </div>
      );
    }

    if (msg.viewOnce) {
      return (
        <div 
          onClick={(e) => { e.stopPropagation(); onUnlockPrivateMedia(msg); }} 
          className="relative w-64 aspect-video rounded-[20px] bg-[#1D4ED8]/10 backdrop-blur-3xl flex flex-col items-center justify-center gap-3 cursor-pointer group/vo border border-[#1D4ED8]/20 hover:bg-[#1D4ED8]/20 transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-[#1D4ED8] shadow-lg transition-transform group-hover/vo:scale-110">
            <EyeOff size={24} />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-[#1D4ED8] uppercase tracking-[0.3em]">Unlock Private Media</p>
            {msg.viewTimer && (
              <p className="text-[8px] text-[#1D4ED8]/60 font-bold uppercase tracking-widest mt-0.5">{msg.viewTimer}s self-destruct</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={`relative overflow-hidden rounded-[14px] bg-base-100 flex items-center justify-center ${isMine ? "bg-transparent ring-0 shadow-none border-0" : "shadow-sm ring-1 ring-base-content/5 bg-black/5"}`}>
        {msg.messageType === "IMAGE" ? (
          <SafeImage 
            mediaPayload={msg.mediaPayload} 
            sessionId={sessionId}
            className={`max-w-full max-h-[150px] md:max-h-[200px] w-auto h-auto object-cover cursor-pointer ${isMine ? "rounded-[14px]" : ""}`} 
            onClick={(e: React.MouseEvent<HTMLImageElement>) => { e.stopPropagation(); onMediaClick([{ url: getCachedMediaUrl(msg.mediaPayload!), type: msg.messageType }], 0); }} 
            alt="chat media" 
          />
        ) : (
          <SafeVideo 
            mediaPayload={msg.mediaPayload} 
            sessionId={sessionId}
            controls 
            className="max-w-full max-h-[150px] md:max-h-[200px] w-auto h-auto" 
          />
        )}
      </div>
    );
  };

  const renderMultiMedia = () => {
    return (
      <div className="flex gap-1 overflow-x-auto snap-x max-w-[260px] md:max-w-[320px] custom-scrollbar pb-1 rounded-[14px]">
        {msgGroup.map((m, idx) => (
          <div key={m.messageId} className="shrink-0 w-[140px] md:w-[160px] snap-center rounded-[10px] overflow-hidden bg-black/5 relative aspect-square">
            {m.messageType === "IMAGE" ? (
              <SafeImage 
                mediaPayload={m.mediaPayload} 
                sessionId={sessionId}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                onClick={(e: React.MouseEvent<HTMLImageElement>) => { e.stopPropagation(); onMediaClick(msgGroup.map(g => ({ url: getCachedMediaUrl(g.mediaPayload!), type: g.messageType })), idx); }} 
                alt="chat media list" 
              />
            ) : (
              <SafeVideo 
                mediaPayload={m.mediaPayload} 
                sessionId={sessionId}
                controls 
                className="w-full h-full object-cover" 
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`relative flex flex-col ${isMine ? "items-end pr-9 pl-1" : "items-start pl-1 pr-1"} group px-1 mb-1`}>

      <div className="relative max-w-[80%] md:max-w-[65%]">
        {/* Swipe to reply background indicator */}
        {(msg.messageType === "TEXT" || msg.messageType === "STICKER" || msg.messageType === "IMAGE" || msg.messageType === "VIDEO") && (
          <div className={`absolute inset-y-0 flex items-center ${isMine ? "right-2 justify-end" : "left-2 justify-start"} pointer-events-none z-0`}>
            <motion.div
              style={{ scale: iconScale, opacity: iconOpacity }}
              className={`p-1.5 rounded-full transition-colors duration-200 ${
                reachedThreshold
                  ? "bg-[#1D4ED8] text-white"
                  : isMine
                    ? "bg-base-content/10 text-base-content/40"
                    : "bg-[#1D4ED8]/10 text-[#1D4ED8]/40"
              }`}
            >
              <IconReply />
            </motion.div>
          </div>
        )}

        <motion.div
          id={`msg-${msg.messageId}`}
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: isMine ? 0.5 : 0, right: isMine ? 0 : 0.5 }}
          style={{ x: dragX }}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          className={`rounded-2xl overflow-hidden relative z-10 transition-shadow 
            ${msg.messageType === "STICKER"
              ? "bg-transparent shadow-none"
              : isMine
                ? "bg-[#1D4ED8] text-white shadow-sm"
                : "bg-base-100 text-base-content border border-base-200 shadow-sm"
            } ${isSingleMedia || isMultiMedia ? "p-0 bg-transparent border-none shadow-none" : "px-3.5 py-1.5"}`}
        >
          {repliedMsg && (
            <div 
              onClick={(e) => { e.stopPropagation(); handleScrollToMessage(repliedMsg.messageId); }}
              className={`mb-2 pl-2 border-l-2 transition-colors cursor-pointer hover:bg-black/5 ${
                isMine ? "border-white/40 bg-white/5 hover:bg-white/10" : "border-[#1D4ED8]/60 bg-[#1D4ED8]/5 hover:bg-[#1D4ED8]/10"
              } py-1.5 pr-2 rounded-r-lg`}
            >
              <p className={`text-[8px] font-black uppercase tracking-[0.1em] mb-0.5 ${isMine ? "text-white/60" : "text-[#1D4ED8]/70"}`}>
                {repliedMsg.senderId === (isMine ? msg.senderId : "STRANGER") ? "You" : "Stranger"}
              </p>
              <p className={`text-[11px] ${isMine ? "text-white/80" : "text-base-content/50"} truncate leading-none`}>
                {repliedMsg.messageType === "TEXT" ? truncate(repliedMsg.content || "") : `[${repliedMsg.messageType}]`}
              </p>
            </div>
          )}

          {isMultiMedia ? renderMultiMedia() : isSingleMedia ? renderSingleMedia() : (
            <div className="flex items-end justify-between gap-3 min-w-[50px] relative">
              <p className="text-[13px] whitespace-pre-wrap break-words leading-[1.4] font-medium tracking-tight flex-1 text-left py-0.5">{msg.content}</p>
              <span className={`shrink-0 text-[8px] font-bold uppercase tracking-widest translate-y-[-2px] ${isMine ? "text-white/60" : "text-base-content/40"}`}>{time}</span>
            </div>
          )}
        </motion.div>

        {/* Three dots menu button (visible next to bubble) */}
        {(msg.messageType === "TEXT" || msg.messageType === "STICKER" || msg.messageType === "IMAGE" || msg.messageType === "VIDEO") && (
          <button
            onClick={handleThreeDotsClick}
            className={`absolute top-1/2 -translate-y-1/2 btn btn-circle btn-xs bg-base-200/50 backdrop-blur-md border border-base-content/10 text-base-content/40 hover:text-[#1D4ED8] hover:bg-base-200 transition-all shadow-lg z-20 right-[-32px] opacity-60 md:opacity-0 group-hover:opacity-100 cursor-pointer`}
          >
            <MoreVertical size={14} />
          </button>
        )}
      </div>
    </div>
  );
}