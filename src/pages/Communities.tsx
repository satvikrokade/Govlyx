import { useState, useEffect, useRef, useCallback } from "react";
import { FiSearch } from "react-icons/fi";
import { HiOutlineArrowRight } from "react-icons/hi";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import {
  Building2, Construction, GraduationCap, Stethoscope, Leaf,
  Laptop, Trophy, Palette, Briefcase, HardHat, ShieldCheck,
  Globe, Lock, EyeOff, Users, Mail, ClipboardCheck,
  CheckCircle2, AlertTriangle, Inbox, Settings, BarChart3,
  X, Crown, Shield, User, VolumeX, Volume2, Ban, Trash2,
  Save, Archive, MessageSquare, Calendar,
  Tag, Rocket, PartyPopper, Plus, ChevronLeft, ChevronRight,
  XCircle, Home, Link, Eye, Image as ImageIcon, RefreshCw,
  Activity, Radio, FileText, Upload, Sparkles, Flame, Check, Clock
} from "lucide-react";

import CommunityCard from "../components/community/CommunityCard";
import CommunityHeader from "../components/community/CommunityHeader";
import CommunityTabs from "../components/community/CommunityTabs";
import CommunitySidebar from "../components/community/CommunitySidebar";
import CreatePost from "../components/ui/CreatePost";
import PostCard from "../components/post/PostCard";
import PostSkeleton from "../components/post/PostSkeleton";
import ImageEditorModal from "../components/modals/ImageEditorModal";
import type { CurrentUser as CardUser } from "../components/post/PostCard";
import { toPostCardPost } from "../utils/postUtils";
import { jwtDecode } from "jwt-decode";
import { cacheSuggestion } from "../utils/searchCache";
import { apiUrl } from "../utils/apiUrl";
import { communityService } from "../api/communityService";
import { showToast } from "../utils/toast";

/* ────────────────────────────────────────────────────────────────────────────
   useBackNavigation – intercept the browser/hardware back button so it
   closes the overlay instead of navigating away from the page.
   ──────────────────────────────────────────────────────────────────────────── */
function useBackNavigation(onClose: () => void) {
  const closedByUI = useRef(false);

  useEffect(() => {
    // Detail panels are already represented by /communities/:slug, so this
    // listener only closes local overlay state when the URL changes.

    const handlePop = () => {
      // Browser back was pressed — close the overlay
      onClose();
    };

    window.addEventListener("popstate", handlePop);
    return () => {
      window.removeEventListener("popstate", handlePop);
      // Keep browser history intact while closing the overlay.
      if (!closedByUI.current) return;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Call this instead of onClose() when the user presses the UI close button */
  const closeViaUI = useCallback(() => {
    closedByUI.current = true;
    onClose();
  }, [onClose]);

  return { closeViaUI };
}


/* ════════════════════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ════════════════════════════════════════════════════════════════════════════ */
const Spin = ({ xs }: { xs?: boolean }) => (
  <span className={`loading loading-spinner ${xs ? "loading-xs" : "loading-sm"}`} />
);

export interface CommunityData {
  id: number;
  name: string;
  slug: string;
  description: string;
  privacy: "PUBLIC" | "PRIVATE" | "SECRET";
  avatarUrl: string | null;
  coverImageUrl: string | null;
  category?: string | null;
  tags?: string | null;
  locationName?: string | null;
  memberCount: number;
  postCount: number;
  isMember?: boolean;
  isOwner?: boolean;
  hasPendingRequest?: boolean;
  allowMemberPosts?: boolean;
  requirePostApproval?: boolean;
  feedEligible?: boolean;
  createdAt: string;
}

interface CreateForm {
  name: string;
  description: string;
  category: string;
  tags: string;
  privacy: "PUBLIC" | "PRIVATE" | "SECRET";
  avatarUrl: string;
  locationRestricted: boolean;
  allowMemberPosts: boolean;
  requirePostApproval: boolean;
}

/* ─── auth ──────────────────────────────────────────────────────────────── */
function getToken(): string | null {
  return (
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token") ||
    null
  );
}
function hdrs(): Record<string, string> {
  const t = getToken();
  return t
    ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

/* ─── local persistence for join requests (workaround for backend bug) ─── */
const getPendingLocal = (): string[] => {
  try { return JSON.parse(localStorage.getItem("pending_joins") || "[]").map(String); } catch { return []; }
};
const addPendingLocal = (id: number | string) => {
  const p = getPendingLocal();
  const s = String(id);
  if (!p.includes(s)) localStorage.setItem("pending_joins", JSON.stringify([...p, s]));
};
const removePendingLocal = (id: number | string) => {
  const p = getPendingLocal();
  const s = String(id);
  localStorage.setItem("pending_joins", JSON.stringify(p.filter(x => x !== s)));
};

/* ─── types ─────────────────────────────────────────────────────────────── */
interface Post {
  id: number;
  content: string;
  authorUsername?: string;
  authorId?: number;
  authorProfileImage?: string;
  authorRole?: string;
  likeCount: number;
  commentCount: number;
  shareCount?: number;
  mediaUrls?: string[];
  imageUrl?: string;
  timeAgo?: string;
  createdAt?: string;
  isLikedByMe?: boolean;
}



interface JoinRequest {
  id: number;
  userId: number;
  username: string;
  profileImage: string | null;
  requestedAt: string;
  message?: string;
}

interface Member {
  userId: number;
  username: string;
  profileImage: string | null;
  role: "ADMIN" | "MODERATOR" | "MEMBER";
  joinedAt: string;
  isMuted?: boolean;
  isBanned?: boolean;
}

interface HealthInsight {
  healthScore?: number;
  healthTier?: string;
  memberCount?: number;
  postCount?: number;
  totalCommentCount?: number;
  activeMembers?: number;
  feedReach?: number;
  components?: Record<string, number>;
}

/* ── Invite types (mirrors CommunityInviteDto.java) ─────────────────────── */
interface InviteResponse {
  id: number;
  token: string;
  inviteLink: string;
  inviteeUsername: string | null;
  inviteeProfileImage: string | null;
  inviterUsername: string | null;
  message: string | null;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  singleUse: boolean;
  useCount: number;
  createdAt: string;
  expiresAt: string;
  actionedAt: string | null;
}

interface InvitePreviewResponse {
  communityName: string;
  communitySlug: string;
  communityDescription: string | null;
  communityPrivacy: string;
  memberCount: number;
  inviterUsername: string | null;
  message: string | null;
  expiresAt: string;
  valid: boolean;
}

interface AcceptInviteResponse {
  communityId: number;
  communityName: string;
  communitySlug: string;
  joined: boolean;
  message: string;
}

interface UserSearchResult {
  id: number;
  username: string;
  profileImage: string | null;
  displayName?: string | null;
}

/* ─── constants ──────────────────────────────────────────────────────────── */
const CATS = [
  "LOCAL_GOVERNANCE", "CIVIC_ISSUES", "EDUCATION", "HEALTH", "ENVIRONMENT",
  "TECHNOLOGY", "SPORTS", "CULTURE", "EMPLOYMENT", "INFRASTRUCTURE", "SAFETY", "OTHER",
];
const CAT_ICON: Record<string, React.ReactNode> = {
  LOCAL_GOVERNANCE: <Building2 size={18} />,
  CIVIC_ISSUES: <Construction size={18} />,
  EDUCATION: <GraduationCap size={18} />,
  HEALTH: <Stethoscope size={18} />,
  ENVIRONMENT: <Leaf size={18} />,
  TECHNOLOGY: <Laptop size={18} />,
  SPORTS: <Trophy size={18} />,
  CULTURE: <Palette size={18} />,
  EMPLOYMENT: <Briefcase size={18} />,
  INFRASTRUCTURE: <HardHat size={18} />,
  SAFETY: <ShieldCheck size={18} />,
  OTHER: <Globe size={18} />,
};
const PRIV_ICON: Record<string, React.ReactNode> = {
  PUBLIC: <Globe size={18} />,
  PRIVATE: <Lock size={18} />,
  SECRET: <EyeOff size={18} />
};
const PRIV_DESC = {
  PUBLIC: "Anyone can join instantly",
  PRIVATE: "Requires moderator approval",
  SECRET: "Invite only — not discoverable",
};

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${esc})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-red-500/20 text-red-500 rounded px-0.5">{p}</mark>
      : p
  );
}

function avatar(name: string, image?: string | null) {
  if (image) return <img src={image} className="w-8 h-8 rounded-full object-cover" alt="" />;
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden border border-base-300 bg-base-200 shrink-0">
      <img src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(name || "?")}`} alt="Avatar" className="w-full h-full object-cover" />
    </div>
  );
}

async function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
  setCopied(true);
  setTimeout(() => setCopied(false), 2200);
}

function relTime(iso?: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ════════════════════════════════════════════════════════════════════════════
   INVITE TAB — rendered inside AdminPanel for PRIVATE / SECRET communities
════════════════════════════════════════════════════════════════════════════ */
function InviteTab({
  communityId,
  privacy,
  communityName,
}: {
  communityId: number;
  privacy: "PRIVATE" | "SECRET";
  communityName: string;
}) {
  const isSecret = privacy === "SECRET";
  type Mode = "send" | "list";
  const [mode, setMode] = useState<Mode>("send");

  const [searchQ, setSearchQ] = useState("");
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<InviteResponse | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copiedSend, setCopiedSend] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<InviteResponse | null>(null);
  const [copiedGen, setCopiedGen] = useState(false);

  const [invites, setInvites] = useState<InviteResponse[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [revoking, setRevoking] = useState<number | null>(null);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    const q = searchQ.trim();
    if (q.length < 2 || selectedUser) { setSuggestions([]); return; }
    debRef.current = setTimeout(async () => {
      setSugLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/users/search?query=${encodeURIComponent(q)}&limit=5`), { headers: hdrs() });
        if (!res.ok) throw new Error();
        const d = await res.json();
        const list: UserSearchResult[] = d?.data?.data ?? d?.data ?? d?.content ?? [];
        setSuggestions(Array.isArray(list) ? list : []);
      } catch { setSuggestions([]); }
      finally { setSugLoading(false); }
    }, 280);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [searchQ, selectedUser]);

  async function handleSendInvite() {
    if (!selectedUser) return;
    setSending(true); setSendError(null); setSendResult(null);
    try {
      const res = await fetch(apiUrl(`/api/communities/${communityId}/invites`), {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({
          inviteeId: selectedUser.id,
          inviteeUsername: selectedUser.displayName || selectedUser.username,
          message: message.trim() || undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(d?.error || d?.message || `Error ${res.status}`);
        return;
      }
      const result: InviteResponse = d?.data ?? d;
      setSendResult(result);
      setSelectedUser(null); setSearchQ(""); setMessage(""); setSuggestions([]);
      if (mode === "list") loadInvites(null, true);
    } catch { setSendError("Server unreachable. Please check your connection."); }
    finally { setSending(false); }
  }

  async function handleGenerateLink() {
    setGenLoading(true); setGenResult(null);
    try {
      const res = await fetch(apiUrl(`/api/communities/${communityId}/invites`), {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({}),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(d?.error || d?.message || "Could not generate link.");
        return;
      }
      setGenResult(d?.data ?? d);
    } catch { alert("Server unreachable. Please check your connection."); }
    finally { setGenLoading(false); }
  }

  const loadInvites = useCallback(async (cur: number | null, replace: boolean) => {
    setListLoading(true);
    try {
      const p = new URLSearchParams({ limit: "20" });
      if (cur) p.set("cursor", String(cur));
      const res = await fetch(apiUrl(`/api/communities/${communityId}/invites?${p}`), { headers: hdrs() });
      if (!res.ok) throw new Error();
      const d = await res.json();
      const paged = d?.data;
      const rows: InviteResponse[] = paged?.data ?? paged?.content ?? [];
      setInvites(prev => replace ? rows : [...prev, ...rows]);
      setHasMore(paged?.hasMore ?? false);
      setCursor(paged?.nextCursor ?? null);
    } catch (err) {
      console.error("Failed to load invites:", err);
      if (replace) setInvites([]);
    }
    finally { setListLoading(false); }
  }, [communityId]);

  useEffect(() => {
    if (mode === "list") loadInvites(null, true);
  }, [mode, loadInvites]);

  async function handleRevoke(inviteId: number) {
    if (!window.confirm("Revoke this invite?")) return;
    setRevoking(inviteId);
    try {
      const res = await fetch(apiUrl(`/api/communities/${communityId}/invites/${inviteId}`), {
        method: "DELETE", headers: hdrs(),
      });
      if (!res.ok) { alert("Could not revoke."); return; }
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch { alert("Server unreachable. Please check your connection."); }
    finally { setRevoking(null); }
  }

  return (
    <div className="p-5 space-y-6">
      <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${isSecret
        ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
        : "bg-orange-500/10 border-orange-500/30 text-orange-400"
        }`}>
        <span className="text-xl shrink-0 mt-0.5">{isSecret ? <EyeOff size={20} /> : <Lock size={20} />}</span>
        <div>
          <p className="font-semibold">{isSecret ? "Secret Community" : "Private Community"}</p>
          <p className="opacity-70 text-xs mt-0.5">
            {isSecret
              ? "Invites are the only way to join this community."
              : "Invited users skip the approval queue and join instantly."}
          </p>
        </div>
      </div>

      <div className="flex gap-1 bg-base-200 rounded-xl p-1">
        {(["send", "list"] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 btn btn-xs rounded-lg transition-all ${mode === m ? "bg-blue-700 text-white font-semibold border-none hover:bg-blue-800" : "btn-ghost"}`}
          >
            {m === "send" ? <><Mail size={12} className="mr-1" /> Send Invite</> : <><ClipboardCheck size={12} className="mr-1" /> Pending Invites</>}
          </button>
        ))}
      </div>

      {mode === "send" && (
        <div className="space-y-4">
          {sendResult && (
            <div className="rounded-xl border border-success/30 bg-success/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-success font-semibold text-sm">
                <CheckCircle2 size={16} />
                Invite sent to @{sendResult.inviteeUsername ?? "user"}!
              </div>
              {sendResult.inviteLink && !sendResult.inviteeUsername && (
                <div className="space-y-1.5">
                  <p className="text-xs opacity-60">Share this link:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-base-300 rounded-lg px-3 py-2 truncate block">
                      {sendResult.inviteLink}
                    </code>
                    <button
                      className={`btn btn-xs shrink-0 ${copiedSend ? "btn-success" : "btn-outline"}`}
                      onClick={() => copyToClipboard(sendResult.inviteLink, setCopiedSend)}
                    >
                      {copiedSend ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Join "${communityName}" on JanSahayak: ${sendResult.inviteLink}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-success btn-xs gap-2 text-[10px] px-2"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                      </svg>
                      WhatsApp
                    </a>
                    <a
                      href={`https://t.me/share/url?url=${encodeURIComponent(sendResult.inviteLink)}&text=${encodeURIComponent(`Hey! I invited you to join "${communityName}".`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn bg-[#0088cc] hover:bg-[#0077b5] text-white btn-xs gap-2 text-[10px] px-2 border-none"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701-.33 4.955c.488 0 .703-.223.976-.488l2.344-2.279 4.875 3.597c.898.496 1.543.241 1.767-.832l3.195-15.04c.328-1.314-.501-1.91-1.353-1.528z" />
                      </svg>
                      Telegram
                    </a>
                    <button
                      onClick={() => copyToClipboard(sendResult.inviteLink, setCopiedSend)}
                      className="btn bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-90 text-white btn-xs gap-2 text-[10px] px-2 border-none"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.584.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.2-4.353-2.612-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                      Instagram
                    </button>
                  </div>
                </div>
              )}
              <button className="btn btn-ghost btn-xs w-full" onClick={() => setSendResult(null)}>
                Send another invite
              </button>
            </div>
          )}

          {sendError && (
            <div className="bg-error/10 border border-error/30 text-error text-sm rounded-xl px-4 py-2">
              ⚠️ {sendError}
            </div>
          )}

          {!sendResult && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Invite by username <span className="text-error">*</span>
                </label>

                {selectedUser ? (
                  <div className="flex items-center gap-3 rounded-xl border border-blue-700 bg-blue-700/10 p-3">
                    {avatar(selectedUser.username, selectedUser.profileImage)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{selectedUser.displayName || selectedUser.username}</p>
                    </div>
                    <button
                      className="btn btn-ghost btn-xs btn-circle text-error"
                      onClick={() => { setSelectedUser(null); setSearchQ(""); }}
                    ><X size={14} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" size={14} />
                      <input
                        type="text"
                        placeholder="Search username…"
                        className="input input-bordered w-full pl-8"
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                        autoComplete="off"
                      />
                      {sugLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spin xs /></div>
                      )}
                    </div>

                    {suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-[100] bg-base-100 border border-base-300 rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/5">
                        {suggestions.map(u => (
                          <button
                            key={u.id}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-base-200 text-left transition-colors border-b last:border-none border-base-300/50"
                            onMouseDown={e => { e.preventDefault(); setSelectedUser(u); setSearchQ(""); setSuggestions([]); }}
                          >
                            {avatar(u.username, u.profileImage)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-base-content">
                                {u.displayName || u.username}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchQ.trim().length >= 2 && !sugLoading && suggestions.length === 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-[100] bg-base-100 border border-base-300 rounded-xl shadow-2xl p-5 text-center ring-1 ring-black/5">
                        <p className="text-sm font-medium text-base-content/60">No users found for "{searchQ}"</p>
                        <p className="text-xs text-base-content/40 mt-1">Check the spelling or try a different name.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Personal message <span className="opacity-40 font-normal">(optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full resize-none text-sm"
                  rows={2}
                  placeholder={`Hey! Join ${communityName}…`}
                  maxLength={300}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
                <p className="text-xs opacity-40 mt-1">{message.length}/300</p>
              </div>

              <button
                className="btn bg-blue-700 text-white font-semibold border-none hover:bg-blue-800 w-full gap-2"
                disabled={!selectedUser || sending}
                onClick={handleSendInvite}
              >
                {sending ? <><Spin xs /> Sending…</> : "📨 Send Invite"}
              </button>

              <div className="divider text-xs opacity-40 my-1">OR</div>

              <div className="rounded-xl border border-base-300 bg-base-200 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-xl text-blue-700"><Link size={20} /></span>
                  <div>
                    <p className="text-sm font-semibold">Generate Shareable Link</p>
                    <p className="text-xs opacity-60 mt-0.5">
                      Anyone with this link can join until it expires (7 days).
                    </p>
                  </div>
                </div>

                {genResult?.inviteLink ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-base-100 rounded-lg px-3 py-2 truncate block border border-base-300">
                        {genResult.inviteLink}
                      </code>
                      <button
                        className={`btn btn-xs shrink-0 ${copiedGen ? "btn-success" : "bg-blue-700 text-white font-semibold border-none hover:bg-blue-800"}`}
                        onClick={() => copyToClipboard(genResult!.inviteLink, setCopiedGen)}
                      >
                        {copiedGen ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                    {genResult.expiresAt && (
                      <p className="text-xs opacity-40">
                        Expires {new Date(genResult.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Join "${communityName}" on JanSahayak: ${genResult.inviteLink}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-success btn-sm gap-2 text-[10px] px-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                        </svg>
                        WhatsApp
                      </a>
                      <a
                        href={`https://t.me/share/url?url=${encodeURIComponent(genResult.inviteLink)}&text=${encodeURIComponent(`Join "${communityName}" on JanSahayak!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn bg-[#0088cc] hover:bg-[#0077b5] text-white btn-sm gap-2 text-[10px] px-2 border-none"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701-.33 4.955c.488 0 .703-.223.976-.488l2.344-2.279 4.875 3.597c.898.496 1.543.241 1.767-.832l3.195-15.04c.328-1.314-.501-1.91-1.353-1.528z" />
                        </svg>
                        Telegram
                      </a>
                      <button
                        onClick={() => copyToClipboard(genResult.inviteLink, setCopiedGen)}
                        className="btn bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-90 text-white btn-sm gap-2 text-[10px] px-2 border-none"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.584.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.2-4.353-2.612-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                        Instagram
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-outline btn-sm w-full gap-2"
                    disabled={genLoading}
                    onClick={handleGenerateLink}
                  >
                    {genLoading ? <><Spin xs /> Generating…</> : "🔗 Generate Invite Link"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {mode === "list" && (
        <div className="space-y-3">
          {listLoading && invites.length === 0 && (
            <div className="flex justify-center py-10"><Spin /></div>
          )}
          {!listLoading && invites.length === 0 && (
            <div className="text-center py-12 opacity-50 space-y-2">
              <div className="flex justify-center mb-2"><Inbox size={40} /></div>
              <p className="font-medium text-sm">No pending invites</p>
              <p className="text-xs">Switch to "Send Invite" to invite someone.</p>
            </div>
          )}
          {invites.map(inv => (
            <InviteRow
              key={inv.id}
              invite={inv}
              revoking={revoking === inv.id}
              onRevoke={() => handleRevoke(inv.id)}
            />
          ))}
          {hasMore && !listLoading && (
            <button
              className="w-full py-2 text-sm text-blue-700 hover:opacity-70"
              onClick={() => loadInvites(cursor, false)}
            >
              Load more ↓
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function InviteRow({
  invite,
  revoking,
  onRevoke,
}: {
  invite: InviteResponse;
  revoking: boolean;
  onRevoke: () => void;
}) {

  const statusColor: Record<InviteResponse["status"], string> = {
    PENDING: "badge-warning",
    ACCEPTED: "badge-success",
    EXPIRED: "badge-ghost",
    REVOKED: "badge-error",
  };

  return (
    <div className="rounded-xl border border-base-300 bg-base-200 p-3 space-y-2">
      <div className="flex items-center gap-3">
        {avatar(invite.inviteeUsername ?? "🔗", invite.inviteeProfileImage)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold">
              {invite.inviteeUsername ? `@${invite.inviteeUsername}` : "🔗 Link invite"}
            </p>
            <span className={`badge badge-xs ${statusColor[invite.status]}`}>
              {invite.status.toLowerCase()}
            </span>
            {!invite.singleUse && (
              <span className="badge badge-xs badge-ghost">multi-use</span>
            )}
            {invite.useCount > 0 && (
              <span className="badge badge-xs badge-ghost">{invite.useCount}× used</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs opacity-40 mt-0.5">
            <span>Sent {relTime(invite.createdAt)}</span>
            {invite.expiresAt && (
              <span>· Expires {new Date(invite.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            )}
          </div>
        </div>
        {invite.status === "PENDING" && (
          <button
            className="btn btn-ghost btn-xs text-error shrink-0"
            disabled={revoking}
            onClick={onRevoke}
          >
            {revoking ? <Spin xs /> : "Revoke"}
          </button>
        )}
      </div>

    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ACCEPT INVITE PAGE
════════════════════════════════════════════════════════════════════════════ */
export function AcceptInvitePage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();

  type PageStatus = "idle" | "loading" | "success" | "already" | "error";
  const [status, setStatus] = useState<PageStatus>("idle");
  const [preview, setPreview] = useState<InvitePreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [accepted, setAccepted] = useState<AcceptInviteResponse | null>(null);

  useEffect(() => {
    if (!token) { setPreviewLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/communities/invites/preview/${token}`));
        const d = await res.json().catch(() => ({}));
        if (res.status === 404) {
          setErrorMsg(d?.error || d?.message || "This invite link is invalid or has expired.");
          return;
        }
        if (!res.ok) {
          setErrorMsg(d?.error || d?.message || "Could not load invite details.");
          return;
        }
        const p: InvitePreviewResponse = d?.data ?? d;
        setPreview(p);
        if (!p || !p.valid) {
          setErrorMsg(d?.error || d?.message || "This invite link has expired or been revoked.");
        }
      } catch (err) {
        console.error("Invite Preview Error:", err);
        setErrorMsg("Server unreachable. Please check your connection.");
      }
      finally { setPreviewLoading(false); }
    })();
  }, [token]);

  async function handleAccept() {
    if (!getToken()) {
      navigate(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`);
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch(apiUrl(`/api/communities/invites/accept/${token}`), {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({}),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(d?.message || "Could not accept invite.");
        setStatus("error");
        return;
      }
      const result: AcceptInviteResponse = d?.data ?? d;
      setAccepted(result);
      setStatus(result.message?.toLowerCase().includes("already") ? "already" : "success");
    } catch {
      setErrorMsg("Server unreachable. Please check your connection.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-base-100 rounded-3xl border border-base-300 shadow-2xl overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-[#1D4ED8]/30 via-[#1D4ED8]/10 to-base-200 flex items-center justify-center">
          <Home size={48} className="text-blue-700" />
        </div>

        <div className="px-6 pb-6 pt-4 space-y-4">
          {previewLoading && (
            <div className="flex justify-center py-8"><Spin /></div>
          )}

          {!previewLoading && errorMsg && status === "idle" && (
            <div className="text-center space-y-3 py-4">
              <div className="flex justify-center text-error"><XCircle size={40} /></div>
              <p className="font-semibold">{errorMsg}</p>
              <p className="text-xs opacity-50">Ask the community admin for a fresh invite.</p>
            </div>
          )}

          {!previewLoading && preview && preview.valid && status === "idle" && (
            <>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold notranslate">{preview.communityName}</h1>
                {preview.communityDescription && (
                  <p className="text-sm opacity-60 line-clamp-3">{preview.communityDescription}</p>
                )}
                <div className="flex items-center justify-center gap-3 text-xs opacity-50 pt-1">
                  <span className="flex items-center gap-1"><Users size={12} /> {(preview.memberCount ?? 0).toLocaleString()} members</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">{preview.communityPrivacy === "SECRET" ? <><EyeOff size={12} /> Secret</> : <><Lock size={12} /> Private</>}</span>
                </div>
              </div>

              {preview.inviterUsername && (
                <div className="rounded-xl bg-base-200 px-4 py-3 text-sm text-center">
                  <span className="opacity-60">Invited by </span>
                  <span className="font-semibold">@{preview.inviterUsername}</span>
                </div>
              )}

              {preview.message && (
                <div className="rounded-xl border border-base-300 bg-base-200 px-4 py-3 text-sm italic opacity-80">
                  "{preview.message}"
                </div>
              )}

              {preview.expiresAt && (
                <p className="text-xs text-center opacity-40">
                  Invite expires:{" "}
                  {new Date(preview.expiresAt).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </p>
              )}

              {!getToken() && (
                <div className="rounded-xl bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning text-center">
                  You need to log in first to accept this invite.
                </div>
              )}

              <button
                className="btn bg-blue-700 text-white font-semibold border-none hover:bg-blue-800 w-full"
                onClick={handleAccept}
              >
                <Rocket size={18} className="mr-2" /> Accept &amp; Join Community
              </button>

              <p className="text-xs text-center opacity-40">
                By joining, you agree to follow the community's rules.
              </p>
            </>
          )}

          {status === "loading" && (
            <div className="text-center space-y-3 py-6">
              <Spin />
              <p className="text-sm opacity-60">Joining community…</p>
            </div>
          )}

          {(status === "success" || status === "already") && accepted && (
            <div className="text-center space-y-3 py-4">
              <div className="flex justify-center text-blue-700"><PartyPopper size={48} /></div>
              <h2 className="font-bold text-lg">
                {status === "already" ? "Already a member!" : "You're in!"}
              </h2>
              <p className="text-sm opacity-60">
                Welcome to <strong>{accepted.communityName}</strong>.
              </p>
              <button
                className="btn bg-blue-700 text-white font-semibold border-none hover:bg-blue-800 w-full"
                onClick={() => navigate('/communities')}
              >
                Open Community <ChevronLeft size={16} className="rotate-180 ml-1" />
              </button>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-3 py-4">
              <div className="flex justify-center text-error"><AlertTriangle size={40} /></div>
              <p className="font-semibold text-error">{errorMsg}</p>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => { setStatus("idle"); setErrorMsg(""); }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ADMIN PANEL
════════════════════════════════════════════════════════════════════════════ */
type AdminTab = "requests" | "members" | "settings" | "insights" | "invites";

function AdminPanel({
  community,
  onClose,
  onCommunityUpdated,
  onMembershipChange,
}: {
  community: CommunityData;
  onClose: () => void;
  onCommunityUpdated: (c: CommunityData) => void;
  onMembershipChange?: (id: number, isMember: boolean, delta: number, hasPendingRequest?: boolean) => void;
}) {
  const { closeViaUI } = useBackNavigation(onClose);
  const [tab, setTab] = useState<AdminTab>("requests");
  const [c, setC] = useState(community);

  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqCursor, setReqCursor] = useState<number | null>(null);
  const [reqHasMore, setReqHasMore] = useState(false);
  const [actingReq, setActingReq] = useState<number | null>(null);

  const loadRequests = useCallback(async (cur: number | null, replace: boolean) => {
    setReqLoading(true);
    try {
      const p = new URLSearchParams({ limit: "20" });
      if (cur) p.set("cursor", String(cur));
      const res = await fetch(apiUrl(`/api/communities/${c.id}/join-requests?${p}`), { headers: hdrs() });
      if (!res.ok) throw new Error();
      const d = await res.json();
      const paged = d?.data ?? d;
      const rawRows: any[] = Array.isArray(paged?.data) ? paged.data : (paged?.content ?? (Array.isArray(paged) ? paged : []));
      const rows: JoinRequest[] = rawRows.map((r: any) => ({
        ...r,
        requestedAt: r.requestedAt || new Date().toISOString()
      }));
      setRequests(prev => replace ? rows : [...prev, ...rows]);
      setReqHasMore(paged.hasMore ?? false);
      setReqCursor(paged.nextCursor ?? null);
    } catch (err) {
      console.error("[loadRequests] Failed to load join requests:", err);
      if (replace) setRequests([]);
    }
    finally { setReqLoading(false); }
  }, [c.id]);

  async function reviewRequest(reqId: number, approve: boolean) {
    setActingReq(reqId);
    const url = `/api/communities/${c.id}/join-requests/${reqId}`;
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: hdrs(),
        body: JSON.stringify({ approve, rejectionReason: approve ? null : undefined }),
      });
      if (!res.ok) {
        let errMsg = `Action failed (${res.status})`;
        try {
          const errBody = await res.text();
          console.error("[reviewRequest] FAILED:", res.status, url, errBody);
          const parsed = JSON.parse(errBody);
          if (parsed?.message) errMsg = parsed.message;
          else if (parsed?.error) errMsg = parsed.error;
        } catch { }
        alert(errMsg);
        return;
      }
      setRequests(p => p.filter(r => r.id !== reqId));
      if (approve) {
        setC(p => ({ ...p, memberCount: p.memberCount + 1 }));
        onMembershipChange?.(c.id, true, 1, false);
      }
    } catch (err: any) {
      console.error("[reviewRequest] Network/proxy error:", url, err);
      alert("Server unreachable – please check your connection.");
    } finally {
      setActingReq(null);
    }
  }

  const [members, setMembers] = useState<Member[]>([]);
  const [memLoading, setMemLoading] = useState(false);
  const [memCursor, setMemCursor] = useState<number | null>(null);
  const [memHasMore, setMemHasMore] = useState(false);
  const [actingMem, setActingMem] = useState<number | null>(null);
  const [memSearch, setMemSearch] = useState("");

  const loadMembers = useCallback(async (cur: number | null, replace: boolean) => {
    setMemLoading(true);
    try {
      const p = new URLSearchParams({ limit: "30" });
      if (cur) p.set("cursor", String(cur));
      const res = await fetch(apiUrl(`/api/communities/${c.id}/members?${p}`), { headers: hdrs() });
      if (!res.ok) throw new Error();
      const d = await res.json();
      const paged = d?.data ?? d;
      const rawRows: any[] = Array.isArray(paged?.data) ? paged.data : (paged?.content ?? (Array.isArray(paged) ? paged : []));
      const rows: Member[] = rawRows.map((m: any) => ({
        ...m,
        userId: m.userId || m.id,
        role: m.memberRole || m.role || "MEMBER",
        joinedAt: m.joinedAt || m.createdAt || new Date().toISOString()
      }));
      setMembers(prev => replace ? rows : [...prev, ...rows]);
      setMemHasMore(paged.hasMore ?? false);
      setMemCursor(paged.nextCursor ?? null);
    } catch (err) {
      console.error("[loadMembers] Failed to load members:", err);
      if (replace) setMembers([]);
    }
    finally { setMemLoading(false); }
  }, [c.id]);

  async function memberAction(
    userId: number,
    action: "remove" | "mute" | "unmute" | "ban" | "unban" | "makeAdmin" | "makeMod" | "makeMember"
  ) {
    setActingMem(userId);
    try {
      let res: Response;
      if (action === "remove") {
        if (!confirm("Remove this member from the community?")) return;
        res = await fetch(apiUrl(`/api/communities/${c.id}/members/${userId}`), { method: "DELETE", headers: hdrs() });
      } else if (action === "mute") {
        res = await fetch(apiUrl(`/api/communities/${c.id}/members/${userId}/mute`), { method: "PUT", headers: hdrs() });
      } else if (action === "unmute") {
        res = await fetch(apiUrl(`/api/communities/${c.id}/members/${userId}/mute`), { method: "DELETE", headers: hdrs() });
      } else if (action === "ban") {
        if (!confirm("Ban this member?")) return;
        res = await fetch(apiUrl(`/api/communities/${c.id}/members/${userId}/ban`), { method: "PUT", headers: hdrs(), body: JSON.stringify({}) });
      } else if (action === "unban") {
        res = await fetch(apiUrl(`/api/communities/${c.id}/members/${userId}/ban`), { method: "DELETE", headers: hdrs() });
      } else {
        const roleMap = { makeAdmin: "ADMIN", makeMod: "MODERATOR", makeMember: "MEMBER" };
        res = await fetch(apiUrl(`/api/communities/${c.id}/members/${userId}/role`), {
          method: "PUT", headers: hdrs(),
          body: JSON.stringify({ role: roleMap[action as keyof typeof roleMap] }),
        });
      }
      if (!res.ok) { alert("Action failed."); return; }
      if (action === "remove" || action === "ban") {
        setMembers(p => p.filter(m => m.userId !== userId));
        if (action === "remove") {
          setC(p => ({ ...p, memberCount: Math.max(0, p.memberCount - 1) }));
          onMembershipChange?.(c.id, true, -1);
        }
      } else {
        setMembers(p => p.map(m => {
          if (m.userId !== userId) return m;
          if (action === "mute") return { ...m, isMuted: true };
          if (action === "unmute") return { ...m, isMuted: false };
          if (action === "unban") return { ...m, isBanned: false };
          if (action === "makeAdmin") return { ...m, role: "ADMIN" as const };
          if (action === "makeMod") return { ...m, role: "MODERATOR" as const };
          if (action === "makeMember") return { ...m, role: "MEMBER" as const };
          return m;
        }));
      }
    } catch { alert("Server unreachable. Please check your connection."); }
    finally { setActingMem(null); }
  }

  const [settingsForm, setSettingsForm] = useState({
    name: c.name,
    description: c.description,
    privacy: c.privacy,
    avatarUrl: c.avatarUrl || "",
    coverImageUrl: c.coverImageUrl || "",
    allowMemberPosts: c.allowMemberPosts ?? true,
    requirePostApproval: c.requirePostApproval ?? false,
    feedEligible: c.feedEligible ?? false,
  });
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast.error("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showToast.error("File size exceeds 5MB limit.");
      return;
    }

    setUploadingCover(true);
    try {
      const data = await communityService.uploadCommunityImage(c.id, file, "cover");
      const updatedUrl = data?.coverImageUrl || data?.data?.coverImageUrl || data?.data?.data?.coverImageUrl;
      if (updatedUrl) {
        setSettingsForm(prev => ({ ...prev, coverImageUrl: updatedUrl }));
        setC(prev => ({ ...prev, coverImageUrl: updatedUrl }));
        onCommunityUpdated({ ...c, coverImageUrl: updatedUrl, isOwner: true, isMember: true });
        showToast.success("Community cover image uploaded successfully!");
      } else {
        showToast.error("Upload succeeded but no cover image URL was returned.");
      }
    } catch (err: any) {
      console.error(err);
      showToast.error(err.response?.data?.message || err.message || "Failed to upload cover image.");
    } finally {
      setUploadingCover(false);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = "";
      }
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast.error("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showToast.error("File size exceeds 5MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditorImageSrc(reader.result as string);
      setEditorOpen(true);
    };
    reader.readAsDataURL(file);
  }

  async function handleEditorSave(editedBlob: Blob) {
    setUploadingImg(true);
    setEditorOpen(false);
    try {
      const file = new File([editedBlob], "community_avatar.jpg", { type: "image/jpeg" });
      const data = await communityService.uploadCommunityImage(c.id, file, "avatar");
      const updatedUrl = data?.avatarUrl || data?.data?.avatarUrl || data?.data?.data?.avatarUrl;
      if (updatedUrl) {
        setSettingsForm(prev => ({ ...prev, avatarUrl: updatedUrl }));
        setC(prev => ({ ...prev, avatarUrl: updatedUrl }));
        onCommunityUpdated({ ...c, avatarUrl: updatedUrl, isOwner: true, isMember: true });
        showToast.success("Community image uploaded successfully!");
      } else {
        showToast.error("Upload succeeded but no image URL was returned.");
      }
    } catch (err: any) {
      console.error(err);
      showToast.error(err.response?.data?.message || err.message || "Failed to upload image.");
    } finally {
      setUploadingImg(false);
      setEditorImageSrc(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function saveSettings() {
    setSettingsBusy(true); setSettingsMsg(null);
    try {
      const res = await fetch(apiUrl(`/api/communities/${c.id}`), {
        method: "PUT", headers: hdrs(), body: JSON.stringify(settingsForm),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setSettingsMsg("❌ " + (d?.message || "Save failed.")); return; }
      const d = await res.json();
      const raw = d?.data ?? d;
      const updated: CommunityData = { ...c, ...raw, isOwner: true, isMember: true };
      setC(updated); onCommunityUpdated(updated);
      setSettingsMsg("✅ Saved successfully.");
    } catch { setSettingsMsg("❌ Server unreachable."); }
    finally { setSettingsBusy(false); }
  }

  async function archiveCommunity() {
    if (!confirm(`Archive "${c.name}"? This cannot be undone easily.`)) return;
    setArchiveBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/communities/${c.id}/archive`), { method: "DELETE", headers: hdrs() });
      if (!res.ok) { alert("Archive failed."); return; }
      alert("Community archived."); onClose();
    } catch { alert("Server unreachable. Please check your connection."); }
    finally { setArchiveBusy(false); }
  }

  const [insights, setInsights] = useState<HealthInsight | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [recalcBusy, setRecalcBusy] = useState(false);

  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/communities/${c.id}/insights`), { headers: hdrs() });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setInsights(d?.data ?? d);
    } catch { setInsights(null); }
    finally { setInsightsLoading(false); }
  }, [c.id]);

  async function triggerRecalc() {
    setRecalcBusy(true);
    try {
      await fetch(apiUrl(`/api/communities/${c.id}/health/recalculate`), { method: "POST", headers: hdrs() });
      setTimeout(() => loadInsights(), 1500);
    } catch { }
    finally { setRecalcBusy(false); }
  }

  useEffect(() => {
    if (tab === "requests") loadRequests(null, true);
    if (tab === "members") loadMembers(null, true);
    if (tab === "insights") loadInsights();
  }, [tab, loadRequests, loadMembers, loadInsights]);

  const filteredMembers = memSearch.trim()
    ? members.filter(m => m.username.toLowerCase().includes(memSearch.toLowerCase()))
    : members;

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "requests", label: "Requests", icon: <Inbox size={14} />, badge: requests.length > 0 ? requests.length : undefined },
    { key: "members", label: "Members", icon: <Users size={14} /> },
    ...(c.privacy !== "PUBLIC"
      ? [{ key: "invites" as AdminTab, label: "Invites", icon: <Link size={14} /> }]
      : []
    ),
    { key: "settings", label: "Settings", icon: <Settings size={14} /> },
    { key: "insights", label: "Insights", icon: <BarChart3 size={14} /> },
  ];

  const roleColor = (role: Member["role"]) => {
    if (role === "ADMIN") return "badge-error";
    if (role === "MODERATOR") return "badge-warning";
    return "badge-ghost";
  };

  return (
    <div className="fixed inset-0 z-[110] flex" onClick={closeViaUI}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative ml-auto w-full max-w-lg h-full bg-base-100 flex flex-col shadow-2xl"
        style={{ animation: "slideR .22s ease-out" }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes slideR{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        <div className="shrink-0 px-4 py-3 border-b border-base-300 bg-base-100">
          <div className="flex items-center justify-between mb-3">
            <button onClick={closeViaUI} className="btn btn-ghost btn-sm gap-1 -ml-2 shrink-0"><ChevronLeft size={18} /> Back</button>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="badge badge-warning badge-xs">Admin</span>
                <h2 className="font-bold text-sm truncate max-w-[160px] notranslate">{c.name}</h2>
                <Settings size={14} className="text-base-content/70 shrink-0" />
              </div>
              <p className="text-xs opacity-50 mt-0.5">
                {c.memberCount} members · {c.privacy.toLowerCase()} community
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex-1 btn btn-xs rounded-lg gap-1 transition-all ${tab === t.key ? "bg-blue-700 text-white font-semibold border-none hover:bg-blue-800" : "btn-ghost opacity-60 hover:opacity-100"
                  }`}
              >
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
                {t.badge && (
                  <span className="absolute -top-1 -right-1 bg-error text-error-content text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {t.badge > 9 ? "9+" : t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "requests" && (
            <div className="p-4 space-y-3">
              {reqLoading && requests.length === 0 && <div className="flex justify-center py-10"><Spin /></div>}
              {!reqLoading && requests.length === 0 && (
                <div className="text-center py-14 opacity-50 space-y-2">
                  <div className="flex justify-center text-success mb-2"><CheckCircle2 size={40} /></div>
                  <p className="font-medium">No pending requests</p>
                  <p className="text-xs">
                    {c.privacy === "PUBLIC" ? "Public community — members join instantly." : "All caught up!"}
                  </p>
                </div>
              )}
              {requests.map(req => (
                <div key={req.id} className="rounded-xl border border-base-300 bg-base-200 p-3 flex items-start gap-3">
                  {avatar(req.username, req.profileImage)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">@{req.username}</p>
                    {req.message && <p className="text-xs opacity-60 mt-0.5 line-clamp-2">"{req.message}"</p>}
                    <p className="text-xs opacity-40 mt-0.5">
                      {new Date(req.requestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button className="btn btn-success btn-xs gap-1" disabled={actingReq === req.id} onClick={() => reviewRequest(req.id, true)}>
                      {actingReq === req.id ? <Spin xs /> : "✓ Accept"}
                    </button>
                    <button className="btn btn-ghost btn-xs btn-outline gap-1" disabled={actingReq === req.id} onClick={() => reviewRequest(req.id, false)}>
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
              {reqHasMore && !reqLoading && (
                <button className="w-full py-2 text-sm text-blue-700" onClick={() => loadRequests(reqCursor, false)}>
                  Load more ↓
                </button>
              )}
            </div>
          )}

          {tab === "members" && (
            <div className="p-4 space-y-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" size={14} />
                <input type="text" placeholder="Filter members…" className="input input-bordered input-sm w-full pl-8"
                  value={memSearch} onChange={e => setMemSearch(e.target.value)} />
              </div>
              {memLoading && members.length === 0 && <div className="flex justify-center py-10"><Spin /></div>}
              {!memLoading && members.length === 0 && <div className="text-center py-10 opacity-50"><p>No members found.</p></div>}
              {filteredMembers.map(m => (
                <div key={m.userId} className="rounded-xl border border-base-300 bg-base-200 p-3">
                  <div className="flex items-center gap-3">
                    {avatar(m.username, m.profileImage)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold">@{m.username}</p>
                        <span className={`badge badge-xs ${roleColor(m.role)}`}>{m.role}</span>
                        {m.isMuted && <span className="badge badge-xs badge-warning flex items-center gap-1"><VolumeX size={10} /> Muted</span>}
                        {m.isBanned && <span className="badge badge-xs badge-error flex items-center gap-1"><Ban size={10} /> Banned</span>}
                      </div>
                      <p className="text-xs opacity-40">
                        Joined {new Date(m.joinedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="dropdown dropdown-end">
                      <button tabIndex={0} className="btn btn-ghost btn-xs btn-circle" disabled={actingMem === m.userId}>
                        {actingMem === m.userId ? <Spin xs /> : "⋯"}
                      </button>
                      <ul tabIndex={0} className="dropdown-content menu menu-sm bg-base-100 rounded-xl border border-base-300 shadow-lg z-50 w-44 p-1">
                        {m.role !== "ADMIN" && <li><button onClick={() => memberAction(m.userId, "makeAdmin")}><Crown size={14} /> Make Admin</button></li>}
                        {m.role !== "MODERATOR" && <li><button onClick={() => memberAction(m.userId, "makeMod")}><Shield size={14} /> Make Moderator</button></li>}
                        {m.role !== "MEMBER" && <li><button onClick={() => memberAction(m.userId, "makeMember")}><User size={14} /> Make Member</button></li>}
                        <li className="menu-title"><span className="text-xs opacity-40">Actions</span></li>
                        {!m.isMuted
                          ? <li><button onClick={() => memberAction(m.userId, "mute")}><VolumeX size={14} /> Mute</button></li>
                          : <li><button onClick={() => memberAction(m.userId, "unmute")}><Volume2 size={14} /> Unmute</button></li>}
                        {!m.isBanned
                          ? <li><button className="text-error" onClick={() => memberAction(m.userId, "ban")}><Ban size={14} /> Ban</button></li>
                          : <li><button onClick={() => memberAction(m.userId, "unban")}><CheckCircle2 size={14} /> Unban</button></li>}
                        <li><button className="text-error" onClick={() => memberAction(m.userId, "remove")}><Trash2 size={14} /> Remove</button></li>
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
              {memHasMore && !memLoading && (
                <button className="w-full py-2 text-sm text-blue-700" onClick={() => loadMembers(memCursor, false)}>
                  Load more ↓
                </button>
              )}
            </div>
          )}

          {tab === "invites" && c.privacy !== "PUBLIC" && (
            <InviteTab
              communityId={c.id}
              privacy={c.privacy as "PRIVATE" | "SECRET"}
              communityName={c.name}
            />
          )}

          {tab === "settings" && (
            <div className="p-4 space-y-4">
              {settingsMsg && (
                <div className={`text-sm rounded-xl px-4 py-2 border flex items-center gap-2 shadow-sm ${settingsMsg.startsWith("✅") ? "bg-success/10 border-success/30 text-success" : "bg-error/10 border-error/30 text-error"}`}>
                  {settingsMsg.startsWith("✅") ? (
                    <CheckCircle2 size={16} className="shrink-0 text-success" />
                  ) : (
                    <AlertTriangle size={16} className="shrink-0 text-error" />
                  )}
                  <span className="text-base-content font-medium">{settingsMsg.replace(/^[✅❌]\s*/, "")}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold mb-1">Community Name</label>
                <input className="input input-bordered w-full" maxLength={60}
                  value={settingsForm.name}
                  onChange={e => setSettingsForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Community Avatar</label>
                <div className="flex items-center gap-4 p-3 bg-base-200/50 rounded-2xl border border-base-300">
                  <div className="shrink-0 w-16 h-16 rounded-full overflow-hidden border border-base-300 shadow-sm relative group bg-base-100">
                    <img
                      src={settingsForm.avatarUrl || `https://robohash.org/${encodeURIComponent(settingsForm.name || "avatar")}`}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                    {uploadingImg && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Spin xs />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImg}
                        className="btn btn-sm btn-outline rounded-xl font-bold uppercase tracking-wider text-[10px] gap-1.5"
                      >
                        <Upload size={12} /> {uploadingImg ? "Uploading..." : "Upload Pic"}
                      </button>
                      {settingsForm.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setSettingsForm(f => ({ ...f, avatarUrl: "" }))}
                          className="btn btn-sm btn-ghost text-error rounded-xl font-bold uppercase tracking-wider text-[10px] gap-1.5"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] opacity-50">JPG, PNG, or WebP. Max 5MB.</p>
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Community Cover Image</label>
                <div className="flex flex-col gap-3 p-3 bg-base-200/50 rounded-2xl border border-base-300">
                  <div className="w-full h-24 rounded-xl overflow-hidden border border-base-300 shadow-sm relative group bg-base-100">
                    {settingsForm.coverImageUrl ? (
                      <img
                        src={settingsForm.coverImageUrl}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-blue-700/10 to-blue-500/5" />
                    )}
                    {uploadingCover && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Spin xs />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => coverFileInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="btn btn-sm btn-outline rounded-xl font-bold uppercase tracking-wider text-[10px] gap-1.5"
                      >
                        <Upload size={12} /> {uploadingCover ? "Uploading..." : "Upload Cover"}
                      </button>
                      {settingsForm.coverImageUrl && (
                        <button
                          type="button"
                          onClick={() => setSettingsForm(f => ({ ...f, coverImageUrl: "" }))}
                          className="btn btn-sm btn-ghost text-error rounded-xl font-bold uppercase tracking-wider text-[10px] gap-1.5"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] opacity-50">JPG, PNG, or WebP. Max 5MB.</p>
                  </div>
                </div>
                <input
                  type="file"
                  ref={coverFileInputRef}
                  onChange={handleCoverUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Description</label>
                <textarea className="textarea textarea-bordered w-full resize-none" rows={3} maxLength={500}
                  value={settingsForm.description}
                  onChange={e => setSettingsForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Privacy</label>
                <div className="space-y-2">
                  {(["PUBLIC", "PRIVATE", "SECRET"] as const).map(p => (
                    <button key={p} type="button"
                      onClick={() => setSettingsForm(f => ({ ...f, privacy: p }))}
                      className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${settingsForm.privacy === p ? "border-blue-600 bg-blue-500/10" : "border-base-300 hover:border-base-400"}`}>
                      <span className="text-xl">{PRIV_ICON[p]}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${settingsForm.privacy === p ? "text-blue-600 dark:text-blue-400" : "text-base-content"}`}>
                          {p.charAt(0) + p.slice(1).toLowerCase()}
                        </p>
                        <p className="text-xs opacity-80 text-base-content">{PRIV_DESC[p]}</p>
                      </div>
                      {settingsForm.privacy === p && <span className="text-blue-600 dark:text-blue-400"><Check size={16} /></span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">Permissions</label>
                {[
                  { key: "allowMemberPosts", label: "Members can post", desc: "Any member can create posts" },
                  { key: "requirePostApproval", label: "Require post approval", desc: "Posts need moderator approval" },
                  { key: "feedEligible", label: "Show posts in main feed", desc: "High-engagement posts surface in the main feed" },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-base-300 p-3 cursor-pointer hover:border-base-400">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs opacity-80">{desc}</p>
                    </div>
                    <input type="checkbox" className="toggle border-[#1D4ED8] bg-[#1D4ED8] checked:bg-[#1D4ED8] toggle-sm"
                      checked={settingsForm[key as keyof typeof settingsForm] as boolean}
                      onChange={e => setSettingsForm(f => ({ ...f, [key]: e.target.checked }))} />
                  </label>
                ))}
              </div>
              <button className="btn bg-blue-700 text-white font-semibold border-none hover:bg-blue-800 w-full" disabled={settingsBusy} onClick={saveSettings}>
                {settingsBusy ? <><Spin xs /> Saving…</> : <><Save size={18} className="mr-2" /> Save Changes</>}
              </button>
              <div className="rounded-xl border border-error/30 bg-error/5 p-4 space-y-2 mt-4">
                <p className="text-sm font-semibold text-error flex items-center gap-2"><AlertTriangle size={16} /> Danger Zone</p>
                <p className="text-xs opacity-60">Archiving removes the community from discovery and disables new posts.</p>
                <button className="btn btn-error btn-outline btn-sm w-full" disabled={archiveBusy} onClick={archiveCommunity}>
                  {archiveBusy ? <Spin xs /> : <><Archive size={16} className="mr-2" /> Archive Community</>}
                </button>
              </div>
            </div>
          )}

          {tab === "insights" && (
            <div className="p-4 space-y-4">
              {insightsLoading && <div className="flex justify-center py-10"><Spin /></div>}
              {!insightsLoading && !insights && (
                <div className="text-center py-10 opacity-50 space-y-2">
                  <div className="flex justify-center text-base-content/20 mb-2">
                    <BarChart3 size={48} strokeWidth={1.5} />
                  </div>
                  <p className="text-sm">Could not load insights.</p>
                  <button className="btn btn-sm btn-outline !opacity-100" onClick={loadInsights}>Retry</button>
                </div>
              )}
              {!insightsLoading && insights && (
                <>
                  <div className="rounded-2xl border border-base-300 bg-gradient-to-br from-[#1D4ED8]/10 to-base-200 p-5 text-center">
                    <p className="text-xs opacity-50 uppercase tracking-widest mb-1">Health Score</p>
                    <p className="text-5xl font-black text-blue-700">
                      {insights.healthScore != null ? Math.round(insights.healthScore) : "—"}
                    </p>
                    {insights.healthTier && <p className="text-sm font-semibold mt-1 opacity-70">{insights.healthTier}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: <Users size={14} className="text-blue-600" />, label: "Members", value: insights.memberCount },
                      { icon: <FileText size={14} className="text-emerald-600" />, label: "Posts", value: insights.postCount },
                      { icon: <MessageSquare size={14} className="text-purple-600" />, label: "Comments", value: insights.totalCommentCount },
                      { icon: <Activity size={14} className="text-orange-600" />, label: "Active", value: insights.activeMembers },
                      { icon: <Radio size={14} className="text-rose-600" />, label: "Feed Reach", value: insights.feedReach },
                    ].filter((item) => item.value != null).map((item) => (
                      <div key={item.label} className="rounded-xl border border-base-300 bg-base-200 p-3 text-center flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1.5 opacity-60 mb-1">
                          {item.icon}
                          <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                        </div>
                        <p className="text-lg font-bold">{Number(item.value).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  {insights.components && Object.keys(insights.components).length > 0 && (
                    <div className="rounded-xl border border-base-300 bg-base-200 p-4 space-y-2">
                      <p className="text-xs font-semibold opacity-50 uppercase tracking-widest">Score Breakdown</p>
                      {Object.entries(insights.components).map(([key, val]) => (
                        <div key={key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="opacity-70 capitalize">{key.replace(/_/g, " ")}</span>
                            <span className="font-semibold">{Math.round(val)}</span>
                          </div>
                          <div className="w-full bg-base-300 rounded-full h-1.5">
                            <div className="bg-blue-700 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, val)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button className="btn btn-outline btn-sm w-full gap-2" disabled={recalcBusy} onClick={triggerRecalc}>
                    {recalcBusy ? <><Spin xs /> Recalculating…</> : <><RefreshCw size={14} /> Recalculate Health Score</>}
                  </button>
                </>
              )}
            </div>
          )}
      {editorImageSrc && (
        <ImageEditorModal
          isOpen={editorOpen}
          onClose={() => {
            setEditorOpen(false);
            setEditorImageSrc(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          imageSrc={editorImageSrc}
          onSave={handleEditorSave}
        />
      )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CREATE COMMUNITY MODAL
════════════════════════════════════════════════════════════════════════════ */
function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: (c: CommunityData) => void }) {
  const { closeViaUI } = useBackNavigation(onClose);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<CreateForm>({
    name: "", description: "", category: "OTHER", tags: "",
    privacy: "PUBLIC", locationRestricted: false, avatarUrl: "",
    allowMemberPosts: true, requirePostApproval: false,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  
  // Image Upload & Editor States (Avatar)
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
  const [selectedBlob, setSelectedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cover Image Upload States
  const [selectedCoverBlob, setSelectedCoverBlob] = useState<Blob | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const canNext = form.name.trim().length >= 3 && form.description.trim().length >= 10;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast.error("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showToast.error("File size exceeds 5MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditorImageSrc(reader.result as string);
      setEditorOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleEditorSave = async (editedBlob: Blob) => {
    setSelectedBlob(editedBlob);
    setPreviewUrl(URL.createObjectURL(editedBlob));
    setEditorOpen(false);
    setEditorImageSrc(null);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast.error("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showToast.error("File size exceeds 5MB limit.");
      return;
    }
    setSelectedCoverBlob(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
  };

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(apiUrl("/api/communities"), {
        method: "POST", headers: hdrs(),
        body: JSON.stringify({
          name: form.name.trim(), description: form.description.trim(),
          category: form.category, tags: form.tags.trim(), privacy: form.privacy,
          avatarUrl: null,
          locationRestricted: form.locationRestricted,
          allowMemberPosts: form.allowMemberPosts, requirePostApproval: form.requirePostApproval,
        }),
      });
      if (res.status === 401 || res.status === 403) { setErr("Please log in."); return; }
      if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d?.message || `Error ${res.status}`); return; }
      const d = await res.json(); 
      let raw = d?.data ?? d;

      // Upload avatar image if a blob was selected
      if (selectedBlob) {
        try {
          const file = new File([selectedBlob], "community_avatar.jpg", { type: "image/jpeg" });
          const uploadData = await communityService.uploadCommunityImage(raw.id, file, "avatar");
          const updatedUrl = uploadData?.avatarUrl || uploadData?.data?.avatarUrl || uploadData?.data?.data?.avatarUrl;
          if (updatedUrl) {
            raw = { ...raw, avatarUrl: updatedUrl };
          }
        } catch (uploadErr: any) {
          console.error("Failed to upload community avatar image during creation:", uploadErr);
          showToast.error("Community created, but avatar image upload failed.");
        }
      }

      // Upload cover image if selected
      if (selectedCoverBlob) {
        try {
          const file = new File([selectedCoverBlob], "community_cover.jpg", { type: selectedCoverBlob.type || "image/jpeg" });
          const uploadData = await communityService.uploadCommunityImage(raw.id, file, "cover");
          const updatedUrl = uploadData?.coverImageUrl || uploadData?.data?.coverImageUrl || uploadData?.data?.data?.coverImageUrl;
          if (updatedUrl) {
            raw = { ...raw, coverImageUrl: updatedUrl };
          }
        } catch (uploadErr: any) {
          console.error("Failed to upload community cover image during creation:", uploadErr);
          showToast.error("Community created, but cover image upload failed.");
        }
      }

      onDone({ 
        ...raw, 
        isMember: true, 
        isOwner: true, 
        postCount: raw.postCount ?? 0, 
        memberCount: raw.memberCount ?? 1, 
        createdAt: raw.createdAt ?? new Date().toISOString() 
      });
    } catch { setErr("Server unreachable."); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeViaUI}>
      <div className="w-full max-w-sm bg-base-100/95 rounded-2xl border border-white/10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.4)] max-h-[85vh] flex flex-col overflow-hidden backdrop-blur-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-content/5 shrink-0">
          <div>
            <h2 className="font-black text-base uppercase tracking-tight flex items-center gap-2 text-base-content">
              <Plus size={15} className="text-blue-700" /> Community
            </h2>
            <div className="flex gap-1 mt-1.5">
              {[1, 2].map(s => <div key={s} className={`h-1 w-5 rounded-full transition-all duration-500 ${step >= s ? "bg-blue-700 w-8" : "bg-base-300"}`} />)}
            </div>
          </div>
          <button onClick={closeViaUI} className="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-base-content hover:bg-base-300/50"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {err && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-2 flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse">
              <AlertTriangle size={16} className="text-red-500 shrink-0" />
              <span>{err}</span>
            </div>
          )}
          
          {step === 1 && (
            <>
              <div>
                <label className="block text-[10px] uppercase font-black tracking-widest text-base-content/80 mb-1">Name <span className="text-error">*</span></label>
                <input autoFocus className="input input-bordered input-sm w-full rounded-xl font-medium text-base-content" placeholder="e.g. Pune Cyclists Club" maxLength={60}
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <p className="text-[9px] font-bold opacity-65 mt-1 uppercase tracking-tighter text-base-content">{form.name.length}/60 · min 3</p>
              </div>
              
              <div>
                <label className="block text-[10px] uppercase font-black tracking-widest text-base-content/80 mb-1.5">Community Avatar</label>
                <div className="flex items-center gap-4 p-3 bg-base-200/50 rounded-2xl border border-base-300">
                  <div className="avatar shrink-0">
                    <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-md bg-base-300 relative flex items-center justify-center font-bold text-2xl text-blue-700 uppercase">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        (form.name?.[0] || "?").toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-xs bg-blue-700 text-white border-none hover:bg-blue-800 rounded-lg font-bold uppercase tracking-wider text-[9px] px-3 py-1.5 h-auto cursor-pointer"
                      >
                        Upload Pic
                      </button>
                      {previewUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBlob(null);
                            setPreviewUrl(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="btn btn-xs btn-ghost text-error rounded-lg font-bold uppercase tracking-wider text-[9px] px-3 py-1.5 h-auto cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[9px] opacity-65 mt-1.5 text-base-content">JPG, PNG, or WebP. Max 5MB.</p>
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black tracking-widest text-base-content/80 mb-1.5">Community Cover Image</label>
                <div className="flex flex-col gap-3 p-3 bg-base-200/50 rounded-2xl border border-base-300">
                  <div className="w-full h-24 rounded-xl overflow-hidden border border-base-300 shadow-sm relative bg-base-100 flex items-center justify-center">
                    {coverPreviewUrl ? (
                      <img src={coverPreviewUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-blue-700/10 to-blue-500/5" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => coverFileInputRef.current?.click()}
                        className="btn btn-xs bg-blue-700 text-white border-none hover:bg-blue-800 rounded-lg font-bold uppercase tracking-wider text-[9px] px-3 py-1.5 h-auto cursor-pointer"
                      >
                        Upload Cover
                      </button>
                      {coverPreviewUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCoverBlob(null);
                            setCoverPreviewUrl(null);
                            if (coverFileInputRef.current) coverFileInputRef.current.value = "";
                          }}
                          className="btn btn-xs btn-ghost text-error rounded-lg font-bold uppercase tracking-wider text-[9px] px-3 py-1.5 h-auto cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[9px] opacity-65 text-base-content">JPG, PNG, or WebP. Max 5MB.</p>
                  </div>
                </div>
                <input
                  type="file"
                  ref={coverFileInputRef}
                  onChange={handleCoverUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black tracking-widest text-base-content/80 mb-1">Description <span className="text-error">*</span></label>
                <textarea className="textarea textarea-bordered transition-all focus:textarea-primary w-full resize-none text-sm rounded-xl min-h-[80px] text-base-content" rows={3} maxLength={500}
                  placeholder="What's this community about?"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                <p className="text-[9px] font-bold opacity-65 mt-1 uppercase tracking-tighter text-base-content">{form.description.length}/500</p>
              </div>
              
              <div>
                <label className="block text-[10px] uppercase font-black tracking-widest text-base-content/80 mb-2">Category</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {CATS.map(cat => (
                    <button key={cat} type="button" onClick={() => setForm(f => ({ ...f, category: cat }))}
                      className={`rounded-xl border py-2 px-1 text-center transition-all duration-300 cursor-pointer ${form.category === cat ? "border-red-500 bg-red-500/15 text-red-500 scale-[1.02] shadow-[0_0_15px_rgba(239,68,68,0.4)]" : "border-base-300 hover:border-base-400 opacity-90 text-base-content"}`}>
                      <div className="text-base mb-0.5">{CAT_ICON[cat]}</div>
                      <div className="text-[9px] font-black uppercase tracking-tighter leading-none">{cat.replace(/_/g, " ")}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-2 text-base-content">Privacy</label>
                <div className="space-y-2">
                  {(["PUBLIC", "PRIVATE", "SECRET"] as const).map(p => (
                    <button key={p} type="button" onClick={() => setForm(f => ({ ...f, privacy: p }))}
                      className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${form.privacy === p ? "border-red-500 bg-red-500/10 shadow-sm scale-[1.01]" : "border-base-content/5 hover:border-base-content/10"}`}>
                      <span className={`text-xl opacity-80 ${form.privacy === p ? "text-red-500" : ""}`}>{PRIV_ICON[p]}</span>
                      <div className="flex-1">
                        <p className={`text-[11px] font-black uppercase tracking-tight ${form.privacy === p ? "text-red-500" : "text-base-content/95"}`}>{p}</p>
                        <p className="text-[9px] font-medium opacity-65 uppercase tracking-tighter leading-none text-base-content">{PRIV_DESC[p]}</p>
                      </div>
                      {form.privacy === p && <span className="text-red-500 text-xs shadow-sm"><Check size={14} /></span>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black tracking-widest text-base-content/80 mb-1">Tags <span className="opacity-65 font-normal">(optional)</span></label>
                <input className="input input-bordered input-sm w-full rounded-xl text-base-content" placeholder="civic, roads, water"
                  value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-black tracking-widest text-base-content/80 mb-1">Settings</label>
                {[
                  { key: "allowMemberPosts", label: "Members can post", desc: "Allow anyone to create posts" },
                  { key: "requirePostApproval", label: "Approve posts", desc: "Moderator must review" },
                  { key: "locationRestricted", label: "Local Only", desc: "Limit to your pincode" },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-base-content/5 p-2 px-3 cursor-pointer hover:bg-base-200/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-tight text-base-content/90 truncate">{label}</p>
                      <p className="text-[9px] font-medium opacity-65 uppercase tracking-tighter leading-none text-base-content">{desc}</p>
                    </div>
                    <input type="checkbox" className="toggle toggle-error toggle-sm scale-90"
                      checked={form[key as keyof CreateForm] as boolean}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="shrink-0 px-4 py-3 border-t border-base-content/5 bg-white/5 flex gap-3">
          {step === 2 && (
            <button
              className="btn btn-sm btn-ghost rounded-xl text-[11px] font-black uppercase tracking-widest flex-none px-4 text-base-content cursor-pointer"
              onClick={() => setStep(1)}
              disabled={busy}
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {step === 1
            ? (
              <button
                className={`btn btn-sm flex-1 rounded-xl text-white text-[11px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer ${!canNext ? "opacity-50" : "bg-blue-700 hover:bg-blue-800 shadow-lg shadow-blue-700/20"}`}
                disabled={!canNext}
                onClick={() => setStep(2)}
              >
                Next <HiOutlineArrowRight size={14} />
              </button>
            ) : (
              <button
                className={`btn btn-sm flex-1 rounded-xl text-white text-[11px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer ${busy ? "opacity-70" : "bg-blue-700 hover:bg-blue-800 shadow-lg shadow-blue-700/20"}`}
                disabled={busy}
                onClick={submit}
              >
                {busy ? "Creating…" : <><Rocket size={16} className="shrink-0" /> Create Community</>}
              </button>
            )
          }
        </div>
      </div>
      {editorImageSrc && (
        <div onClick={e => e.stopPropagation()}>
          <ImageEditorModal
            isOpen={editorOpen}
            onClose={() => {
              setEditorOpen(false);
              setEditorImageSrc(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            imageSrc={editorImageSrc}
            onSave={handleEditorSave}
          />
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   DETAIL PANEL
════════════════════════════════════════════════════════════════════════════ */
function DetailPanel({
  community,
  onClose,
  onMembershipChange,
}: {
  community: CommunityData;
  onClose: () => void;
  onMembershipChange: (id: number, isMember: boolean, delta: number, hasPendingRequest?: boolean, communityData?: CommunityData) => void;
}) {
  const navigate = useNavigate();
  const { closeViaUI } = useBackNavigation(onClose);
  const normalise = (raw: CommunityData): CommunityData =>
    raw.isOwner ? { ...raw, isMember: true } : raw;

  const [c, setC] = useState(() => normalise(community));
  const [tab, setTab] = useState<"posts" | "about">("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [acting, setActing] = useState(false);
  const [openCreatePost, setOpenCreatePost] = useState(false);
  const [postSort, setPostSort] = useState<"NEW" | "TOP">("NEW");
  const [cursorScore, setCursorScore] = useState<number | null>(null);

  // ── JWT Decode for CurrentUser ──
  const currentUser: CardUser | null = (() => {
    const t = getToken();
    if (!t) return null;
    try {
      const d: any = jwtDecode(t);
      return {
        id: d.id,
        role: d.role,
        username: d.sub || d.username || "User",
      };
    } catch { return null; }
  })();


  useEffect(() => { setC(normalise(community)); }, [community]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/communities/${community.slug}`), { headers: hdrs() });
        if (!res.ok) return;
        const d = await res.json();
        const detail = d?.data ?? d;
        if (active && detail) {
          const fetchedMember = detail.isMember === true || detail.member === true || detail.isMember === "true" || detail.member === "true";
          const backendPending = detail.hasPendingRequest === true || detail.pendingRequest === true || detail.hasPendingRequest === "true" || detail.pendingRequest === "true";
          const communityId = detail.id ?? community.id;
          const localPending = getPendingLocal().includes(String(communityId));
          const finalIsOwner = detail.isOwner === true || detail.owner === true || detail.isOwner === "true" || detail.owner === "true" || !!community.isOwner;

          if (fetchedMember || finalIsOwner) removePendingLocal(communityId);
          else if (backendPending) addPendingLocal(communityId);

          setC(prev => normalise({
            ...prev,
            ...detail,
            id: communityId,
            isMember: fetchedMember || finalIsOwner,
            isOwner: finalIsOwner,
            hasPendingRequest: (fetchedMember || finalIsOwner) ? false : (backendPending || prev.hasPendingRequest === true || localPending)
          }));
        }
      } catch { }
    })();
    return () => { active = false; };
  }, [community.slug]);

  const loadPosts = useCallback(async (cur: number | null, score: number | null, replace: boolean) => {
    const canView = c.isMember || c.isOwner || c.privacy === "PUBLIC";
    if (!canView) return;
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: "15" });
      if (cur !== null) p.set("cursor", String(cur));
      if (postSort === "TOP" && score !== null) p.set("cursorScore", String(score));

      const endpoint = postSort === "TOP"
        ? `/api/communities/${c.id}/posts/top?${p}`
        : `/api/communities/${c.id}/posts?${p}`;

      const res = await fetch(endpoint, { headers: hdrs() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const paged: any = data?.data ?? data;
      const arr = paged?.content ?? paged?.data ?? [];
      setPosts(prev => replace ? arr : [...prev, ...arr]);
      setHasMore(paged?.hasMore ?? false);
      setCursor(paged?.nextCursor ?? null);
      if (postSort === "TOP") {
        setCursorScore(paged?.nextCursorScore ?? null);
      }
    } catch { }
    finally { setLoading(false); }
  }, [c.id, c.isMember, c.isOwner, c.privacy, postSort]);

  useEffect(() => {
    const canView = c.isMember || c.isOwner || c.privacy === "PUBLIC";
    if (canView) {
      loadPosts(null, null, true);
    } else {
      setPosts([]);
    }
  }, [loadPosts, c.isMember, c.isOwner, c.privacy, postSort]);

  async function toggleMembership() {
    setActing(true);
    try {
      if (c.isMember) {
        if (!window.confirm(`Leave "${c.name}"?`)) return;
        const res = await fetch(apiUrl(`/api/communities/${c.id}/leave`), { method: "DELETE", headers: hdrs() });
        if (!res.ok) { alert((await res.json().catch(() => ({}))).message || "Could not leave."); return; }
        setC(p => ({ ...p, isMember: false, memberCount: p.memberCount - 1 }));
        onMembershipChange(c.id, false, -1, false, { ...c, isMember: false, memberCount: c.memberCount - 1 });
      } else if (c.hasPendingRequest) {
        await fetch(apiUrl(`/api/communities/${c.id}/join-requests/me`), { method: "DELETE", headers: hdrs() });
        removePendingLocal(c.id);
        setC(p => ({ ...p, hasPendingRequest: false }));
        onMembershipChange(c.id, false, 0, false, { ...c, hasPendingRequest: false });
      } else {
        const res = await fetch(apiUrl(`/api/communities/${c.id}/join`), { method: "POST", headers: hdrs(), body: JSON.stringify({}) });
        if (res.status === 401) { alert("Please log in."); return; }
        const d = await res.json(); const joined = d?.data?.joined ?? false;
        const newHasPending = !joined && String(c.privacy).toUpperCase() === "PRIVATE";
        if (newHasPending) addPendingLocal(c.id);
        else if (joined) removePendingLocal(c.id);
        setC(p => ({ ...p, isMember: joined, hasPendingRequest: newHasPending, memberCount: joined ? p.memberCount + 1 : p.memberCount }));
        onMembershipChange(c.id, joined, joined ? 1 : 0, newHasPending, { ...c, isMember: joined, hasPendingRequest: newHasPending, memberCount: joined ? c.memberCount + 1 : c.memberCount });
        
        // Cache the community if we successfully joined it
        if (joined) {
          cacheSuggestion({
            kind: 'COMMUNITY',
            id: c.id,
            displayText: c.name,
            subText: c.description,
            avatarUrl: c.avatarUrl || undefined,
            slug: c.slug
          });
        }
      }
    } catch { alert("Action failed."); }
    finally { setActing(false); }
  }

  const canPost = c.isOwner || (c.isMember && c.allowMemberPosts !== false);
  const isSecret = c.privacy === "SECRET" && !c.isMember;
  const canViewPosts = c.isMember || c.isOwner || c.privacy === "PUBLIC";

  return (
    <div className="fixed inset-0 z-[110] flex" onClick={closeViaUI}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative ml-auto w-full max-w-xl h-full bg-base-100 flex flex-col shadow-2xl overflow-hidden"
        style={{ animation: "slideR .22s ease-out" }} onClick={e => e.stopPropagation()}>

        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-base-300">
          <button className="btn btn-ghost btn-sm gap-1" onClick={closeViaUI}><ChevronLeft size={18} /> Back</button>
          {!c.isOwner
            ? <button
              className={`btn btn-sm flex items-center gap-1.5 ${c.isMember ? "border border-red-500 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 bg-transparent font-medium" : c.hasPendingRequest ? "btn-warning btn-outline" : isSecret ? "btn-disabled" : "bg-blue-700 text-white font-semibold border-none hover:bg-blue-800"}`}
              onClick={toggleMembership} disabled={acting || isSecret}>
              {acting ? (
                <Spin xs />
              ) : c.isMember ? (
                "Leave"
              ) : c.hasPendingRequest ? (
                <>
                  <Clock size={14} />
                  <span>Pending · Cancel</span>
                </>
              ) : isSecret ? (
                "Invite Only"
              ) : c.privacy === "PRIVATE" ? (
                "Request to Join"
              ) : (
                "Join Community"
              )}
            </button>
            : <div className="flex items-center gap-2">
              <span className="badge badge-warning gap-1.5 font-bold py-3"><Crown size={14} /> Owner</span>
            </div>
          }
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <CommunityHeader
              community={c}
              acting={acting}
              onJoinClick={toggleMembership}
              onImageUploaded={(type, url) => {
                setC(prev => ({ ...prev, [type === "avatar" ? "avatarUrl" : "coverImageUrl"]: url }));
                onMembershipChange(c.id, c.isMember ?? false, 0, c.hasPendingRequest, { ...c, [type === "avatar" ? "avatarUrl" : "coverImageUrl"]: url });
              }}
            />
            <CommunityTabs active={tab} onChange={setTab} />

            {tab === "posts" && (
              <div className="space-y-3">
                {!canViewPosts ? (
                  <div className="text-center py-12 opacity-50 space-y-2">
                    <div className="flex justify-center mb-2"><Lock size={40} /></div>
                    <p className="text-sm">Join this community to view posts.</p>
                  </div>
                ) : (
                  <>
                    {canPost && (
                      <button
                        className="btn w-full bg-[#1D4ED8] hover:bg-blue-800 text-white border-none rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm font-semibold shadow-sm hover:shadow transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99]"
                        onClick={() => setOpenCreatePost(true)}
                      >
                        <Plus size={16} /> Create a community post
                      </button>
                    )}

                    <CreatePost
                      open={openCreatePost}
                      onClose={() => setOpenCreatePost(false)}
                      communityId={c.id}
                      communityName={c.name}
                      onPostCreated={(newPost: Post) => {
                        setPosts((prev) => [newPost, ...prev]);
                        setC((prev) => ({ ...prev, postCount: prev.postCount + 1 }));
                      }}
                    />

                    <div className="flex items-center justify-between border-b border-base-300 pb-2">
                      <span className="text-sm font-semibold opacity-80">Feed</span>
                      <div className="flex bg-base-200 rounded-lg p-0.5 border border-base-300">
                        <button
                          className={`btn btn-xs rounded-md border-none flex items-center gap-1 ${postSort === "NEW" ? "bg-base-100 shadow-sm text-base-content" : "btn-ghost text-base-content/60"}`}
                          onClick={() => setPostSort("NEW")}
                          disabled={loading}
                        >
                          <Sparkles size={12} className="text-amber-500" />
                          <span>New</span>
                        </button>
                        <button
                          className={`btn btn-xs rounded-md border-none flex items-center gap-1 ${postSort === "TOP" ? "bg-base-100 shadow-sm text-base-content" : "btn-ghost text-base-content/60"}`}
                          onClick={() => setPostSort("TOP")}
                          disabled={loading}
                        >
                          <Flame size={12} className="text-orange-500" />
                          <span>Trending</span>
                        </button>
                      </div>
                    </div>

                    {loading && posts.length === 0 && (
                      <div className="space-y-4 pt-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <PostSkeleton key={`sk-comm-${i}`} />
                        ))}
                      </div>
                    )}
                    {!loading && posts.length === 0 && (
                      <div className="text-center py-12 opacity-50 space-y-2">
                        <div className="flex justify-center mb-2"><Inbox size={40} /></div>
                        <p className="text-sm">{canPost ? "No posts yet — be the first!" : "No posts yet."}</p>
                      </div>
                    )}
                    {posts.map(post => {
                      const cardPost = toPostCardPost({
                        ...post,
                        variant: "social", // allow toPostCardPost to re-detect if it's a poll
                        username: post.authorUsername,
                        userProfileImage: post.authorProfileImage,
                        isLikedByCurrentUser: post.isLikedByMe,
                        communityId: c.id,
                        communityName: c.name,
                        communityAvatar: c.avatarUrl || undefined,
                        communityMemberCount: String(c.memberCount || 0),
                        isMember: c.isMember,
                      });

                      return (
                        <PostCard
                          key={post.id}
                          post={cardPost}
                          currentUser={currentUser || undefined}
                          hideCommunityStrip={true}
                        />
                      );
                    })}

                    {hasMore && !loading && (
                      <button className="w-full py-2 text-sm text-blue-700 hover:opacity-70" onClick={() => loadPosts(cursor, cursorScore, false)}>Load more ↓</button>
                    )}
                  </>
                )}
              </div>
            )}

            {tab === "about" && (
              <div className="space-y-6">
                <div className="rounded-xl border border-base-300 bg-base-200 p-5">
                  <h3 className="font-semibold mb-3 text-lg">About this community</h3>
                  <p className="text-sm opacity-80 whitespace-pre-line leading-relaxed">
                    {c.description || "No detailed description provided."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {([
                    ["Members", c.memberCount.toLocaleString(), <Users size={14} />],
                    ["Posts", c.postCount.toLocaleString(), <MessageSquare size={14} />],
                    ["Privacy", c.privacy, <Lock size={14} />],
                    ["Since", new Date(c.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }), <Calendar size={14} />],
                    c.category ? ["Category", c.category.replace(/_/g, " "), <Tag size={14} />] : null,
                  ] as Array<[string, string, React.ReactNode] | null>).filter((item): item is [string, string, React.ReactNode] => !!item).map(([l, v, ico]) => (
                    <div key={l} className="rounded-xl border border-base-300 bg-base-200 p-3">
                      <p className="text-xs opacity-50 mb-1 flex items-center gap-1">{ico} {l}</p>
                      <p className="text-sm font-semibold">{v}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-base-300 bg-base-200 p-5">
                  <h3 className="font-semibold mb-3 text-lg">Media &amp; Data</h3>
                  {(() => {
                    const mediaList: Array<{ url: string; type: "image" | "video"; postId: number }> = [];
                    posts.forEach(p => {
                      const urls = new Set<string>();
                      if (p.mediaUrls && Array.isArray(p.mediaUrls)) {
                        p.mediaUrls.forEach(u => { if (u) urls.add(u); });
                      }
                      if (p.imageUrl) {
                        urls.add(p.imageUrl);
                      }
                      urls.forEach(url => {
                        const isVideo = /\.(mp4|webm|ogg|mov|m4v)$/i.test(url) || url.includes("/video");
                        mediaList.push({ url, type: isVideo ? "video" : "image", postId: p.id });
                      });
                    });

                    if (mediaList.length > 0) {
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {mediaList.slice(0, 6).map((item, idx) => (
                            <div
                              key={idx}
                              onClick={() => navigate(`/post/${item.postId}`)}
                              className="aspect-square rounded-xl bg-base-300/50 flex items-center justify-center overflow-hidden border border-base-300 text-base-content hover:scale-[1.02] transition-all cursor-pointer relative group/media"
                            >
                              {item.type === "video" ? (
                                <>
                                  <video
                                    src={item.url}
                                    className="w-full h-full object-cover"
                                    muted
                                    playsInline
                                    loop
                                    onMouseOver={e => e.currentTarget.play().catch(() => {})}
                                    onMouseOut={e => e.currentTarget.pause()}
                                  />
                                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover/media:bg-black/40 transition-colors">
                                    <span className="text-white text-[9px] bg-black/60 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Video</span>
                                  </div>
                                </>
                              ) : (
                                <img
                                  src={item.url}
                                  alt="Uploaded content"
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover/media:scale-105"
                                  onError={e => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <div className="text-center py-8 opacity-55 border-2 border-dashed border-base-300 rounded-xl space-y-1.5 bg-base-100/50">
                        <ImageIcon size={32} className="mx-auto opacity-30" />
                        <p className="text-xs font-bold uppercase tracking-wider">No media uploaded yet</p>
                        <p className="text-[10px] opacity-70">Images and videos shared in community posts will appear here.</p>
                      </div>
                    );
                  })()}
                </div>

                <CommunitySidebar />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════════════ */
const DEFAULT_RECOMMENDED: CommunityData[] = [
  {
    id: 9991,
    name: "Civic Pune Action Group",
    slug: "civic-pune-action",
    description: "Collaborative platform for citizen engagement, road repairs, and public amenity improvements in Pune.",
    privacy: "PUBLIC",
    avatarUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=150&q=80",
    coverImageUrl: null,
    category: "CIVIC_ISSUES",
    memberCount: 1420,
    postCount: 89,
    isMember: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 9992,
    name: "Tech Hub India",
    slug: "tech-hub-india",
    description: "Connecting developers, designers, and startup enthusiasts across India to share ideas and collaborate.",
    privacy: "PUBLIC",
    avatarUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=150&q=80",
    coverImageUrl: null,
    category: "TECHNOLOGY",
    memberCount: 3250,
    postCount: 154,
    isMember: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 9993,
    name: "Clean & Green Mumbai",
    slug: "clean-green-mumbai",
    description: "Join the movement to make Mumbai cleaner, greener, and more sustainable. Organizing local clean-up drives.",
    privacy: "PUBLIC",
    avatarUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=150&q=80",
    coverImageUrl: null,
    category: "ENVIRONMENT",
    memberCount: 890,
    postCount: 42,
    isMember: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 9994,
    name: "Healthy Living & Wellness",
    slug: "healthy-living",
    description: "Daily tips, discussions, and local group activities focused on physical fitness, mental health, and nutrition.",
    privacy: "PUBLIC",
    avatarUrl: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=150&q=80",
    coverImageUrl: null,
    category: "HEALTH",
    memberCount: 1730,
    postCount: 96,
    isMember: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 9995,
    name: "Local Governance Pune",
    slug: "local-gov-pune",
    description: "Official update and discussion forum for Pune local municipal issues, ward meetings, and public notices.",
    privacy: "PUBLIC",
    avatarUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=150&q=80",
    coverImageUrl: null,
    category: "LOCAL_GOVERNANCE",
    memberCount: 2150,
    postCount: 112,
    isMember: false,
    createdAt: new Date().toISOString()
  }
];

function RecommendedCarousel({
  recommended,
  loading,
  onSelect,
  onJoin,
  joiningId
}: {
  recommended: CommunityData[];
  loading: boolean;
  onSelect: (c: CommunityData) => void;
  onJoin: (e: React.MouseEvent, c: CommunityData) => void;
  joiningId: number | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    if (recommended.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % recommended.length);
  }, [recommended.length]);

  const prevSlide = useCallback(() => {
    if (recommended.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + recommended.length) % recommended.length);
  }, [recommended.length]);

  // Autoplay loop
  useEffect(() => {
    if (isPaused || recommended.length < 3) return;
    timerRef.current = setInterval(nextSlide, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, nextSlide, recommended.length]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-base-300 bg-base-200/50 p-6 flex flex-col items-center justify-center min-h-[220px] animate-pulse">
        <div className="h-4 bg-base-300 rounded w-1/3 mb-6" />
        <div className="flex gap-4 w-full justify-center items-center">
          <div className="w-1/4 h-32 bg-base-300 rounded-2xl opacity-50" />
          <div className="w-1/3 h-40 bg-base-300 rounded-2xl" />
          <div className="w-1/4 h-32 bg-base-300 rounded-2xl opacity-50" />
        </div>
      </div>
    );
  }

  if (recommended.length < 3) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) prevSlide();
      else nextSlide();
    }
    touchStartX.current = null;
    // Resume auto-play after a short delay
    setTimeout(() => setIsPaused(false), 2000);
  };

  return (
    <div 
      className="relative flex flex-col items-center justify-center py-6 select-none overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="w-full text-left mb-4 px-1">
        <p className="text-xs font-bold uppercase tracking-widest text-base-content/95">
          Recommended Communities
        </p>
      </div>

      {/* 3D Carousel container */}
      <div 
        className="relative w-full h-[220px] flex items-center justify-center"
        style={{
          perspective: "1200px",
          transformStyle: "preserve-3d"
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-base-100/70 hover:bg-base-100 border border-base-300/80 backdrop-blur-md text-base-content hover:text-blue-500 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
          aria-label="Previous slide"
        >
          <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
        </button>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-base-100/70 hover:bg-base-100 border border-base-300/80 backdrop-blur-md text-base-content hover:text-blue-500 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
          aria-label="Next slide"
        >
          <ChevronRight size={18} className="sm:w-5 sm:h-5" />
        </button>

        {recommended.map((c, i) => {
          const n = recommended.length;
          let diff = i - activeIndex;
          
          // Wrap around for circular loop
          if (diff < -n / 2) diff += n;
          if (diff > n / 2) diff -= n;

          const isActive = diff === 0;
          const isLeft = diff === -1;
          const isRight = diff === 1;

          // Compute style
          let transform = "";
          let opacity = 0;
          let zIndex = 0;
          let pointerEvents: "auto" | "none" = "none";

          if (isActive) {
            transform = "translateX(0) scale(1) translateZ(0) rotateY(0deg)";
            opacity = 1;
            zIndex = 20;
            pointerEvents = "auto";
          } else if (isLeft) {
            transform = "translateX(-28%) scale(0.82) translateZ(-120px) rotateY(20deg)";
            opacity = 0.55;
            zIndex = 10;
            pointerEvents = "auto";
          } else if (isRight) {
            transform = "translateX(28%) scale(0.82) translateZ(-120px) rotateY(-20deg)";
            opacity = 0.55;
            zIndex = 10;
            pointerEvents = "auto";
          } else {
            transform = `translateX(${diff > 0 ? "40%" : "-40%"}) scale(0.65) translateZ(-240px)`;
            opacity = 0;
            zIndex = 0;
            pointerEvents = "none";
          }

          const imgSrc = c.avatarUrl || `https://robohash.org/${encodeURIComponent(c.name)}`;

          return (
            <div
              key={c.id}
              onClick={() => {
                if (isActive) onSelect(c);
                else if (isLeft) prevSlide();
                else if (isRight) nextSlide();
              }}
              className={`absolute w-[290px] sm:w-[320px] h-[190px] rounded-[2rem] border-2 border-base-300 bg-base-100/90 backdrop-blur-md p-5 flex flex-col justify-between shadow-[0_15px_35px_rgba(0,0,0,0.15)] transition-all duration-500 ease-out transform-gpu cursor-pointer ${
                isActive ? "hover:shadow-[0_20px_45px_rgba(29,78,216,0.15)]" : ""
              }`}
              style={{
                transform,
                opacity,
                zIndex,
                pointerEvents,
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden"
              }}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-11 h-11 rounded-full overflow-hidden ring-2 ring-base-300 shadow-sm">
                  <img
                    src={imgSrc}
                    alt={c.name}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = `https://robohash.org/${encodeURIComponent(c.name)}`; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-extrabold text-[13px] text-base-content leading-tight truncate w-full notranslate">{c.name}</p>
                    {c.category && (
                      <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15">
                        {c.category.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-base-content/65 line-clamp-2 mt-1 leading-snug">{c.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-base-content/5">
                <span className="text-[10px] font-bold text-base-content/50 flex items-center gap-1">
                  <Users size={11} className="text-[#1D4ED8]" /> {c.memberCount.toLocaleString()} members
                </span>
                
                {isActive && (
                  <button
                    onClick={(e) => onJoin(e, c)}
                    disabled={joiningId === c.id || c.isMember || c.hasPendingRequest}
                    className={`btn btn-xs rounded-full px-4 h-7 text-[9px] font-black uppercase tracking-wider border-none ${
                      c.isMember 
                        ? "bg-emerald-600 text-white" 
                        : c.hasPendingRequest 
                          ? "bg-warning text-white" 
                          : "bg-blue-700 hover:bg-blue-800 text-white"
                    }`}
                  >
                    {joiningId === c.id ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : c.isMember ? (
                      "Joined"
                    ) : c.hasPendingRequest ? (
                      "Pending"
                    ) : (
                      "Join"
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Control Dots */}
      <div className="flex gap-1.5 mt-2">
        {recommended.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              activeIndex === i ? "bg-[#1D4ED8] w-4" : "bg-base-content/20 w-1.5"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

const Community = () => {
  const [query, setQuery] = useState("");
  const [committed, setCommitted] = useState("");
  const [searchResults, setSearchResults] = useState<CommunityData[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchCursor, setSearchCursor] = useState<number | null>(null);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [suggestions, setSuggestions] = useState<CommunityData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [myCommunities, setMyCommunities] = useState<CommunityData[]>([]);
  const [myCommunitiesLoading, setMyCommunitiesLoading] = useState(true);
  const [selected, setSelected] = useState<CommunityData | null>(null);
  const [adminTarget, setAdminTarget] = useState<CommunityData | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const view = (searchParams.get("tab") as "default" | "joined" | "owned") || "default";

  const setView = (
    newTabOrFn:
      | "default"
      | "joined"
      | "owned"
      | ((prev: "default" | "joined" | "owned") => "default" | "joined" | "owned")
  ) => {
    const nextTab = typeof newTabOrFn === "function" ? newTabOrFn(view) : newTabOrFn;
    setSearchParams(
      (prev) => {
        if (nextTab === "default") {
          prev.delete("tab");
        } else {
          prev.set("tab", nextTab);
        }
        return prev;
      },
      { replace: true }
    );
  };

  const [recommended, setRecommended] = useState<CommunityData[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const { id: slugParam } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const communityQueryParam = searchParams.get("community");
  const activeSlug = slugParam || communityQueryParam || null;

  const openCommunity = (c: CommunityData) => {
    setSelected(c);
    setSearchParams(prev => {
      prev.set("community", c.slug);
      return prev;
    }, { replace: true });
  };

  const closeCommunity = () => {
    setSelected(null);
    setSearchParams(prev => {
      prev.delete("community");
      return prev;
    }, { replace: true });

    if (slugParam) {
      navigate("/communities" + location.search, { replace: true });
    }
  };

  // Load recommended
  useEffect(() => {
    let active = true;
    const loadRecs = async () => {
      try {
        const res = await fetch(apiUrl("/api/communities?size=30"), { headers: hdrs() });
        if (!res.ok) throw new Error();
        const d = await res.json();
        const list = d?.data?.data ?? d?.data?.content ?? d?.data ?? d?.content ?? d ?? [];
        if (active && Array.isArray(list)) {
          const mapped = list.map((c: any): CommunityData => ({
            id: c.id,
            name: c.name || c.communityName || "",
            slug: c.slug || c.communitySlug || String(c.id),
            description: c.description || c.communityDescription || "",
            category: c.category || c.communityCategory || "General",
            privacy: c.privacy || c.communityPrivacy || "PUBLIC",
            avatarUrl: c.avatarUrl || null,
            coverImageUrl: c.coverImageUrl || null,
            memberCount: c.memberCount ?? c.communityMemberCount ?? 0,
            postCount: c.postCount ?? 0,
            isMember: c.isMember ?? c.member ?? false,
            isOwner: c.isOwner ?? c.owner ?? false,
            createdAt: c.createdAt ?? new Date().toISOString(),
            hasPendingRequest: c.hasPendingRequest ?? false,
          }));
          const joinedIds = new Set(myCommunities.map(x => x.id));
          const filtered = mapped.filter(x => !joinedIds.has(x.id));
          
          if (filtered.length < 3) {
            const fallback = DEFAULT_RECOMMENDED.filter(x => !joinedIds.has(x.id));
            setRecommended([...filtered, ...fallback]);
          } else {
            setRecommended(filtered);
          }
        }
      } catch {
        if (active) {
          const joinedIds = new Set(myCommunities.map(x => x.id));
          const fallback = DEFAULT_RECOMMENDED.filter(x => !joinedIds.has(x.id));
          setRecommended(fallback);
        }
      } finally {
        if (active) setRecommendedLoading(false);
      }
    };
    loadRecs();
    return () => { active = false; };
  }, [myCommunities]);

  const handleCarouselJoin = async (e: React.MouseEvent, c: CommunityData) => {
    e.stopPropagation();
    setJoiningId(c.id);
    try {
      const res = await fetch(apiUrl(`/api/communities/${c.id}/join`), { method: "POST", headers: hdrs(), body: JSON.stringify({}) });
      if (res.status === 401) { alert("Please log in."); return; }
      const d = await res.json();
      const joined = d?.data?.joined ?? false;
      const newHasPending = !joined && String(c.privacy).toUpperCase() === "PRIVATE";
      
      setRecommended(prev => prev.map(item => item.id === c.id ? { ...item, isMember: joined, hasPendingRequest: newHasPending, memberCount: joined ? item.memberCount + 1 : item.memberCount } : item));
      
      syncMembership(c.id, joined, joined ? 1 : 0, newHasPending);
    } catch {
      alert("Action failed.");
    } finally {
      setJoiningId(null);
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const quickDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMyCommunities = useCallback(async () => {
    setMyCommunitiesLoading(true);
    try {
      const [joinedRes, ownedRes] = await Promise.allSettled([
        fetch(apiUrl("/api/communities/me?limit=100"), { headers: hdrs() }),
        fetch(apiUrl("/api/communities/owned"), { headers: hdrs() }),
      ]);
      let joined: CommunityData[] = [];
      if (joinedRes.status === "fulfilled" && joinedRes.value.ok) {
        const j = await joinedRes.value.json().catch(() => ({}));
        joined = (j?.data?.content ?? j?.data?.data ?? j?.content ?? []).map((c: any) => {
          const isMem = c.isMember ?? c.member ?? c.isOwner ?? c.owner ?? false;
          const backendPending = c.hasPendingRequest === true || c.pendingRequest === true || c.hasPendingRequest === "true" || c.pendingRequest === "true";
          const localPending = getPendingLocal().includes(String(c.id));
          if (isMem) removePendingLocal(c.id);
          return {
            ...c,
            isMember: isMem,
            isOwner: c.isOwner ?? c.owner ?? false,
            hasPendingRequest: isMem ? false : (backendPending || localPending)
          };
        });
      }
      let owned: CommunityData[] = [];
      if (ownedRes.status === "fulfilled" && ownedRes.value.ok) {
        const o = await ownedRes.value.json().catch(() => ({}));
        owned = (o?.data ?? o?.content ?? []).map((c: any) => {
          removePendingLocal(c.id);
          return { ...c, isMember: true, isOwner: true, hasPendingRequest: false };
        });
      }
      const seen = new Set<number>(); const merged: CommunityData[] = [];
      for (const c of [...owned, ...joined]) { if (!seen.has(c.id)) { seen.add(c.id); merged.push(c); } }
      setMyCommunities(merged);

      // Auto-sync joined communities to offline search cache
      merged.forEach(item => {
        cacheSuggestion({
          kind: 'COMMUNITY',
          id: item.id,
          displayText: item.name,
          subText: item.description,
          avatarUrl: item.avatarUrl || undefined,
          slug: item.slug
        });
      });
    } catch { setMyCommunities([]); }
    finally { setMyCommunitiesLoading(false); }
  }, []);

  useEffect(() => { fetchMyCommunities(); }, [fetchMyCommunities]);

  // ── Auto-select community from URL /:slug or search navigation state ──────────
  useEffect(() => {
    let active = true;
    const navState = (location.state ?? {}) as { selectedCommunity?: any; searchQuery?: string };

    // If navigated with a pre-built community object (from search overlay), select immediately
    if (navState.selectedCommunity) {
      setSelected(navState.selectedCommunity);
      window.history.replaceState({}, ""); // clear state so back nav doesn't re-trigger
      return;
    }

    // If routed to /communities/:slug or ?community=slug, fetch and open that community
    if (activeSlug) {
      fetch(apiUrl(`/api/communities/${activeSlug}`), { headers: hdrs() })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => {
          if (!active) return;
          const c = d?.data ?? d;
          if (c?.id) setSelected(c);
        })
        .catch(() => { /* slug not found — stay on list view */ });
    } else {
      setSelected(null);
      setAdminTarget(null);
    }

    // If navigated with a hashtag search query (from HashtagCard)
    if (navState.searchQuery) {
      setQuery(navState.searchQuery);
      setCommitted(navState.searchQuery);
      doSearch(navState.searchQuery, null, true);
      window.history.replaceState({}, "");
    }

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlug]);


  useEffect(() => {
    if (quickDebounceRef.current) clearTimeout(quickDebounceRef.current);
    const q = query.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    quickDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/api/search/quick?q=${encodeURIComponent(q)}`), { headers: hdrs() });
        if (!res.ok) return;
        const d = await res.json();
        const allHits: any[] = Array.isArray(d?.data) ? d.data : Array.isArray(d?.data?.data) ? d.data.data : d?.content ?? [];
        const communityHits = allHits.filter((r: any) => r.type === "COMMUNITY" || r.resultType === "COMMUNITY");
        const mapped = communityHits.map((r: any): CommunityData => ({
          id: r.communityId ?? r.id, name: r.communityName ?? r.name ?? "",
          slug: r.communitySlug ?? r.slug ?? String(r.communityId ?? r.id),
          description: r.communityDescription ?? r.description ?? "",
          category: r.communityCategory ?? r.category ?? null,
          tags: null, avatarUrl: null, coverImageUrl: null,
          privacy: (r.communityPrivacy ?? r.privacy ?? "PUBLIC") as CommunityData["privacy"],
          locationName: r.locationName ?? null, memberCount: r.communityMemberCount ?? r.memberCount ?? 0,
          postCount: 0, isMember: r.communityIsMember ?? r.isMember ?? r.member ?? false,
          isOwner: r.communityIsOwner ?? r.isOwner ?? r.owner ?? false, createdAt: r.createdAt ?? new Date().toISOString(),
          hasPendingRequest: (r.communityIsMember ?? r.isMember ?? r.member ?? false) ? false : (r.hasPendingRequest === true || r.pendingRequest === true || r.hasPendingRequest === "true" || r.pendingRequest === "true" || getPendingLocal().includes(String(r.communityId ?? r.id)))
        }));
        setSuggestions(mapped);
      } catch { setSuggestions([]); }
    }, 300);
    return () => { if (quickDebounceRef.current) clearTimeout(quickDebounceRef.current); };
  }, [query]);

  const doSearch = useCallback(async (q: string, cur: number | null, replace: boolean) => {
    if (!q.trim()) return;
    if (replace) setSearchLoading(true); else setSearchLoadingMore(true);
    try {
      const p = new URLSearchParams({ q, type: "COMMUNITY", limit: "20" });
      if (cur !== null) p.set("cursor", String(cur));
      const res = await fetch(apiUrl(`/api/search/type?${p}`), { headers: hdrs() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      const paged = d?.hasMore !== undefined ? d : (d?.data ?? d);
      const rawItems: any[] = Array.isArray(paged?.data) ? paged.data : (paged?.content ?? []);
      const mapped = rawItems.map((r: any): CommunityData => {
        const cId = r.communityId ?? r.id;
        const isMem = r.communityIsMember ?? r.isMember ?? r.member ?? false;
        const backendPending = r.hasPendingRequest === true || r.pendingRequest === true || r.hasPendingRequest === "true" || r.pendingRequest === "true";
        const localPending = getPendingLocal().includes(String(cId));
        if (isMem) removePendingLocal(cId);
        return {
          id: cId, name: r.communityName ?? r.name ?? "",
          slug: r.communitySlug ?? r.slug ?? String(cId),
          description: r.communityDescription ?? r.description ?? "",
          category: r.communityCategory ?? r.category ?? null,
          tags: null, avatarUrl: null, coverImageUrl: null,
          privacy: (r.communityPrivacy ?? r.privacy ?? "PUBLIC") as CommunityData["privacy"],
          locationName: r.locationName ?? null, memberCount: r.communityMemberCount ?? r.memberCount ?? 0,
          postCount: r.postCount ?? 0, isMember: isMem,
          isOwner: r.communityIsOwner ?? r.isOwner ?? r.owner ?? false, createdAt: r.createdAt ?? new Date().toISOString(),
          allowMemberPosts: r.allowMemberPosts, requirePostApproval: r.requirePostApproval, feedEligible: r.feedEligible,
          hasPendingRequest: isMem ? false : (backendPending || localPending)
        };
      });
      setSearchResults(prev => replace ? mapped : [...prev, ...mapped]);
      setSearchHasMore(paged?.hasMore ?? false);
      setSearchCursor(paged?.nextCursor ?? null);
    } catch { if (replace) setSearchResults([]); }
    finally { if (replace) setSearchLoading(false); else setSearchLoadingMore(false); }
  }, []);

  function commitSearch(q: string) {
    const t = q.trim();
    setQuery(t); setCommitted(t); setShowSuggestions(false); setSuggestions([]);
    setSearchResults([]); setSearchCursor(null); setView("default");
    if (t) doSearch(t, null, true);
  }

  function syncMembership(id: number, isMember: boolean, delta: number, hasPendingRequest?: boolean, communityData?: CommunityData) {
    const upd = (c: CommunityData): CommunityData => c.id === id ? { ...c, isMember, memberCount: c.memberCount + delta, hasPendingRequest: hasPendingRequest ?? c.hasPendingRequest } : c;
    setSearchResults(p => p.map(upd));
    setRecommended(p => p.map(upd));
    setSelected(prev => prev && prev.id === id ? { ...prev, isMember, memberCount: prev.memberCount + delta, hasPendingRequest: hasPendingRequest ?? prev.hasPendingRequest } : prev);
    setMyCommunities(p => {
      const e = p.some(c => c.id === id);
      if (e) {
        if (!isMember && !hasPendingRequest) {
          const item = p.find(c => c.id === id);
          if (item && !item.isOwner) {
            return p.filter(c => c.id !== id);
          }
        }
        return p.map(upd);
      }
      const f = communityData ||
                searchResults.find(c => c.id === id) ||
                recommended.find(c => c.id === id) ||
                (selected && selected.id === id ? selected : null);
      if (f) {
        const normalized: CommunityData = {
          id: f.id,
          name: f.name || "",
          slug: f.slug || String(f.id),
          description: f.description || "",
          category: f.category || "General",
          privacy: f.privacy || "PUBLIC",
          avatarUrl: f.avatarUrl || null,
          coverImageUrl: f.coverImageUrl || null,
          memberCount: f.memberCount + delta,
          postCount: f.postCount ?? 0,
          isMember: isMember,
          isOwner: f.isOwner ?? false,
          createdAt: f.createdAt ?? new Date().toISOString(),
          hasPendingRequest: hasPendingRequest ?? false
        };
        return [...p, normalized];
      }
      return p;
    });
  }

  function handleCreated(c: CommunityData) {
    setShowCreate(false);
    const entry: CommunityData = { ...c, isMember: true, isOwner: true };
    setMyCommunities(prev => [entry, ...prev.filter(x => x.id !== entry.id)]);
    setSelected(entry);
    navigate("/communities/" + entry.slug + location.search);
  }

  function handleCommunityUpdated(updated: CommunityData) {
    setMyCommunities(p => p.map(c => c.id === updated.id ? updated : c));
    setAdminTarget(updated);
  }

  const isSearching = committed.length > 0;
  const ownedList = myCommunities.filter(c => c.isOwner);
  const joinedOnly = myCommunities.filter(c => !c.isOwner);

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Communities</h1>
          <p className="text-sm opacity-70">Discover and join communities based on your interests.</p>
        </div>
        <button className="btn bg-[#1D4ED8] text-white font-semibold border-none hover:bg-[#1D4ED8]/90 btn-sm gap-2 shrink-0" onClick={() => setShowCreate(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create
        </button>
      </div>

      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" size={16} />
            <input ref={inputRef} type="text" placeholder="Search communities..."
              className="input input-bordered w-full pl-10 pr-8" value={query}
              onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitSearch(query); } if (e.key === "Escape") setShowSuggestions(false); }} />
            {query && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80"
                onClick={() => { setQuery(""); setCommitted(""); setSearchResults([]); setSuggestions([]); inputRef.current?.focus(); }}><X size={16} /></button>
            )}
            {showSuggestions && query.trim().length >= 2 && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-base-100 border border-base-300 rounded-2xl shadow-xl overflow-hidden">
                {suggestions.map(c => (
                  <button key={c.id} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-base-200 text-left transition-colors"
                    onMouseDown={e => { e.preventDefault(); commitSearch(c.name); }}>
                    <span className="text-[#1D4ED8] dark:text-white shrink-0"><Users size={18} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate notranslate">{highlight(c.name, query)}</p>
                      {c.description && <p className="text-xs opacity-50 truncate">{c.description}</p>}
                    </div>
                    <span className="text-xs opacity-30 shrink-0 flex items-center gap-1"><Users size={12} /> {c.memberCount.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn bg-[#1D4ED8] text-white font-semibold border-none hover:bg-[#1D4ED8]/90 px-4" disabled={!query.trim()} onClick={() => commitSearch(query)}>Search</button>
        </div>
      </div>

      {!isSearching && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setView(v => v === "joined" ? "default" : "joined")}
            className={`btn btn-sm rounded-full gap-1.5 transition-all ${view === "joined" ? "bg-[#1D4ED8] text-white font-semibold border-none hover:bg-[#1D4ED8]/90" : "btn-ghost border border-base-300 hover:border-[#1D4ED8]/50"}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            My Communities
            {joinedOnly.length > 0 && (
              <span className={`badge badge-xs ${view === "joined" ? "bg-white/30 text-white" : "badge-ghost"}`}>{joinedOnly.length}</span>
            )}
          </button>
          <button
            onClick={() => setView(v => v === "owned" ? "default" : "owned")}
            className={`btn btn-sm rounded-full gap-1.5 transition-all ${view === "owned" ? "btn-warning" : "btn-ghost border border-base-300 hover:border-warning/50"}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            My Groups
            {ownedList.length > 0 && (
              <span className={`badge badge-xs ${view === "owned" ? "badge-warning-content bg-white/30" : "badge-ghost"}`}>{ownedList.length}</span>
            )}
          </button>
          <button
            onClick={() => setView("default")}
            className={`btn btn-sm rounded-full gap-1.5 transition-all ${view === "default" ? "bg-emerald-600 text-white font-semibold border-none hover:bg-emerald-700" : "btn-ghost border border-base-300 hover:border-emerald-500/50"}`}
          >
            <Sparkles size={13} />
            Recommended
          </button>
        </div>
      )}

      {!isSearching && view === "default" && (
        <RecommendedCarousel
          recommended={recommended}
          loading={recommendedLoading}
          onSelect={openCommunity}
          onJoin={handleCarouselJoin}
          joiningId={joiningId}
        />
      )}

      {isSearching && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-40">
              Results for "{committed}"{!searchLoading && searchResults.length > 0 && ` · ${searchResults.length}${searchHasMore ? "+" : ""}`}
            </p>
            <button className="btn btn-ghost btn-xs opacity-50" onClick={() => { setQuery(""); setCommitted(""); setSearchResults([]); }}>Clear</button>
          </div>
          {searchLoading && (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-base-300 bg-base-200 p-4 animate-pulse space-y-3">
                  <div className="h-4 bg-base-300 rounded w-2/3" /><div className="h-3 bg-base-300 rounded w-full" />
                  <div className="h-3 bg-base-300 rounded w-1/3" /><div className="h-9 bg-base-300 rounded-lg w-full mt-2" />
                </div>
              ))}
            </div>
          )}
          {!searchLoading && searchResults.length === 0 && committed && (
            <div className="flex flex-col items-center justify-center py-16 opacity-50 space-y-3">
              <p className="text-sm">No communities found for "{committed}"</p>
              <button className="btn bg-[#1D4ED8] text-white font-semibold border-none hover:bg-[#1D4ED8]/90 btn-sm !opacity-100" onClick={() => setShowCreate(true)}>+ Create "{committed}"</button>
            </div>
          )}
          {!searchLoading && searchResults.length > 0 && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {searchResults.map((c: any) => {
                const local = myCommunities.find(x => x.id === c.id);
                return (
                  <CommunityCard key={c.id} id={c.id} slug={c.slug} name={c.name} description={c.description}
                    members={c.memberCount} avatarUrl={c.avatarUrl} privacy={c.privacy}
                    isMember={!!local?.isMember} isOwner={!!local?.isOwner} hasPendingRequest={!!local?.hasPendingRequest}
                    onClick={() => {
                      openCommunity(local ? { ...c, isMember: local.isMember, isOwner: local.isOwner, hasPendingRequest: local.hasPendingRequest } : c);
                    }} />
                );
              })}
            </div>
          )}
          {searchHasMore && !searchLoading && (
            <button className="w-full py-2 text-sm text-[#1D4ED8] hover:opacity-70 transition-opacity"
              disabled={searchLoadingMore} onClick={() => doSearch(committed, searchCursor, false)}>
              {searchLoadingMore ? <Spin xs /> : "Load more ↓"}
            </button>
          )}
        </>
      )}

      {!isSearching && (
        <>
          {myCommunitiesLoading && (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-base-300 bg-base-200 p-4 animate-pulse space-y-3">
                  <div className="h-4 bg-base-300 rounded w-2/3" /><div className="h-3 bg-base-300 rounded w-full" />
                  <div className="h-3 bg-base-300 rounded w-1/3" /><div className="h-9 bg-base-300 rounded-lg w-full mt-2" />
                </div>
              ))}
            </div>
          )}
          {!myCommunitiesLoading && myCommunities.length === 0 && (
            <div className="text-center py-14 opacity-60 space-y-3">
              <p className="font-semibold">You haven't joined any communities yet</p>
              <p className="text-sm max-w-xs mx-auto">Search above or create your own community.</p>
            </div>
          )}

          {!myCommunitiesLoading && myCommunities.length > 0 && (
            <div className="space-y-5">
              {(view === "default" || view === "owned") && ownedList.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-40 flex items-center gap-1.5">
                    <Settings size={14} /> Created by you · {ownedList.length}
                  </p>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    {ownedList.map(c => {
                      const ownedImgSrc = c.avatarUrl || `https://robohash.org/${encodeURIComponent(c.name)}`;
                      return (
                        <div key={c.id} className="group relative rounded-2xl border border-base-300 bg-base-100 overflow-hidden transition-all duration-200 min-w-0" style={{ transform: "translateZ(0)" }}>
                          <div className="p-4 cursor-pointer" onClick={() => { openCommunity({ ...c, isMember: true }); }}>
                            <div className="flex items-center gap-3.5">
                              <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden ring-2 ring-base-300 transition-all duration-200 shadow-sm">
                                <img
                                  src={ownedImgSrc}
                                  alt={c.name}
                                  className="w-full h-full object-cover transition-transform duration-300"
                                  onError={e => { (e.target as HTMLImageElement).src = `https://robohash.org/${encodeURIComponent(c.name)}`; }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                  <p className="font-bold text-sm truncate notranslate">{c.name}</p>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/20">
                                    <Settings size={8} /> Owner
                                  </span>
                                  {c.privacy !== "PUBLIC" && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-base-200 text-base-content/60 border border-base-300">
                                      {c.privacy === "SECRET" ? <><EyeOff size={9} /> Secret</> : <><Lock size={9} /> Private</>}
                                    </span>
                                  )}
                                </div>
                                {c.description && <p className="text-xs text-base-content/60 line-clamp-1">{c.description}</p>}
                                <p className="text-[11px] font-medium text-base-content/45 mt-1 flex items-center gap-1">
                                  <Users size={11} className="text-[#1D4ED8]/60" /> {c.memberCount.toLocaleString()} members
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="border-t border-base-200 grid grid-cols-2 divide-x divide-base-200">
                            <button
                              className="py-2.5 text-xs font-semibold text-base-content/60 hover:text-base-content hover:bg-base-200 transition-all duration-200 flex items-center justify-center gap-1.5"
                              onClick={() => { openCommunity({ ...c, isMember: true }); }}
                            >
                              <Eye size={13} /> View
                            </button>
                            <button
                              className="py-2.5 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 transition-all duration-200 flex items-center justify-center gap-1.5"
                              onClick={e => { e.stopPropagation(); setAdminTarget(c); }}
                            >
                              <Settings size={13} /> Manage
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {view === "owned" && ownedList.length === 0 && (
                <div className="text-center py-14 opacity-60 space-y-3">
                  <div className="flex justify-center text-base-content/20"><Settings size={48} /></div>
                  <p className="font-semibold">You haven't created any communities yet</p>
                  <button className="btn bg-[#1D4ED8] text-white font-semibold border-none hover:bg-[#1D4ED8]/90 btn-sm !opacity-100" onClick={() => setShowCreate(true)}>+ Create your first community</button>
                </div>
              )}

              {(view === "default" || view === "joined") && joinedOnly.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-40">✓ Joined · {joinedOnly.length}</p>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    {joinedOnly.map(c => (
                      <CommunityCard key={c.id} id={c.id} slug={c.slug} name={c.name} description={c.description}
                        members={c.memberCount} avatarUrl={c.avatarUrl} privacy={c.privacy} onClick={() => { openCommunity(c); }} />
                    ))}
                  </div>
                </div>
              )}

              {view === "joined" && joinedOnly.length === 0 && (
                <div className="text-center py-14 opacity-60 space-y-3">
                  <p className="font-semibold">You haven't joined any communities yet</p>
                  <p className="text-sm max-w-xs mx-auto">Search above to discover communities.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selected && !adminTarget && (
        <DetailPanel
          key={selected.id}
          community={{
            ...selected,
            isMember: selected.isMember || myCommunities.some(x => x.id === selected.id && x.isMember),
            isOwner: selected.isOwner || myCommunities.some(x => x.id === selected.id && x.isOwner),
            hasPendingRequest: selected.hasPendingRequest && !myCommunities.some(x => x.id === selected.id && x.isMember)
          }}
          onClose={closeCommunity}
          onMembershipChange={syncMembership}
        />
      )}

      {adminTarget && (
        <AdminPanel key={adminTarget.id} community={adminTarget} onClose={() => { setAdminTarget(null); if (slugParam) navigate("/communities" + location.search, { replace: true }); }} onCommunityUpdated={handleCommunityUpdated} onMembershipChange={syncMembership} />
      )}

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onDone={handleCreated} />
      )}
    </div>
  );
};

export default Community;
