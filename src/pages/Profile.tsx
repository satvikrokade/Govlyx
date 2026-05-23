import { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle,
  Clock,
} from "lucide-react";
import EmptyState from "../components/ui/EmptyState";
import ProfileTabs from "../components/profile/ProfileTabs";
import PostCard from "../components/post/PostCard";
import PostSkeleton from "../components/post/PostSkeleton";
import type { AnyPost, CurrentUser } from "../components/post/PostCard";
import { useCurrentUser } from "../hooks/useUser";
import { toPostCardPost, resolveMediaUrl } from "../utils/postUtils";
import { apiUrl } from "../utils/apiUrl";

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
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}



// ─── share helper ─────────────────────────────────────────────────────────────

// ─── date helpers ─────────────────────────────────────────────────────────────
function formatDate(raw: any): string {
  if (raw === null || raw === undefined || raw === "") return "Unknown";
  let d: Date;
  if (Array.isArray(raw)) {
    d = new Date(
      raw[0],
      raw[1] - 1,
      raw[2] ?? 1,
      raw[3] ?? 0,
      raw[4] ?? 0,
      raw[5] ?? 0
    );
  } else {
    const ms = Number(raw);
    d = isNaN(ms) ? new Date(raw as string) : new Date(ms);
  }
  if (isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}


// ─── types ────────────────────────────────────────────────────────────────────
type PostFilter = "all" | "active" | "resolved";
type Tab = "posts" | "social" | "activity";

// ─── shared ActionBtn ─────────────────────────────────────────────────────────

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl bg-base-200 p-3 text-center">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  );
}

// Removed redundant local IssuePostCard, GovernmentBroadcastCard, PollCard, SocialPostCard

// ─── shared post mappers ──────────────────────────────────────────────────────
function mapSocialPost(p: any): AnyPost {
  return toPostCardPost(p);
}

function mapIssuePost(p: any): AnyPost {
  return toPostCardPost({ ...p, variant: "issue" });
}


// ═══════════════════════════════════════════════════════════════════════════════
// Profile page
// ═══════════════════════════════════════════════════════════════════════════════
const Profile = () => {
  const [tab, setTab] = useState<Tab>("posts");
  const [postFilter, setPostFilter] = useState<PostFilter>("active");

  const handleDelete = (type: 'posts' | 'social-posts', id: number) => {
    // Parent only handles state removal. PostCard handles confirm + API.
    if (type === 'posts') {
      setAllPosts(prev => prev.filter(p => p.id !== id));
      setActivePosts(prev => prev.filter(p => p.id !== id));
      setResolvedPosts(prev => prev.filter(p => p.id !== id));
      setIssueCount(n => Math.max(0, n - 1));
    } else {
      setSocialPosts(prev => prev.filter(p => p.id !== id));
      setSocialCount(n => Math.max(0, n - 1));
    }
  };

  const [username, setUsername] = useState<string>("...");
  const [memberSince, setMemberSince] = useState("");
  const [location, setLocation] = useState("India");
  const [currentUser, setCurrentUser] = useState<CurrentUser | undefined>();

  const [issueCount, setIssueCount] = useState<number>(0);
  const [socialCount, setSocialCount] = useState<number>(0);
  const [communityCount, setCommunityCount] = useState<number>(0);

  const [allPosts, setAllPosts] = useState<AnyPost[]>([]);
  const [activePosts, setActivePosts] = useState<AnyPost[]>([]);
  const [resolvedPosts, setResolvedPosts] = useState<AnyPost[]>([]);
  const [socialPosts, setSocialPosts] = useState<AnyPost[]>([]);
  const [activity, setActivity] = useState<AnyPost[]>([]);

  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const { data: user } = useCurrentUser();

  useEffect(() => {
    if (!user) return;
    const name = user.actualUsername ?? user.username ?? "User";
    setUsername(name);
    
    if (user.createdAt)
      setMemberSince(formatDate(user.createdAt));
    if (user.pincode) setLocation(user.pincode);
    else if (user.address) setLocation(user.address);

    setCurrentUser({
      id: user.id,
      username: name,
      role: user.role,
    });
  }, [user]);

  // Fetch counts + pre-populate lists
  useEffect(() => {
    // Fetch total issue count
    apiFetch("/api/posts/count/my-posts")
      .then((res) => {
        if (res?.success) setIssueCount(res.data);
      })
      .catch(() => { });

    // Fetch total social count
    apiFetch("/api/social-posts/count/my-posts")
      .then((res) => {
        if (res?.success) setSocialCount(res.data);
      })
      .catch(() => { });

    apiFetch("/api/posts/my-posts?limit=100")
      .then((b) => {
        const posts: AnyPost[] = (b?.data?.data ?? []).map(mapIssuePost);
        setAllPosts(posts);
      })
      .catch(() => { });

    apiFetch("/api/social-posts/my-posts?limit=100")
      .then((b) => {
        const rawPosts: any[] = b?.data?.data ?? [];
        setSocialPosts(rawPosts.map(mapSocialPost));
      })
      .catch(() => { });

    apiFetch("/api/communities/me?limit=100")
      .then((b) => setCommunityCount(b?.data?.data?.length ?? 0))
      .catch(() => { });
  }, []);

  // Fetch issue filter data on demand
  useEffect(() => {
    if (tab !== "posts") return;
    if (postFilter === "all") return;
    if (postFilter === "active" && activePosts.length > 0) return;
    if (postFilter === "resolved" && resolvedPosts.length > 0) return;

    setLoadingPosts(true);
    const url =
      postFilter === "active"
        ? "/api/posts/my-posts/active?limit=50"
        : "/api/posts/my-posts/resolved?limit=50";

    apiFetch(url)
      .then((b) => {
        const posts: AnyPost[] = (b?.data?.data ?? []).map(mapIssuePost);
        if (postFilter === "active") setActivePosts(posts);
        if (postFilter === "resolved") setResolvedPosts(posts);
      })
      .catch(() => {})
      .finally(() => setLoadingPosts(false));
  }, [tab, postFilter]);

  // Fetch social posts on tab open
  useEffect(() => {
    if (tab !== "social") return;
    if (socialPosts.length > 0) return;
    setLoadingSocial(true);
    apiFetch("/api/social-posts/my-posts?limit=50")
      .then((b) => setSocialPosts((b?.data?.data ?? []).map(mapSocialPost)))
      .catch(() => {})
      .finally(() => setLoadingSocial(false));

  }, [tab]);

  // Fetch activity — show saved, liked, and commented posts
  useEffect(() => {
    if (tab !== "activity") return;
    if (activity.length > 0) return;
    setLoadingActivity(true);

    Promise.allSettled([
      apiFetch("/api/interactions/saved/social-posts?page=0&size=30"),
      apiFetch("/api/interactions/saved/posts?page=0&size=30"),
      apiFetch("/api/interactions/liked?page=0&size=30"),
      apiFetch("/api/interactions/commented?page=0&size=30"),
    ])
      .then(([savedSocialRes, savedPostsRes, likedRes, commentedRes]) => {
        const items: { post: AnyPost; time: number; type: string }[] = [];

        // 1. Process Saved Social
        if (savedSocialRes.status === "fulfilled") {
          const rows = savedSocialRes.value?.data?.content ?? [];
          rows.forEach((row: any) => {
            const raw = row.socialPost || row;
            if (!raw?.id) return;
            const mapped = toPostCardPost({ ...raw, ...row });
            if (!mapped.username) mapped.username = username; // Last resort fallback for profile activity
            items.push({
              post: mapped,
              time: new Date(row.savedAt || raw.createdAt || row.createdAt || 0).getTime(),
              type: "saved"
            });
          });
        }

        // 2. Process Saved Regular
        if (savedPostsRes.status === "fulfilled") {
          const rows = savedPostsRes.value?.data?.content ?? [];
          rows.forEach((row: any) => {
            const raw = row.post || row;
            if (!raw?.id) return;
            const mapped = toPostCardPost({ ...raw, ...row, variant: "issue" });
            if (!mapped.username) mapped.username = username;
            items.push({
              post: mapped,
              time: new Date(row.savedAt || raw.createdAt || row.createdAt || 0).getTime(),
              type: "saved"
            });
          });
        }

        // 3. Process Liked
        if (likedRes.status === "fulfilled") {
          const data = likedRes.value?.data || {};
          const socialLikes = data.socialLikes?.content || [];
          const issueLikes = data.issueLikes?.content || [];

          socialLikes.forEach((row: any) => {
            if (!row.socialPost) return;
            const mapped = toPostCardPost({ ...row.socialPost, ...row });
            if (!mapped.username) mapped.username = username;
            items.push({
              post: mapped,
              time: new Date(row.createdAt || 0).getTime(),
              type: "liked"
            });
          });
          issueLikes.forEach((row: any) => {
            if (!row.post) return;
            const mapped = toPostCardPost({ ...row.post, ...row, variant: "issue" });
            if (!mapped.username) mapped.username = username;
            items.push({
              post: mapped,
              time: new Date(row.createdAt || 0).getTime(),
              type: "liked"
            });
          });
        }

        // 4. Process Commented
        if (commentedRes.status === "fulfilled") {
          const data = commentedRes.value?.data || {};
          const socialComments = data.socialComments?.content || [];
          const issueComments = data.issueComments?.content || [];

          socialComments.forEach((row: any) => {
            if (!row.socialPost) return;
            const mapped = toPostCardPost({ ...row.socialPost, ...row });
            if (!mapped.username) mapped.username = username;
            items.push({
              post: mapped,
              time: new Date(row.createdAt || 0).getTime(),
              type: "commented"
            });
          });
          issueComments.forEach((row: any) => {
            if (!row.post) return;
            const mapped = toPostCardPost({ ...row.post, ...row, variant: "issue" });
            if (!mapped.username) mapped.username = username;
            items.push({
              post: mapped,
              time: new Date(row.createdAt || 0).getTime(),
              type: "commented"
            });
          });
        }

        // Sort by most recent activity
        items.sort((a, b) => b.time - a.time);

        // Deduplicate: If same post appears multiple times (e.g. liked and saved), 
        // we can keep both to show both actions, or unique them. 
        // Let's keep unique for a cleaner "Activity" list of posts.
        const uniquePosts: AnyPost[] = [];
        const seenIds = new Set<string>();

        items.forEach(item => {
          const key = `${item.post.variant}-${item.post.id}`;
          if (!seenIds.has(key)) {
            seenIds.add(key);
            uniquePosts.push(item.post);
          }
        });

        setActivity(uniquePosts);
      })
      .catch((err) => console.error("Failed to fetch activity", err))
      .finally(() => setLoadingActivity(false));
  }, [tab]);

  const displayedPosts =
    postFilter === "active"
      ? activePosts
      : postFilter === "resolved"
        ? resolvedPosts
        : allPosts;

  return (
    <div className="space-y-4 pt-2 sm:pt-0">
      {/* Profile Header */}
      <div className="rounded-xl border border-base-300 bg-base-200 p-3 sm:p-4">
        <div className="flex items-center gap-4">
          <div className="avatar">
            <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-primary shadow-lg bg-base-300">
               <img 
                src={resolveMediaUrl(user?.profileImage, "social-posts") || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(username)}`} 
                alt="Profile Avatar" 
                className="w-full h-full object-cover" 
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <h1 className="font-extrabold text-xs sm:text-sm md:text-lg truncate max-w-full leading-tight">{username}</h1>
              <ShieldCheck size={12} className="text-[#1D4ED8] shrink-0" />
            </div>
            <p className="text-[9px] sm:text-xs opacity-70 truncate line-clamp-1">
              {memberSince ? `Member since ${memberSince}` : "Loading…"} • {location}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard value={issueCount} label="Issues" />
        <StatCard value={socialCount} label="S-Posts" />
        <StatCard value={communityCount} label="Groups" />
      </div>

      {/* Tabs */}
      <ProfileTabs active={tab} onChange={setTab} />

      {/* Issues tab */}
      {tab === "posts" && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {(["active", "resolved"] as PostFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setPostFilter(f)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition ${postFilter === f
                    ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                    : "border-base-300 hover:border-blue-400"
                  }`}
              >
                {f === "active" && <Clock size={11} />}
                {f === "resolved" && <CheckCircle size={11} />}
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loadingPosts ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <PostSkeleton key={`sk-issues-${i}`} />
              ))}
            </div>
          ) : displayedPosts.length === 0 ? (
            <EmptyState
              title="No issues yet"
              description="Issue posts you create will appear here."
            />
          ) : (
            displayedPosts.map((p) => (
              <PostCard 
                key={p.id} 
                post={p} 
                currentUser={currentUser} 
                onDelete={(id) => handleDelete('posts', id)} 
              />
            ))
          )}
        </div>
      )}

      {/* Social Posts tab */}
      {tab === "social" && (
        <div className="space-y-4">
          {loadingSocial ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <PostSkeleton key={`sk-social-${i}`} />
              ))}
            </div>
          ) : socialPosts.length === 0 ? (
            <EmptyState
              title="No social posts yet"
              description="Social posts you publish will appear here."
            />
          ) : (
            socialPosts.map((p) => (
              <PostCard 
                key={p.id} 
                post={p} 
                currentUser={currentUser} 
                onDelete={(id) => handleDelete('social-posts', id)} 
              />
            ))
          )}
        </div>
      )}

      {/* Activity tab — saved posts rendered as PostCards */}
      {tab === "activity" && (
        <div className="space-y-4">
          {loadingActivity ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <PostSkeleton key={`sk-activity-${i}`} />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <EmptyState
              title="No saved posts yet"
              description="Posts you save will appear here."
            />
          ) : (
            activity.map((post) => (
              <PostCard
                key={`${post.id}-${post.variant}`}
                post={post}
                currentUser={currentUser}
                hideDelete={true}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;