import { useState, useEffect, useRef, useCallback } from "react";
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
  Activity, Radio, FileText, Upload, Sparkles, Flame, Check, Clock, MoreVertical,
  Search, ArrowRight, Send, Copy, Share2, Instagram, ArrowDown
} from "lucide-react";

import CommunityCard from "../components/community/CommunityCard";
import CommunityHeader from "../components/community/CommunityHeader";
import CommunityTabs from "../components/community/CommunityTabs";
import CommunityChat from "../components/community/CommunityChat";
import { communityChatSocket } from "../api/communityChatSocket.service";
import CommunitySidebar from "../components/community/CommunitySidebar";
import CreatePost from "../components/ui/CreatePost";
import PostCard from "../components/post/PostCard";
import LoadingAnimation from "../components/ui/LoadingAnimation";
import ImageEditorModal from "../components/modals/ImageEditorModal";
import type { CurrentUser as CardUser } from "../components/post/PostCard";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import ConfirmModal from "../components/post/ConfirmModal";
import LimitReachedModal from "../components/modals/LimitReachedModal";
import { getAuthToken } from "../utils/auth";
import { useMyBilling } from "../hooks/useBilling";
import PricingModal from "../components/billing/PricingModal";
import { toPostCardPost, decodeHTML } from "../utils/postUtils";
import { jwtDecode } from "jwt-decode";
import { cacheSuggestion } from "../utils/searchCache";
import { apiUrl } from "../utils/apiUrl";
import { communityService } from "../api/communityService";
import { showToast } from "../utils/toast";
import { postService } from "../api/postService";

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
  healthScore?: number;
  momentumScore?: number;
  rankLabel?: string;
  cityRank?: number;
  percentile?: number;
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
  return getAuthToken();
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
  likedByMe?: boolean;
  isSavedByMe?: boolean;
  savedByMe?: boolean;
  isPoll?: boolean;
  [key: string]: any; // allow extra backend fields (e.g. poll data, feedReach)
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

function resolvePostApprovalFlag(raw: any, fallback = false): boolean {
  return Boolean(
    raw?.requirePostApproval ??
    raw?.requiresPostApproval ??
    raw?.postApprovalRequired ??
    raw?.approvePosts ??
    raw?.approvalRequired ??
    fallback
  );
}

function withPostApprovalAliases<T extends { requirePostApproval: boolean }>(payload: T) {
  return {
    ...payload,
    requiresPostApproval: payload.requirePostApproval,
    postApprovalRequired: payload.requirePostApproval,
    approvePosts: payload.requirePostApproval,
    approvalRequired: payload.requirePostApproval,
  };
}

function getCommunityMomentum(c: CommunityData): number {
  return c.momentumScore ?? c.healthScore ?? Math.min(100, Math.round((c.memberCount * 0.04) + (c.postCount * 1.8)));
}

function getCommunityRankLabel(c: CommunityData): string {
  if (c.rankLabel) return c.rankLabel;
  if (c.cityRank && c.cityRank <= 3) return `#${c.cityRank} Most Active Ward`;
  if (typeof c.percentile === "number" && c.percentile <= 1) return "Top 1% in Pune";
  if (typeof c.percentile === "number" && c.percentile <= 5) return "Top 5% in Pune";
  const score = getCommunityMomentum(c);
  if (score >= 90) return "Top 1% in Pune";
  if (score >= 70) return "Top 5% Growing";
  if (score >= 45) return "Rising Mohalla";
  return "";
}

function highlight(text: string, query: string): React.ReactNode {
  const decoded = decodeHTML(text);
  if (!query.trim() || !decoded) return decoded;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = decoded.split(new RegExp(`(${esc})`, "gi"));
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
  privacy: "PUBLIC" | "PRIVATE" | "SECRET";
  communityName: string;
}) {
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

  const publicInviteFallback = useCallback((): InviteResponse => ({
    id: Date.now(),
    token: "",
    inviteLink: `${window.location.origin}/communities?community=${encodeURIComponent(String(communityId))}`,
    inviteeUsername: null,
    inviteeProfileImage: null,
    inviterUsername: null,
    message: null,
    status: "PENDING",
    singleUse: false,
    useCount: 0,
    createdAt: new Date().toISOString(),
    expiresAt: "",
    actionedAt: null,
  }), [communityId]);

  const isPublicInviteRejection = (payload: any) => {
    const text = String(payload?.error || payload?.message || "").toLowerCase();
    return privacy === "PUBLIC" && text.includes("public") && text.includes("invite");
  };

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
        if (isPublicInviteRejection(d)) {
          setSendResult(publicInviteFallback());
          setSelectedUser(null); setSearchQ(""); setMessage(""); setSuggestions([]);
          return;
        }
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
        if (isPublicInviteRejection(d)) {
          setGenResult(publicInviteFallback());
          return;
        }
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
      <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${
        privacy === "SECRET"
          ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
          : privacy === "PRIVATE"
            ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
            : "bg-blue-500/10 border-blue-500/30 text-blue-400"
      }`}>
        <span className="text-xl shrink-0 mt-0.5">
          {privacy === "SECRET" ? <EyeOff size={20} /> : privacy === "PRIVATE" ? <Lock size={20} /> : <Users size={20} />}
        </span>
        <div>
          <p className="font-semibold">
            {privacy === "SECRET" ? "Secret Community" : privacy === "PRIVATE" ? "Private Community" : "Public Community"}
          </p>
          <p className="opacity-70 text-xs mt-0.5">
            {privacy === "SECRET"
              ? "Invites are the only way to join this community."
              : privacy === "PRIVATE"
                ? "Invited users skip the approval queue and join instantly."
                : "Generate invite links or invite specific users to join your public community."}
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
                      className={`btn btn-xs shrink-0 gap-1.5 ${copiedSend ? "btn-success" : "btn-outline"}`}
                      onClick={() => copyToClipboard(sendResult.inviteLink, setCopiedSend)}
                    >
                      {copiedSend ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Join "${communityName}" on JanSahayak: ${sendResult.inviteLink}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-success btn-xs gap-2 text-[10px] px-2"
                    >
                      <Share2 size={14} />
                      WhatsApp
                    </a>
                    <a
                      href={`https://t.me/share/url?url=${encodeURIComponent(sendResult.inviteLink)}&text=${encodeURIComponent(`Hey! I invited you to join "${communityName}".`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn bg-[#0088cc] hover:bg-[#0077b5] text-white btn-xs gap-2 text-[10px] px-2 border-none"
                    >
                      <Send size={14} />
                      Telegram
                    </a>
                    <button
                      onClick={() => copyToClipboard(sendResult.inviteLink, setCopiedSend)}
                      className="btn bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-90 text-white btn-xs gap-2 text-[10px] px-2 border-none"
                    >
                      <Instagram size={14} />
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
            <div className="flex items-center gap-2 bg-error/10 border border-error/30 text-error text-sm rounded-xl px-4 py-2">
              <AlertTriangle size={15} className="shrink-0" />
              {sendError}
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
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" size={14} />
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
                {sending ? <><Spin xs /> Sending...</> : <><Send size={16} /> Send Invite</>}
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
                        {copiedGen ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
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
                        <Share2 size={16} />
                        WhatsApp
                      </a>
                      <a
                        href={`https://t.me/share/url?url=${encodeURIComponent(genResult.inviteLink)}&text=${encodeURIComponent(`Join "${communityName}" on JanSahayak!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn bg-[#0088cc] hover:bg-[#0077b5] text-white btn-sm gap-2 text-[10px] px-2 border-none"
                      >
                        <Send size={16} />
                        Telegram
                      </a>
                      <button
                        onClick={() => copyToClipboard(genResult.inviteLink, setCopiedGen)}
                        className="btn bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-90 text-white btn-sm gap-2 text-[10px] px-2 border-none"
                      >
                        <Instagram size={16} />
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
                    {genLoading ? <><Spin xs /> Generating...</> : <><Link size={16} /> Generate Invite Link</>}
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
              className="w-full py-2 text-sm text-blue-700 hover:opacity-70 inline-flex items-center justify-center gap-1"
              onClick={() => loadInvites(cursor, false)}
            >
              Load more <ArrowDown size={14} />
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
        {avatar(invite.inviteeUsername ?? "Link", invite.inviteeProfileImage)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold">
              {invite.inviteeUsername ? `@${invite.inviteeUsername}` : "Link invite"}
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
type AdminTab = "requests" | "members" | "settings" | "insights" | "invites" | "post-approvals";

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
  const [panelAnimDone, setPanelAnimDone] = useState(false);

  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqCursor, setReqCursor] = useState<number | null>(null);
  const [reqHasMore, setReqHasMore] = useState(false);
  const [actingReq, setActingReq] = useState<number | null>(null);

  const [pendingPosts, setPendingPosts] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [actingPost, setActingPost] = useState<number | null>(null);

  const loadPendingPosts = useCallback(async () => {
    setPendingLoading(true);
    try {
      let res = await fetch(apiUrl(`/api/communities/${c.id}/posts/pending`), { headers: hdrs() });
      if (!res.ok) {
        res = await fetch(apiUrl(`/api/communities/${c.id}/posts?status=PENDING`), { headers: hdrs() });
      }
      if (!res.ok) {
        res = await fetch(apiUrl(`/api/communities/${c.id}/posts?pending=true`), { headers: hdrs() });
      }
      if (!res.ok) {
        throw new Error("Failed to fetch pending posts");
      }
      const d = await res.json();
      const list = d?.data?.content ?? d?.data?.data ?? d?.data ?? d?.content ?? d ?? [];
      setPendingPosts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error loading pending posts:", err);
      setPendingPosts([]);
    } finally {
      setPendingLoading(false);
    }
  }, [c.id]);

  async function reviewPost(postId: number, approve: boolean) {
    setActingPost(postId);
    try {
      let res;
      if (approve) {
        res = await fetch(apiUrl(`/api/communities/${c.id}/posts/${postId}/approve`), {
          method: "POST",
          headers: hdrs(),
          body: JSON.stringify({})
        });
        if (!res.ok) {
          res = await fetch(apiUrl(`/api/posts/${postId}/approve`), {
            method: "POST",
            headers: hdrs(),
            body: JSON.stringify({})
          });
        }
      } else {
        res = await fetch(apiUrl(`/api/communities/${c.id}/posts/${postId}/reject`), {
          method: "POST",
          headers: hdrs(),
          body: JSON.stringify({})
        });
        if (!res.ok) {
          res = await fetch(apiUrl(`/api/posts/${postId}/reject`), {
            method: "POST",
            headers: hdrs(),
            body: JSON.stringify({})
          });
        }
        if (!res.ok) {
          res = await fetch(apiUrl(`/api/social-posts/${postId}`), {
            method: "DELETE",
            headers: hdrs()
          });
        }
      }

      if (!res.ok) {
        alert(approve ? "Failed to approve post." : "Failed to reject post.");
      } else {
        setPendingPosts(prev => prev.filter(p => p.id !== postId));
        alert(approve ? "Post approved!" : "Post rejected.");
      }
    } catch (err) {
      alert("An error occurred while reviewing the post.");
    } finally {
      setActingPost(null);
    }
  }

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
    requirePostApproval: resolvePostApprovalFlag(c),
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
      const settingsPayload = withPostApprovalAliases(settingsForm);
      const res = await fetch(apiUrl(`/api/communities/${c.id}`), {
        method: "PUT", headers: hdrs(), body: JSON.stringify(settingsPayload),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setSettingsMsg("❌ " + (d?.message || "Save failed.")); return; }
      const d = await res.json();
      const raw = d?.data ?? d;
      const updated: CommunityData = { ...c, ...raw, requirePostApproval: resolvePostApprovalFlag(raw, settingsForm.requirePostApproval), isOwner: true, isMember: true };
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
    loadPendingPosts();
  }, [loadPendingPosts]);

  useEffect(() => {
    if (tab === "requests") loadRequests(null, true);
    if (tab === "post-approvals") loadPendingPosts();
    if (tab === "members") loadMembers(null, true);
    if (tab === "insights") loadInsights();
  }, [tab, loadRequests, loadMembers, loadInsights, loadPendingPosts]);

  const filteredMembers = memSearch.trim()
    ? members.filter(m => m.username.toLowerCase().includes(memSearch.toLowerCase()))
    : members;

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "requests", label: "Requests", icon: <Inbox size={14} />, badge: requests.length > 0 ? requests.length : undefined },
    { key: "post-approvals", label: "Approvals", icon: <ClipboardCheck size={14} />, badge: pendingPosts.length > 0 ? pendingPosts.length : undefined },
    { key: "members", label: "Members", icon: <Users size={14} /> },
    { key: "invites", label: "Invites", icon: <Link size={14} /> },
    { key: "settings", label: "Settings", icon: <Settings size={14} /> },
  ];

  const roleColor = (role: Member["role"]) => {
    if (role === "ADMIN") return "badge-error";
    if (role === "MODERATOR") return "badge-warning";
    return "badge-ghost";
  };

  return (
    <div className="fixed inset-0 z-[110] flex" onClick={closeViaUI}>
      <div className="absolute inset-0 bg-black/60" />
      <style>{`@keyframes slideRPanel{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div
        className="relative ml-auto w-full max-w-lg h-full bg-base-100 flex flex-col shadow-2xl"
        style={panelAnimDone ? {} : { animation: "slideRPanel .22s ease-out forwards" }}
        onAnimationEnd={() => setPanelAnimDone(true)}
        onClick={e => e.stopPropagation()}
      >

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
                      {actingReq === req.id ? <Spin xs /> : <><Check size={12} /> Accept</>}
                    </button>
                    <button className="btn btn-ghost btn-xs btn-outline gap-1" disabled={actingReq === req.id} onClick={() => reviewRequest(req.id, false)}>
                      <X size={12} /> Reject
                    </button>
                  </div>
                </div>
              ))}
              {reqHasMore && !reqLoading && (
                <button className="w-full py-2 text-sm text-blue-700 inline-flex items-center justify-center gap-1" onClick={() => loadRequests(reqCursor, false)}>
                  Load more <ArrowDown size={14} />
                </button>
              )}
            </div>
          )}

          {tab === "post-approvals" && (
            <div className="p-4 space-y-3">
              {pendingLoading && pendingPosts.length === 0 && <div className="flex justify-center py-10"><Spin /></div>}
              {!pendingLoading && pendingPosts.length === 0 && (
                <div className="text-center py-14 opacity-50 space-y-2">
                  <div className="flex justify-center text-success mb-2"><CheckCircle2 size={40} /></div>
                  <p className="font-medium">No pending posts</p>
                  <p className="text-xs">All posts are live!</p>
                </div>
              )}
              {pendingPosts.map(post => (
                <div key={post.id} className="rounded-xl border border-base-300 bg-base-200 p-3.5 space-y-2 flex flex-col">
                  <div className="flex items-center gap-3">
                    {avatar(post.username, post.userProfileImage)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">@{post.username}</p>
                      <p className="text-[10px] opacity-40 mt-0.5">{post.timeAgo ?? "pending review"}</p>
                    </div>
                  </div>
                  {post.content && (
                    <p className="text-xs text-base-content/80 whitespace-pre-wrap">{post.content}</p>
                  )}
                  {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className="rounded-lg overflow-hidden border border-base-300 max-h-32 bg-black/5 flex items-center justify-center">
                      <img src={post.mediaUrls[0]} alt="Post media" className="object-contain max-h-32 w-full" />
                    </div>
                  )}
                  <div className="flex gap-2 justify-end pt-2 border-t border-base-content/5 mt-2">
                    <button className="btn btn-ghost btn-xs btn-outline gap-1" disabled={actingPost === post.id} onClick={() => reviewPost(post.id, false)}>
                      <X size={12} /> Reject
                    </button>
                    <button className="btn btn-success btn-xs gap-1" disabled={actingPost === post.id} onClick={() => reviewPost(post.id, true)}>
                      {actingPost === post.id ? <Spin xs /> : <><Check size={12} /> Approve</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "members" && (
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" size={14} />
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
                        {actingMem === m.userId ? <Spin xs /> : <MoreVertical size={14} />}
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
                <button className="w-full py-2 text-sm text-blue-700 inline-flex items-center justify-center gap-1" onClick={() => loadMembers(memCursor, false)}>
                  Load more <ArrowDown size={14} />
                </button>
              )}
            </div>
          )}

          {tab === "invites" && (
            <InviteTab
              communityId={c.id}
              privacy={c.privacy as "PUBLIC" | "PRIVATE" | "SECRET"}
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
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
                      className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${settingsForm.privacy === p ? "border-red-500 bg-red-500/15 shadow-[0_0_0_1px_rgba(239,68,68,0.4),0_0_22px_rgba(239,68,68,0.38)]" : "border-base-300 hover:border-base-400"}`}>
                      <span className={`text-xl ${settingsForm.privacy === p ? "text-red-500" : ""}`}>{PRIV_ICON[p]}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${settingsForm.privacy === p ? "text-red-500 dark:text-red-400" : "text-base-content"}`}>
                          {p.charAt(0) + p.slice(1).toLowerCase()}
                        </p>
                        <p className="text-xs opacity-80 text-base-content">{PRIV_DESC[p]}</p>
                      </div>
                      {settingsForm.privacy === p && <span className="text-red-500 dark:text-red-400"><Check size={16} /></span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">Permissions</label>
                {[
                  { key: "allowMemberPosts", label: "Members can post", desc: "Any member can create posts" },
                  { key: "requirePostApproval", label: "Approve posts", desc: "Moderator must review posts before they go live" },
                  { key: "feedEligible", label: "Show posts in main feed", desc: "High-engagement posts surface in the main feed" },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-base-300 p-3 cursor-pointer hover:border-base-400">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs opacity-80">{desc}</p>
                    </div>
                    <input type="checkbox" className="toggle toggle-sm govlyx-red-toggle"
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
function CreateModal({ 
  onClose, 
  onDone,
  onUpgrade
}: { 
  onClose: () => void; 
  onDone: (c: CommunityData) => void;
  onUpgrade: () => void;
}) {
  const { data: billing } = useMyBilling();
  const { closeViaUI } = useBackNavigation(onClose);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<CreateForm>({
    name: "", description: "", category: "OTHER", tags: "",
    privacy: "PUBLIC", locationRestricted: false, avatarUrl: "",
    allowMemberPosts: true, requirePostApproval: false,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalMessage, setLimitModalMessage] = useState("");
  
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
      const createPayload = withPostApprovalAliases({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        tags: form.tags.trim(),
        privacy: form.privacy,
        avatarUrl: null,
        locationRestricted: form.locationRestricted,
        allowMemberPosts: form.allowMemberPosts,
        requirePostApproval: form.requirePostApproval,
      });
      const res = await fetch(apiUrl("/api/communities"), {
        method: "POST", headers: hdrs(),
        body: JSON.stringify(createPayload),
      });
      if (res.status === 401 || res.status === 403) { setErr("Please log in."); return; }
      if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d?.message || `Error ${res.status}`); return; }
      const d = await res.json(); 
      let raw = d?.data ?? d;

      // Ensure creation settings (like requirePostApproval) are correctly persisted via a follow-up PUT request
      try {
        await fetch(apiUrl(`/api/communities/${raw.id}`), {
          method: "PUT",
          headers: hdrs(),
          body: JSON.stringify(withPostApprovalAliases({
            name: form.name.trim(),
            description: form.description.trim(),
            category: form.category,
            privacy: form.privacy,
            allowMemberPosts: form.allowMemberPosts,
            requirePostApproval: form.requirePostApproval,
            feedEligible: true
          }))
        });
        raw.requirePostApproval = form.requirePostApproval;
        raw.requiresPostApproval = form.requirePostApproval;
        raw.postApprovalRequired = form.requirePostApproval;
        raw.approvePosts = form.requirePostApproval;
        raw.approvalRequired = form.requirePostApproval;
        raw.allowMemberPosts = form.allowMemberPosts;
      } catch (putErr) {
        console.error("Failed to sync community settings via PUT fallback:", putErr);
      }

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
      <div className="w-full max-w-sm sm:max-w-xl md:max-w-3xl bg-base-100/95 rounded-2xl border border-white/10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.4)] max-h-[85vh] flex flex-col overflow-hidden backdrop-blur-2xl" onClick={e => e.stopPropagation()}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-black tracking-widest text-base-content/80 mb-1">Name <span className="text-error">*</span></label>
                  <input autoFocus className="input input-bordered input-sm w-full rounded-xl font-medium text-base-content" placeholder="e.g. Pune Cyclists Club" maxLength={60}
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  <p className="text-[9px] font-bold opacity-65 mt-1 uppercase tracking-tighter text-base-content">{form.name.length}/60 · min 3</p>
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
              </div>

              <div className="space-y-3">
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
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
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-base-content">Privacy</label>
                  <div className="space-y-2">
                    {(["PUBLIC", "PRIVATE", "SECRET"] as const).map(p => {
                      const isExclusive = p === "PRIVATE" || p === "SECRET";
                      const isLocked = isExclusive && (!billing?.privateCommunityQuota || billing.privateCommunityQuota <= 0);
                      
                      return (
                        <button 
                          key={p} 
                          type="button" 
                          onClick={() => {
                            if (isLocked) {
                              setLimitModalMessage(`Creating a ${p.toLowerCase()} community requires an active Pro or VIP Pass with available quota.`);
                              setShowLimitModal(true);
                              return;
                            }
                            setForm(f => ({ ...f, privacy: p }));
                          }}
                          className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${form.privacy === p ? "border-red-500 bg-red-500/15 shadow-[0_0_0_1px_rgba(239,68,68,0.45),0_0_24px_rgba(239,68,68,0.45)] scale-[1.01]" : "border-base-content/5 hover:border-base-content/10"}`}
                        >
                          <span className={`text-xl opacity-80 ${form.privacy === p ? "text-red-500" : ""}`}>
                            {PRIV_ICON[p]}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`text-[11px] font-black uppercase tracking-tight ${form.privacy === p ? "text-red-500" : "text-base-content/95"}`}>
                                {p}
                              </p>
                              {isLocked && (
                                <span className="badge badge-warning text-[8px] font-black py-1 px-1.5 uppercase tracking-wide">
                                  Locked
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] font-medium opacity-65 uppercase tracking-tighter leading-none text-base-content">
                              {PRIV_DESC[p]}
                            </p>
                          </div>
                          {form.privacy === p && <span className="text-red-500 text-xs shadow-sm"><Check size={14} /></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
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
                      <input type="checkbox" className="toggle toggle-sm govlyx-red-toggle scale-90"
                        checked={form[key as keyof CreateForm] as boolean}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                    </label>
                  ))}
                </div>
              </div>
            </div>
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
                Next <ArrowRight size={14} />
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
      {showLimitModal && (
        <div onClick={e => e.stopPropagation()}>
          <LimitReachedModal
            isOpen={showLimitModal}
            onClose={() => setShowLimitModal(false)}
            onUpgrade={() => {
              onClose();
              onUpgrade();
            }}
            message={limitModalMessage}
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
  const queryClient = useQueryClient();
  const normalise = (raw: CommunityData): CommunityData =>
    raw.isOwner ? { ...raw, isMember: true } : raw;

  const [c, setC] = useState(() => normalise(community));
  const [panelAnimDone, setPanelAnimDone] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [tab, setTab] = useState<"posts" | "chat" | "about">("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [acting, setActing] = useState(false);
  const [openCreatePost, setOpenCreatePost] = useState(false);
  const [postSort, setPostSort] = useState<"NEW" | "TOP">("NEW");
  const [cursorScore, setCursorScore] = useState<number | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const postId = searchParams.get("postId");

  const {
    data: singlePost,
    isLoading: loadingSinglePost,
    error: singlePostError,
  } = useQuery({
    queryKey: ["social-post", postId],
    queryFn: async () => {
      if (!postId) return null;
      const raw: any = await postService.getPostById(Number(postId), "social-posts");
      const postData = raw?.data || raw;
      return toPostCardPost({
        ...postData,
        variant: postData.isPoll ? "poll" : "social",
        username: postData.authorUsername || postData.username,
        userProfileImage: postData.authorProfileImage || postData.userProfileImage,
        isLikedByCurrentUser: postData.isLikedByMe ?? postData.likedByMe ?? postData.isLikedByCurrentUser ?? false,
        isSavedByCurrentUser: postData.isSavedByMe ?? postData.savedByMe ?? postData.isSavedByCurrentUser ?? postData.isSaved ?? false,
        communityId: c.id,
        communityName: c.name,
        communityAvatar: c.avatarUrl || undefined,
        communityMemberCount: String(c.memberCount || 0),
        isMember: c.isMember,
      });
    },
    enabled: !!postId && !!c.id && (c.isMember || c.isOwner || c.privacy === "PUBLIC"),
  });

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

  const sharePostToChat = async (postId: number, postContent: string) => {
    if (!c.isMember) {
      showToast.error("You must be a member to share to chat");
      return;
    }
    const sendPayload = () => {
      communityChatSocket.sendMessage(c.id, {
        content: `Shared a post: "${postContent.substring(0, 60)}${postContent.length > 60 ? "..." : ""}"`,
        sharedPostId: postId
      });
      showToast.success("Post shared to community chat!");
    };

    if (communityChatSocket.isConnected) {
      sendPayload();
    } else {
      communityChatSocket.connect({
        onMessage: () => {},
        onTyping: () => {},
        onError: () => {},
        onConnected: () => {
          sendPayload();
        }
      });
      communityChatSocket.joinCommunity(c.id);
    }
  };

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
            requirePostApproval: resolvePostApprovalFlag(detail, prev.requirePostApproval ?? false),
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

      const res = await fetch(apiUrl(endpoint), { headers: hdrs() });
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

  const updatePostState = useCallback((postId: number, updater: (post: any) => any) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return updater(p);
      }
      return p;
    }));
  }, []);

  const handleLike = useCallback((postId: number, liked: boolean) => {
    updatePostState(postId, (p: any) => {
      if (!!p.isLikedByMe === liked) return p;
      return {
        ...p,
        isLikedByMe: liked,
        likeCount: (p.likeCount ?? 0) + (liked ? 1 : -1)
      };
    });

    queryClient.setQueryData(["social-post", String(postId)], (prev: any) => {
      if (!prev) return prev;
      if (!!prev.isLikedByCurrentUser === liked) return prev;
      return {
        ...prev,
        isLikedByCurrentUser: liked,
        likeCount: (prev.likeCount ?? 0) + (liked ? 1 : -1)
      };
    });
  }, [queryClient, updatePostState]);

  const handleSave = useCallback((postId: number, saved: boolean) => {
    updatePostState(postId, (p: any) => {
      const isSaved = !!(p.isSavedByMe ?? p.isSaved ?? false);
      if (isSaved === saved) return p;
      return {
        ...p,
        isSavedByMe: saved,
        isSaved: saved
      };
    });

    queryClient.setQueryData(["social-post", String(postId)], (prev: any) => {
      if (!prev) return prev;
      const isSaved = !!(prev.isSavedByCurrentUser ?? prev.isSaved ?? false);
      if (isSaved === saved) return prev;
      return {
        ...prev,
        isSavedByCurrentUser: saved,
        isSaved: saved
      };
    });
  }, [queryClient, updatePostState]);

  const handleShare = useCallback((postId: number) => {
    updatePostState(postId, (p: any) => ({
      ...p,
      shareCount: (p.shareCount ?? 0) + 1
    }));

    queryClient.setQueryData(["social-post", String(postId)], (prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        shareCount: (prev.shareCount ?? 0) + 1
      };
    });
  }, [queryClient, updatePostState]);

  async function handleLeaveConfirm() {
    setActing(true);
    setShowLeaveConfirm(false);
    try {
      const res = await fetch(apiUrl(`/api/communities/${c.id}/leave`), { method: "DELETE", headers: hdrs() });
      if (!res.ok) { alert((await res.json().catch(() => ({}))).message || "Could not leave."); return; }
      setC(p => ({ ...p, isMember: false, memberCount: p.memberCount - 1 }));
      onMembershipChange(c.id, false, -1, false, { ...c, isMember: false, memberCount: c.memberCount - 1 });
      showToast.info("💔 You left us... we'll remember you.");
    } catch {
      alert("Could not leave.");
    } finally {
      setActing(false);
    }
  }

  async function toggleMembership() {
    if (!getAuthToken()) {
      navigate("/login");
      return;
    }
    setActing(true);
    try {
      if (c.isMember) {
        setShowLeaveConfirm(true);
        setActing(false);
        return;
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
        if (joined) {
          showToast.success("👋 Hey there, newcomer! Make yourself at home.");
        } else if (newHasPending) {
          showToast.info("Request sent. We saved you a seat while the admins review it.");
        }
        
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
      <style>{`@keyframes slideRPanel{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div className="relative ml-auto w-full max-w-2xl sm:max-w-3xl h-full bg-base-100 flex flex-col shadow-2xl"
        style={panelAnimDone ? {} : { animation: "slideRPanel .22s ease-out forwards" }}
        onAnimationEnd={() => setPanelAnimDone(true)}
        onClick={e => e.stopPropagation()}>

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
          <div className="p-2 sm:p-4 space-y-3 sm:space-y-4">
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
                ) : postId ? (
                  <div className="space-y-4 pt-2">
                    <button
                      className="btn btn-ghost btn-sm gap-1 hover:bg-base-200/50"
                      onClick={() => {
                        setSearchParams(prev => {
                          const next = new URLSearchParams(prev);
                          next.delete("postId");
                          return next;
                        });
                        setTab("posts");
                      }}
                    >
                      ← Back to Community
                    </button>

                    {loadingSinglePost && (
                      <div className="relative min-h-[360px] rounded-3xl">
                        <LoadingAnimation overlay label="Loading post" />
                      </div>
                    )}

                    {singlePostError && (
                      <div className="text-center py-12 opacity-50 space-y-2">
                        <p className="text-sm text-error font-medium">Post not found or unavailable.</p>
                      </div>
                    )}

                    {!loadingSinglePost && !singlePostError && singlePost && (
                      <PostCard
                        post={singlePost}
                        currentUser={currentUser || undefined}
                        hideCommunityStrip={true}
                        onLike={handleLike}
                        onSave={handleSave}
                        onShare={handleShare}
                        onShareToCommunity={(c.isMember || c.isOwner) ? (postId, content) => sharePostToChat(postId, content) : undefined}
                      />
                    )}
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
                      <div className="relative min-h-[360px] rounded-3xl">
                        <LoadingAnimation overlay label="Loading posts" />
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
                        variant: post.isPoll ? "poll" : "social", // allow toPostCardPost to re-detect if it's a poll
                        username: post.authorUsername,
                        userProfileImage: post.authorProfileImage,
                        isLikedByCurrentUser: post.isLikedByMe ?? post.likedByMe ?? post.isLikedByCurrentUser,
                        isSavedByCurrentUser: post.isSavedByMe ?? post.savedByMe ?? post.isSavedByCurrentUser,
                        communityId: c.id,
                        communityName: c.name,
                        communityAvatar: c.avatarUrl || undefined,
                        communityMemberCount: String(c.memberCount || 0),
                        isMember: c.isMember,
                      });

                      return (
                        <div key={post.id} className="flex flex-col">
                          <PostCard
                            post={cardPost}
                            currentUser={currentUser || undefined}
                            hideCommunityStrip={true}
                            onLike={handleLike}
                            onSave={handleSave}
                            onShare={handleShare}
                            onShareToCommunity={(c.isMember || c.isOwner) ? (postId, content) => sharePostToChat(postId, content) : undefined}
                          />
                        </div>
                      );
                    })}

                    {hasMore && !loading && (
                      <button className="w-full py-2 text-sm text-blue-700 hover:opacity-70 inline-flex items-center justify-center gap-1" onClick={() => loadPosts(cursor, cursorScore, false)}>Load more <ArrowDown size={14} /></button>
                    )}
                  </>
                )}
              </div>
            )}

            {tab === "chat" && (
              c.isMember || c.isOwner ? (
                <CommunityChat communityId={c.id} isAdmin={c.isOwner || false} />
              ) : (
                <div className="text-center py-12 bg-base-200 rounded-2xl border border-base-300 opacity-50 space-y-2">
                  <div className="flex justify-center mb-2"><Lock size={40} /></div>
                  <p className="text-sm text-base-content">Join this community to view and participate in the group chat.</p>
                </div>
              )
            )}

            {tab === "about" && (
              <div className="space-y-6">
                <div className="rounded-xl border border-base-300 bg-base-200 p-5">
                  <h3 className="font-semibold mb-3 text-lg">About this community</h3>
                  <p className="text-sm opacity-80 whitespace-pre-line leading-relaxed">
                    {decodeHTML(c.description || "No detailed description provided.")}
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
      <ConfirmModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeaveConfirm}
        title="Leave Community"
        message={`Are you sure you want to leave "${c.name}"? You will no longer receive updates or see posts from this community.`}
        confirmLabel="Leave"
        cancelLabel="Cancel"
        isDanger={true}
        isLoading={acting}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════════════ */


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
  const [visibleCards, setVisibleCards] = useState(2);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Dynamically update the number of visible cards based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setVisibleCards(1); // Single showcase in mobile devices
      } else {
        setVisibleCards(2); // Max 2 cards on larger devices
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const nextSlide = useCallback(() => {
    if (recommended.length === 0 || recommended.length <= visibleCards || isAnimating) return;
    setIsAnimating(true);
    setActiveIndex((prev) => {
      if (prev >= recommended.length) {
        return 1;
      }
      return prev + 1;
    });
  }, [recommended.length, visibleCards, isAnimating]);

  const prevSlide = useCallback(() => {
    if (recommended.length === 0 || recommended.length <= visibleCards || isAnimating) return;
    setIsAnimating(true);
    if (activeIndex === 0) {
      setTransitionEnabled(false);
      setActiveIndex(recommended.length);
      setTimeout(() => {
        setTransitionEnabled(true);
        setActiveIndex(recommended.length - 1);
      }, 30);
    } else {
      setActiveIndex((prev) => prev - 1);
    }
  }, [recommended.length, activeIndex, visibleCards, isAnimating]);

  // Reset activeIndex if it gets out of bounds
  useEffect(() => {
    if (activeIndex > recommended.length) {
      setActiveIndex(0);
    }
  }, [recommended.length, activeIndex]);

  // Handle instant wrap-around and animation state unlock after transition completes
  useEffect(() => {
    if (recommended.length <= visibleCards) return;
    
    let timer: ReturnType<typeof setTimeout>;
    
    if (activeIndex === recommended.length) {
      timer = setTimeout(() => {
        setTransitionEnabled(false);
        setActiveIndex(0);
        setTimeout(() => {
          setTransitionEnabled(true);
          setIsAnimating(false);
        }, 30);
      }, 500); // match transition duration-500
    } else if (isAnimating) {
      timer = setTimeout(() => {
        setIsAnimating(false);
      }, 500); // transition length
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeIndex, recommended.length, visibleCards, isAnimating]);

  // Autoplay loop
  useEffect(() => {
    if (isPaused || recommended.length <= visibleCards) return;
    timerRef.current = setInterval(nextSlide, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, nextSlide, recommended.length, visibleCards]);

  if (loading) {
    return (
      <div className="relative min-h-[260px] rounded-2xl border border-base-300 bg-base-200/20">
        <LoadingAnimation overlay label="Loading communities" />
      </div>
    );
  }

  if (recommended.length === 0) return null;

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

  const getCardImage = (c: CommunityData) => {
    let url = c.coverImageUrl || c.avatarUrl || "";
    if (!url) {
      return `https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=500&q=80`;
    }
    if (url.includes("unsplash.com")) {
      url = url.replace(/w=\d+/, "w=500").replace(/q=\d+/, "q=90");
    }
    return url;
  };

  const extendedRecommended = recommended.length > visibleCards
    ? [...recommended, ...recommended.slice(0, visibleCards)]
    : recommended;

  const dotCount = recommended.length;
  const activeDotIndex = activeIndex % recommended.length;

  return (
    <div 
      className="relative flex flex-col w-full py-6 select-none overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="w-full text-left mb-6 px-1">
        <p className="text-xs font-bold uppercase tracking-widest text-base-content/95">
          Recommended Communities
        </p>
      </div>

      {/* Carousel Container */}
      <div className="relative w-full px-8 sm:px-12">
        {/* Left Arrow Button */}
        {recommended.length > visibleCards && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-base-100 border border-base-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] text-base-content hover:text-[#1D4ED8] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft size={14} className="sm:w-4 sm:h-4" />
          </button>
        )}

        {/* Right Arrow Button */}
        {recommended.length > visibleCards && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-base-100 border border-base-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] text-base-content hover:text-[#1D4ED8] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            aria-label="Next slide"
          >
            <ChevronRight size={14} className="sm:w-4 sm:h-4" />
          </button>
        )}

        {/* Viewport/Track */}
        <div 
          className="overflow-hidden w-full"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className={`flex -mx-2.5 ${transitionEnabled ? "transition-transform duration-500 ease-out" : ""}`}
            style={{
              transform: `translateX(-${activeIndex * (100 / visibleCards)}%)`
            }}
          >
            {extendedRecommended.map((c, index) => {
              return (
                <div
                  key={`${c.id}-${index}`}
                  className="flex flex-col"
                  style={{
                    width: `${100 / visibleCards}%`,
                    flexShrink: 0,
                    padding: "0 10px"
                  }}
                  onClick={() => onSelect(c)}
                >
                  {/* Card Container */}
                  <div className="w-full bg-base-100 rounded-3xl border border-base-300 dark:border-white/10 p-4.5 flex flex-col justify-between shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-300 min-h-[360px] sm:min-h-[380px] h-full cursor-pointer hover:border-base-content/20 dark:hover:border-white/25">
                    <div className="flex flex-col h-full justify-between">
                      <div>
                        {/* Cover Image at Top */}
                        <div className="w-full aspect-[16/10] max-h-[140px] sm:max-h-[170px] rounded-2xl overflow-hidden mb-3 bg-base-200">
                          <img
                            src={getCardImage(c)}
                            alt={c.name}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=500&q=80`;
                            }}
                          />
                        </div>

                        {/* Title */}
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          {getCommunityRankLabel(c) && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 dark:border-amber-400/30 bg-amber-500/10 dark:bg-amber-400/10 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-400">
                              <Trophy size={10} /> {getCommunityRankLabel(c)}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 dark:border-emerald-400/30 bg-emerald-500/10 dark:bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                            <Activity size={10} /> {getCommunityMomentum(c)} momentum
                          </span>
                        </div>
                        <h3 className="font-extrabold text-sm sm:text-base text-base-content leading-tight mb-1 truncate notranslate">
                          {decodeHTML(c.name)}
                        </h3>

                        {/* Description */}
                        <p className="text-[11px] sm:text-xs text-base-content/60 line-clamp-2 leading-relaxed">
                          {decodeHTML(c.description)}
                        </p>
                      </div>

                      {/* Footer Details */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-base-content/5">
                        <span className="text-[11px] font-bold text-base-content/50">
                          {c.memberCount.toLocaleString()} members
                        </span>

                        <button
                          type="button"
                          onClick={(e) => onJoin(e, c)}
                          disabled={joiningId === c.id || c.isMember || c.hasPendingRequest}
                          className={`btn btn-xs rounded-full px-4 h-7 text-[9px] font-black uppercase tracking-wider border-none cursor-pointer ${
                            c.isMember 
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                              : c.hasPendingRequest 
                                ? "bg-warning text-white" 
                                : "bg-blue-600 hover:bg-blue-700 text-white"
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
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Control Dots */}
      {recommended.length > visibleCards && dotCount > 1 && (
        <div className="flex justify-center gap-1.5 mt-5">
          {Array.from({ length: dotCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (isAnimating) return;
                setIsAnimating(true);
                setTransitionEnabled(true);
                setActiveIndex(i);
              }}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                activeDotIndex === i ? "bg-[#1D4ED8] w-5" : "bg-base-content/20 w-2"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const Community = () => {
  const queryClient = useQueryClient();
  useMyBilling();
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
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
          setRecommended(filtered);
        }
      } catch {
        if (active) {
          setRecommended([]);
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
    if (!getAuthToken()) {
      navigate("/login");
      return;
    }
    setJoiningId(c.id);
    try {
      const res = await fetch(apiUrl(`/api/communities/${c.id}/join`), { method: "POST", headers: hdrs(), body: JSON.stringify({}) });
      if (res.status === 401) { alert("Please log in."); return; }
      const d = await res.json();
      const joined = d?.data?.joined ?? false;
      const newHasPending = !joined && String(c.privacy).toUpperCase() === "PRIVATE";
      
      setRecommended(prev => prev.map(item => item.id === c.id ? { ...item, isMember: joined, hasPendingRequest: newHasPending, memberCount: joined ? item.memberCount + 1 : item.memberCount } : item));
      
      syncMembership(c.id, joined, joined ? 1 : 0, newHasPending);
      if (joined) {
        showToast.success("👋 Hey there, newcomer! Make yourself at home.");
      } else if (newHasPending) {
        showToast.info("Request sent. We saved you a seat while the admins review it.");
      }
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
            requirePostApproval: resolvePostApprovalFlag(c),
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
          return { ...c, requirePostApproval: resolvePostApprovalFlag(c), isMember: true, isOwner: true, hasPendingRequest: false };
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
          allowMemberPosts: r.allowMemberPosts, requirePostApproval: resolvePostApprovalFlag(r), feedEligible: r.feedEligible,
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
    queryClient.invalidateQueries({ queryKey: ["my-communities"] });
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
    queryClient.invalidateQueries({ queryKey: ["my-communities"] });
    setShowCreate(false);
    const entry: CommunityData = { ...c, isMember: true, isOwner: true };
    setMyCommunities(prev => [entry, ...prev.filter(x => x.id !== entry.id)]);
    setSelected(entry);
    navigate("/communities/" + entry.slug + location.search);
  }

  function handleCommunityUpdated(updated: CommunityData) {
    queryClient.invalidateQueries({ queryKey: ["my-communities"] });
    setMyCommunities(p => p.map(c => c.id === updated.id ? updated : c));
    setAdminTarget(updated);
  }

  const isSearching = committed.length > 0;
  const ownedList = myCommunities.filter(c => c.isOwner);
  const joinedOnly = myCommunities.filter(c => !c.isOwner);
  const isCommunityPageLoading = !isSearching && (myCommunitiesLoading || (view === "default" && recommendedLoading));

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Communities</h1>
          <p className="text-sm opacity-70">Discover and join communities based on your interests.</p>
        </div>
        <button className="btn bg-[#1D4ED8] text-white font-semibold border-none hover:bg-[#1D4ED8]/90 btn-sm gap-2 shrink-0" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          Create
        </button>
      </div>

      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" size={16} />
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
                      {c.description && <p className="text-xs opacity-50 truncate">{decodeHTML(c.description)}</p>}
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
            <Users size={14} />
            My Communities
            {joinedOnly.length > 0 && (
              <span className={`badge badge-xs ${view === "joined" ? "bg-white/30 text-white" : "badge-ghost"}`}>{joinedOnly.length}</span>
            )}
          </button>
          <button
            onClick={() => setView(v => v === "owned" ? "default" : "owned")}
            className={`btn btn-sm rounded-full gap-1.5 transition-all ${view === "owned" ? "btn-warning" : "btn-ghost border border-base-300 hover:border-warning/50"}`}
          >
            <Settings size={14} />
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

      {!isSearching && view === "default" && !isCommunityPageLoading && (
        <RecommendedCarousel
          recommended={recommended}
          loading={false}
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
            <div className="relative min-h-[320px] rounded-3xl">
              <LoadingAnimation overlay label="Loading communities" />
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
                    rankLabel={getCommunityRankLabel(c)} momentumScore={getCommunityMomentum(c)}
                    isMember={!!local?.isMember} isOwner={!!local?.isOwner} hasPendingRequest={!!local?.hasPendingRequest}
                    onClick={() => {
                      openCommunity(local ? { ...c, isMember: local.isMember, isOwner: local.isOwner, hasPendingRequest: local.hasPendingRequest } : c);
                    }} />
                );
              })}
            </div>
          )}
          {searchHasMore && !searchLoading && (
            <button className="w-full py-2 text-sm text-[#1D4ED8] hover:opacity-70 transition-opacity inline-flex items-center justify-center gap-1"
              disabled={searchLoadingMore} onClick={() => doSearch(committed, searchCursor, false)}>
              {searchLoadingMore ? <Spin xs /> : <>Load more <ArrowDown size={14} /></>}
            </button>
          )}
        </>
      )}

      {!isSearching && (
        <>
          {isCommunityPageLoading && (
            <div className="relative min-h-[420px] rounded-3xl">
              <LoadingAnimation overlay label="Loading communities" />
            </div>
          )}
          {!isCommunityPageLoading && (
            <div className="space-y-5">
              {view === "default" && recommended.length === 0 && myCommunities.length === 0 && (
                <div className="text-center py-14 opacity-60 space-y-3">
                  <p className="font-semibold">No communities found</p>
                  <p className="text-sm max-w-xs mx-auto">Create a community to get started and invite others!</p>
                  <button className="btn bg-[#1D4ED8] text-white font-semibold border-none hover:bg-[#1D4ED8]/90 btn-sm !opacity-100" onClick={() => setShowCreate(true)}>+ Create a community</button>
                </div>
              )}
              {((view === "default" && ownedList.length > 0) || view === "owned") && (
                ownedList.length > 0 ? (
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
                                    <p className="font-bold text-sm truncate notranslate">{decodeHTML(c.name)}</p>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/20">
                                      <Settings size={8} /> Owner
                                    </span>
                                    {c.privacy !== "PUBLIC" && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-base-200 text-base-content/60 border border-base-300">
                                        {c.privacy === "SECRET" ? <><EyeOff size={9} /> Secret</> : <><Lock size={9} /> Private</>}
                                      </span>
                                    )}
                                  </div>
                                  {c.description && <p className="text-xs text-base-content/60 line-clamp-1">{decodeHTML(c.description)}</p>}
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
                ) : (
                  <div className="text-center py-14 opacity-60 space-y-3">
                    <div className="flex justify-center text-base-content/20"><Settings size={48} /></div>
                    <p className="font-semibold">You haven't created any communities yet</p>
                    <button className="btn bg-[#1D4ED8] text-white font-semibold border-none hover:bg-[#1D4ED8]/90 btn-sm !opacity-100" onClick={() => setShowCreate(true)}>+ Create your first community</button>
                  </div>
                )
              )}

              {((view === "default" && joinedOnly.length > 0) || view === "joined") && (
                joinedOnly.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest opacity-40">✓ Joined · {joinedOnly.length}</p>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      {joinedOnly.map(c => (
                        <CommunityCard key={c.id} id={c.id} slug={c.slug} name={c.name} description={c.description}
                          members={c.memberCount} avatarUrl={c.avatarUrl} privacy={c.privacy}
                          rankLabel={getCommunityRankLabel(c)} momentumScore={getCommunityMomentum(c)}
                          onClick={() => { openCommunity(c); }} />
                      ))}
                    </div>
                  </div>
                ) : (
                  view === "joined" && (
                    <div className="text-center py-14 opacity-60 space-y-3">
                      <p className="font-semibold">You haven't joined any communities yet</p>
                      <p className="text-sm max-w-xs mx-auto">Search above to discover communities.</p>
                    </div>
                  )
                )
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
        <CreateModal 
          onClose={() => setShowCreate(false)} 
          onDone={handleCreated} 
          onUpgrade={() => setIsPricingModalOpen(true)} 
        />
      )}

      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
    </div>
  );
};

export default Community;



