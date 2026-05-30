import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useTheme } from "../hooks/useTheme";
import { 
  ArrowRight, 
  ChevronDown, 
  Sun,
  Moon,
  Menu,
  X,
  MessageCircle,
  Plus,
  Search,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  SlidersHorizontal,
  Flag,
  Zap,
  Lock,
  Settings as SettingsIcon,
  Wifi,
  Battery,
  Users,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Helper check for logged-in user session
const isLoggedIn = (): boolean => {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  if (!token) return false;

  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    const isExpired = decoded.exp * 1000 < Date.now();
    if (isExpired) {
      localStorage.removeItem("token");
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

// ─── Logo Sub-component ──────────────────────────────────────────────────────
interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

const LandingLogo: React.FC<LogoProps> = ({ className = "", size = 36, showText = false }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 540"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform hover:scale-105 duration-300 shrink-0"
      >
        <path
          fill="#1D4ED8"
          d="M256 32L96 112v120c0 112 64 208 160 248c96-40 160-136 160-248V112L256 32z"
        />
        <g fill="#FFFFFF" transform="translate(0, -6)">
          <path d="M256 150c-40 0-72 32-72 72v20h144v-20c0-40-32-72-72-72z"/>
          <rect x="220" y="242" width="72" height="16"/>
          <rect x="204" y="220" width="12" height="40"/>
          <rect x="296" y="220" width="12" height="40"/>
        </g>
        <g fill="#FFFFFF" transform="translate(0, -6)">
          <circle cx="170" cy="210" r="6"/>
          <circle cx="196" cy="230" r="4"/>
          <circle cx="342" cy="210" r="6"/>
          <circle cx="318" cy="230" r="4"/>
          <circle cx="256" cy="190" r="5"/>
        </g>
        <path fill="#FFFFFF" d="M150 300h212l-8 16H158z"/>
        <g fill="#FFFFFF">
          <rect x="248" y="300" width="16" height="120"/>
          <rect x="198" y="300" width="16" height="80"/>
          <rect x="298" y="300" width="16" height="80"/>
        </g>
        <g fill="#FFFFFF">
          <circle cx="256" cy="440" r="18"/>
          <circle cx="206" cy="380" r="20"/>
          <circle cx="306" cy="380" r="20"/>
        </g>
        <g>
          <rect x="252" y="118" width="8" height="32" fill="#FFFFFF"/>
          <path d="M260 118h45v22l-45-8z" fill="#FFFFFF"/>
          <path d="M260 118l35 16l-35-6z" fill="#FFFFFF" opacity="0.4"/>
        </g>
      </svg>
      {showText && (
        <span className="font-bold text-xl sm:text-2xl tracking-tight text-slate-900 dark:text-white transition-colors duration-300">
          Govlyx
        </span>
      )}
    </div>
  );
};

// ─── Destinations Config ─────────────────────────────────────────────────────
const DESTINATIONS = [
  { name: "Main Platform (govlyx.com)", url: "https://govlyx.com" },
  { name: "Open Source Repository (GitHub)", url: "https://github.com/govlyx/govlyx" },
  { name: "Developer Documentation", url: "https://github.com/govlyx/govlyx#readme" }
];

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState("https://govlyx.com");
  const [destinationOpen, setDestinationOpen] = useState(false);

  // ─── Interactive Phone Mockup Post States ──────────────────────────────────
  const [posts, setPosts] = useState([
    {
      id: "post-1",
      author: "ZENYETI8480",
      avatarInitials: "ZY",
      avatarBg: "bg-slate-800",
      time: "1 HOUR AGO",
      content: "Major pothole on MG Road near the main junction finally got patched up today! Traffic is flowing smoothly now. Thanks to everyone who bumped the issue last week. 🙌",
      reactions: 412,
      comments: 88,
      shares: 14,
      liked: false,
      bookmarked: false
    },
    {
      id: "post-2",
      author: "PUNECIVIC404",
      avatarInitials: "PC",
      avatarBg: "bg-indigo-600",
      time: "5 HOURS AGO",
      content: "Does anyone know if the Sunday farmer's market is still happening at Shivaji Park this weekend despite the rain forecast?",
      reactions: 156,
      comments: 34,
      shares: 2,
      liked: false,
      bookmarked: false
    },
    {
      id: "post-3",
      author: "KINDCROW9071",
      avatarInitials: "KC",
      avatarBg: "bg-brand-100 text-brand-600",
      time: "1 DAY AGO",
      content: "Streetlights have been out on 4th Cross Street for three days straight. It's completely pitch dark at night and unsafe for pedestrians. @CityCouncil please look into this urgently! 🔦⚠️",
      reactions: 892,
      comments: 134,
      shares: 45,
      liked: false,
      bookmarked: false
    }
  ]);

  const handleLikePost = (postId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          const isLikedNow = !post.liked;
          return {
            ...post,
            liked: isLikedNow,
            reactions: isLikedNow ? post.reactions + 1 : post.reactions - 1
          };
        }
        return post;
      })
    );
  };

  const handleBookmarkPost = (postId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            bookmarked: !post.bookmarked
          };
        }
        return post;
      })
    );
  };

  useEffect(() => {
    // Enable scrollable behavior by adding a CSS class helper on Mount
    document.documentElement.classList.add("scrollable-page");
    return () => {
      // Restore scroll lock on Unmount
      document.documentElement.classList.remove("scrollable-page");
    };
  }, []);

  const handleEnterPlatform = (e: React.MouseEvent) => {
    e.preventDefault();
    if (targetUrl === "https://govlyx.com") {
      if (isLoggedIn()) {
        navigate("/dashboard");
      } else {
        navigate("/login");
      }
    } else {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const selectedDestination = DESTINATIONS.find((dest) => dest.url === targetUrl) ?? DESTINATIONS[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1D] text-slate-800 dark:text-slate-200 selection:bg-brand-500/20 selection:text-brand-900 dark:selection:text-white transition-colors duration-300 flex flex-col justify-between overflow-x-hidden">
      
      {/* ─── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-[100] bg-white/90 dark:bg-[#0A0F1D]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 h-[72px] transition-colors duration-300">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <a href="#" className="flex items-center">
            <LandingLogo showText size={34} />
          </a>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Platform</a>
            <a href="#communities" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Communities</a>
            <a href="https://github.com/govlyx/govlyx#readme" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Docs</a>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={toggleTheme} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60"
              aria-label="Toggle Theme"
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            <button 
              onClick={handleEnterPlatform}
              className="bg-brand-600 hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500 text-white font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg shadow-md shadow-brand-500/10 transition-all flex items-center gap-2 cursor-pointer"
            >
              Enter Platform <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="md:hidden text-slate-500 dark:text-slate-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-[72px] inset-x-0 z-[99] bg-white dark:bg-[#0A0F1D] border-b border-slate-200 dark:border-slate-800/80 shadow-lg md:hidden transition-colors"
          >
            <div className="px-4 pt-3 pb-6 space-y-3">
              <a 
                href="#features" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-base font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Platform
              </a>
              <a 
                href="#communities" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-base font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Communities
              </a>
              <a 
                href="https://github.com/govlyx/govlyx#readme" 
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-base font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Docs
              </a>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center gap-2 w-1/2 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  {theme === "light" ? <><Moon className="w-4 h-4" /> Dark Mode</> : <><Sun className="w-4 h-4" /> Light Mode</>}
                </button>
                <button
                  onClick={(e) => {
                    setIsMobileMenuOpen(false);
                    handleEnterPlatform(e);
                  }}
                  className="w-1/2 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-md shadow-brand-500/10 flex justify-center items-center gap-1.5"
                >
                  Enter Platform <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-6 lg:pt-24 lg:pb-8 px-4 sm:px-6 overflow-hidden min-h-[80vh] lg:min-h-0 flex items-center bg-transparent">
        {/* Background Decor */}
        <div className="absolute inset-0 bg-grid-pattern opacity-40 dark:opacity-30 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[400px] lg:w-[600px] h-[400px] lg:h-[600px] bg-brand-100 dark:bg-brand-900/10 rounded-full mix-blend-multiply filter blur-[80px] lg:blur-[100px] opacity-70 dark:opacity-40 translate-x-1/3 -translate-y-1/4 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[300px] lg:w-[500px] h-[300px] lg:h-[500px] bg-blue-100 dark:bg-blue-900/10 rounded-full mix-blend-multiply filter blur-[80px] lg:blur-[100px] opacity-70 dark:opacity-40 -translate-x-1/4 translate-y-1/4 pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-center relative z-10">
          
          {/* Left Column: Title & Replicated Portal Gateway Card */}
          <div className="max-w-xl mx-auto lg:mx-0 w-full text-center lg:text-left order-2 lg:order-1 mt-4 lg:mt-0">
            <div className="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-900/25 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-400 font-semibold text-[10px] sm:text-xs px-3 py-0.5 rounded-full uppercase tracking-wider mb-3">
              Portal Gateway
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-3 lg:mb-4">
              Apni baat.<br className="hidden sm:block" /> Apna shehar.<br />
              <span className="text-brand-600 dark:text-brand-500">Apna feed.</span>
            </h1>
            
            <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-355 leading-relaxed mb-4 lg:mb-5 max-w-lg mx-auto lg:mx-0">
              The civic-tech transparency infrastructure. Connect with your neighbors, get verified government alerts, and join local communities based on your 6-digit pincode.
            </p>

            {/* Replicated Portal Gateway Card */}
            <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-soft dark:shadow-none text-left max-w-md mx-auto lg:mx-0 relative overflow-hidden transition-colors">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white mb-0.5">Welcome to Govlyx</h3>
              <p className="text-[11px] sm:text-xs text-slate-505 dark:text-slate-400 mb-4 leading-normal">
                Select your destination below to enter the platform.
              </p>
              
              <div className="bg-slate-50 dark:bg-[#0B0F1A] border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 sm:p-4 transition-colors">
                <label className="block text-[10px] sm:text-[11px] font-bold text-slate-450 dark:text-slate-500 tracking-wider uppercase mb-1.5">
                  Select Destination
                </label>
                
                <div className="relative mb-3">
                  <button
                    type="button"
                    onClick={() => setDestinationOpen(!destinationOpen)}
                    className={`w-full bg-white dark:bg-[#121829] border rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-left text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      destinationOpen
                        ? "border-brand-500"
                        : "border-slate-200 dark:border-slate-800 hover:border-brand-500/60 dark:hover:border-brand-500/60"
                    }`}
                  >
                    <span className="truncate">{selectedDestination.name}</span>
                    <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${destinationOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {destinationOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute left-0 right-0 top-full mt-1.5 z-30 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F1A] shadow-xl"
                      >
                        {DESTINATIONS.map((dest) => {
                          const active = dest.url === targetUrl;
                          return (
                            <button
                              key={dest.url}
                              type="button"
                              onClick={() => {
                                setTargetUrl(dest.url);
                                setDestinationOpen(false);
                              }}
                              className={`w-full px-3.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                                active
                                  ? "bg-brand-600 text-white font-semibold"
                                  : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-[#0B0F1A] dark:text-slate-350 dark:hover:bg-[#121829] dark:hover:text-white"
                              }`}
                            >
                              {dest.name}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button 
                  onClick={handleEnterPlatform}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg py-2 sm:py-2.5 text-xs sm:text-sm shadow-md shadow-brand-500/20 transition-all flex justify-center items-center gap-1.5 cursor-pointer"
                >
                  Enter Platform <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic CSS Mobile Phone Mockup */}
          <div className="relative flex justify-center items-center order-1 lg:order-2">
            {/* Decorative Blur behind phone */}
            <div className="absolute w-[280px] sm:w-[320px] h-[360px] sm:h-[440px] bg-brand-400/20 dark:bg-brand-500/10 rounded-full blur-[60px] animate-pulse pointer-events-none"></div>

            {/* Phone Body */}
            <div className="relative w-[280px] sm:w-[296px] h-[500px] sm:h-[540px] bg-slate-900 dark:bg-slate-950 rounded-[40px] sm:rounded-[44px] border-[10px] sm:border-[12px] border-slate-900 dark:border-slate-800 shadow-phone overflow-hidden animate-float flex flex-col select-none transition-colors">
              
              {/* Top Status Bar Mock */}
              <div className="h-6 w-full bg-white dark:bg-[#0A0F1D] flex justify-between items-center px-6 text-[10px] font-bold text-slate-800 dark:text-slate-300 z-20 transition-colors shrink-0">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-3 h-3 text-slate-800 dark:text-slate-300" />
                  <Battery className="w-3.5 h-3.5 text-slate-800 dark:text-slate-300" />
                </div>
              </div>

              {/* Dynamic Island / Camera Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-900 dark:bg-slate-800 rounded-b-2xl z-30 transition-colors"></div>

              {/* App Header */}
              <div className="bg-white dark:bg-[#121829] px-4 pt-3.5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 z-10 shrink-0 transition-colors">
                <div className="flex items-center gap-2">
                  <Menu className="w-4.5 h-4.5 text-slate-700 dark:text-slate-300" />
                  <LandingLogo size={24} />
                </div>
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <div className="bg-brand-600 text-white text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5">
                    <Plus className="w-2.5 h-2.5" /> Create
                  </div>
                </div>
              </div>

              {/* App Content Area (Feed) */}
              <div className="flex-1 bg-[#F8FAFC] dark:bg-[#0B0F1A] overflow-y-auto scrollbar-hide p-3 flex flex-col gap-3 pb-8 relative transition-colors">
                
                {/* Floating Pill */}
                <div className="sticky top-0 z-10 flex justify-center mb-1">
                  <div className="bg-white/90 dark:bg-[#121829]/95 backdrop-blur border border-slate-200 dark:border-slate-800/80 text-[10px] font-bold text-slate-600 dark:text-slate-300 px-3.5 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 transition-colors">
                    <SlidersHorizontal className="w-3 h-3" /> Explore Feed
                  </div>
                </div>

                {/* Posts mapping */}
                {posts.map((post) => (
                  <div key={post.id} className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-3 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full ${post.avatarBg} flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-inner`}>
                          {post.avatarInitials}
                        </div>
                        <div className="leading-tight">
                          <div className="text-[10px] font-bold text-slate-900 dark:text-white">{post.author}</div>
                          <div className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase">{post.time}</div>
                        </div>
                      </div>
                      <button className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-0.5 rounded cursor-pointer">
                        <Flag className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 mb-3 ml-1 leading-relaxed text-left">
                      {post.content}
                    </p>
                    
                    {/* Interaction Buttons (Active and incrementable!) */}
                    <div className="flex items-center gap-4 text-[9px] font-bold text-slate-500 dark:text-slate-400 border-t border-slate-50 dark:border-slate-800/60 pt-2 ml-1">
                      
                      {/* Heart (Like) button */}
                      <button 
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1 transition-all duration-200 cursor-pointer p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                          post.liked 
                            ? "text-pink-600 dark:text-pink-500" 
                            : "hover:text-pink-600 dark:hover:text-pink-400"
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${post.liked ? "fill-pink-600 dark:fill-pink-500" : ""}`} />
                        <span>{post.reactions}</span>
                      </button>

                      {/* Comments count */}
                      <span className="flex items-center gap-1 p-1">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{post.comments}</span>
                      </span>

                      {/* Shares count */}
                      <span className="flex items-center gap-1 p-1">
                        <Share2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{post.shares}</span>
                      </span>

                      {/* Bookmark button */}
                      <button 
                        onClick={() => handleBookmarkPost(post.id)}
                        className={`ml-auto transition-colors duration-200 cursor-pointer p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                          post.bookmarked 
                            ? "text-brand-600 dark:text-brand-400" 
                            : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                        }`}
                        aria-label="Bookmark"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${post.bookmarked ? "fill-brand-600 dark:fill-brand-400" : ""}`} />
                      </button>

                    </div>
                  </div>
                ))}

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── Ticker Section ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#121829] border-y border-slate-200 dark:border-slate-800 py-3 overflow-hidden relative flex items-center transition-colors">
        <div className="absolute left-0 top-0 bottom-0 z-20 bg-brand-600 dark:bg-brand-700 px-3 sm:px-4 flex items-center font-bold text-[9px] sm:text-[10px] text-white tracking-widest uppercase shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 sm:mr-2 animate-pulse"></span> LIVE
        </div>
        <div className="flex whitespace-nowrap animate-marquee pl-[90px] sm:pl-[120px] space-x-8 sm:space-x-12 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
          <span>Street light fixed after 200+ reactions <span className="text-brand-600 dark:text-brand-400">📍 Kolhapur</span></span>
          <span>Free health camp this Saturday <span className="text-brand-600 dark:text-brand-400">📍 Sangli</span></span>
          <span>New bus route approved by MSRTC <span className="text-brand-600 dark:text-brand-400">📍 Nashik</span></span>
          <span>Pothole on SH-10 repaired! <span className="text-brand-600 dark:text-brand-400">📍 Solapur</span></span>
          <span>Power cut Sunday 9AM–1PM <span className="text-brand-600 dark:text-brand-400">📍 Aurangabad</span></span>
          {/* Duplicated for seamless loop */}
          <span>Street light fixed after 200+ reactions <span className="text-brand-600 dark:text-brand-400">📍 Kolhapur</span></span>
          <span>Free health camp this Saturday <span className="text-brand-600 dark:text-brand-400">📍 Sangli</span></span>
          <span>New bus route approved by MSRTC <span className="text-brand-600 dark:text-brand-400">📍 Nashik</span></span>
        </div>
      </div>

      {/* ─── Platform Features Section (Features Indicator for anchor link) ─── */}
      <section id="features" className="py-12 bg-transparent"></section>

      {/* ─── Communities Section ─────────────────────────────────────────────── */}
      <section id="communities" className="py-16 sm:py-24 px-4 sm:px-6 bg-[#F8FAFC] dark:bg-[#0B0F1A] border-t border-slate-200/50 dark:border-slate-800/40 transition-colors">
        <div className="max-w-[1400px] mx-auto">
          
          <div className="mb-12 sm:mb-16 text-center max-w-2xl mx-auto px-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-3 sm:mb-4 tracking-tight">
              Discover your local network
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base md:text-lg leading-relaxed">
              Join communities based on your interests, get daily updates, or chat anonymously with neighbors in your pincode.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm hover:shadow-lg dark:hover:border-brand-500/40 transition-all duration-350 flex flex-col justify-between group">
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center flex-shrink-0 text-xl shadow-inner group-hover:scale-110 transition-transform duration-300">🚦</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">Pune traffic update</h3>
                      <span className="bg-orange-50 dark:bg-orange-950/45 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 shrink-0">
                        <SettingsIcon className="w-2.5 h-2.5" /> Owner
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">Get all traffic related updates in pune</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-4 flex flex-col gap-2">
                <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-2">
                  <Users className="w-3.5 h-3.5" /> 14,203 members
                </p>
                <div className="flex gap-2">
                  <button className="flex-1 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg transition-all flex justify-center items-center gap-1 cursor-pointer">
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <button className="flex-1 py-1.5 text-xs font-semibold text-orange-500 hover:text-orange-600 hover:bg-orange-50/30 border border-orange-200 dark:border-orange-900/40 rounded-lg transition-all flex justify-center items-center gap-1 cursor-pointer">
                    <SettingsIcon className="w-3.5 h-3.5" /> Manage
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm hover:shadow-lg dark:hover:border-brand-500/40 transition-all duration-350 flex flex-col justify-between group">
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center flex-shrink-0 text-xl shadow-inner group-hover:scale-110 transition-transform duration-300">💧</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">Water Supply Dept.</h3>
                      <span className="bg-blue-50 dark:bg-blue-950/45 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900/60 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0">Official</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">Verified alerts for water cuts & supply scheduling.</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-4 flex flex-col gap-2">
                <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-2">
                  <Users className="w-3.5 h-3.5" /> 5,892 members
                </p>
                <button className="w-full py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-white hover:bg-brand-600 border border-slate-200 dark:border-slate-800 rounded-lg transition-all flex justify-center items-center gap-1 cursor-pointer">
                  View Community <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm hover:shadow-lg dark:hover:border-brand-500/40 transition-all duration-350 flex flex-col justify-between group">
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center flex-shrink-0 text-xl shadow-inner group-hover:scale-110 transition-transform duration-300">🤖</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">Local Chat</h3>
                      <span className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase shrink-0">
                        <Lock className="w-2.5 h-2.5" /> Secret
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">Anonymous connections in your immediate area.</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-4 flex flex-col gap-2">
                <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-2">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" /> Ephemeral chats
                </p>
                <button className="w-full py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-white hover:bg-brand-600 border border-slate-200 dark:border-slate-800 rounded-lg transition-all flex justify-center items-center gap-1 cursor-pointer">
                  Start Chatting <MessageCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-white dark:bg-[#0A0F1D] border-t border-slate-200 dark:border-slate-800/80 py-10 sm:py-12 px-4 sm:px-6 transition-colors duration-300">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          
          <LandingLogo showText size={26} />
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-slate-500 dark:text-slate-400 font-semibold">
            <a href="#features" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Platform</a>
            <a href="https://github.com/govlyx/govlyx" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">GitHub</a>
            <a href="https://github.com/govlyx/govlyx#readme" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Docs</a>
            <a href="#" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Privacy Policy</a>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">
            © 2026 Govlyx · Civic-Tech Transparency Infrastructure
          </p>
        </div>
      </footer>

    </div>
  );
}
