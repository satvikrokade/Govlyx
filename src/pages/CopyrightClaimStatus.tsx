import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Sun,
  Moon,
  Search,
  Loader2,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import GovlyxLogo from "../components/ui/GovlyxLogo";
import axiosInstance from "../api/axiosConfig";

interface ClaimStatusData {
  id: number;
  referenceId: string;
  claimantName: string;
  claimantCompany: string | null;
  claimantEmail: string;
  status: "PENDING" | "ACKNOWLEDGED" | "RESOLVED";
  originalWorkType: string;
  originalWorkDescription: string;
  infringingUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export default function CopyrightClaimStatus() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const [refInput, setRefInput] = useState(searchParams.get("ref") || "");
  const [emailInput, setEmailInput] = useState(searchParams.get("email") || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claim, setClaim] = useState<ClaimStatusData | null>(null);

  const fetchStatus = async (ref: string, email: string) => {
    if (!ref || !email) return;
    setLoading(true);
    setError(null);
    setClaim(null);

    try {
      const response = await axiosInstance.get(
        `/api/copyright-claims/status?ref=${encodeURIComponent(ref.trim())}&email=${encodeURIComponent(email.trim())}`
      );
      const data = response.data?.data ?? response.data;
      if (data) {
        setClaim(data);
      } else {
        throw new Error("No claim data found.");
      }
    } catch (err: any) {
      console.error("Error fetching claim status:", err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "We couldn't find any copyright claim matching this Reference ID and Email combination."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ref = searchParams.get("ref");
    const email = searchParams.get("email");
    if (ref && email) {
      fetchStatus(ref, email);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refInput || !emailInput) {
      setError("Please fill in both the Reference ID and your email.");
      return;
    }
    setSearchParams({ ref: refInput.trim(), email: emailInput.trim() });
  };

  const getStatusBadge = (status: ClaimStatusData["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
      case "ACKNOWLEDGED":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Acknowledged (Reviewing Content)
          </span>
        );
      case "RESOLVED":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">
            <CheckCircle className="w-3.5 h-3.5" /> Resolved
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-base-100 text-slate-800 dark:text-slate-200 selection:bg-blue-650/30 transition-colors duration-300 flex flex-col relative overflow-hidden">
      {/* Top Navbar */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-base-100/90 backdrop-blur-md sticky top-0 z-50 pt-[env(safe-area-inset-top,0px)] shrink-0 transition-colors duration-300">
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
        {/* Main Container */}
        <main className="w-full mx-auto max-w-[850px] px-6 py-16 flex-1 flex flex-col justify-center">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-605 dark:text-blue-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/5 border border-blue-500/15">
            <Search className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Claim Status Tracker
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Check the processing status of your copyright claim and view logs of actions taken by the Govlyx Grievance Desk.
          </p>
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-base-100/60 dark:bg-base-100/40 border border-black/10 dark:border-white/10 p-6 rounded-3xl backdrop-blur-xl shadow-md space-y-4 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label text-xs font-bold uppercase tracking-wider opacity-70">
                Reference ID
              </label>
              <input
                type="text"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                placeholder="e.g. CLA-XXXXXXXX"
                className="input input-bordered w-full focus:outline-none font-mono text-sm"
                required
              />
            </div>

            <div className="form-control w-full">
              <label className="label text-xs font-bold uppercase tracking-wider opacity-70">
                Claimant Email
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="e.g. legal@claimant.com"
                className="input input-bordered w-full focus:outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn w-full bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white disabled:opacity-55 disabled:cursor-not-allowed border-none rounded-xl h-11 font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#1D4ED8]/20 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Fetching Status...
              </>
            ) : (
              "Check Claim Status"
            )}
          </button>
        </form>

        {error && (
          <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs sm:text-sm text-red-650 dark:text-red-400 font-bold flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Claim Details View */}
        {claim && (
          <div className="bg-base-100/60 dark:bg-base-100/40 border border-black/10 dark:border-white/10 p-6 sm:p-10 rounded-3xl backdrop-blur-xl shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div className="space-y-1">
                <span className="text-xs opacity-50 uppercase font-mono">Reference ID: {claim.referenceId}</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Infringement Notice Detail
                </h2>
              </div>
              <div className="self-start sm:self-center">{getStatusBadge(claim.status)}</div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 opacity-50" />
                <div>
                  <span className="opacity-60 block">Submitted At</span>
                  <span className="font-semibold">{new Date(claim.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 opacity-50" />
                <div>
                  <span className="opacity-60 block">Last Updated</span>
                  <span className="font-semibold">{new Date(claim.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Claimant Info */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Claimant Party</h4>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {claim.claimantName} {claim.claimantCompany ? `(${claim.claimantCompany})` : ""}
              </p>
              <p className="text-xs opacity-75">{claim.claimantEmail}</p>
            </div>

            {/* Original Work info */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Original Copyrighted Work</h4>
              <div className="p-4 bg-base-200/50 border border-base-350 rounded-2xl">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-600/10 text-blue-500 rounded-md border border-blue-500/10 mb-2 inline-block">
                  {claim.originalWorkType} Content
                </span>
                <p className="text-sm leading-relaxed">{claim.originalWorkDescription}</p>
              </div>
            </div>

            {/* Infringing URLs list */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Infringing URLs</h4>
              <div className="space-y-2">
                {claim.infringingUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/5 text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-mono transition-colors"
                  >
                    <span className="truncate max-w-[90%]">{url}</span>
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
