import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useTheme } from "../hooks/useTheme";
import { getAuthToken, clearAuthTokens } from "../utils/auth";
import { useLanguage, SUPPORTED_LANGUAGES, type LangCode } from "../context/LanguageContext";
import GovlyxLogo from "../components/ui/GovlyxLogo";
import { 
  ArrowRight, 
  ChevronDown, 
  Sun,
  Moon,
  Menu,
  X,
  Globe,
  Check,
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
  Eye,
  TrafficCone,
  Droplet,
  Bot,
  MapPin,
  CheckCircle2,
  Landmark,
  Handshake,
  XCircle,
  Camera,
  Building,
  Lightbulb,
  AlertTriangle,
  BarChart3,
  UserX,
  TrendingUp,
  Building2,
  Cpu,
  Rocket,
  Radio,
  User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const isLoggedIn = (): boolean => {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    const isExpired = decoded.exp * 1000 < Date.now();
    if (isExpired) {
      clearAuthTokens();
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

// ─── Destinations Config ─────────────────────────────────────────────────────
const DESTINATIONS = [
  { name: "Main Platform (govlyx.com)", url: "https://govlyx.com" },
  { name: "Upcoming Updates", url: "/upcoming-updates" },
  { name: "Privacy Policy", url: "/privacy-policy" },
  { name: "Review", url: "/review" }
];

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState("https://govlyx.com");
  const [destinationOpen, setDestinationOpen] = useState(false);

  const words = React.useMemo(() => {
    const textWords = ["Neighbourhood", "&", "Govt"];
    let globalIndex = 0;
    return textWords.map((word) => {
      const chars = Array.from(word).map((char) => ({
        char,
        idx: globalIndex++
      }));
      globalIndex++;
      return chars;
    });
  }, []);
  const totalLetters = 20;
  const [titleHovered, setTitleHovered] = useState(false);

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
      bookmarked: false,
      commented: false,
      shared: false,
      flagged: false
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
      bookmarked: false,
      commented: false,
      shared: false,
      flagged: false
    },
    {
      id: "post-3",
      author: "KINDCROW9071",
      avatarInitials: "KC",
      avatarBg: "bg-[#eff4ff] text-[#1D4ED8]",
      time: "1 DAY AGO",
      content: "Streetlights have been out on 4th Cross Street for three days straight. It's completely pitch dark at night and unsafe for pedestrians. @CityCouncil please look into this urgently! 🔦⚠️",
      reactions: 892,
      comments: 134,
      shares: 45,
      liked: false,
      bookmarked: false,
      commented: false,
      shared: false,
      flagged: false
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

  const handleCommentPost = (postId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          const isCommentedNow = !post.commented;
          return {
            ...post,
            commented: isCommentedNow,
            comments: isCommentedNow ? post.comments + 1 : post.comments - 1
          };
        }
        return post;
      })
    );
  };

  const handleSharePost = (postId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          const isSharedNow = !post.shared;
          return {
            ...post,
            shared: isSharedNow,
            shares: isSharedNow ? post.shares + 1 : post.shares - 1
          };
        }
        return post;
      })
    );
  };

  const handleFlagPost = (postId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            flagged: !post.flagged
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
    } else if (targetUrl.startsWith("/")) {
      navigate(targetUrl);
    } else {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const selectedDestination = DESTINATIONS.find((dest) => dest.url === targetUrl) ?? DESTINATIONS[0];

  return (
    <div className="min-h-screen bg-base-100 text-slate-800 dark:text-slate-200 selection:bg-[#1D4ED8]/20 selection:text-[#1e3a8a] dark:selection:text-white transition-colors duration-300 flex flex-col justify-between overflow-x-hidden">
      
      {/* ─── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-[100] bg-base-100/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 pt-[env(safe-area-inset-top,0px)] transition-colors duration-300">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          <a href="#" className="flex items-center">
            <GovlyxLogo showText size={44} markScale={0.9} textClassName="hidden sm:block text-2xl sm:text-3xl" />
          </a>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-base font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">Platform</a>
            <button onClick={() => navigate("/upcoming-updates")} className="text-base font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer">Updates</button>
            <button onClick={() => navigate("/review")} className="text-base font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer">Review</button>
            <button onClick={() => navigate("/privacy-policy")} className="text-base font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer">Policy</button>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">

            <button 
              onClick={toggleTheme} 
              className="hidden md:inline-flex text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60"
              aria-label="Toggle Theme"
            >
              {theme === "light" ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            </button>
            
            <button 
              onClick={handleEnterPlatform}
              className="hidden md:inline-flex liquid-button text-white font-semibold text-sm sm:text-base px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-all cursor-pointer"
            >
              <span className="description">Enter</span>
              <span className="ocean" aria-hidden="true">
                <svg viewBox="0 0 320 64" preserveAspectRatio="none">
                  <path d="M0 46C26 10 58 12 82 43C111 80 147 -1 180 26C212 52 216 60 251 42C279 28 294 8 320 24" />
                </svg>
              </span>
            </button>

            {/* Mobile Menu Toggle */}
            <motion.button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              whileTap={{ scale: 0.9, rotate: isMobileMenuOpen ? -12 : 12 }}
              className="md:hidden text-slate-500 dark:text-slate-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60"
              aria-label="Toggle Menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isMobileMenuOpen ? (
                  <motion.span
                    key="close"
                    initial={{ opacity: 0, rotate: -90, scale: 0.75 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.75 }}
                    transition={{ duration: 0.18 }}
                    className="block"
                  >
                    <X className="w-7 h-7" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ opacity: 0, rotate: 90, scale: 0.75 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: -90, scale: 0.75 }}
                    transition={{ duration: 0.18 }}
                    className="block"
                  >
                    <Menu className="w-7 h-7" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
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
            className="fixed top-[calc(72px+env(safe-area-inset-top,0px))] inset-x-0 z-[99] bg-base-100 border-b border-slate-200 dark:border-slate-800/80 shadow-lg md:hidden transition-colors"
          >
            <div className="px-4 pt-3 pb-6 space-y-3">
              <a 
                href="#features" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-base font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Platform
              </a>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate("/upcoming-updates");
                }}
                className="w-full text-left block px-3 py-2.5 rounded-lg text-base font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-transparent border-none cursor-pointer"
              >
                Updates
              </button>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate("/review");
                }}
                className="w-full text-left block px-3 py-2.5 rounded-lg text-base font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-transparent border-none cursor-pointer"
              >
                Review
              </button>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate("/privacy-policy");
                }}
                className="w-full text-left block px-3 py-2.5 rounded-lg text-base font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-transparent border-none cursor-pointer"
              >
                Policy
              </button>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">

                <div className="flex items-center gap-3">
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
                    className="w-1/2 py-2.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-sm font-semibold shadow-md shadow-[#1D4ED8]/10 flex justify-center items-center"
                  >
                    Enter
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-6 lg:pt-24 lg:pb-8 px-4 sm:px-8 lg:px-24 xl:px-32 overflow-hidden min-h-[80vh] lg:min-h-0 flex items-center bg-transparent">
        {/* Background Decor */}
        <div className="absolute inset-0 bg-grid-pattern opacity-40 dark:opacity-30 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[400px] lg:w-[600px] h-[400px] lg:h-[600px] bg-[#eff4ff] dark:bg-[#1D4ED8]/10 rounded-full mix-blend-multiply filter blur-[80px] lg:blur-[100px] opacity-70 dark:opacity-40 translate-x-1/3 -translate-y-1/4 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[300px] lg:w-[500px] h-[300px] lg:h-[500px] bg-[#eff4ff] dark:bg-[#1D4ED8]/10 rounded-full mix-blend-multiply filter blur-[80px] lg:blur-[100px] opacity-70 dark:opacity-40 -translate-x-1/4 translate-y-1/4 pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-6 items-center relative z-10">
          
          {/* Left Column: Title & Replicated Portal Gateway Card */}
          <div className="max-w-2xl mx-auto lg:mx-0 w-full text-center lg:text-left order-1 lg:order-1 mt-4 lg:mt-0 lg:pl-10">

            
            <h1 className="text-[5.8vw] xs:text-[5.5vw] sm:text-4xl lg:text-4xl xl:text-5xl font-extrabold text-slate-900 dark:text-white leading-[1.2] tracking-tight mb-3 lg:mb-4 flex flex-col items-center lg:items-start gap-1">
              <span className="whitespace-nowrap lg:whitespace-normal xl:whitespace-nowrap">Connecting Every Indian to Their</span>
              <span
                onMouseEnter={() => setTitleHovered(true)}
                onMouseLeave={() => setTitleHovered(false)}
                className="relative inline-flex flex-nowrap gap-x-[0.25em] cursor-default select-none text-[#ff5f5f] pb-1"
              >
                {words.map((wordChars, wordIdx) => (
                  <span key={wordIdx} className="inline-block whitespace-nowrap">
                    {wordChars.map(({ char, idx }) => (
                      <motion.span
                        key={idx}
                        animate={titleHovered ? {
                          y: idx % 2 === 0 ? -6 : -3,
                          color: "#1D4ED8",
                          textShadow: "0 12px 24px rgba(29, 78, 216, 0.28)",
                        } : {
                          y: 0,
                          color: "#ff5f5f",
                          textShadow: "0 0 0 rgba(29, 78, 216, 0)",
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 24,
                          mass: 0.55,
                          delay: titleHovered ? idx * 0.018 : (totalLetters - idx) * 0.006,
                        }}
                        style={{
                          display: "inline-block"
                        }}
                        className="will-change-transform"
                      >
                        {char}
                      </motion.span>
                    ))}
                  </span>
                ))}
                <motion.span
                  aria-hidden="true"
                  initial={false}
                  animate={titleHovered ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bottom-0 left-0 h-1 w-full origin-left rounded-full bg-[#1D4ED8]"
                />
              </span>
            </h1>
            
            <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-4 lg:mb-5 max-w-lg mx-auto lg:mx-0 font-medium">
              A student-built platform to give every Indian citizen a voice in their own area. Safe, anonymous, and centered around your 6-digit pincode.
            </p>

            {/* Replicated Portal Gateway Card */}
            <div className="bg-base-200 border border-black/10 dark:border-base-300 rounded-2xl p-4 sm:p-5 shadow-soft dark:shadow-none text-left max-w-md mx-auto lg:mx-0 relative transition-colors">
              {/* 18+ warning sticker */}
              <div className="absolute -top-3 -right-3 bg-red-600 border border-red-500 text-white font-black text-[11px] px-2.5 py-0.5 rounded-lg shadow-lg shadow-red-500/20 rotate-12 select-none z-20">
                18+
              </div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white mb-0.5">Welcome to Govlyx</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mb-4 leading-normal">
                Select your destination below to enter the platform.
              </p>
              
              <div className="bg-base-300/30 border border-black/10 dark:border-base-300 rounded-xl p-3 sm:p-4 transition-colors">
                <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-500 tracking-wider uppercase mb-1.5">
                  Select Destination
                </label>
                
                <div className="relative mb-3">
                  <button
                    type="button"
                    onClick={() => setDestinationOpen(!destinationOpen)}
                  className={`w-full bg-base-200 border rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-left text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/40 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    destinationOpen
                      ? "border-[#1D4ED8]"
                      : "border-black/10 dark:border-white/20 hover:border-[#1D4ED8]/60 dark:hover:border-[#1D4ED8]/60"
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
                        className="absolute left-0 right-0 top-full mt-1.5 z-30 overflow-hidden rounded-lg border border-black/10 dark:border-base-300 bg-base-200 shadow-xl"
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
                                  ? "bg-[#1D4ED8] text-white font-semibold"
                                  : "bg-base-200 text-slate-700 hover:bg-base-300/50 dark:text-slate-300 dark:hover:bg-base-300/50 dark:hover:text-white"
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

                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 mb-3 notranslate">
                  <div className="dropdown dropdown-top w-full">
                    <div tabIndex={0} role="button" className="w-full bg-base-200 border border-black/10 dark:border-white/20 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-[#1D4ED8]/60 transition-all cursor-pointer flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 min-w-0">
                        <Globe className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                        <span className="truncate">
                          {SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeLabel || language}
                        </span>
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    </div>
                    <ul tabIndex={0} className="dropdown-content menu left-0 p-1.5 shadow-2xl bg-base-100 border border-black/10 dark:border-base-300 rounded-2xl w-full z-[120] mb-1.5 gap-0.5 max-h-44 overflow-y-auto flex-nowrap">
                      {SUPPORTED_LANGUAGES.map((l) => (
                        <li key={l.code}>
                          <button
                            onClick={() => setLanguage(l.code as LangCode)}
                            className={`flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl ${
                              language === l.code
                                ? "bg-[#1D4ED8] text-white"
                                : "hover:bg-base-200 text-base-content/85"
                            }`}
                          >
                            <span>{l.nativeLabel}</span>
                            {language === l.code && <Check className="w-3.5 h-3.5" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="bg-base-200 border border-black/10 dark:border-white/20 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-[#1D4ED8]/60 transition-all cursor-pointer flex items-center justify-center gap-2"
                    aria-label="Toggle Theme"
                  >
                    {theme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                    <span>{theme === "light" ? "Dark" : "Light"}</span>
                  </button>
                </div>
 
                <button 
                  onClick={handleEnterPlatform}
                  className="liquid-button w-full text-white font-semibold rounded-lg py-2 sm:py-2.5 text-xs sm:text-sm transition-all cursor-pointer"
                >
                  <span className="description flex justify-center items-center gap-1.5">
                    Enter Platform <ArrowRight className="w-4 h-4" />
                  </span>
                  <span className="ocean" aria-hidden="true">
                    <svg viewBox="0 0 320 64" preserveAspectRatio="none">
                      <path d="M0 46C26 10 58 12 82 43C111 80 147 -1 180 26C212 52 216 60 251 42C279 28 294 8 320 24" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic CSS Mobile Phone Mockup */}
          <div className="relative flex justify-center items-center order-2 lg:order-2">
            {/* Decorative Blur behind phone */}
            <div className="absolute w-[280px] sm:w-[320px] h-[360px] sm:h-[440px] bg-[#1D4ED8]/25 dark:bg-[#1D4ED8]/10 rounded-full blur-[60px] animate-pulse pointer-events-none"></div>
 
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
                  <GovlyxLogo size={24} />
                </div>
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <div className="bg-[#1D4ED8] text-white text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5">
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
                      <button 
                        onClick={() => handleFlagPost(post.id)}
                        className={`transition-colors p-0.5 rounded cursor-pointer ${
                          post.flagged 
                            ? "text-red-500 dark:text-red-400" 
                            : "text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400"
                        }`}
                      >
                        <Flag className={`w-3 h-3 ${post.flagged ? "fill-red-500 dark:fill-red-400" : ""}`} />
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
                      <button 
                        onClick={() => handleCommentPost(post.id)}
                        className={`flex items-center gap-1 transition-all duration-200 cursor-pointer p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                          post.commented 
                            ? "text-blue-600 dark:text-blue-400" 
                            : "hover:text-blue-600 dark:hover:text-blue-400"
                        }`}
                      >
                        <MessageSquare className={`w-3.5 h-3.5 ${post.commented ? "fill-blue-600 dark:fill-blue-400" : ""}`} />
                        <span>{post.comments}</span>
                      </button>

                      {/* Shares count */}
                      <button 
                        onClick={() => handleSharePost(post.id)}
                        className={`flex items-center gap-1 transition-all duration-200 cursor-pointer p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                          post.shared 
                            ? "text-emerald-600 dark:text-emerald-500" 
                            : "hover:text-emerald-600 dark:hover:text-emerald-400"
                        }`}
                      >
                        <Share2 className={`w-3.5 h-3.5 ${post.shared ? "fill-emerald-600 dark:fill-emerald-500" : ""}`} />
                        <span>{post.shares}</span>
                      </button>

                      {/* Bookmark button */}
                      <button 
                        onClick={() => handleBookmarkPost(post.id)}
                        className={`ml-auto transition-colors duration-200 cursor-pointer p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                          post.bookmarked 
                            ? "text-amber-500 dark:text-amber-400" 
                            : "text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400"
                        }`}
                        aria-label="Bookmark"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${post.bookmarked ? "fill-amber-500 dark:fill-amber-400" : ""}`} />
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
        <div className="absolute left-0 top-0 bottom-0 z-20 bg-[#1D4ED8] dark:bg-[#1e40af] px-3 sm:px-4 flex items-center font-bold text-[9px] sm:text-[10px] text-white tracking-widest uppercase shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 sm:mr-2 animate-pulse"></span> LIVE
        </div>
        <div className="flex whitespace-nowrap animate-marquee pl-[90px] sm:pl-[120px] space-x-8 sm:space-x-12 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">Street light fixed after 200+ reactions <span className="text-[#1D4ED8] dark:text-blue-400 inline-flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5" /> Kolhapur</span></span>
          <span className="inline-flex items-center gap-1.5">Free health camp this Saturday <span className="text-[#1D4ED8] dark:text-blue-400 inline-flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5" /> Sangli</span></span>
          <span className="inline-flex items-center gap-1.5">New bus route approved by MSRTC <span className="text-[#1D4ED8] dark:text-blue-400 inline-flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5" /> Nashik</span></span>
          <span className="inline-flex items-center gap-1.5">Pothole on SH-10 repaired! <span className="text-[#1D4ED8] dark:text-blue-400 inline-flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5" /> Solapur</span></span>
          <span className="inline-flex items-center gap-1.5">Power cut Sunday 9AM–1PM <span className="text-[#1D4ED8] dark:text-blue-400 inline-flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5" /> Chh Sambhajinagar</span></span>
          {/* Duplicated for seamless loop */}
          <span className="inline-flex items-center gap-1.5">Street light fixed after 200+ reactions <span className="text-[#1D4ED8] dark:text-blue-400 inline-flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5" /> Kolhapur</span></span>
          <span className="inline-flex items-center gap-1.5">Free health camp this Saturday <span className="text-[#1D4ED8] dark:text-blue-400 inline-flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5" /> Sangli</span></span>
          <span className="inline-flex items-center gap-1.5">New bus route approved by MSRTC <span className="text-[#1D4ED8] dark:text-blue-400 inline-flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5" /> Nashik</span></span>
        </div>
      </div>

      {/* ─── Platform Features Section (Features Indicator for anchor link) ─── */}
      <div id="features" className="scroll-mt-20"></div>

      {/* ─── WHAT IS GOVLYX & PROBLEM/SOLUTION ─── */}
      <section className="pt-20 pb-8 px-4 sm:px-6 lg:px-24 bg-base-100 border-t border-slate-100 dark:border-slate-800/40 transition-colors">
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#1D4ED8] dark:text-[#60A5FA] text-xs font-black tracking-widest uppercase bg-[#1D4ED8]/10 dark:bg-[#60A5FA]/15 px-3.5 py-1.5 rounded-full">
              What is Govlyx?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-4 tracking-tight leading-tight">
              A Simple App Built for Every Indian Citizen
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-4 text-sm sm:text-base leading-relaxed font-medium">
              Just enter your <strong>6-digit pincode</strong> and instantly see news, civic issues, government announcements, and community discussions happening in your own neighbourhood — safely and anonymously.
            </p>
          </div>

          {/* Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-8">
            <div className="bg-base-200 border border-base-300 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-4.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#1D4ED8]/10 dark:bg-[#1D4ED8]/20 text-[#1D4ED8] dark:text-[#1D4ED8] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="font-extrabold text-slate-950 dark:text-white text-base sm:text-lg leading-tight">Your Neighbourhood</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs md:text-sm leading-relaxed">
                See only posts and issues from your pincode area. Not national noise — just your street, ward, and colony.
              </p>
            </div>
            <div className="bg-base-200 border border-base-300 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-4.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#1D4ED8]/10 dark:bg-[#1D4ED8]/20 text-[#1D4ED8] dark:text-[#1D4ED8] flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="font-extrabold text-slate-950 dark:text-white text-base sm:text-lg leading-tight">Your Government</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs md:text-sm leading-relaxed">
                Government departments post updates, schemes, real-time alerts and announcements directly to you.
              </p>
            </div>
            <div className="bg-base-200 border border-base-300 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-4.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#1D4ED8]/10 dark:bg-[#1D4ED8]/20 text-[#1D4ED8] dark:text-[#1D4ED8] flex items-center justify-center shrink-0">
                  <Handshake className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="font-extrabold text-slate-950 dark:text-white text-base sm:text-lg leading-tight">Your Community</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs md:text-sm leading-relaxed">
                Join local groups, discuss issues, vote in polls, and connect with neighbours — all in one place.
              </p>
            </div>
          </div>


        </div>
      </section>

      {/* ─── CIVIC ISSUE LIFECYCLE ─── */}
      <section className="pt-8 pb-20 px-4 sm:px-6 lg:px-24 bg-base-100 border-t border-base-300 transition-colors">
        <div className="max-w-[1400px] mx-auto">

          {/* Civic Issue Lifecycle Block */}
          <div className="bg-base-200 border border-base-300 rounded-3xl p-8 sm:p-10 shadow-soft">
            <h3 className="font-black text-xl sm:text-2xl text-slate-900 dark:text-white mb-2 text-center lg:text-left">
              Civic Issue Lifecycle
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold mb-8 text-center lg:text-left">
              Your complaint does not just sit there — Govlyx fights for it automatically!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm mb-3"><Camera className="w-5 h-5" /></div>
                <h5 className="font-bold text-xs text-slate-900 dark:text-white">1. You Post</h5>
                <p className="text-slate-400 text-[10px] mt-1.5">Snap a photo of the broken road. Post with your pincode and tag the department.</p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm mb-3"><Landmark className="w-5 h-5" /></div>
                <h5 className="font-bold text-xs text-slate-900 dark:text-white">2. Govt Notified</h5>
                <p className="text-slate-400 text-[10px] mt-1.5">The tagged department gets alerted on their portal dashboard and assigns a fixer.</p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm mb-3"><Users className="w-5 h-5" /></div>
                <h5 className="font-bold text-xs text-slate-900 dark:text-white">3. Neighbours React</h5>
                <p className="text-slate-400 text-[10px] mt-1.5">People nearby react and comment. The issue starts getting traction in the area.</p>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm mb-3"><TrendingUp className="w-5 h-5" /></div>
                <h5 className="font-bold text-xs text-slate-900 dark:text-white">4. Auto-Promoted</h5>
                <p className="text-slate-400 text-[10px] mt-1.5">Enough reactions? App expands coverage to district → state → national automatically.</p>
              </div>

              {/* Step 5 */}
              <div className="flex flex-col items-center text-center p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center shadow-sm mb-3"><CheckCircle2 className="w-5 h-5" /></div>
                <h5 className="font-bold text-xs text-green-500">5. Resolved!</h5>
                <p className="text-slate-400 text-[10px] mt-1.5">Department marks it fixed with proof. You and all local supporters are notified instantly.</p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-emerald-500/5 border border-emerald-500/20 text-xs font-semibold rounded-xl text-emerald-600 dark:text-emerald-400 text-center flex items-center justify-center gap-2">
              <Lightbulb className="w-4 h-4 shrink-0" />
              <span>The more your neighbours engage with the issue, the further it travels — all the way to national level if needed. Zero manual effort from you.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── KEY FEATURES GRID ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-24 bg-base-100 border-t border-slate-100 dark:border-slate-800/40 transition-colors">
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#1D4ED8] dark:text-blue-400 text-xs font-black tracking-widest uppercase bg-blue-50 dark:bg-blue-950/30 px-3.5 py-1.5 rounded-full">
              Feature Suite
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-4 tracking-tight leading-tight">
              Everything You Can Do on Govlyx
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm leading-relaxed font-semibold">
              Power packed features tailored specifically for hyperlocal communities
            </p>
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Local Feed */}
            <div className="bg-base-200 border border-base-300 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 mb-3">
                <MapPin className="w-5 h-5 text-[#1D4ED8] shrink-0" />
                <h4 className="font-extrabold text-slate-950 dark:text-white text-sm leading-tight">Local Feed</h4>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                See posts and issues only from your pincode. Sort by Hot, New, and Top tabs.
              </p>
            </div>

            {/* 2. Govt Broadcasts */}
            <div className="bg-base-200 border border-base-300 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 mb-3">
                <Landmark className="w-5 h-5 text-[#1D4ED8] shrink-0" />
                <h4 className="font-extrabold text-slate-950 dark:text-white text-sm leading-tight">Govt Broadcasts</h4>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Departments post schemes, alerts, and real-time notices to citizens by area.
              </p>
            </div>

            {/* 3. Civic Tracker */}
            <div className="bg-base-200 border border-base-300 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 mb-3">
                <AlertTriangle className="w-5 h-5 text-[#1D4ED8] shrink-0" />
                <h4 className="font-extrabold text-slate-950 dark:text-white text-sm leading-tight">Civic Issue Tracker</h4>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Post problems. Complaints auto-escalate from ward → district → state if engagement grows.
              </p>
            </div>

            {/* 4. Communities */}
            <div className="bg-base-200 border border-base-300 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 mb-3">
                <Users className="w-5 h-5 text-[#1D4ED8] shrink-0" />
                <h4 className="font-extrabold text-slate-950 dark:text-white text-sm leading-tight">Communities</h4>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Create or join local groups — colony, school, RWA. Filter by Public, Private, or Secret.
              </p>
            </div>

            {/* 5. Polls */}
            <div className="bg-base-200 border border-base-300 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 mb-3">
                <BarChart3 className="w-5 h-5 text-[#1D4ED8] shrink-0" />
                <h4 className="font-extrabold text-slate-950 dark:text-white text-sm leading-tight">Neighbourhood Polls</h4>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Ask your neighbourhood a question and get instant votes and stats.
              </p>
            </div>

            {/* 6. Identity Protection */}
            <div className="bg-base-200 border border-base-300 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 mb-3">
                <UserX className="w-5 h-5 text-[#1D4ED8] shrink-0" />
                <h4 className="font-extrabold text-slate-950 dark:text-white text-sm leading-tight">Identity Protection</h4>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Random username hides who you are. Post videos safely without your real name.
              </p>
            </div>

            {/* 7. Anonymous Chat */}
            <div className="bg-base-200 border border-base-300 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 mb-3">
                <MessageCircle className="w-5 h-5 text-[#1D4ED8] shrink-0" />
                <h4 className="font-extrabold text-slate-950 dark:text-white text-sm leading-tight">Anonymous 1-vs-1 Chat</h4>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Talk 1-on-1 with a fellow citizen safely. Absolutely no identity revealed.
              </p>
            </div>

            {/* 8. Local Search */}
            <div className="bg-base-200 border border-base-300 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 mb-3">
                <Search className="w-5 h-5 text-[#1D4ED8] shrink-0" />
                <h4 className="font-extrabold text-slate-950 dark:text-white text-sm leading-tight">Hyperlocal Search</h4>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Search posts, communities, and hashtags specifically near your pincode.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* ─── GOVT INTEGRATION & SCHEME ALIGNMENT ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-24 bg-base-100 border-t border-slate-100 dark:border-slate-800/40 transition-colors">
        <div className="max-w-[1400px] mx-auto">
          {/* Two-Way Citizen Govt platform */}
          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-12 items-center mb-20">
            <div>
              <span className="text-[#1D4ED8] dark:text-blue-400 text-xs font-black tracking-widest uppercase bg-blue-50 dark:bg-blue-950/30 px-3.5 py-1.5 rounded-full">
                SaaS Integration
              </span>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight mt-4 text-left">
                India's First Two-Way Citizen–Govt Platform
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 leading-relaxed text-left">
                Real-time communication, not just a one-way government noticeboard. Dual portal support for seamless escalation flow.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
              <div className="bg-base-200 border border-base-300 p-5 rounded-2xl">
                <h4 className="font-extrabold text-slate-950 dark:text-white text-sm mb-3 text-blue-600 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600 shrink-0" /> Citizens Can:
                </h4>
                <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-semibold font-medium">
                  <li className="flex items-center gap-1.5">✓ Post local civic issues</li>
                  <li className="flex items-center gap-1.5">✓ Save & share govt schemes</li>
                  <li className="flex items-center gap-1.5">✓ Receive location specific alerts</li>
                  <li className="flex items-center gap-1.5">✓ Tag departments on problems</li>
                  <li className="flex items-center gap-1.5">✓ Comment & vote on issues</li>
                </ul>
              </div>

              <div className="bg-base-200 border border-base-300 p-5 rounded-2xl">
                <h4 className="font-extrabold text-slate-950 dark:text-white text-sm mb-3 text-emerald-500 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-emerald-500 shrink-0" /> Government Can:
                </h4>
                <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-semibold font-medium">
                  <li className="flex items-center gap-1.5">✓ Broadcast schemes by pincode</li>
                  <li className="flex items-center gap-1.5">✓ Send real-time local alerts</li>
                  <li className="flex items-center gap-1.5">✓ Receive tagged complaints</li>
                  <li className="flex items-center gap-1.5">✓ Mark civic issues as Resolved</li>
                  <li className="flex items-center gap-1.5">✓ Track engagement & metrics</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Scheme Alignment Cards */}
          <div className="text-center mb-10">
            <h3 className="font-extrabold text-xl sm:text-2xl text-slate-950 dark:text-white">Supported National Missions</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">India funded programmes looking for digital solutions like Govlyx</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-base-200 p-5 rounded-2xl border border-base-300">
              <h4 className="font-black text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-1.5"><Building2 className="w-4 h-4 text-blue-500 shrink-0" /> Smart Cities Mission</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Smart Cities require civic engagement tech for real-time local info and issue resolution. Govlyx integrates directly into this funded mission's tech stack.
              </p>
            </div>

            <div className="bg-base-200 p-5 rounded-2xl border border-base-300">
              <h4 className="font-black text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-1.5"><Cpu className="w-4 h-4 text-blue-500 shrink-0" /> Digital India Program</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Providing a two-way channel between every government office and citizen. Leverage standard translation APIs for vernacular support.
              </p>
            </div>

            <div className="bg-base-200 p-5 rounded-2xl border border-base-300">
              <h4 className="font-black text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-1.5"><Building className="w-4 h-4 text-blue-500 shrink-0" /> Gram Panchayat GPDP</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Act as a digital noticeboard for rural panchayats to broadcast job cards, water schemes, and budget allocations directly to villagers.
              </p>
            </div>

            <div className="bg-base-200 p-5 rounded-2xl border border-base-300">
              <h4 className="font-black text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-1.5"><Rocket className="w-4 h-4 text-blue-500 shrink-0" /> Startup India Recognition</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                DPIIT startup recognition unlocks fast-tracked patents, tax exemptions, and access to government tenders without traditional restrictions.
              </p>
            </div>

            <div className="bg-base-200 p-5 rounded-2xl border border-base-300">
              <h4 className="font-black text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-1.5"><Lightbulb className="w-4 h-4 text-blue-500 shrink-0" /> Atal Innovation Mission</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Funded by NITI Aayog, supporting student innovators addressing core Indian citizen problems with grants up to Rs 10 lakh.
              </p>
            </div>

            <div className="bg-base-200 p-5 rounded-2xl border border-base-300">
              <h4 className="font-black text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-1.5"><Radio className="w-4 h-4 text-blue-500 shrink-0" /> BharatNet & PM-WANI</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Bringing connection to rural areas. Govlyx can scale to be the default civic utility promoted at rural public internet access points.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* ─── WHY GOVLYX COMPARISON TABLE ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-24 bg-base-100 border-t border-base-300 transition-colors">
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#1D4ED8] dark:text-blue-400 text-xs font-black tracking-widest uppercase bg-blue-50 dark:bg-blue-950/30 px-3.5 py-1.5 rounded-full">
              Comparisons
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-4 tracking-tight leading-tight">
              Why Govlyx When Other Apps Exist?
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-semibold">
              No other app combines all these civic-tech features in one place
            </p>
          </div>
          {/* Table Container */}
          <div className="overflow-x-auto border border-base-300 rounded-3xl bg-base-200 shadow-soft">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-base-300 bg-base-300/30">
                  <th className="p-4 sm:p-5 font-black text-slate-900 dark:text-white">Feature</th>
                  <th className="p-4 sm:p-5 font-black text-[#1D4ED8] dark:text-blue-400 text-center">Govlyx</th>
                  <th className="p-4 sm:p-5 font-black text-slate-400 dark:text-slate-500 text-center">WhatsApp</th>
                  <th className="p-4 sm:p-5 font-black text-slate-400 dark:text-slate-500 text-center">Facebook</th>
                  <th className="p-4 sm:p-5 font-black text-slate-400 dark:text-slate-500 text-center">MyGov</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-[#151c30]/50 transition-colors">
                  <td className="p-4 sm:p-5 font-bold text-slate-800 dark:text-slate-200">Hyperlocal (Pincode) Feed</td>
                  <td className="p-4 sm:p-5 text-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-[#151c30]/50 transition-colors">
                  <td className="p-4 sm:p-5 font-bold text-slate-800 dark:text-slate-200">Identity Protection (Anonymity)</td>
                  <td className="p-4 sm:p-5 text-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-[#151c30]/50 transition-colors">
                  <td className="p-4 sm:p-5 font-bold text-slate-800 dark:text-slate-200">Direct Government Broadcasts</td>
                  <td className="p-4 sm:p-5 text-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-[#151c30]/50 transition-colors">
                  <td className="p-4 sm:p-5 font-bold text-slate-800 dark:text-slate-200">Automatic Issue Escalation</td>
                  <td className="p-4 sm:p-5 text-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-[#151c30]/50 transition-colors">
                  <td className="p-4 sm:p-5 font-bold text-slate-800 dark:text-slate-200">Secure Anonymous 1-vs-1 Chat</td>
                  <td className="p-4 sm:p-5 text-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-[#151c30]/50 transition-colors">
                  <td className="p-4 sm:p-5 font-bold text-slate-800 dark:text-slate-200">Zero National Noise / Spam</td>
                  <td className="p-4 sm:p-5 text-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><XCircle className="w-5 h-5 text-rose-500 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center"><AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>


      {/* ─── Communities Section ─────────────────────────────────────────────── */}
      <section id="communities" className="py-16 sm:py-24 px-4 sm:px-6 bg-base-100 border-t border-base-300 transition-colors">
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
            <div className="bg-base-200 border border-base-300 rounded-xl p-5 shadow-sm hover:shadow-lg dark:hover:border-[#1D4ED8]/45 transition-all duration-350 flex flex-col justify-between group">
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center flex-shrink-0 text-orange-500 dark:text-orange-400 shadow-inner group-hover:scale-110 transition-transform duration-300">
                    <TrafficCone className="w-5 h-5" />
                  </div>
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
                  <button onClick={() => navigate("/login")} className="flex-1 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg transition-all flex justify-center items-center gap-1 cursor-pointer">
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <button onClick={() => navigate("/login")} className="flex-1 py-1.5 text-xs font-semibold text-orange-500 hover:text-orange-600 hover:bg-orange-50/30 border border-orange-200 dark:border-orange-900/40 rounded-lg transition-all flex justify-center items-center gap-1 cursor-pointer">
                    <SettingsIcon className="w-3.5 h-3.5" /> Manage
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-base-200 border border-base-300 rounded-xl p-5 shadow-sm hover:shadow-lg dark:hover:border-[#1D4ED8]/45 transition-all duration-350 flex flex-col justify-between group">
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#eff4ff] dark:bg-[#1D4ED8]/10 flex items-center justify-center flex-shrink-0 text-[#1D4ED8] dark:text-[#60a5fa] shadow-inner group-hover:scale-110 transition-transform duration-300">
                    <Droplet className="w-5 h-5 fill-current" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">Water Supply Dept.</h3>
                      <span className="bg-[#eff4ff] dark:bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-blue-400 border border-[#bfdbfe] dark:border-[#1D4ED8]/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0">Official</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">Verified alerts for water cuts & supply scheduling.</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-4 flex flex-col gap-2">
                <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-2">
                  <Users className="w-3.5 h-3.5" /> 5,892 members
                </p>
                <button onClick={() => navigate("/login")} className="w-full py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-white hover:bg-[#1D4ED8] border border-slate-200 dark:border-slate-800 rounded-lg transition-all flex justify-center items-center gap-1 cursor-pointer">
                  View Community <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-base-200 border border-base-300 rounded-xl p-5 shadow-sm hover:shadow-lg dark:hover:border-[#1D4ED8]/45 transition-all duration-350 flex flex-col justify-between group">
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center flex-shrink-0 text-purple-500 dark:text-purple-400 shadow-inner group-hover:scale-110 transition-transform duration-300">
                    <Bot className="w-5 h-5" />
                  </div>
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
                <button onClick={() => navigate("/login")} className="w-full py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-white hover:bg-[#1D4ED8] border border-slate-200 dark:border-slate-800 rounded-lg transition-all flex justify-center items-center gap-1 cursor-pointer">
                  Start Chatting <MessageCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-base-100 border-t border-base-300 py-10 sm:py-12 px-4 sm:px-6 transition-colors duration-300">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          
          <GovlyxLogo showText size={38} textClassName="text-2xl sm:text-2xl" />
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-slate-500 dark:text-slate-400 font-semibold">
            <a href="#features" className="hover:text-red-600 dark:hover:text-red-400 transition-colors">Platform</a>
            <button onClick={() => navigate("/upcoming-updates")} className="hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer font-semibold">Upcoming Updates</button>
            <button onClick={() => navigate("/privacy-policy")} className="hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer font-semibold">Privacy Policy</button>
            <button onClick={() => navigate("/refund-policy")} className="hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer font-semibold">Refund Policy</button>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">
            © 2026&nbsp;<span className="notranslate" translate="no">Govlyx</span>
          </p>
        </div>
      </footer>

    </div>
  );
}
