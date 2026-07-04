import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Sun, 
  Moon, 
  Star, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Cpu, 
  Send, 
  Bug, 
  Rocket, 
  Palette, 
  MessageSquare,
  Terminal,
  ShieldCheck,
  Smartphone,
  Frown,
  Meh,
  Smile,
  Laugh,
  Angry
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import GovlyxLogo from "../components/ui/GovlyxLogo";
import axiosInstance from "../api/axiosConfig";
import { showToast } from "../utils/toast";

type FeedbackCategory = "BUG" | "FEATURE_REQUEST" | "UI_UX" | "GENERAL";

const CATEGORY_DETAILS = {
  BUG: {
    label: "Bug Report",
    color: "from-rose-500 to-red-650",
    bgLight: "bg-rose-500/10",
    text: "text-rose-500",
    border: "border-rose-500/20",
    borderSelected: "border-rose-500 dark:border-rose-500/80",
    glow: "shadow-rose-500/10",
    desc: "Something is broken or behaving unexpectedly.",
    icon: Bug,
  },
  FEATURE_REQUEST: {
    label: "Feature Request",
    color: "from-pink-500 to-purple-600",
    bgLight: "bg-pink-500/10",
    text: "text-pink-500",
    border: "border-pink-500/20",
    borderSelected: "border-pink-500 dark:border-pink-500/80",
    glow: "shadow-pink-500/10",
    desc: "Suggest new ideas or tools you want to see.",
    icon: Rocket,
  },
  UI_UX: {
    label: "UI / UX Feedback",
    color: "from-indigo-500 to-blue-600",
    bgLight: "bg-indigo-500/10",
    text: "text-indigo-550 dark:text-indigo-400",
    border: "border-indigo-500/20",
    borderSelected: "border-indigo-550 dark:border-indigo-400",
    glow: "shadow-indigo-500/10",
    desc: "Feedback on design, navigation, or animations.",
    icon: Palette,
  },
  GENERAL: {
    label: "General Review",
    color: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
    borderSelected: "border-emerald-500 dark:border-emerald-500/80",
    glow: "shadow-emerald-500/10",
    desc: "General thoughts, compliments, or suggestions.",
    icon: MessageSquare,
  },
};

export default function ReviewPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Form States
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<FeedbackCategory>("GENERAL");
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "offline">("idle");
  const [apiError, setApiError] = useState<string>("");

  // Metadata (auto-generated fields)
  const appVersion = "1.0.0";
  const deviceInfo = navigator.userAgent;

  const handleSubmit = async (e: React.FormEvent, simulate = false) => {
    e.preventDefault();
    if (rating === 0) {
      showToast.error("Please select a rating before submitting!");
      return;
    }

    setSubmitting(true);
    setApiError("");

    const payload = {
      rating,
      category,
      message,
      appVersion,
      deviceInfo
    };

    if (simulate) {
      setTimeout(() => {
        setSubmitting(false);
        setSubmitStatus("success");
        showToast.success("Simulated successful feedback submission!");
      }, 1200);
      return;
    }

    try {
      await axiosInstance.post("/api/v1/feedback", payload);
      setSubmitting(false);
      setSubmitStatus("success");
      showToast.success("Feedback submitted successfully!");
    } catch (err: any) {
      setSubmitting(false);
      console.error("Feedback API error:", err);
      if (!err.response) {
        setSubmitStatus("offline");
      } else {
        const errMsg = err.response?.data?.message || err.response?.data?.error || "Failed to submit feedback.";
        setApiError(errMsg);
        showToast.error(errMsg);
      }
    }
  };

  const handleResetForm = () => {
    setRating(0);
    setHoverRating(0);
    setCategory("GENERAL");
    setMessage("");
    setSubmitStatus("idle");
    setApiError("");
  };

  const currentCat = CATEGORY_DETAILS[category];

  return (
    <div className="h-screen bg-base-100 text-slate-800 dark:text-slate-200 selection:bg-blue-650/30 transition-colors duration-300 flex flex-col relative overflow-hidden">
      {/* Navbar */}
      <nav className="border-b border-slate-200/80 dark:border-slate-800/80 bg-base-100/90 backdrop-blur-md sticky top-0 z-50 pt-[env(safe-area-inset-top,0px)] shrink-0 transition-colors duration-300">
        <div className="max-w-[1200px] mx-auto px-6 h-[72px] flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer bg-transparent border-none group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Go Back
          </button>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-105 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <span className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />
            <GovlyxLogo showText size={44} textClassName="hidden sm:block text-xl sm:text-2xl font-extrabold" />
          </div>
        </div>
      </nav>

      {/* Scrollable Container Wrapper */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-between z-10">
        {/* Content Area */}
        <main className="w-full mx-auto max-w-[1300px] px-6 py-10">
          
          {/* Header */}
          <div className="text-left mb-10 max-w-3xl">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Review Govlyx
            </h1>
            <p className="mt-3 text-base text-slate-500 dark:text-slate-400 font-medium">
              We are constantly refining the hyperlocal civic experience. Share your thoughts, report issues, or suggest updates below.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {submitStatus === "success" ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-8 sm:p-12 rounded-3xl text-center max-w-xl mx-auto space-y-6 backdrop-blur-xl shadow-2xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none" />
                <div className="w-20 h-20 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-green-500/5">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Feedback Submitted</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Thank you for helping us improve Govlyx. Your feedback has been logged successfully and will be reviewed by our platform administrators.
                  </p>
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleResetForm}
                    className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-850 dark:hover:text-white transition-all inline-flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-350"
                  >
                    <RefreshCw className="w-4 h-4" /> Submit Another Review
                  </button>
                </div>
              </motion.div>
            ) : submitStatus === "offline" ? (
              <motion.div 
                key="offline"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-8 sm:p-12 rounded-3xl max-w-2xl mx-auto space-y-6 backdrop-blur-xl shadow-2xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
                <div className="w-16 h-16 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/5 mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Backend Service Unreachable
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    The backend endpoint at <code className="font-mono text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded text-amber-500 dark:text-amber-400">POST /api/v1/feedback</code> is currently offline or unreachable.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-start pt-4">
                  <button
                    onClick={handleResetForm}
                    className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-650 dark:text-slate-350 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Go Back & Retry
                  </button>
                  <button
                    onClick={(e) => handleSubmit(e, true)}
                    className="px-6 py-3 bg-[#1D4ED8] hover:bg-[#1e40af] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/10 border-none flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Cpu className="w-4 h-4" /> Simulate Success
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                  {/* Form Section */}
                <div className="lg:col-span-6 bg-base-100/60 dark:bg-base-100/40 border border-black/10 dark:border-white/15 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-xl space-y-6">
                  <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
                    
                    {/* Category Selection */}
                    <div className="space-y-3">
                      <label className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400">
                        1. Select Category
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(["BUG", "FEATURE_REQUEST", "UI_UX", "GENERAL"] as FeedbackCategory[]).map((cat) => {
                          const details = CATEGORY_DETAILS[cat];
                          const IconComp = details.icon;
                          const isSelected = category === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setCategory(cat)}
                              className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl text-left border cursor-pointer transition-all relative overflow-hidden group backdrop-blur-sm ${
                                isSelected
                                  ? `bg-base-100 dark:bg-base-100 ${details.borderSelected} ring-2 ring-blue-600/30 shadow-md ${details.glow}`
                                  : "bg-base-100/35 dark:bg-base-100/15 border-slate-200/80 dark:border-slate-800/80 hover:bg-base-100/80 dark:hover:bg-base-100/30 hover:border-slate-300 dark:hover:border-slate-750"
                              }`}
                            >
                              <div className="flex gap-2.5 sm:gap-3.5 items-start">
                                <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all ${
                                  isSelected ? `${details.bgLight} ${details.text}` : "bg-slate-200/40 dark:bg-slate-800/30 text-slate-400 group-hover:text-slate-650 dark:group-hover:text-slate-200"
                                }`}>
                                  <IconComp className="w-4 h-4 sm:w-5 h-5 shrink-0" />
                                </div>
                                <div>
                                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white mb-0.5">{details.label}</h4>
                                  <p className="text-[10px] sm:text-xs text-slate-450 dark:text-slate-400 leading-normal">{details.desc}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                     {/* Rating Selector */}
                    <div className="space-y-3 p-4 sm:p-6 bg-base-100/45 dark:bg-base-100/20 border border-slate-200/80 dark:border-slate-800/85 rounded-xl sm:rounded-2xl backdrop-blur-sm">
                      <label className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 block">
                        2. Overall Rating
                      </label>
                      <div className="flex flex-wrap items-center gap-3 py-2">
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="p-1 cursor-pointer hover:scale-110 active:scale-95 transition-transform bg-transparent border-none"
                            >
                              <Star
                                className={`w-6 h-6 sm:w-8 sm:h-8 transition-colors ${
                                  star <= (hoverRating || rating)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-300 dark:text-slate-700"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        {rating > 0 && (
                          <motion.span 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-450/10 border border-amber-400/20 px-2.5 py-1 rounded-lg"
                          >
                            {rating === 1 && (
                              <>
                                <Angry className="w-4 h-4 text-red-500" />
                                <span>Terrible</span>
                              </>
                            )}
                            {rating === 2 && (
                              <>
                                <Frown className="w-4 h-4 text-orange-500" />
                                <span>Poor</span>
                              </>
                            )}
                            {rating === 3 && (
                              <>
                                <Meh className="w-4 h-4 text-yellow-500" />
                                <span>Average</span>
                              </>
                            )}
                            {rating === 4 && (
                              <>
                                <Smile className="w-4 h-4 text-green-500" />
                                <span>Good</span>
                              </>
                            )}
                            {rating === 5 && (
                              <>
                                <Laugh className="w-4 h-4 text-emerald-500" />
                                <span>Excellent!</span>
                              </>
                            )}
                          </motion.span>
                        )}
                      </div>
                    </div>

                    {/* Message Field */}
                    <div className="space-y-3">
                      <label htmlFor="message" className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 block">
                        3. Review & Feedback (Optional)
                      </label>
                      <div className="relative">
                        <textarea
                          id="message"
                          rows={4}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="What did you love? Any features you'd like to suggest? Let us know..."
                          className="w-full bg-base-100/50 dark:bg-base-100/20 border border-black/15 dark:border-white/15 rounded-2xl p-4 text-xs sm:text-sm focus:outline-none focus:border-[#1D4ED8] text-slate-805 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-750 transition-colors"
                          maxLength={1000}
                        />
                        <div className="absolute bottom-4 right-4 text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                          {message.length} / 1000
                        </div>
                      </div>
                    </div>

                    {apiError && (
                      <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 dark:text-red-400 font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {apiError}
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 rounded-2xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white font-extrabold text-sm tracking-wider uppercase transition-all shadow-lg shadow-blue-500/10 border-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Submitting Review...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" /> Submit Feedback
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Live Review/Interactive Preview */}
                <div className="lg:col-span-6 space-y-6">
                  <div className="bg-base-100/60 dark:bg-base-100/40 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl px-3 sm:px-4 py-6 backdrop-blur-xl relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-blue-505 dark:text-blue-400" />
                        <span className="text-[10px] sm:text-xs font-black tracking-widest uppercase text-slate-700 dark:text-slate-200">Live Review Preview</span>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>

                     {/* Simulated Review Card with 3D Float Effect & White Shadow */}
                    <motion.div 
                      animate={{
                        y: [0, -6, 0],
                        transition: {
                          duration: 5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }
                      }}
                      style={{ 
                        transformStyle: "preserve-3d", 
                        perspective: 1000,
                        transform: "rotateX(10deg) rotateY(-8deg) rotateZ(0.5deg)"
                      }}
                      className="border border-black/10 dark:border-white/15 rounded-2xl bg-base-100 dark:bg-[#0a0e1a] p-5 relative overflow-hidden shadow-[-15px_20px_35px_rgba(0,0,0,0.35),_0_0_15px_rgba(255,255,255,0.07)] dark:shadow-[-15px_20px_35px_rgba(0,0,0,0.55),_0_0_15px_rgba(255,255,255,0.04)] transition-all duration-300"
                    >
                      <div className="space-y-4 pt-2" style={{ transform: "translateZ(20px)" }}>
                        {/* Review category badge */}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-750 dark:text-slate-200 block uppercase tracking-wider">Review Type</span>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-gradient-to-r ${currentCat.color} text-white mt-1.5 shadow-sm`}>
                              <currentCat.icon className="w-2.5 h-2.5" />
                              {currentCat.label}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-750 dark:text-slate-200 block uppercase tracking-wider">Review ID</span>
                            <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-100 mt-1.5 block">#GLX-5532</span>
                          </div>
                        </div>

                        {/* Stars */}
                        <div>
                          <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-750 dark:text-slate-200 block uppercase tracking-wider mb-1.5">Assigned Rating</span>
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star 
                                key={idx} 
                                className={`w-5 h-5 ${idx < rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-800"}`} 
                              />
                            ))}
                          </div>
                        </div>

                        {/* Message */}
                        <div>
                          <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-750 dark:text-slate-200 block uppercase tracking-wider mb-1.5">Citizen Statement</span>
                          <div className="p-3.5 bg-base-100/55 dark:bg-base-100/25 border border-slate-200 dark:border-white/15 rounded-xl min-h-[80px] max-h-[180px] overflow-y-auto text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-medium italic whitespace-pre-wrap leading-relaxed break-words scrollbar-thin">
                            {message ? `"${message}"` : '"No details provided. Overall rating submitted."'}
                          </div>
                        </div>

                        {/* Divider Line */}
                        <div className="border-t border-slate-200 dark:border-white/10 my-2" />

                        {/* Metadata fields */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div>
                            <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-750 dark:text-slate-200 block uppercase tracking-wider">Version</span>
                            <span className="font-mono text-xs font-bold text-slate-805 dark:text-slate-100">{appVersion}</span>
                          </div>
                          <div>
                            <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-750 dark:text-slate-200 block uppercase flex items-center gap-1 tracking-wider">
                              <Smartphone className="w-2.5 h-2.5 text-blue-550 dark:text-blue-450" /> Platform Agent
                            </span>
                            <span className="font-mono text-xs text-slate-700 dark:text-slate-200 truncate block mt-0.5" title={deviceInfo}>Web Browser</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* DTO specs box */}
                    <div className="mt-4 p-4 rounded-2xl bg-base-100/40 dark:bg-base-100/20 border border-slate-200 dark:border-white/10 space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-350">
                        <ShieldCheck className="w-4 h-4 text-blue-550 dark:text-blue-400" />
                        <span className="text-xs font-black uppercase tracking-wider">Payload Integrity</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
                        All submissions pack a verified DTO scheme that carries device context and platform versions to guarantee accurate diagnostics.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </AnimatePresence>

        </main>

        <footer className="bg-base-100 border-t border-base-300 py-10 sm:py-12 px-6 transition-colors duration-300 z-10 shrink-0">
          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <GovlyxLogo showText size={38} textClassName="text-2xl sm:text-2xl" />
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-slate-500 dark:text-slate-400 font-semibold">
              <button onClick={() => navigate("/")} className="hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer font-semibold">Home</button>
              <button onClick={() => navigate("/upcoming-updates")} className="hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer font-semibold">Upcoming Updates</button>
              <button onClick={() => navigate("/privacy-policy")} className="hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer font-semibold">Privacy Policy</button>
              <button onClick={() => navigate("/refund-policy")} className="hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer font-semibold">Refund Policy</button>
              <button onClick={() => navigate("/review")} className="text-red-600 dark:text-red-400 bg-transparent border-none p-0 cursor-pointer font-semibold">Review</button>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">
              © 2026&nbsp;<span className="notranslate" translate="no">Govlyx</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
