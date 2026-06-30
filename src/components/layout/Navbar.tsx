/**
 * src/components/layout/Navbar.tsx
 *
 * Changes from original:
 *  - Desktop search input opens SearchOverlay on click or first keystroke
 *  - Mobile search icon opens SearchOverlay
 *  - SearchOverlay imported from ../search/SearchOverlay
 */

import { useState, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { Search, MessageCircle, Plus, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

import CreatePost from "../ui/CreatePost";
import SearchOverlay from "../search/SearchOverlay";
import NotificationDropdown from "./NotificationDropdown";
import { useModal } from "../../context/ModalContext";
import { useCurrentUser } from "../../hooks/useUser";
import { useUnreadNotificationsCount } from "../../hooks/useNotification";
import { resolveMediaUrl } from "../../utils/postUtils";
import { isAdminUser, getAuthToken } from "../../utils/auth";
import GovlyxLogo from "../ui/GovlyxLogo";

const Navbar = () => {
  const loggedIn = !!getAuthToken();
  const [openCreate, setOpenCreate] = useState(false);
  const { openModal, closeModal } = useModal();
  const { theme, toggleTheme } = useTheme();
  
  const { data: user } = useCurrentUser();
  const { data: unreadNotifications = 0, refetch: refetchUnreadCount } = useUnreadNotificationsCount();
  
  const username = user?.actualUsername ?? user?.username ?? "User";

  // ── Search overlay state ───────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSeed, setSearchSeed] = useState("");

  /** Open overlay, optionally pre-seeding the first typed character */
  const openSearch = useCallback((seed = "") => {
    setSearchSeed(seed);
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchSeed("");
  }, []);



  // (Effect for unread count is now handled by useUnreadNotificationsCount hook)

  return (
    <>
      <motion.header
        className="z-[100] w-full border-b border-base-300 bg-base-200 backdrop-blur-md shadow-sm pt-[env(safe-area-inset-top,0px)]"
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="mx-auto flex h-14 max-w-[1780px] items-center gap-3 px-4">

          {/* MOBILE MENU */}
          <label htmlFor="mobile-drawer" className="btn btn-ghost btn-sm lg:hidden">
            <Menu size={20} />
          </label>

          {/* LOGO */}
          <NavLink to={loggedIn ? "/dashboard" : "/"} className="flex items-center gap-2">
            <GovlyxLogo size={36} showText textClassName="hidden sm:block text-2xl font-bold" />
          </NavLink>

          {/* DESKTOP SEARCH — read-only trigger, opens overlay */}
          {!isAdminUser() && (
            <div className="hidden lg:flex flex-1 justify-center">
              <div className="relative w-full max-w-xl">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search communities, posts…"
                  className="input input-bordered w-full pl-10 cursor-pointer caret-transparent"
                  readOnly
                  // Open overlay immediately on click
                  onClick={() => openSearch()}
                  // If user just starts typing, seed that character into the overlay
                  onKeyDown={(e) => {
                    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                      openSearch(e.key);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* ACTIONS */}
          <div className="ml-auto flex items-center gap-2">

            {/* MOBILE SEARCH ICON */}
            {!isAdminUser() && (
              <button
                className="btn btn-ghost btn-sm lg:hidden hover:bg-blue-700/10"
                onClick={() => openSearch()}
                aria-label="Open search"
              >
                <Search size={18} />
              </button>
            )}

            {/* CREATE - Desktop */}
            {!isAdminUser() && loggedIn && (
              <button
                onClick={() => { setOpenCreate(true); openModal(); }}
                className="btn btn-sm bg-blue-700 hidden sm:flex gap-1 text-white"
              >
                <Plus size={16} />
                Create
              </button>
            )}

            {/* MOBILE CREATE ICON */}
            {!isAdminUser() && loggedIn && (
              <button
                onClick={() => { setOpenCreate(true); openModal(); }}
                className="btn btn-ghost btn-sm sm:hidden hover:bg-blue-700/10"
                aria-label="Create post"
              >
                <Plus size={18} />
              </button>
            )}

            {/* CHAT - HIDE ON MOBILE */}
            {!isAdminUser() && loggedIn && (
              <NavLink to="/quick-chat" className="btn btn-ghost btn-sm hover:bg-blue-700/10 hidden sm:inline-flex">
                <MessageCircle size={18} />
              </NavLink>
            )}

            {loggedIn && (
              <NotificationDropdown 
                unreadCount={unreadNotifications} 
                onRefresh={refetchUnreadCount} 
              />
            )}

            {/* THEME TOGGLE */}
            <button
              onClick={toggleTheme}
              className="btn btn-ghost btn-sm hover:bg-blue-700/10 hidden lg:inline-flex"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <NavLink to={loggedIn ? "/profile" : "/login"} className="avatar placeholder">
              <div className="w-8 rounded-full overflow-hidden bg-base-200 border-2 border-[#1D4ED8] dark:border-white">
                <img src={resolveMediaUrl(user?.profileImage, "social-posts") || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(username)}`} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            </NavLink>
          </div>

          {/* CREATE POST MODAL */}
        </div>
      </motion.header>

      {/* CREATE POST MODAL — rendered outside header so it is positioned relative to viewport */}
      <CreatePost open={openCreate} onClose={() => { setOpenCreate(false); closeModal(); }} />

      {/* Search Overlay — rendered outside the header so it can cover full screen */}
      <SearchOverlay
        open={searchOpen}
        onClose={closeSearch}
        initialQuery={searchSeed}
      />
    </>
  );
};

export default Navbar;