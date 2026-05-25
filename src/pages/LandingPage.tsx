import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useTheme } from "../hooks/useTheme";
import { 
  ArrowRight, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Shield, 
  Activity, 
  Cpu, 
  Layers,
  Sun,
  Moon,
  Menu,
  X,
  Globe,
  MessageCircle
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

const LandingLogo: React.FC<LogoProps> = ({ className = "", size = 40, showText = false }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 540"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform hover:scale-105 duration-300"
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
        <span className="font-sans font-bold text-2xl tracking-tight text-slate-900 dark:text-white transition-colors duration-300">
          Govlyx
        </span>
      )}
    </div>
  );
};

// ─── Navbar Sub-component ────────────────────────────────────────────────────
interface NavbarProps {
  theme: string;
  toggleTheme: () => void;
  onEnterPlatform: (e: React.MouseEvent) => void;
}

const LandingNavbar: React.FC<NavbarProps> = ({ theme, toggleTheme, onEnterPlatform }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Platform", href: "#", onClick: onEnterPlatform },
    { name: "GitHub", href: "https://github.com/govlyx/govlyx", target: "_blank" },
    { name: "Docs", href: "https://github.com/govlyx/govlyx#readme", target: "_blank" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-[background-color,border-color,box-shadow] duration-300 py-3 ${
        scrolled
          ? "bg-white/80 dark:bg-[#0A0F1D]/80 backdrop-blur-md shadow-md border-b border-slate-200/50 dark:border-slate-800/50"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="flex items-center">
            <LandingLogo showText size={38} />
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target={link.target}
                rel={link.target ? "noopener noreferrer" : undefined}
                onClick={link.onClick}
                className="text-sm font-semibold transition-colors text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary"
              >
                {link.name}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="btn btn-ghost btn-circle text-base-content dark:text-gray-300"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ y: -20, opacity: 0, rotate: -90 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: 20, opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === "light" ? <Moon className="size-5" /> : <Sun className="size-5" />}
                </motion.div>
              </AnimatePresence>
            </button>

            <a
              href="https://github.com/govlyx/govlyx"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-circle text-base-content dark:text-gray-300"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>

            <button onClick={onEnterPlatform} className="btn btn-primary btn-sm rounded-lg shadow-sm font-bold">
              Enter Platform <ArrowRight className="size-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              className="btn btn-ghost btn-circle btn-sm text-base-content"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="size-5" /> : <Sun className="size-5" />}
            </button>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="btn btn-ghost btn-circle btn-sm text-base-content"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target={link.target}
                  rel={link.target ? "noopener noreferrer" : undefined}
                  onClick={(e) => {
                    setIsOpen(false);
                    if (link.onClick) link.onClick(e);
                  }}
                  className="block px-3 py-2.5 rounded-md text-base font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4 flex items-center gap-4 px-3">
                <a
                  href="https://github.com/govlyx/govlyx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm gap-2 w-1/2"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                  </svg> Github
                </a>
                <button
                  onClick={(e) => {
                    setIsOpen(false);
                    onEnterPlatform(e);
                  }}
                  className="btn btn-primary btn-sm gap-2 w-1/2 font-bold"
                >
                  Enter Platform
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

// ─── Gateway Sub-component ──────────────────────────────────────────────────
interface GatewayProps {
  onEnterPlatform: (e: React.MouseEvent) => void;
  targetUrl: string;
  setTargetUrl: (url: string) => void;
  destinations: { name: string; url: string }[];
}

const LandingGateway: React.FC<GatewayProps> = ({ onEnterPlatform, targetUrl, setTargetUrl, destinations }) => {
  const [showOverview, setShowOverview] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const selectedDestination = destinations.find((dest) => dest.url === targetUrl) ?? destinations[0];

  return (
    <section className="min-h-[calc(100vh-12rem)] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-transparent">
      <div className="absolute top-1/4 left-10 w-80 h-80 bg-[#1D4ED8]/10 rounded-full blur-3xl -z-10 animate-pulse duration-5000"></div>
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-[#1D4ED8]/5 rounded-full blur-3xl -z-10 animate-pulse duration-7000"></div>

      <div className="w-full max-w-4xl lg:max-w-5xl space-y-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-panel w-full p-8 sm:p-10 lg:p-12 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-6 order-last lg:order-first">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1D4ED8]/10 dark:bg-[#1D4ED8]/20 border border-[#1D4ED8]/20 dark:border-[#1D4ED8]/30 text-xs font-semibold text-[#1D4ED8] dark:text-[#60A5FA] uppercase tracking-wider">
                  <span>Portal Gateway</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Welcome to Govlyx
                </h2>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  The main application is hosted on its primary platform. Select your destination below and click enter.
                </p>
              </div>

              <div className="bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl p-6 space-y-6">
                
                {/* Select Destination */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Select Destination
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setDestinationOpen((open) => !open)}
                      className={`w-full bg-white dark:bg-slate-950/80 border rounded-xl px-4 py-3 text-sm font-semibold text-left text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/50 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                        destinationOpen
                          ? "border-[#1D4ED8] rounded-b-none"
                          : "border-slate-200 dark:border-white/10 hover:border-[#1D4ED8]/60 dark:hover:border-[#3B82F6]/60"
                      }`}
                      aria-haspopup="listbox"
                      aria-expanded={destinationOpen}
                    >
                      <span className="truncate">{selectedDestination.name}</span>
                      <ChevronDown className={`size-4 shrink-0 text-slate-500 dark:text-slate-400 transition-transform ${destinationOpen ? "rotate-180" : ""}`} />
                    </button>

                    {destinationOpen && (
                      <div
                        className="absolute left-0 right-0 top-full z-30 overflow-hidden rounded-b-xl border-x border-b border-[#1D4ED8] bg-white dark:bg-[#020617] shadow-xl shadow-[#1D4ED8]/15"
                        role="listbox"
                      >
                        {destinations.map((dest) => {
                          const active = dest.url === targetUrl;
                          return (
                            <button
                              key={dest.url}
                              type="button"
                              onClick={() => {
                                setTargetUrl(dest.url);
                                setDestinationOpen(false);
                              }}
                              className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                                active
                                  ? "bg-[#1D4ED8] text-white font-semibold"
                                  : "bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:bg-[#020617] dark:text-slate-200 dark:hover:bg-[#0F1B33] dark:hover:text-white"
                              }`}
                              role="option"
                              aria-selected={active}
                            >
                              {dest.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={onEnterPlatform}
                    className="w-full bg-[#1D4ED8] hover:bg-[#1e40af] text-white px-6 py-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-[#1D4ED8]/20 transition-all transform hover:translate-y-[-2px] duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950"
                  >
                    Enter Platform <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>

              {/* Platform Concept Dropdown */}
              <div className="border-t border-slate-200 dark:border-white/10 pt-6">
                <button
                  onClick={() => setShowOverview(!showOverview)}
                  className="w-full flex items-center justify-between py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-semibold uppercase tracking-wider focus:outline-none"
                >
                  <span>Platform Concept At A Glance</span>
                  {showOverview ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>

                <AnimatePresence>
                  {showOverview && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                        <div className="bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 p-4 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 text-[#1D4ED8]">
                            <Shield className="size-4" />
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Public Policy Audits</h4>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            Transforms raw government expenditure data and scheme guidelines into searchable ledger audits.
                          </p>
                        </div>

                        <div className="bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 p-4 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 text-[#1D4ED8]">
                            <Activity className="size-4" />
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Transparency Index</h4>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            Calculates region-by-region transparency levels using open-source scoring models.
                          </p>
                        </div>

                        <div className="bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 p-4 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 text-[#1D4ED8]">
                            <Cpu className="size-4" />
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Civic Telemetry</h4>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            Tracks budget allocations vs. actual ground achievements with cryptographic validation hashes.
                          </p>
                        </div>

                        <div className="bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 p-4 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 text-[#1D4ED8]">
                            <Layers className="size-4" />
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Developer API Hub</h4>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            Open access nodes letting civic devs integrate transparency data directly into external apps.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Column (Branding logo and card) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center text-center p-8 lg:py-12 bg-slate-100/50 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/10 shadow-xl order-first lg:order-last relative group overflow-hidden">
              <div className="absolute inset-0 opacity-75 group-hover:scale-110 transition-transform duration-700 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(29, 78, 216, 0.15) 0%, transparent 70%)" }}></div>
              
              <motion.div 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="relative z-10 p-5 bg-white/10 rounded-3xl border border-white/20 shadow-2xl mb-6 hover:border-white/40 transition-colors duration-300 animate-bounce-slow"
              >
                <LandingLogo size={120} />
              </motion.div>
              
              <div className="space-y-3 relative z-10">
                <h1 className="text-5xl lg:text-6xl font-black tracking-wider text-slate-900 dark:text-white select-none">
                  GOVLYX
                </h1>
                <div className="w-16 h-1 bg-slate-900 dark:bg-white mx-auto rounded-full"></div>
                <p className="text-xs font-semibold tracking-wider text-slate-600 dark:text-slate-300 uppercase">
                  Civic-Tech Transparency Infrastructure
                </p>
              </div>
            </div>

          </div>
        </motion.div>
        
        <p className="text-center text-xs text-slate-500">
          Hosting Address: <a href="https://govlyx.com" className="text-slate-500 dark:text-slate-400 hover:text-[#1D4ED8] transition-colors underline inline-flex items-center gap-0.5">govlyx.com <ExternalLink className="size-3 inline" /></a>
        </p>
      </div>
    </section>
  );
};

// ─── Footer Sub-component ────────────────────────────────────────────────────
const LandingFooter: React.FC = () => {
  return (
    <footer className="bg-base-200/50 dark:bg-slate-950 border-t border-base-200 dark:border-slate-900 py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          <div className="md:col-span-5 space-y-4">
            <LandingLogo showText size={32} />
            <p className="text-sm text-base-content/70 dark:text-gray-400 max-w-sm leading-relaxed">
              GOVLYX is a civic-tech transparency engine that parses scattered open datasets into structured, immutable, and citizen-friendly intelligence.
            </p>
            <p className="text-xs text-base-content/50 dark:text-gray-500 font-mono">
              Transparency is not a slogan. It is an infrastructure layer.
            </p>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-base-content/50">Navigation</h4>
            <div className="flex flex-col gap-2 text-sm text-base-content/75 dark:text-gray-400">
              <a href="#vision" className="hover:text-primary transition-colors">Vision</a>
              <a href="#objectives" className="hover:text-primary transition-colors">Objectives</a>
              <a href="#features" className="hover:text-primary transition-colors">Features Simulator</a>
              <a href="#tech-stack" className="hover:text-primary transition-colors">Architecture</a>
            </div>
          </div>

          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-base-content/50">Community & Nodes</h4>
            <p className="text-xs text-base-content/70 dark:text-gray-400 leading-relaxed mb-2">
              Interested in running an independent audit node or verifying telemetry hashes?
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com/govlyx/govlyx"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-circle btn-outline border-base-300 dark:border-slate-800 text-base-content/80 hover:bg-primary hover:text-white hover:border-primary"
                aria-label="GitHub"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                </svg>
              </a>
              <a
                href="#"
                className="btn btn-sm btn-circle btn-outline border-base-300 dark:border-slate-800 text-base-content/80 hover:bg-primary hover:text-white hover:border-primary"
                aria-label="Discord / Chat"
              >
                <MessageCircle className="size-4" />
              </a>
              <a
                href="#"
                className="btn btn-sm btn-circle btn-outline border-base-300 dark:border-slate-800 text-base-content/80 hover:bg-primary hover:text-white hover:border-primary"
                aria-label="Global"
              >
                <Globe className="size-4" />
              </a>
              <a
                href="#"
                className="btn btn-sm btn-circle btn-outline border-base-300 dark:border-slate-800 text-base-content/80 hover:bg-primary hover:text-white hover:border-primary"
                aria-label="Auditing Status"
              >
                <Shield className="size-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-base-200 dark:border-slate-900 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-base-content/50 dark:text-gray-500">
          <p>© 2026 GOVLYX. MIT Licensed. Open source civic-tech project.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#contribution" className="hover:text-primary transition-colors">Security Audit Report</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ─── Main LandingPage Page Component ─────────────────────────────────────────
const DESTINATIONS = [
  { name: "Main Platform (govlyx.com)", url: "https://govlyx.com" },
  { name: "Open Source Repository (GitHub)", url: "https://github.com/govlyx/govlyx" },
  { name: "Developer Documentation", url: "https://github.com/govlyx/govlyx#readme" }
];

export default function LandingPage() {
  const [targetUrl, setTargetUrl] = useState("https://govlyx.com");
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    // Enable scrollable behavior by adding a CSS class helper on Mount
    document.documentElement.classList.add("scrollable-page");

    return () => {
      // Restore scroll lock on Unmount
      document.documentElement.classList.remove("scrollable-page");
    };
  }, []);

  // Navigate locally if entering Main Platform; otherwise open external URLs
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0F1D] text-base-content font-sans transition-colors duration-300 flex flex-col justify-between">
      <LandingNavbar theme={theme} toggleTheme={toggleTheme} onEnterPlatform={handleEnterPlatform} />
      <main className="flex-grow">
        <LandingGateway 
          destinations={DESTINATIONS} 
          targetUrl={targetUrl} 
          setTargetUrl={setTargetUrl} 
          onEnterPlatform={handleEnterPlatform} 
        />
      </main>
      <LandingFooter />
    </div>
  );
}
