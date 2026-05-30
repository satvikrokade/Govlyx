import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  RefreshCw,
  MapPin,
  MessageSquare,
  TrendingUp,
  Users,
  BarChart2,
  ChevronDown,
  Image as ImageIcon,
  X,
  Inbox,
} from "lucide-react";
import DepartmentSidebar from "../components/department/DepartmentSidebar";
import ResolvePostModal from "../components/department/ResolvePostModal";
import {
  getActiveTaggedPosts,
  getResolvedTaggedPosts,
  createBroadcast,
  getBroadcastAnalytics,
  getBroadcastStatistics,
  getPincodeStates,
  getPincodeDistricts,
} from "../api/departmentService";
import { apiUrl } from "../utils/apiUrl";
import type {
  DashboardTab,
  IssueFilter,
  TaggedPost,
  BroadcastScope,
  BroadcastAnalytics,
  BroadcastStatistics,
} from "../types/department";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function useCurrentUser() {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(apiUrl("/api/users/me"), {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body) => {
        const user = body?.data;
        setUsername(user?.actualUsername ?? user?.username ?? null);
      })
      .catch(() => setUsername(null))
      .finally(() => setLoading(false));
  }, []);
  return { username, loading };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Issue card */
const IssueCard = ({
  post,
  onResolveClick,
}: {
  post: TaggedPost;
  onResolveClick: (p: TaggedPost) => void;
}) => {
  const author = post.citizenDisplayName ?? post.userDisplayName ?? post.citizenUsername ?? post.username ?? "Citizen";
  const handle = post.citizenUsername ?? post.username ?? "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="group rounded-2xl border border-base-300 bg-base-100 p-5 hover:border-primary/30
                 hover:shadow-md transition-all"
    >
      {/* Author row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(handle)}`}
            alt="Avatar"
            className="h-8 w-8 rounded-full border border-base-300 bg-base-200 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{author}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] opacity-40">@{handle}</span>
              {post.timeAgo && (
                <>
                  <span className="opacity-20">·</span>
                  <span className="text-[11px] opacity-40 flex items-center gap-1">
                    <Clock size={10} /> {post.timeAgo}
                  </span>
                </>
              )}
              {post.targetPincode && (
                <>
                  <span className="opacity-20">·</span>
                  <span className="text-[11px] opacity-40 flex items-center gap-1">
                    <MapPin size={10} /> {post.targetPincode}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider
            ${post.isResolved
              ? "bg-success/10 text-success"
              : "bg-amber-400/10 text-amber-500"
            }`}
        >
          {post.isResolved ? (
            <><CheckCircle2 size={11} /> Resolved</>
          ) : (
            <><Clock size={11} /> Pending</>
          )}
        </span>
      </div>

      {/* Content */}
      <p className="text-sm leading-relaxed opacity-80 line-clamp-3 mb-3">{post.content}</p>

      {/* Issue type tag */}
      {post.issueType && (
        <span className="mb-3 inline-block rounded-md bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
          {post.issueType}
        </span>
      )}

      {/* Resolution message (if resolved) */}
      {post.isResolved && post.resolutionMessage && (
        <div className="mb-3 rounded-xl bg-success/5 border border-success/20 px-4 py-3">
          <p className="text-[11px] font-semibold text-success mb-1 uppercase tracking-wide">
            Official Response
          </p>
          <p className="text-xs leading-relaxed opacity-70">{post.resolutionMessage}</p>
          {post.resolvedAt && (
            <p className="text-[10px] opacity-40 mt-1">
              Resolved {post.resolvedAt}
              {post.resolvedByUsername ? ` by @${post.resolvedByUsername}` : ""}
            </p>
          )}
        </div>
      )}

      {/* Footer stats + CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-base-300/50 mt-1">
        <div className="flex items-center gap-3 text-[11px] opacity-40">
          <span className="flex items-center gap-1"><MessageSquare size={12} /> {post.commentCount ?? 0}</span>
          <span className="flex items-center gap-1"><TrendingUp size={12} /> {post.likeCount ?? 0}</span>
        </div>

        {!post.isResolved && (
          <button
            id={`resolve-btn-${post.id}`}
            onClick={() => onResolveClick(post)}
            className="flex items-center gap-1.5 rounded-xl bg-[#1D4ED8] px-3 py-1.5 text-xs font-bold text-white
                       hover:bg-[#1D4ED8]-focus transition-all shadow-sm hover:shadow-md opacity-0 group-hover:opacity-100"
          >
            <CheckCircle2 size={13} />
            Mark Resolved
          </button>
        )}
      </div>
    </motion.div>
  );
};

/** Skeleton for issue card */
const IssueSkeleton = () => (
  <div className="rounded-2xl border border-base-300 bg-base-200 p-5 space-y-3 animate-pulse">
    <div className="flex items-center gap-2.5">
      <div className="h-8 w-8 rounded-full bg-base-300" />
      <div className="space-y-1.5 flex-1">
        <div className="h-3 w-1/3 rounded bg-base-300" />
        <div className="h-2.5 w-1/4 rounded bg-base-300" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 w-full rounded bg-base-300" />
      <div className="h-3 w-5/6 rounded bg-base-300" />
      <div className="h-3 w-3/4 rounded bg-base-300" />
    </div>
    <div className="h-8 w-28 rounded-xl bg-base-300 ml-auto" />
  </div>
);

/** Stat card for analytics */
const StatCard = ({
  title,
  value,
  sub,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) => (
  <div className="rounded-2xl border border-base-300 bg-base-100 p-5 flex items-start gap-4">
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-semibold opacity-50 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-extrabold leading-tight mt-0.5">{value}</p>
      {sub && <p className="text-xs opacity-40 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast form
// ─────────────────────────────────────────────────────────────────────────────
const SCOPE_OPTIONS: { value: BroadcastScope; label: string; hint: string }[] = [
  { value: "COUNTRY", label: "Entire Country", hint: "Visible to all citizens nationally" },
  { value: "STATE", label: "State(s)", hint: "Comma-separated state names" },
  { value: "DISTRICT", label: "District(s)", hint: "Comma-separated district names" },
  { value: "AREA", label: "Pincode Area(s)", hint: "Comma-separated pincodes" },
];

const BroadcastForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [content, setContent] = useState("");
  const [scope, setScope] = useState<BroadcastScope>("DISTRICT");
  const [targets, setTargets] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [err, setErr] = useState("");

  // Location Selector Cache and Selected states
  const [statesList, setStatesList] = useState<string[]>([]);
  const [districtsList, setDistrictsList] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [activeDistrictState, setActiveDistrictState] = useState("");
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Fetch States list when STATE or DISTRICT scope is active
  useEffect(() => {
    if ((scope === "STATE" || scope === "DISTRICT") && statesList.length === 0) {
      setLoadingLocations(true);
      getPincodeStates()
        .then((data) => setStatesList(data))
        .catch((e) => console.error("Failed to load states:", e))
        .finally(() => setLoadingLocations(false));
    }
  }, [scope, statesList.length]);

  // Fetch Districts when a State is selected under DISTRICT scope
  useEffect(() => {
    if (scope === "DISTRICT" && activeDistrictState) {
      setLoadingLocations(true);
      setDistrictsList([]);
      getPincodeDistricts(activeDistrictState)
        .then((data) => setDistrictsList(data))
        .catch((e) => console.error("Failed to load districts:", e))
        .finally(() => setLoadingLocations(false));
    } else {
      setDistrictsList([]);
    }
  }, [scope, activeDistrictState]);

  function handleMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setMediaFile(f);
    if (f) setMediaPreview(URL.createObjectURL(f));
    else setMediaPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setStatus("loading");
    setErr("");
    try {
      let finalStates: string[] | undefined = undefined;
      let finalDistricts: string[] | undefined = undefined;
      let finalPincodes: string[] | undefined = undefined;

      if (scope === "STATE") {
        finalStates = selectedStates;
        if (finalStates.length === 0) throw new Error("Please select at least one State");
      } else if (scope === "DISTRICT") {
        finalDistricts = selectedDistricts;
        if (finalDistricts.length === 0) throw new Error("Please select at least one District");
      } else if (scope === "AREA") {
        finalPincodes = targets
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        if (finalPincodes.length === 0) throw new Error("Please enter at least one Pincode");
      }

      await createBroadcast(
        {
          content: content.trim(),
          broadcastScope: scope,
          ...(scope === "STATE" ? { targetStates: finalStates } : {}),
          ...(scope === "DISTRICT" ? { targetDistricts: finalDistricts } : {}),
          ...(scope === "AREA" ? { targetPincodes: finalPincodes } : {}),
        },
        mediaFile
      );
      setStatus("success");
      setContent("");
      setTargets("");
      setSelectedStates([]);
      setSelectedDistricts([]);
      setActiveDistrictState("");
      setMediaFile(null);
      setMediaPreview(null);
      setTimeout(() => { setStatus("idle"); onSuccess(); }, 1500);
    } catch (error: unknown) {
      setStatus("error");
      setErr(error instanceof Error ? error.message : "Failed to publish broadcast.");
    }
  }

  const currentScopeInfo = SCOPE_OPTIONS.find((o) => o.value === scope)!;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-base-300 bg-base-100 p-6 space-y-5"
    >
      <div>
        <h3 className="text-sm font-bold mb-0.5">Compose Official Broadcast</h3>
        <p className="text-xs opacity-40">
          Publish an official announcement to citizens in your jurisdiction.
        </p>
      </div>

      {/* Content */}
      <div>
        <label className="text-xs font-semibold opacity-60 mb-1.5 block">
          Message <span className="text-error">*</span>
        </label>
        <textarea
          id="broadcast-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your official announcement here…"
          className="w-full rounded-xl border border-base-300 bg-base-200 px-4 py-3 text-sm leading-relaxed
                     placeholder:opacity-40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40
                     transition-all min-h-[120px]"
          maxLength={2000}
          disabled={status === "loading" || status === "success"}
        />
        <div className="flex justify-end">
          <span className="text-[11px] opacity-30">{content.length}/2000</span>
        </div>
      </div>

      {/* Scope selector */}
      <div>
        <label className="text-xs font-semibold opacity-60 mb-1.5 block">Broadcast Scope</label>
        <div className="relative">
          <select
            id="broadcast-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as BroadcastScope)}
            className="w-full appearance-none rounded-xl border border-base-300 bg-base-200 px-4 py-2.5
                       text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 pr-10 transition-all"
            disabled={status === "loading" || status === "success"}
          >
            {SCOPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-3 opacity-40" />
        </div>
        <p className="text-[11px] opacity-40 mt-1">{currentScopeInfo.hint}</p>
      </div>

      {/* Targets input (hidden for COUNTRY) */}
      {scope !== "COUNTRY" && (
        <div className="space-y-3">
          {scope === "STATE" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold opacity-60 block">
                Target States <span className="text-error">*</span>
              </label>
              <div className="relative">
                <select
                  id="state-select"
                  className="w-full appearance-none rounded-xl border border-base-300 bg-base-200 px-4 py-2.5
                             text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 pr-10 transition-all"
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !selectedStates.includes(val)) {
                      setSelectedStates([...selectedStates, val]);
                    }
                  }}
                  disabled={loadingLocations || status === "loading" || status === "success"}
                >
                  <option value="" disabled>
                    {loadingLocations ? "Loading states..." : "Select State..."}
                  </option>
                  {statesList.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {loadingLocations ? (
                  <RefreshCw className="animate-spin absolute right-3 top-3.5 opacity-40 text-primary" size={16} />
                ) : (
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-3.5 opacity-40" />
                )}
              </div>

              {/* Selected States Pills */}
              {selectedStates.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedStates.map((st) => (
                    <span
                      key={st}
                      className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#1D4ED8]/10 text-[#1D4ED8]
                                 px-3 py-1 rounded-full border border-[#1D4ED8]/25"
                    >
                      {st}
                      <button
                        type="button"
                        onClick={() => setSelectedStates(selectedStates.filter((x) => x !== st))}
                        className="hover:text-red-500 transition-colors ml-0.5"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {scope === "DISTRICT" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* State Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold opacity-60 block">Select State</label>
                  <div className="relative">
                    <select
                      id="district-state-select"
                      className="w-full appearance-none rounded-xl border border-base-300 bg-base-200 px-3.5 py-2
                                 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 pr-9 transition-all"
                      value={activeDistrictState}
                      onChange={(e) => setActiveDistrictState(e.target.value)}
                      disabled={loadingLocations || status === "loading" || status === "success"}
                    >
                      <option value="" disabled>Select State...</option>
                      {statesList.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3 opacity-40" />
                  </div>
                </div>

                {/* District Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold opacity-60 block">Select District</label>
                  <div className="relative">
                    <select
                      id="district-select"
                      className="w-full appearance-none rounded-xl border border-base-300 bg-base-200 px-3.5 py-2
                                 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 pr-9 transition-all"
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !selectedDistricts.includes(val)) {
                          setSelectedDistricts([...selectedDistricts, val]);
                        }
                      }}
                      disabled={!activeDistrictState || loadingLocations || status === "loading" || status === "success"}
                    >
                      <option value="" disabled>
                        {!activeDistrictState
                          ? "Select state first..."
                          : loadingLocations
                          ? "Loading districts..."
                          : "Select District..."}
                      </option>
                      {districtsList.map((dist) => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                    {loadingLocations ? (
                      <RefreshCw className="animate-spin absolute right-3 top-3 opacity-40 text-primary" size={14} />
                    ) : (
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3 opacity-40" />
                    )}
                  </div>
                </div>
              </div>

              {/* Selected Districts Pills */}
              {selectedDistricts.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedDistricts.map((ds) => (
                    <span
                      key={ds}
                      className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#1D4ED8]/10 text-[#1D4ED8]
                                 px-3 py-1 rounded-full border border-[#1D4ED8]/25"
                    >
                      {ds}
                      <button
                        type="button"
                        onClick={() => setSelectedDistricts(selectedDistricts.filter((x) => x !== ds))}
                        className="hover:text-red-500 transition-colors ml-0.5"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {scope === "AREA" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold opacity-60 block">
                Target Pincodes <span className="text-error">*</span>
              </label>
              <input
                id="broadcast-targets"
                type="text"
                value={targets}
                onChange={(e) => setTargets(e.target.value)}
                placeholder="e.g. 411001, 400001"
                className="w-full rounded-xl border border-base-300 bg-base-200 px-4 py-2.5 text-sm
                           placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                disabled={status === "loading" || status === "success"}
              />
            </div>
          )}
        </div>
      )}

      {/* Media upload */}
      <div>
        <label className="text-xs font-semibold opacity-60 mb-1.5 block">
          Attach Image (optional)
        </label>
        {mediaPreview ? (
          <div className="relative rounded-xl overflow-hidden border border-base-300 max-h-48">
            <img src={mediaPreview} alt="Preview" className="w-full h-48 object-cover" />
            <button
              type="button"
              onClick={() => { setMediaFile(null); setMediaPreview(null); }}
              className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full
                         bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label
            htmlFor="broadcast-media"
            className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-base-300
                       px-4 py-4 hover:border-primary/40 transition-colors"
          >
            <ImageIcon size={20} className="opacity-30" />
            <span className="text-sm opacity-40">Click to upload image</span>
            <input
              id="broadcast-media"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleMedia}
              disabled={status === "loading" || status === "success"}
            />
          </label>
        )}
      </div>

      {/* Error */}
      {status === "error" && (
        <div className="flex items-start gap-2 rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{err}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        id="broadcast-submit"
        disabled={!content.trim() || (scope !== "COUNTRY" && !targets.trim()) || status === "loading" || status === "success"}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] py-3 text-sm font-bold
                   text-white shadow-md hover:bg-[#1D4ED8]-focus transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "loading" && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        )}
        {status === "success" ? (
          <><CheckCircle2 size={16} /> Published!</>
        ) : status === "loading" ? (
          "Publishing…"
        ) : (
          <><Send size={16} /> Publish Broadcast</>
        )}
      </button>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Analytics panel
// ─────────────────────────────────────────────────────────────────────────────
const AnalyticsPanel = ({ username }: { username: string }) => {
  const [analytics, setAnalytics] = useState<BroadcastAnalytics | null>(null);
  const [stats, setStats] = useState<BroadcastStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getBroadcastAnalytics(30), getBroadcastStatistics()])
      .then(([a, s]) => { setAnalytics(a); setStats(s); })
      .catch(() => setError("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-base-300 bg-base-200 h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle size={32} className="text-error opacity-60" />
        <p className="text-sm opacity-60">{error}</p>
      </div>
    );
  }

  const totalBroadcasts = stats?.total ?? stats?.totalBroadcasts ?? analytics?.totalBroadcasts ?? 0;
  const totalActive = stats?.active ?? 0;
  const totalResolved = stats?.resolved ?? 0;
  const resolutionRate =
    analytics?.resolutionRate != null
      ? `${Math.round((analytics.resolutionRate as number) * 100)}%`
      : totalResolved + totalActive > 0
        ? `${Math.round((totalResolved / (totalResolved + totalActive)) * 100)}%`
        : "—";

  const broadcastsByScope = analytics?.broadcastsByScope as Record<string, number> | undefined;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold mb-0.5">Performance Overview</h3>
        <p className="text-xs opacity-40">Last 30 days</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Total Broadcasts"
          value={totalBroadcasts}
          sub="Official posts published"
          icon={<BarChart2 size={20} className="text-primary" />}
          color="bg-[#1D4ED8]/10"
        />
        <StatCard
          title="Resolution Rate"
          value={resolutionRate}
          sub="Issues marked resolved"
          icon={<CheckCircle2 size={20} className="text-success" />}
          color="bg-success/10"
        />
        <StatCard
          title="Active Issues"
          value={totalActive}
          sub="Pending citizen requests"
          icon={<Clock size={20} className="text-amber-500" />}
          color="bg-amber-400/10"
        />
        <StatCard
          title="Citizens Reached"
          value={analytics?.totalReach ?? "—"}
          sub="Via broadcasts"
          icon={<Users size={20} className="text-violet-500" />}
          color="bg-violet-400/10"
        />
      </div>

      {/* Scope breakdown */}
      {broadcastsByScope && Object.keys(broadcastsByScope).length > 0 && (
        <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
          <p className="text-xs font-semibold opacity-50 uppercase tracking-wide mb-4">
            Broadcasts by Scope
          </p>
          <div className="space-y-3">
            {Object.entries(broadcastsByScope).map(([scopeKey, count]) => {
              const max = Math.max(...Object.values(broadcastsByScope));
              const pct = max > 0 ? Math.round(((count as number) / max) * 100) : 0;
              return (
                <div key={scopeKey}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize opacity-70">{scopeKey.toLowerCase()}</span>
                    <span className="font-bold">{count as number}</span>
                  </div>
                  <div className="h-2 rounded-full bg-base-300 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[#1D4ED8]"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
const DepartmentDashboard = () => {
  const { username, loading: userLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<DashboardTab>("issues");
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("active");
  const [posts, setPosts] = useState<TaggedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<TaggedPost | null>(null);
  const [activePendingCount, setActivePendingCount] = useState(0);
  const [broadcastRefresh, setBroadcastRefresh] = useState(0);

  const fetchIssues = useCallback(
    async (filter: IssueFilter) => {
      if (!username) return;
      setPostsLoading(true);
      setPostsError(null);
      try {
        const page =
          filter === "active"
            ? await getActiveTaggedPosts(username)
            : await getResolvedTaggedPosts(username);
        setPosts(page.posts);
        if (filter === "active") setActivePendingCount(page.totalCount);
      } catch (e: unknown) {
        setPostsError(e instanceof Error ? e.message : "Failed to load issues.");
      } finally {
        setPostsLoading(false);
      }
    },
    [username]
  );

  // Fetch on tab / filter change
  useEffect(() => {
    if (activeTab === "issues") fetchIssues(issueFilter);
  }, [activeTab, issueFilter, fetchIssues]);

  // Initial fetch of active count for badge regardless of current tab
  useEffect(() => {
    if (username) {
      getActiveTaggedPosts(username, null, 1)
        .then((p) => setActivePendingCount(p.totalCount))
        .catch(() => { });
    }
  }, [username]);

  function handleResolved(postId: number) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setActivePendingCount((c) => Math.max(0, c - 1));
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!username) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <AlertCircle size={40} className="text-error/60" />
        <p className="text-sm opacity-60">Could not load your account. Please log in again.</p>
        <a href="/login" className="text-sm font-semibold text-primary underline">
          Go to Login
        </a>
      </div>
    );
  }

  return (
    <>
      {/* Resolve Modal */}
      {resolveTarget && (
        <ResolvePostModal
          post={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onResolved={(id) => { handleResolved(id); setResolveTarget(null); }}
        />
      )}

      <div className="grid grid-cols-12 gap-5 pb-8">
        {/* ── Left Sidebar ── */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3">
          <div className="sticky top-4">
            <DepartmentSidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              activeBadge={activePendingCount}
            />
          </div>
        </div>

        {/* ── Main Panel ── */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-5">

          {/* Page header */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-base-300 bg-base-100 px-6 py-4">
            <div>
              <p className="text-[11px] font-semibold opacity-40 uppercase tracking-widest">
                Department Portal
              </p>
              <h1 className="text-lg font-extrabold leading-tight mt-0.5">
                {activeTab === "issues"
                  ? "Issues Inbox"
                  : activeTab === "broadcasts"
                    ? "Official Broadcasts"
                    : "Analytics & Impact"}
              </h1>
              <p className="text-xs opacity-50 mt-0.5">
                @{username}
              </p>
            </div>

            {/* Quick refresh for issues */}
            {activeTab === "issues" && (
              <button
                id="dept-refresh-btn"
                onClick={() => fetchIssues(issueFilter)}
                disabled={postsLoading}
                className="flex items-center gap-2 rounded-xl border border-base-300 px-3 py-2 text-xs font-semibold
                           hover:bg-base-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={postsLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            )}
          </div>

          {/* ── ISSUES PANEL ── */}
          {activeTab === "issues" && (
            <div className="space-y-4">
              {/* Filter tabs */}
              <div className="flex gap-2 bg-base-200/50 p-1 rounded-2xl w-fit border border-base-300">
                {(["active", "resolved"] as IssueFilter[]).map((f) => (
                  <button
                    key={f}
                    id={`issue-filter-${f}`}
                    onClick={() => setIssueFilter(f)}
                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-all capitalize
                      ${issueFilter === f
                        ? "bg-[#1D4ED8] text-white shadow-md"
                        : "text-base-content/60 hover:text-base-content hover:bg-base-300/50"
                      }`}
                  >
                    {f}
                    {f === "active" && activePendingCount > 0 && (
                      <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full
                                       bg-amber-400 text-[10px] font-extrabold text-black px-1.5">
                        {activePendingCount > 99 ? "99+" : activePendingCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Content */}
              <AnimatePresence mode="wait">
                {postsLoading ? (
                  <motion.div
                    key="skeletons"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {Array.from({ length: 4 }).map((_, i) => <IssueSkeleton key={i} />)}
                  </motion.div>
                ) : postsError ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-3 py-16 text-center rounded-2xl border border-error/20 bg-error/5"
                  >
                    <AlertCircle size={32} className="text-error/60" />
                    <p className="text-sm opacity-60">{postsError}</p>
                    <button
                      onClick={() => fetchIssues(issueFilter)}
                      className="text-sm font-semibold text-primary underline"
                    >
                      Try Again
                    </button>
                  </motion.div>
                ) : posts.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-3 py-20 text-center rounded-2xl border border-dashed border-base-300"
                  >
                    <div className="mb-2 opacity-20">
                      {issueFilter === "active" ? (
                        <Inbox size={48} strokeWidth={1.5} />
                      ) : (
                        <CheckCircle2 size={48} strokeWidth={1.5} className="text-success" />
                      )}
                    </div>
                    <p className="text-sm font-semibold opacity-60">
                      {issueFilter === "active"
                        ? "No active issues tagged to your department."
                        : "No resolved issues yet."}
                    </p>
                    <p className="text-xs opacity-40">
                      Citizens tag departments in civic posts to raise issues.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <AnimatePresence>
                      {posts.map((post) => (
                        <IssueCard
                          key={post.id}
                          post={post}
                          onResolveClick={setResolveTarget}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── BROADCASTS PANEL ── */}
          {activeTab === "broadcasts" && (
            <div className="space-y-5">
              <BroadcastForm
                onSuccess={() => setBroadcastRefresh((n) => n + 1)}
              />
              <div className="rounded-2xl border border-base-300 bg-base-200/50 px-5 py-4">
                <p className="text-xs opacity-40 text-center">
                  Broadcasts are published as official civic posts and are visible in citizens' feeds based on their location.
                </p>
              </div>
            </div>
          )}

          {/* ── ANALYTICS PANEL ── */}
          {activeTab === "analytics" && (
            <AnalyticsPanel key={broadcastRefresh} username={username} />
          )}
        </div>
      </div>
    </>
  );
};

export default DepartmentDashboard;
