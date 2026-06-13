import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useTheme } from "../hooks/useTheme";
import { useLanguage, SUPPORTED_LANGUAGES, type LangCode } from "../context/LanguageContext";
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
  Smartphone,
  ShieldAlert as ShieldIcon,
  Landmark,
  Handshake,
  Tv,
  XCircle,
  Pin,
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
        <span className="font-bold text-xl sm:text-2xl tracking-tight text-slate-900 dark:text-white transition-colors duration-300 notranslate">
          Govlyx
        </span>
      )}
    </div>
  );
};

// ─── Destinations Config ─────────────────────────────────────────────────────
const DESTINATIONS = [
  { name: "Main Platform (govlyx.com)", url: "https://govlyx.com" },
  { name: "Upcoming Updates", url: "/upcoming-updates" }
];

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState("https://govlyx.com");
  const [destinationOpen, setDestinationOpen] = useState(false);

  const letters = React.useMemo(() => Array.from("Neighbourhood & Govt"), []);
  const scatterOffsets = React.useMemo(() => {
    return letters.map(() => ({
      x: (Math.random() - 0.5) * 80, // random offset x between -40 and 40
      y: (Math.random() - 0.5) * 80, // random offset y between -40 and 40
      rotate: (Math.random() - 0.5) * 120, // random rotation
      scale: 0.6 + Math.random() * 0.8, // scale between 0.6 and 1.4
    }));
  }, [letters]);
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
      avatarBg: "bg-[#eff4ff] text-[#1D4ED8]",
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
      <nav className="fixed top-0 inset-x-0 z-[100] bg-base-100/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 h-[72px] transition-colors duration-300">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <a href="#" className="flex items-center">
            <LandingLogo showText size={34} />
          </a>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">Platform</a>
            <button onClick={() => navigate("/upcoming-updates")} className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer">Updates</button>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Language Dropdown */}
            <div className="dropdown dropdown-end notranslate">
              <div tabIndex={0} role="button" className="flex items-center gap-1.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer">
                <Globe className="w-5 h-5" />
                <span className="text-xs uppercase font-black tracking-wider hidden sm:inline">{language}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </div>
              <ul tabIndex={0} className="dropdown-content menu p-1.5 shadow-2xl bg-base-100 border border-base-300 rounded-2xl w-44 z-[120] mt-1 gap-0.5 max-h-60 overflow-y-auto flex-nowrap">
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
              onClick={toggleTheme} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60"
              aria-label="Toggle Theme"
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            <button 
              onClick={handleEnterPlatform}
              className="bg-[#1D4ED8] hover:bg-[#1e40af] dark:bg-[#1D4ED8] dark:hover:bg-[#1e40af] text-white font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg shadow-md shadow-[#1D4ED8]/10 transition-all cursor-pointer"
            >
              Enter
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
            className="fixed top-[72px] inset-x-0 z-[99] bg-base-100 border-b border-slate-200 dark:border-slate-800/80 shadow-lg md:hidden transition-colors"
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

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                {/* Language Selector in Mobile Menu */}
                <div className="dropdown w-full notranslate">
                  <div tabIndex={0} role="button" className="btn btn-outline border-slate-200 dark:border-slate-800/60 w-full flex items-center justify-between px-4 py-2.5 h-10 rounded-lg text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span>Interface Language</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs uppercase font-bold opacity-60">
                        {SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeLabel || language}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                    </span>
                  </div>
                  <ul tabIndex={0} className="dropdown-content menu p-1.5 shadow-2xl bg-base-100 border border-base-300 rounded-2xl w-full z-[120] mt-1 max-h-48 overflow-y-auto gap-0.5 flex-nowrap">
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <li key={l.code}>
                        <button
                          onClick={() => {
                            setLanguage(l.code as LangCode);
                          }}
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

            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-3 lg:mb-4">
              Connecting Every Indian to Their <br className="hidden sm:block" />
              <span
                onMouseEnter={() => setTitleHovered(true)}
                onMouseLeave={() => setTitleHovered(false)}
                className="inline-flex flex-wrap cursor-default select-none text-[#ff5f5f]"
              >
                {letters.map((char, idx) => (
                  <motion.span
                    key={idx}
                    animate={titleHovered ? {
                      x: scatterOffsets[idx].x,
                      y: scatterOffsets[idx].y,
                      rotate: scatterOffsets[idx].rotate,
                      scale: scatterOffsets[idx].scale,
                    } : {
                      x: 0,
                      y: 0,
                      rotate: 0,
                      scale: 1,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 150,
                      damping: 15,
                    }}
                    style={{
                      display: "inline-block",
                      whiteSpace: char === " " ? "pre" : "normal"
                    }}
                    className={`transition-colors duration-300 ${titleHovered ? "text-[#1D4EED] dark:text-[#1D4EED] drop-shadow-[0_0_8px_rgba(29,78,237,0.6)]" : "text-[#ff5f5f]"}`}
                  >
                    {char}
                  </motion.span>
                ))}
              </span>
            </h1>
            
            <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-4 lg:mb-5 max-w-lg mx-auto lg:mx-0 font-medium">
              A student-built platform to give every Indian citizen a voice in their own area. Safe, anonymous, and centered around your 6-digit pincode.
            </p>

            {/* Replicated Portal Gateway Card */}
            <div className="bg-base-200 border border-base-300 rounded-2xl p-4 sm:p-5 shadow-soft dark:shadow-none text-left max-w-md mx-auto lg:mx-0 relative transition-colors">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white mb-0.5">Welcome to Govlyx</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mb-4 leading-normal">
                Select your destination below to enter the platform.
              </p>
              
              <div className="bg-base-300/30 border border-base-300 rounded-xl p-3 sm:p-4 transition-colors">
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
                      : "border-base-300 hover:border-[#1D4ED8]/60 dark:hover:border-[#1D4ED8]/60"
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
                        className="absolute left-0 right-0 top-full mt-1.5 z-30 overflow-hidden rounded-lg border border-base-300 bg-base-200 shadow-xl"
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
 
                <button 
                  onClick={handleEnterPlatform}
                  className="w-full bg-[#1D4ED8] hover:bg-[#1e40af] text-white font-semibold rounded-lg py-2 sm:py-2.5 text-xs sm:text-sm shadow-md shadow-[#1D4ED8]/20 transition-all flex justify-center items-center gap-1.5 cursor-pointer"
                >
                  Enter Platform <ArrowRight className="w-4 h-4" />
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
                  <LandingLogo size={24} />
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
                            ? "text-[#1D4ED8] dark:text-blue-400" 
                            : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                        }`}
                        aria-label="Bookmark"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${post.bookmarked ? "fill-[#1D4ED8] dark:fill-blue-400" : ""}`} />
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
      <section className="py-20 px-4 sm:px-6 lg:px-24 bg-base-100 border-t border-slate-100 dark:border-slate-800/40 transition-colors">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <div className="bg-base-200 border border-base-300 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#1D4ED8]/10 dark:bg-[#1D4ED8]/20 text-[#1D4ED8] dark:text-[#1D4ED8] flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-950 dark:text-white text-lg leading-tight">Your Neighbourhood</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                See only posts and issues from your pincode area. Not national noise — just your street, ward, and colony.
              </p>
            </div>
            <div className="bg-base-200 border border-base-300 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#1D4ED8]/10 dark:bg-[#1D4ED8]/20 text-[#1D4ED8] dark:text-[#1D4ED8] flex items-center justify-center shrink-0">
                  <Landmark className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-950 dark:text-white text-lg leading-tight">Your Government</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                Government departments post updates, schemes, real-time alerts and announcements directly to you.
              </p>
            </div>
            <div className="bg-base-200 border border-base-300 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#1D4ED8]/10 dark:bg-[#1D4ED8]/20 text-[#1D4ED8] dark:text-[#1D4ED8] flex items-center justify-center shrink-0">
                  <Handshake className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-950 dark:text-white text-lg leading-tight">Your Community</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                Join local groups, discuss issues, vote in polls, and connect with neighbours — all in one place.
              </p>
            </div>
          </div>

          {/* Problem vs Solution Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-base-200 border border-base-300 p-8 sm:p-10 rounded-3xl transition-colors">
            {/* Problems */}
            <div className="space-y-6">
              <h3 className="font-black text-xl sm:text-2xl text-red-500 dark:text-red-400 flex items-center gap-2">
                <ShieldIcon className="w-6 h-6 shrink-0" /> Problems Every Indian Faces Daily
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold">
                Why does nobody know what is happening in their own neighbourhood?
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex gap-3.5 items-start">
                  <div className="bg-red-500/10 text-red-500 dark:text-red-400 p-1.5 rounded-lg shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">WhatsApp Groups Are a Mess</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-normal">Your mohalla group has 200 people, fake news, and memes. Nobody knows when the water was cut or why the road is broken.</p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start">
                  <div className="bg-red-500/10 text-red-500 dark:text-red-400 p-1.5 rounded-lg shrink-0 mt-0.5">
                    <Tv className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">News Shows Only Big City Stories</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-normal">Facebook and Instagram show you Bollywood and national politics. Local issues in your ward or village are completely invisible online.</p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start">
                  <div className="bg-red-500/10 text-red-500 dark:text-red-400 p-1.5 rounded-lg shrink-0 mt-0.5">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Government Announcements Never Reach You</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-normal">A new scheme was launched in your district last month. You never heard about it. Government posts on MyGov.in — but nobody visits it.</p>
                  </div>
                </div>

                <div className="flex gap-3.5 items-start">
                  <div className="bg-red-500/10 text-red-500 dark:text-red-400 p-1.5 rounded-lg shrink-0 mt-0.5">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Safe Space to Speak Up</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-normal">You want to report a corrupt official or a local problem — but you are afraid to put your name on it publicly. So you stay silent.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Solution */}
            <div className="space-y-6 lg:border-l lg:border-slate-200 dark:lg:border-slate-800 lg:pl-10">
              <h3 className="font-black text-xl sm:text-2xl text-green-500 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 shrink-0" /> Govlyx Solves All of This
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold">
                One app. Your pincode. Everything local and safe.
              </p>

              <div className="space-y-4 pt-2">
                <div className="bg-base-200 border border-base-300 p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
                  <span className="text-red-500 dark:text-red-400 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1"><XCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" /> WhatsApp chaos</span>
                  <span className="text-slate-400 text-xs rotate-90 sm:rotate-0">→</span>
                  <span className="text-green-500 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> Organised Pincode Feed
                  </span>
                </div>

                <div className="bg-base-200 border border-base-300 p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
                  <span className="text-red-500 dark:text-red-400 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1"><XCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" /> Missing Schemes</span>
                  <span className="text-slate-400 text-xs rotate-90 sm:rotate-0">→</span>
                  <span className="text-green-500 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> Direct Pincode Broadcasts
                  </span>
                </div>

                <div className="bg-base-200 border border-base-300 p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
                  <span className="text-red-500 dark:text-red-400 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1"><XCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" /> Unresolved Issues</span>
                  <span className="text-slate-400 text-xs rotate-90 sm:rotate-0">→</span>
                  <span className="text-green-500 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> Post → Viral → Resolved
                  </span>
                </div>

                <div className="bg-base-200 border border-base-300 p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
                  <span className="text-red-500 dark:text-red-400 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1"><XCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" /> Name Exposure Fear</span>
                  <span className="text-slate-400 text-xs rotate-90 sm:rotate-0">→</span>
                  <span className="text-green-500 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> Random Anonymity Protects You
                  </span>
                </div>

                <div className="p-3 bg-blue-500/5 border border-blue-500/20 text-xs font-semibold rounded-xl text-blue-600 dark:text-blue-400 flex gap-2 items-center">
                  <Pin className="w-4 h-4 rotate-45 shrink-0" />
                  <span>Govlyx works on just one thing from you: your <strong>6-digit pincode</strong>. No GPS. No long forms. No complicated setup.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CIVIC ISSUE LIFECYCLE ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-24 bg-base-100 border-t border-base-300 transition-colors">
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
          
          <LandingLogo showText size={26} />
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-slate-500 dark:text-slate-400 font-semibold">
            <a href="#features" className="hover:text-red-600 dark:hover:text-red-400 transition-colors">Platform</a>
            <button onClick={() => navigate("/upcoming-updates")} className="hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer font-semibold">Upcoming Updates</button>
            <a href="#" className="hover:text-red-600 dark:hover:text-red-400 transition-colors">Privacy Policy</a>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">
            © 2026 Govlyx
          </p>
        </div>
      </footer>

    </div>
  );
}
