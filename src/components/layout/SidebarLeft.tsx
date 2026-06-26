import { NavLink, useLocation, Link } from "react-router-dom";
import {
  Home,
  Users,
  User,
  Settings,
  LayoutDashboard,
  Bell,
  Sun,
  Moon,
  Inbox,
  Megaphone,
  BarChart2,
  Crown,
  Zap,
} from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { useCurrentUser } from "../../hooks/useUser";
import { useUnreadNotificationsCount } from "../../hooks/useNotification";
import { useMyBilling } from "../../hooks/useBilling";
import { useQuery } from "@tanstack/react-query";
import { resolveMediaUrl } from "../../utils/postUtils";
import { getUserRole } from "../../utils/auth";
import axiosInstance from "../../api/axiosConfig";
import { getActiveTaggedPosts } from "../../api/departmentService";

const QUICK_CHAT_LIGHT_ICON = "/icons/quick_chat_light_theme.gif";
const QUICK_CHAT_DARK_ICON = "/icons/quick_chat_dark_theme.gif";

const BASE_NAV_ITEMS = [
  { label: "Home", icon: Home, to: "/dashboard" },
  { label: "Communities", icon: Users, to: "/communities" },
  { label: "Notifications", icon: Bell, to: "/notifications" },
  { label: "Quick Chat", icon: null, to: "/quick-chat" },
  { label: "Profile", icon: User, to: "/profile" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

const ADMIN_NAV_ITEM = { label: "Admin Dashboard", icon: LayoutDashboard, to: "/admin/dashboard" };

// Admin nav sections shown in the left sidebar when on the admin dashboard
const ADMIN_NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard", tab: "dashboard",
        icon: (
          <svg className="w-[18px] h-[18px] flex-shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Registration",
    items: [
      {
        label: "Register Department", tab: "reg-dept",
        icon: (
          <svg className="w-[18px] h-[18px] flex-shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11" />
          </svg>
        ),
      },
      {
        label: "Register Admin", tab: "reg-admin",
        icon: (
          <svg className="w-[18px] h-[18px] flex-shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "User Management",
    items: [
      {
        label: "All Users", tab: "users",
        icon: (
          <svg className="w-[18px] h-[18px] flex-shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        label: "Departments", tab: "departments",
        icon: (
          <svg className="w-[18px] h-[18px] flex-shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        ),
      },
      {
        label: "Communities", tab: "communities",
        icon: (
          <svg className="w-[18px] h-[18px] flex-shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        label: "Content Monitor", tab: "content",
        icon: (
          <svg className="w-[18px] h-[18px] flex-shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
      },
      {
        label: "Chat Statistics", tab: "chat",
        icon: (
          <svg className="w-[18px] h-[18px] flex-shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
      {
        label: "Broadcasts", tab: "broadcast",
        icon: (
          <svg className="w-[18px] h-[18px] flex-shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
          </svg>
        ),
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "System Health", tab: "system",
        icon: (
          <svg className="w-[18px] h-[18px] flex-shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        ),
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const SidebarLeft = () => {
  const { data: user, isLoading: loading } = useCurrentUser();
  const { data: unreadCount } = useUnreadNotificationsCount();
  const { data: billing } = useMyBilling();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Fetch actual user communities (both joined and owned)
  const { data: communities, isLoading: communitiesLoading } = useQuery({
    queryKey: ["my-communities"],
    queryFn: async () => {
      const [joinedRes, ownedRes] = await Promise.allSettled([
        axiosInstance.get("/api/communities/me?limit=100"),
        axiosInstance.get("/api/communities/owned"),
      ]);

      let joined: any[] = [];
      if (joinedRes.status === "fulfilled" && joinedRes.value.status === 200) {
        const j = joinedRes.value.data;
        joined = j?.data?.data ?? j?.data?.content ?? [];
      }

      let owned: any[] = [];
      if (ownedRes.status === "fulfilled" && ownedRes.value.status === 200) {
        const o = ownedRes.value.data;
        owned = o?.data ?? o?.content ?? [];
      }

      const seen = new Set<number>();
      const merged: any[] = [];
      for (const c of [...owned, ...joined]) {
        if (c?.id && !seen.has(c.id)) {
          seen.add(c.id);
          merged.push(c);
        }
      }
      return merged;
    },
    enabled: !!user,
  });

  // Check role from JWT token which is the source of truth
  const role = getUserRole();
  const isDept = role === "ROLE_DEPARTMENT";
  const isAdmin = role === "ROLE_ADMIN";
  const username = user?.actualUsername ?? user?.username;

  // Fetch active issues count dynamically if user is a department
  const { data: activeIssuesCount } = useQuery({
    queryKey: ["active-issues-count", username],
    queryFn: async () => {
      if (!username) return 0;
      try {
        const page = await getActiveTaggedPosts(username, null, 1);
        return page.totalCount;
      } catch {
        return 0;
      }
    },
    enabled: isDept && !!username,
    refetchInterval: 30 * 1000,
  });

  const navItems = isDept
    ? [
        { label: "Issues Inbox", icon: Inbox, to: "/department/dashboard?tab=issues" },
        { label: "Official Broadcasts", icon: Megaphone, to: "/department/dashboard?tab=broadcasts" },
        { label: "Analytics", icon: BarChart2, to: "/department/dashboard?tab=analytics" },
        { label: "Notifications", icon: Bell, to: "/notifications" },
        { label: "Profile", icon: User, to: "/profile" },
        { label: "Settings", icon: Settings, to: "/settings" }
      ]
    : isAdmin
    ? [
        ADMIN_NAV_ITEM,
        { label: "Notifications", icon: Bell, to: "/notifications" },
        { label: "Profile", icon: User, to: "/profile" },
        { label: "Settings", icon: Settings, to: "/settings" }
      ]
    : BASE_NAV_ITEMS;

  // Removing unused avatarLetter
  const displayName = loading ? "Loading..." : (username ?? "Anonymous User");

  const searchParamsObj = new URLSearchParams(location.search);
  const activeTabParam = searchParamsObj.get("tab") || "issues";

  // For admin dashboard: determine which tab is active from the URL
  const isOnAdminDashboard = isAdmin && location.pathname.startsWith("/admin/dashboard");
  const adminActiveTab = isOnAdminDashboard ? (searchParamsObj.get("tab") || "dashboard") : null;

  // nav item base classes
  const navItemBase = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition relative";
  const navItemActive = "bg-[#1D4ED8] text-white font-bold";
  const navItemInactive = "hover:bg-base-300 text-base-content/70";

  const tier = billing?.currentTier || "GOVLYX_FREE";

  const passBadge = (() => {
    if (tier === "GOVLYX_VIP") {
      return {
        borderColor: "border-amber-500 dark:border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
        badgeBg: "bg-amber-500 text-white",
        icon: <Crown className="w-2.5 h-2.5" />,
        text: "VIP",
        textClass: "text-amber-500 font-bold",
        bgLight: "bg-amber-500/10 text-amber-500 border-amber-500/20"
      };
    }
    if (tier === "GOVLYX_PRO") {
      return {
        borderColor: "border-blue-500 dark:border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]",
        badgeBg: "bg-blue-500 text-white",
        icon: <Zap className="w-2.5 h-2.5" />,
        text: "PRO",
        textClass: "text-blue-500 font-bold",
        bgLight: "bg-blue-500/10 text-blue-500 border-blue-500/20"
      };
    }
    return null;
  })();

  return (
    <aside className="flex min-h-full flex-col gap-4 pb-8">

      {/* Profile Card */}
      <div className="rounded-xl bg-base-200 p-4 shadow-sm border border-base-content/5">
        <div className="flex items-center gap-3">
          <div className="avatar placeholder relative">
            <div className={`w-10 h-10 rounded-full overflow-hidden bg-base-200 border-2 transition-all ${passBadge ? passBadge.borderColor : "border-[#1D4ED8] dark:border-white"}`}>
              <img src={resolveMediaUrl(user?.profileImage, "social-posts") || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(displayName)}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            {passBadge && (
              <div className={`absolute -top-1 -left-1 w-4.5 h-4.5 rounded-full ${passBadge.badgeBg} border border-white dark:border-base-200 flex items-center justify-center shadow-md`}>
                {passBadge.icon}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="font-semibold text-sm truncate notranslate" title={displayName}>{displayName}</p>
              {passBadge && (
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${passBadge.bgLight} shrink-0`}>
                  {passBadge.icon}
                  <span>{passBadge.text}</span>
                </span>
              )}
            </div>
            {isAdmin && <p className="text-[10px] font-mono uppercase tracking-wider text-green-500 opacity-80">Admin</p>}
            {isDept && <p className="text-[10px] font-mono uppercase tracking-wider text-blue-500 opacity-80">Dept</p>}
          </div>
        </div>
      </div>

      {/* ── ADMIN: Full nav sections always visible ── */}
      {isAdmin ? (
        <>
          {ADMIN_NAV_SECTIONS.map(section => (
            <nav key={section.label} className="rounded-xl bg-base-200 p-2">
              <p className="text-[10px] uppercase tracking-widest font-semibold opacity-40 px-3 pt-1 pb-2">
                {section.label}
              </p>
              {section.items.map(item => {
                const isActive = adminActiveTab === item.tab;
                return (
                  <NavLink
                    key={item.tab}
                    to={`/admin/dashboard?tab=${item.tab}`}
                    className={`${navItemBase} ${isActive ? navItemActive : navItemInactive}`}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          ))}

          {/* Utility links for admin */}
          <nav className="rounded-xl bg-base-200 p-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold opacity-40 px-3 pt-1 pb-2">
              Account
            </p>
            <NavLink
              to="/notifications"
              className={`${navItemBase} ${location.pathname === "/notifications" ? navItemActive : navItemInactive}`}
            >
              <Bell size={18} />
              <span className="flex-1">Notifications</span>
              {unreadCount !== undefined && unreadCount > 0 && (
                <span className="bg-error text-error-content text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </NavLink>
            <NavLink
              to="/profile"
              className={`${navItemBase} ${location.pathname === "/profile" ? navItemActive : navItemInactive}`}
            >
              <User size={18} />
              <span className="flex-1">Profile</span>
            </NavLink>
            <NavLink
              to="/settings"
              className={`${navItemBase} ${location.pathname === "/settings" ? navItemActive : navItemInactive}`}
            >
              <Settings size={18} />
              <span className="flex-1">Settings</span>
            </NavLink>
          </nav>
        </>
      ) : (
        /* ── Non-admin-dashboard: existing nav rendering ── */
        <nav className="rounded-xl bg-base-200 p-2">
          {navItems.map(({ label, icon: Icon, to }) => {
            const isNotifications = label === "Notifications";
            const isIssuesInbox = label === "Issues Inbox";
            const isQuickChat = label === "Quick Chat";

            const isDeptTabLink = to.startsWith("/department/dashboard");
            const isLinkActive = isDeptTabLink
              ? location.pathname === "/department/dashboard" &&
                (new URLSearchParams(to.split("?")[1]).get("tab") || "issues") === activeTabParam
              : location.pathname === to;

            return (
              <NavLink
                key={label}
                to={to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition relative
                  ${isLinkActive
                    ? "bg-[#1D4ED8] text-white font-bold"
                    : "hover:bg-base-300 text-base-content/70"
                  }`}
              >
                {isQuickChat ? (
                  <img
                    src={theme === "dark" ? QUICK_CHAT_DARK_ICON : QUICK_CHAT_LIGHT_ICON}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    onContextMenu={(event) => event.preventDefault()}
                    className="h-[18px] w-[18px] flex-shrink-0 rounded-[2px] object-contain"
                  />
                ) : Icon ? (
                  <Icon size={18} />
                ) : null}
                <span className="flex-1">{label}</span>
                {isNotifications && unreadCount !== undefined && unreadCount > 0 && (
                  <span className="bg-error text-error-content text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                {isIssuesInbox && activeIssuesCount !== undefined && activeIssuesCount > 0 && (
                  <span className="bg-amber-400 text-black text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                    {activeIssuesCount > 99 ? "99+" : activeIssuesCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      )}

      {/* Mobile Theme Toggle */}
      <div className="lg:hidden mt-auto pt-4">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-base-300/30 hover:bg-base-300 transition-colors duration-200"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-100 shadow-sm">
            {theme === "light" ? <Moon size={18} className="text-blue-600" /> : <Sun size={18} className="text-yellow-500" />}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-bold truncate">{theme === "light" ? "Dark Mode" : "Light Mode"}</p>
            <p className="text-[10px] opacity-40 uppercase font-bold tracking-wider truncate">Switch Theme</p>
          </div>
          <div className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${theme === "dark" ? "bg-blue-600" : "bg-base-content/20"}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-300 ${theme === "dark" ? "translate-x-4.5" : "translate-x-0.5"}`} />
          </div>
        </button>
      </div>

      {/* Communities */}
      {user && !isAdmin && !isDept && (
        <div className="rounded-xl bg-base-200 p-4">
          <p className="mb-2 text-sm font-semibold opacity-70">
            Your Communities
          </p>
          {communitiesLoading ? (
            <div className="flex items-center justify-center py-4">
              <span className="loading loading-spinner loading-sm opacity-50" />
            </div>
          ) : communities && communities.length > 0 ? (
            <div className="max-h-60 overflow-y-auto pr-1">
              <ul className="space-y-1 text-sm">
                {communities.slice(0, 4).map((c) => {
                  const activeCommunityParam = searchParamsObj.get("community");
                  const isActive =
                    location.pathname.startsWith("/communities") &&
                    (activeCommunityParam === c.slug ||
                      activeCommunityParam === String(c.id) ||
                      location.pathname === `/communities/${c.slug}` ||
                      location.pathname === `/communities/${c.id}`);

                  return (
                    <li key={c.id}>
                      <Link
                        to={`/communities?community=${c.slug || c.id}`}
                        className={`block truncate rounded-lg px-3 py-1.5 transition duration-150 hover:bg-base-300 notranslate
                          ${isActive ? "font-semibold text-[#1D4ED8]" : "opacity-80"}`}
                      >
                        {c.name}
                      </Link>
                    </li>
                  );
                })}
                {communities.length > 4 && (
                  <li>
                    <NavLink
                      to="/communities"
                      className="block truncate rounded-lg px-3 py-1.5 text-xs text-blue-600 font-semibold transition-all duration-300 hover:text-red-500 dark:hover:text-red-400"
                    >
                      View More
                    </NavLink>
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <p className="text-xs opacity-50 py-2">No joined communities yet.</p>
          )}
        </div>
      )}

    </aside>
  );
};

export default SidebarLeft;
