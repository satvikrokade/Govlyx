/**
 * src/components/search/SearchOverlay.tsx
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, X, Hash, Users, FileText, Loader2, AlertCircle, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import PostCard from "../post/PostCard";
import { toPostCardPost } from "../../utils/postUtils";
import { useCurrentUser } from "../../hooks/useUser";
import { 
  saveRecentSearch, 
  getRecentSearches, 
  cacheSuggestion, 
  getOfflineSuggestions,
} from "../../utils/searchCache";
import type { CacheItem } from "../../utils/searchCache";
import { apiUrl } from "../../utils/apiUrl";

// ─── Raw backend shape — defensive: accept every possible field name ──────────
// SearchDto.Result fields (from SearchService builder calls):
//   .resultType()  .id()  .post()  .socialPost()
//   .communityName()  .communitySlug()  .communityAvatarUrl()  .communityDescription()
//   .memberCount()    .privacy()  .pincode()  .locationName()  .healthScore()
//   .hashtag()  .postCount()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawResult = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawApiResponse = Record<string, any>;

// ─── Normalised shape the UI works with ──────────────────────────────────────

type ResultKind = "POST" | "SOCIAL_POST" | "COMMUNITY" | "HASHTAG" | "UNKNOWN";

interface NormResult {
  kind: ResultKind;
  id?: number;
  // post / social-post
  postDto?: Record<string, unknown>;
  // community
  communityName?: string;
  communitySlug?: string;
  communityAvatarUrl?: string;
  communityDescription?: string;
  memberCount?: number;
  locationName?: string;
  // hashtag
  hashtag?: string;
  postCount?: number;
  // original for debug
  _raw: RawResult;
}

// ─── Normaliser — reads every possible field name variant ────────────────────

function normalise(r: RawResult): NormResult {
  // resultType may be "POST", "SOCIAL_POST", "COMMUNITY", "HASHTAG"
  const kind: ResultKind =
    (r.resultType ?? r.type ?? r.kind ?? "UNKNOWN").toString().toUpperCase() as ResultKind;

  const base: NormResult = { kind, id: r.id ?? undefined, _raw: r };

  if (kind === "POST" || kind === "SOCIAL_POST") {
    // backend sets .post(PostResponse) for POST and .socialPost(SocialPostDto) for SOCIAL_POST
    const dto = r.post ?? r.socialPost ?? r.postResponse ?? r.socialPostDto ?? null;
    return { ...base, postDto: dto ?? undefined };
  }

  if (kind === "COMMUNITY") {
    return {
      ...base,
      communityName: r.communityName ?? r.name ?? undefined,
      communitySlug: r.communitySlug ?? r.slug ?? undefined,
      communityAvatarUrl: r.communityAvatarUrl ?? r.avatarUrl ?? r.imageUrl ?? r.communityImageUrl ?? undefined,
      communityDescription: r.communityDescription ?? r.description ?? undefined,
      memberCount: r.memberCount ?? r.communityMemberCount ?? r.membersCount ?? undefined,
      locationName: r.locationName ?? r.location ?? undefined,
    };
  }

  if (kind === "HASHTAG") {
    const rawTag = r.hashtag ?? r.tag ?? r.hashtagName ?? "";
    return {
      ...base,
      hashtag: rawTag.toString().replace(/^#+/, ""),
      postCount: r.postCount ?? r.count ?? undefined,
    };
  }

  return base;
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

function getAuthToken(): string | null {
  return (
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token") ||
    null
  );
}
function authHeaders(): HeadersInit {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ─── Post mapper ──────────────────────────────────────────────────────────────

// dtoToAnyPost removed in favor of shared toPostCardPost utility

// ─── useDebounce ──────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDv(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return dv;
}

// ─── Scroll sentinel ──────────────────────────────────────────────────────────

function ScrollSentinel({ onIntersect }: { onIntersect: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onIntersect);
  useEffect(() => { cb.current = onIntersect; }, [onIntersect]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) cb.current(); },
      { threshold: 0.1, rootMargin: "0px 0px 300px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref} className="h-2" />;
}

// ─── Debug panel — shows raw JSON so you can see exact field names ────────────

function DebugPanel({ raw }: { raw: RawResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded border border-warning/40 bg-warning/5 text-xs mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-1 opacity-60 hover:opacity-100"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        raw JSON ({raw.resultType ?? raw.type ?? "?"})
      </button>
      {open && (
        <pre className="px-2 pb-2 overflow-x-auto text-[10px] opacity-70 max-h-48">
          {JSON.stringify(raw, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Result cards ─────────────────────────────────────────────────────────────

const DEBUG = false; // disabled to hide raw JSON in search results

function CommunityCard({ r }: { r: NormResult }) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Navigate directly to the community via URL slug/id — Communities page reads useParams
    const slug = r.communitySlug || String(r.id || "");
    navigate(`/communities/${slug}`, {
      state: {
        selectedCommunity: {
          id: r.id || 0,
          name: r.communityName || "Unnamed",
          slug,
          description: r.communityDescription || "",
          category: null,
          tags: null,
          avatarUrl: r.communityAvatarUrl || null,
          coverImageUrl: null,
          privacy: "PUBLIC" as const,
          locationName: r.locationName || null,
          memberCount: r.memberCount || 0,
          postCount: 0,
          isMember: false,
          isOwner: false,
          createdAt: new Date().toISOString(),
        },
      },
    });
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 rounded-xl border border-base-300 bg-base-100 p-3 hover:bg-base-200 transition-colors text-left"
      >
        {r.communityAvatarUrl ? (
          <img
            src={r.communityAvatarUrl}
            alt={r.communityName}
            className="h-10 w-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700/10">
            <Users size={18} className="text-blue-700" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold truncate">
            {r.communityName ?? <span className="opacity-40 italic">Unnamed community</span>}
          </p>
          {r.communityDescription && (
            <p className="text-xs opacity-60 truncate">{r.communityDescription}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {r.memberCount != null && (
              <p className="text-xs opacity-50">{Number(r.memberCount).toLocaleString()} members</p>
            )}
            {r.locationName && (
              <p className="text-xs opacity-40">· {r.locationName}</p>
            )}
          </div>
        </div>
      </button>
      {DEBUG && <DebugPanel raw={r._raw} />}
    </div>
  );
}

function HashtagCard({ r }: { r: NormResult }) {
  const navigate = useNavigate();
  return (
    <div>
      <button
        onClick={() => navigate("/communities", { state: { searchQuery: r.hashtag ?? "" } })}
        className="flex w-full items-center gap-3 rounded-xl border border-base-300 bg-base-100 p-3 hover:bg-base-200 transition-colors text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10">
          <Hash size={18} className="text-secondary" />
        </div>
        <div>
          <p className="font-semibold">#{r.hashtag}</p>
          {r.postCount != null && (
            <p className="text-xs opacity-50">{Number(r.postCount).toLocaleString()} posts</p>
          )}
        </div>
      </button>
      {DEBUG && <DebugPanel raw={r._raw} />}
    </div>
  );
}

function UnknownCard({ r }: { r: NormResult }) {
  if (!DEBUG) return null;
  return (
    <div className="rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error">
      ⚠ Unknown resultType: "{r._raw.resultType ?? r._raw.type ?? "missing"}"
      <DebugPanel raw={r._raw} />
    </div>
  );
}

// ─── Typeahead dropdown ───────────────────────────────────────────────────────

function TypeaheadDropdown({
  results, loading, onSelect,
}: {
  results: NormResult[];
  loading: boolean;
  onSelect: (q: string) => void;
}) {
  const navigate = useNavigate();
  if (!loading && results.length === 0) return null;


  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-base-300 bg-base-100 shadow-xl overflow-hidden">
      {results.length > 0 && (
        <div className="max-h-60 overflow-y-auto">
          {results.map((r, i) => {
            if (r.kind === "HASHTAG")
              return (
                <button key={i} onClick={() => onSelect(`#${r.hashtag}`)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 transition-colors">
                  <Hash size={14} className="opacity-50" />
                  <span className="font-medium">#{r.hashtag}</span>
                  {r.postCount != null && <span className="ml-auto text-xs opacity-40">{r.postCount} posts</span>}
                </button>
              );

            if (r.kind === "COMMUNITY")
              return (
                <button key={i} onClick={() => {
                    const slug = r.communitySlug || String(r.id ?? "");
                    navigate(`/communities/${slug}`, {
                      state: { selectedCommunity: { id: r.id, name: r.communityName, slug, avatarUrl: r.communityAvatarUrl } }
                    });
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 transition-colors">
                  <Users size={14} className="opacity-50" />
                  <span className="font-medium">{r.communityName}</span>
                  <span className="ml-auto text-xs opacity-40">community</span>
                </button>
              );

            if (r.kind === "POST" || r.kind === "SOCIAL_POST") {
              const content = r.postDto?.content as string | undefined;
              const postId = r.id;
              return (
                <button key={i}
                  onClick={() => {
                    if (postId) navigate(`/post/${postId}`);
                    else onSelect((content ?? "").slice(0, 60));
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 transition-colors">
                  <FileText size={14} className="opacity-50" />
                  <span className="truncate opacity-80">{content}</span>
                </button>
              );
            }

            return null;
          })}
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center p-3 opacity-50 border-t border-base-300">
          <Loader2 size={16} className="animate-spin" />
        </div>
      )}
    </div>
  );
}

// ─── useFullSearch hook ───────────────────────────────────────────────────────

function extractItems(raw: RawApiResponse): RawResult[] {
  // Backend SearchDto.Response uses field "data" (set via .data(flat))
  // Fallback to "results" / "content" / "items" just in case
  const arr = raw.data ?? raw.results ?? raw.content ?? raw.items ?? [];
  return Array.isArray(arr) ? arr : [];
}

function useFullSearch(committedQuery: string) {
  const [results, setResults] = useState<NormResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (cursor: number | null, replace: boolean, q: string) => {
    if (!q.trim()) return;
    replace ? setInitialLoading(true) : setLoading(true);
    setError(null);

      // 1. Initial local lookup for instant feedback
      const offlineItems = getOfflineSuggestions(q);
      const convertedOffline = offlineItems.map(item => ({
        kind: item.kind,
        id: typeof item.id === 'number' ? item.id : undefined,
        communityName: item.kind === 'COMMUNITY' ? item.displayText : undefined,
        communitySlug: item.slug,
        communityAvatarUrl: item.avatarUrl || undefined,
        hashtag: item.kind === 'HASHTAG' ? item.displayText.replace('#', '') : undefined,
        postDto: item.kind === 'POST' || item.kind === 'SOCIAL_POST' ? { content: item.displayText } : undefined,
        _raw: {}
      }));

      if (replace) setResults(convertedOffline as NormResult[]);

      // 2. Network Fetch
      try {
        const params = new URLSearchParams({ q, limit: "20" });
        if (cursor !== null) params.set("cursor", String(cursor));

        const res = await fetch(apiUrl(`/api/search?${params}`), { headers: authHeaders() });

        if (res.status === 401 || res.status === 403) throw new Error("Please log in to see more.");

        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) throw new Error("Offline Mode");

        if (!res.ok) throw new Error(`Server error ${res.status}`);

        const raw: RawApiResponse = await res.json();
        const networkItems = extractItems(raw).map(normalise);

        setResults((prev) => {
          if (replace) {
            // Merge network with offline, prioritized network
            const merged = [...networkItems];
            convertedOffline.forEach(off => {
              const exists = merged.find(net => 
                net.kind === off.kind && (net.id === off.id || net.communitySlug === off.communitySlug || net.hashtag === off.hashtag)
              );
              if (!exists) merged.push(off as NormResult);
            });
            return merged;
          }
          return [...prev, ...networkItems];
        });
        
        setHasMore(raw.hasMore ?? false);
        setNextCursor(raw.nextCursor ?? null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Search failed";
        // If we have some results already (from local cache), don't show a loud error
        if (convertedOffline.length > 0) {
          setError("Search offline — showing local results");
        } else {
          setError(msg === "Offline Mode" ? "Server unreachable — check your connection" : msg);
        }
        setHasMore(false);
      } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!committedQuery.trim()) {
      setResults([]); setHasMore(false); setNextCursor(null); setError(null);
      return;
    }
    setResults([]); setNextCursor(null); setHasMore(false); setError(null);
    fetchPage(null, true, committedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedQuery]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore && committedQuery.trim()) fetchPage(nextCursor, false, committedQuery);
  }, [loading, hasMore, committedQuery, nextCursor, fetchPage]);

  return { results, loading, initialLoading, hasMore, error, loadMore };
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export default function SearchOverlay({ open, onClose, initialQuery = "" }: SearchOverlayProps) {
  const [inputValue, setInputValue] = useState(initialQuery);
  const [committedQuery, setCommittedQuery] = useState("");
  const [quickResults, setQuickResults] = useState<NormResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [quickLoading, setQuickLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const debouncedInput = useDebounce(inputValue, 300);
  const { results, loading, initialLoading, hasMore, error, loadMore } = useFullSearch(committedQuery);
  const { data: user } = useCurrentUser();

  const currentUser = user ? {
    id: user.id,
    username: user.actualUsername || user.username,
    role: user.role
  } : undefined;

  useEffect(() => {
    if (open) {
      setInputValue(initialQuery);
      setCommittedQuery("");
      setQuickResults([]);
      setShowDropdown(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!debouncedInput.trim() || !open) {
      setQuickResults([]); 
      setShowDropdown(false); 
      return;
    }

    // 1. Check local cache immediately for offline / instant results
    const offlineItems: CacheItem[] = getOfflineSuggestions(debouncedInput);
    const convertedOffline: NormResult[] = offlineItems.map(item => ({
      kind: item.kind,
      id: typeof item.id === 'number' ? item.id : undefined,
      communityName: item.kind === 'COMMUNITY' ? item.displayText : undefined,
      communitySlug: item.slug,
      communityAvatarUrl: item.avatarUrl || undefined,
      hashtag: item.kind === 'HASHTAG' ? item.displayText.replace('#', '') : undefined,
      postDto: item.kind === 'POST' || item.kind === 'SOCIAL_POST' ? { content: item.displayText } : undefined,
      _raw: {} 
    }));

    setQuickResults(convertedOffline);
    if (convertedOffline.length > 0) setShowDropdown(true);

    // 2. Fetch from network
    setQuickLoading(true);
    fetch(apiUrl(`/api/search/quick?q=${encodeURIComponent(debouncedInput)}`), { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((raw: RawApiResponse) => {
        const networkItems = extractItems(raw).map(normalise);
        
        // Merge network results with offline results, prioritizing network items
        const merged = [...networkItems];
        // Add offline items that aren't already in network results
        convertedOffline.forEach(off => {
          const exists = merged.find(net => 
            net.kind === off.kind && (net.id === off.id || net.communitySlug === off.communitySlug || net.hashtag === off.hashtag)
          );
          if (!exists) merged.push(off);
        });
        
        setQuickResults(merged);
        setShowDropdown(true);
      })
      .catch(() => {
        // Silent fallback for quick results
        if (convertedOffline.length > 0) setShowDropdown(true);
      })
      .finally(() => setQuickLoading(false));
  }, [debouncedInput, open]);

  const commitSearch = useCallback((q: string) => {
    saveRecentSearch(q);
    setInputValue(q); 
    setCommittedQuery(q); 
    setShowDropdown(false); 
    inputRef.current?.blur();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) commitSearch(inputValue);
    if (e.key === "Escape") { if (showDropdown) setShowDropdown(false); else onClose(); }
  };

  const handleInputFocus = () => {
    const historical = getRecentSearches();
    setRecentSearches(historical);

    if (!committedQuery) {
      // If no input, show recent searches if they exist
      if (!inputValue && historical.length > 0) {
        setShowDropdown(true);
      } else if (quickResults.length > 0) {
        setShowDropdown(true);
      }
    }
  };

  if (!open) return null;

  const postResults = results.filter((r) => r.kind === "POST" || r.kind === "SOCIAL_POST");
  const communityResults = results.filter((r) => r.kind === "COMMUNITY");
  const hashtagResults = results.filter((r) => r.kind === "HASHTAG");
  const unknownResults = results.filter((r) => r.kind === "UNKNOWN");
  const hasResults = results.length > 0;
  const showEmpty = committedQuery && !initialLoading && !loading && !hasResults && !error;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="mx-auto mt-14 flex h-[calc(100vh-3.5rem)] max-w-2xl flex-col bg-base-100 shadow-2xl lg:mt-16 lg:h-[calc(100vh-4rem)] lg:rounded-b-2xl overflow-hidden">

        {/* Search bar */}
        <div className="relative flex items-center gap-2 border-b border-base-300 px-4 py-3 shrink-0 z-40">
          <Search size={18} className="shrink-0 opacity-50" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder="Search posts, communities, hashtags…"
            className="flex-1 bg-transparent text-base outline-none placeholder:opacity-40"
          />
          {inputValue && (
            <button onClick={() => { setInputValue(""); setCommittedQuery(""); setShowDropdown(false); }}
              className="btn btn-ghost btn-xs btn-circle">
              <X size={14} />
            </button>
          )}
          <button onClick={onClose} className="btn btn-ghost btn-sm ml-1">Cancel</button>

          {showDropdown && !committedQuery && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-base-300 bg-base-100 shadow-xl overflow-hidden flex flex-col">
              {/* RECENT SEARCHES */}
              {!inputValue && recentSearches.length > 0 && (
                <div className="border-b border-base-300 bg-base-200/50 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Recent Searches</span>
                </div>
              )}
              {!inputValue && recentSearches.map((q, i) => (
                <button key={`recent-${i}`} onClick={() => commitSearch(q)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-base-200 transition-colors group">
                  <RefreshCw size={14} className="opacity-30 group-hover:opacity-60 transition-opacity" />
                  <span className="font-medium opacity-70">{q}</span>
                </button>
              ))}

              {/* AUTO-SUGGESTIONS */}
              {inputValue && (
                <TypeaheadDropdown 
                  results={quickResults} 
                  loading={quickLoading} 
                  onSelect={(q) => {
                    // Try to find if this selection corresponds to a specific community/top result to cache it
                    const matched = quickResults.find(r => 
                      r.communityName === q || `#${r.hashtag}` === q || (r.postDto?.content as string)?.startsWith(q)
                    );
                    if (matched) {
                      cacheSuggestion({
                        kind: matched.kind,
                        id: matched.id,
                        displayText: matched.communityName || (matched.hashtag ? `#${matched.hashtag}` : (matched.postDto?.content as string) || q),
                        subText: matched.communityDescription,
                        avatarUrl: matched.communityAvatarUrl,
                        slug: matched.communitySlug
                      });
                    }
                    commitSearch(q);
                  }} 
                />
              )}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* Idle */}
          {!committedQuery && !initialLoading && (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <Search size={40} className="mb-3" />
              <p className="text-sm">Search for posts, communities or hashtags</p>
              <p className="text-xs mt-1">Prefix with # to search hashtags directly</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Skeleton */}
          {initialLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-base-300 bg-base-200 p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1/4 rounded bg-base-300" />
                <div className="h-4 w-12 rounded bg-base-300" />
              </div>
              <div className="h-3 w-full rounded bg-base-300" />
              <div className="h-3 w-5/6 rounded bg-base-300" />
            </div>
          ))}

          {/* Empty */}
          {showEmpty && (
            <div className="flex flex-col items-center justify-center py-16 opacity-40">
              <Search size={36} className="mb-3" />
              <p className="text-sm">No results for "{committedQuery}"</p>
            </div>
          )}

          {/* Unknown-type debug cards (dev only) */}
          {unknownResults.map((r, i) => <UnknownCard key={i} r={r} />)}

          {/* Hashtags */}
          {hashtagResults.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest opacity-50">Hashtags</h3>
              <div className="space-y-2">
                {hashtagResults.map((r, i) => <HashtagCard key={i} r={r} />)}
              </div>
            </section>
          )}

          {/* Communities */}
          {communityResults.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest opacity-50">Communities</h3>
              <div className="space-y-2">
                {communityResults.map((r, i) => <CommunityCard key={i} r={r} />)}
              </div>
            </section>
          )}

          {/* Posts */}
          {postResults.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest opacity-50">Posts</h3>
              <div className="space-y-3">
                {postResults.map((r, i) => {
                  if (!r.postDto) return DEBUG ? <DebugPanel key={i} raw={r._raw} /> : null;
                  const post = toPostCardPost(r.postDto);
                  const postId = r.id ?? post.id;
                  return (
                    <div
                      key={`${r.kind}-${r.id ?? i}`}
                      className="cursor-pointer"
                      onClick={() => { if (postId) { onClose(); navigate(`/post/${postId}`); } }}
                    >
                      <PostCard
                        post={post}
                        currentUser={currentUser}
                        onLike={(id: number, liked: boolean) => console.log("like", id, liked)}
                        onSave={(id: number, saved: boolean) => console.log("save", id, saved)}
                        onShare={(id: number) => navigator.clipboard?.writeText(`${window.location.origin}/post/${id}`).catch(() => { })}
                        onComment={(id: number) => { onClose(); navigate(`/post/${id}`); }}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Load more */}
          {!initialLoading && loading && (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="animate-spin opacity-50" />
            </div>
          )}
          {!initialLoading && hasMore && !loading && !error && <ScrollSentinel onIntersect={loadMore} />}
          {!hasMore && hasResults && !error && (
            <p className="py-4 text-center text-xs opacity-30">End of results</p>
          )}
        </div>
      </div>
    </div>
  );
}