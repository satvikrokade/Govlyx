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

const Navbar = () => {
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
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 text-white font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 540">
                <path
                  fill="#1D4ED8"
                  d="M256 32L96 112v120c0 112 64 208 160 248c96-40 160-136 160-248V112L256 32z"
                />
                <g fill="#FFFFFF" transform="translate(0, -6)">
                  <path d="M256 150c-40 0-72 32-72 72v20h144v-20c0-40-32-72-72-72z" />
                  <rect x="220" y="242" width="72" height="16" />
                  <rect x="204" y="220" width="12" height="40" />
                  <rect x="296" y="220" width="12" height="40" />
                </g>
                <g fill="#FFFFFF" transform="translate(0, -6)">
                  <circle cx="170" cy="210" r="6" />
                  <circle cx="196" cy="230" r="4" />
                  <circle cx="342" cy="210" r="6" />
                  <circle cx="318" cy="230" r="4" />
                  <circle cx="256" cy="190" r="5" />
                </g>
                <path fill="#FFFFFF" d="M150 300h212l-8 16H158z" />
                <g fill="#FFFFFF">
                  <rect x="248" y="300" width="16" height="120" />
                  <rect x="198" y="300" width="16" height="80" />
                  <rect x="298" y="300" width="16" height="80" />
                </g>
                <g fill="#FFFFFF">
                  <circle cx="256" cy="440" r="18" />
                  <circle cx="206" cy="380" r="20" />
                  <circle cx="306" cy="380" r="20" />
                </g>
                <g>
                  <rect x="252" y="118" width="8" height="32" fill="#FFFFFF" />
                  <path d="M260 118h45v22l-45-8z" fill="#FFFFFF" />
                  <path d="M260 118l35 16l-35-6z" fill="#FFFFFF" opacity="0.4" />
                </g>
              </svg>
            </div>
            <span className="hidden sm:block text-2xl font-bold">Govlyx</span>
          </NavLink>

          {/* DESKTOP SEARCH — read-only trigger, opens overlay */}
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

          {/* ACTIONS */}
          <div className="ml-auto flex items-center gap-2">

            {/* MOBILE SEARCH ICON */}
            <button
              className="btn btn-ghost btn-sm lg:hidden hover:bg-blue-700/10"
              onClick={() => openSearch()}
              aria-label="Open search"
            >
              <Search size={18} />
            </button>

            {/* CREATE - Desktop */}
            <button
              onClick={() => { setOpenCreate(true); openModal(); }}
              className="btn btn-sm bg-blue-700 hidden sm:flex gap-1 text-white"
            >
              <Plus size={16} />
              Create
            </button>

            {/* MOBILE CREATE ICON */}
            <button
              onClick={() => { setOpenCreate(true); openModal(); }}
              className="btn btn-ghost btn-sm sm:hidden hover:bg-blue-700/10"
              aria-label="Create post"
            >
              <Plus size={18} />
            </button>

            {/* CHAT - HIDE ON MOBILE */}
            <NavLink to="/quick-chat" className="btn btn-ghost btn-sm hover:bg-blue-700/10 hidden sm:inline-flex">
              <MessageCircle size={18} />
            </NavLink>

            <NotificationDropdown 
              unreadCount={unreadNotifications} 
              onRefresh={refetchUnreadCount} 
            />

            {/* THEME TOGGLE */}
            <button
              onClick={toggleTheme}
              className="btn btn-ghost btn-sm hover:bg-blue-700/10 hidden lg:inline-flex"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <NavLink to="/profile" className="avatar placeholder">
              <div className="w-8 rounded-full overflow-hidden bg-base-200 border border-base-300">
                <img src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(username)}`} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            </NavLink>
          </div>

          {/* CREATE POST MODAL */}
          <CreatePost open={openCreate} onClose={() => { setOpenCreate(false); closeModal(); }} />
        </div>
      </motion.header>

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