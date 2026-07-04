import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Sun,
  Moon,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import GovlyxLogo from "../components/ui/GovlyxLogo";
import axiosInstance from "../api/axiosConfig";
import { showToast } from "../utils/toast";

export default function CopyrightClaimForm() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [form, setForm] = useState({
    claimantName: "",
    claimantCompany: "",
    claimantEmail: "",
    claimantPhone: "",
    claimantAddress: "",
    infringingUrls: "",
    infringementDescription: "",
    originalWorkUrls: "",
    originalWorkDescription: "",
    originalWorkType: "Text",
    goodFaithDeclaration: false,
    accuracyDeclaration: false,
    signature: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (
      !form.claimantName ||
      !form.claimantEmail ||
      !form.claimantAddress ||
      !form.infringingUrls ||
      !form.infringementDescription ||
      !form.originalWorkDescription ||
      !form.signature
    ) {
      setError("Please fill in all required fields and sign the declaration.");
      return;
    }

    if (!form.goodFaithDeclaration || !form.accuracyDeclaration) {
      setError("You must agree to the legal declarations.");
      return;
    }

    // Convert URLs comma/newline separated string to array
    const infringingUrlsArr = form.infringingUrls
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    const originalWorkUrlsArr = form.originalWorkUrls
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (infringingUrlsArr.length === 0) {
      setError("Please provide at least one valid infringing URL.");
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post("/api/copyright-claims", {
        claimantName: form.claimantName,
        claimantCompany: form.claimantCompany || null,
        claimantEmail: form.claimantEmail,
        claimantPhone: form.claimantPhone || null,
        claimantAddress: form.claimantAddress,
        infringingUrls: infringingUrlsArr,
        infringementDescription: form.infringementDescription,
        originalWorkUrls: originalWorkUrlsArr,
        originalWorkDescription: form.originalWorkDescription,
        originalWorkType: form.originalWorkType,
        goodFaithDeclaration: form.goodFaithDeclaration,
        accuracyDeclaration: form.accuracyDeclaration,
        signature: form.signature
      });

      const data = response.data?.data ?? response.data;
      if (data?.referenceId) {
        setReferenceId(data.referenceId);
        showToast.success("Copyright claim submitted successfully.");
      } else {
        throw new Error("Missing Reference ID in response.");
      }
    } catch (err: any) {
      console.error("Error submitting copyright claim:", err);
      if (err.response?.status === 429) {
        setError("Too many requests. You have reached the maximum limit of 5 copyright claims per day from this IP address.");
      } else {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            err.message ||
            "Failed to submit copyright claim. Please try again."
        );
      }
    } finally {
      setLoading(false);
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
            <Scale className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            DMCA & Copyright Infringement Portal
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            If you believe your copyrighted work is hosted on Govlyx without authorization, use this secure, official form to file a formal takedown request.
          </p>
        </div>

        {/* Success State */}
        {referenceId ? (
          <div className="bg-base-200/60 dark:bg-base-200/40 border border-green-500/30 p-8 sm:p-12 rounded-3xl backdrop-blur-xl shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-green-500">Claim Filed Successfully</h3>
              <p className="text-sm opacity-80 max-w-md mx-auto">
                We have registered your copyright infringement claim. Our Grievance Desk will review the URLs and respond within the statutory 24-hour window.
              </p>
            </div>

            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-sm mx-auto">
              <span className="text-xs opacity-60 uppercase font-bold tracking-wider">Your Reference ID</span>
              <p className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 select-all mt-1">
                {referenceId}
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => navigate(`/copyright-claim/status?ref=${referenceId}&email=${form.claimantEmail}`)}
                className="btn bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white border-none rounded-xl h-11 px-6 font-bold shadow-lg shadow-[#1D4ED8]/20"
              >
                Track Claim Status
              </button>
              <button
                onClick={() => setReferenceId(null)}
                className="btn btn-ghost rounded-xl h-11 px-6 font-bold"
              >
                Submit Another Claim
              </button>
            </div>
          </div>
        ) : (
          /* Form Container */
          <form
            onSubmit={handleSubmit}
            className="bg-base-100/60 dark:bg-base-100/40 border border-black/10 dark:border-white/10 p-6 sm:p-10 rounded-3xl backdrop-blur-xl shadow-xl space-y-8"
          >
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs sm:text-sm text-red-650 dark:text-red-400 font-bold flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* SECTION 1: Claimant Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-black border-b border-slate-200 dark:border-slate-800 pb-2">
                1. Claimant Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label text-xs font-bold uppercase tracking-wider opacity-70">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"><User size={16} /></span>
                    <input
                      type="text"
                      name="claimantName"
                      value={form.claimantName}
                      onChange={handleChange}
                      placeholder="e.g. John Doe"
                      className="input input-bordered w-full focus:outline-none pl-11"
                      required
                    />
                  </div>
                </div>

                <div className="form-control w-full">
                  <label className="label text-xs font-bold uppercase tracking-wider opacity-70">
                    Company / Organization (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"><Building size={16} /></span>
                    <input
                      type="text"
                      name="claimantCompany"
                      value={form.claimantCompany}
                      onChange={handleChange}
                      placeholder="e.g. Legal Corp LLC"
                      className="input input-bordered w-full focus:outline-none pl-11"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label text-xs font-bold uppercase tracking-wider opacity-70">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"><Mail size={16} /></span>
                    <input
                      type="email"
                      name="claimantEmail"
                      value={form.claimantEmail}
                      onChange={handleChange}
                      placeholder="e.g. legal@claimant.com"
                      className="input input-bordered w-full focus:outline-none pl-11"
                      required
                    />
                  </div>
                </div>

                <div className="form-control w-full">
                  <label className="label text-xs font-bold uppercase tracking-wider opacity-70">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"><Phone size={16} /></span>
                    <input
                      type="tel"
                      name="claimantPhone"
                      value={form.claimantPhone}
                      onChange={handleChange}
                      placeholder="e.g. +1 555-0199"
                      className="input input-bordered w-full focus:outline-none pl-11"
                    />
                  </div>
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label text-xs font-bold uppercase tracking-wider opacity-70">
                  Full Postal Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-4 opacity-40"><MapPin size={16} /></span>
                  <textarea
                    name="claimantAddress"
                    value={form.claimantAddress}
                    onChange={handleChange}
                    placeholder="Provide your complete legal address"
                    rows={3}
                    className="textarea textarea-bordered w-full focus:outline-none pl-11 py-3.5 leading-relaxed"
                    required
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: Infringing Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-black border-b border-slate-200 dark:border-slate-800 pb-2">
                2. Infringing Work on Govlyx
              </h3>
              <div className="form-control w-full">
                <label className="label text-xs font-bold uppercase tracking-wider opacity-70">
                  Infringing Post / Media URLs <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-4 opacity-40"><LinkIcon size={16} /></span>
                  <textarea
                    name="infringingUrls"
                    value={form.infringingUrls}
                    onChange={handleChange}
                    placeholder="Paste the infringing Govlyx URLs here (one URL per line)"
                    rows={3}
                    className="textarea textarea-bordered w-full focus:outline-none pl-11 py-3.5 leading-relaxed font-mono text-sm"
                    required
                  />
                </div>
                <label className="label text-[10px] opacity-50 mt-1">
                  Example: https://govlyx.com/post/12345
                </label>
              </div>

              <div className="form-control w-full">
                <label className="label text-xs font-bold uppercase tracking-wider opacity-70">
                  Description of Infringement <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="infringementDescription"
                  value={form.infringementDescription}
                  onChange={handleChange}
                  placeholder="Explain how this content infringes your copyright (e.g. 'This post re-uploads my commercial photography without license.')"
                  rows={4}
                  className="textarea textarea-bordered w-full focus:outline-none py-3.5 leading-relaxed"
                  required
                />
              </div>
            </div>

            {/* SECTION 3: Original Work Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-black border-b border-slate-200 dark:border-slate-800 pb-2">
                3. Original Copyrighted Work
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label text-xs font-bold uppercase tracking-wider opacity-70">
                    Content Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="originalWorkType"
                    value={form.originalWorkType}
                    onChange={handleChange}
                    className="select select-bordered w-full focus:outline-none font-bold text-sm"
                  >
                    <option value="Text">Text (Articles, Literary Works)</option>
                    <option value="Audio">Audio (Songs, Podcasts)</option>
                    <option value="Video">Video (Clips, Movies)</option>
                    <option value="Image">Image (Photos, Graphics)</option>
                  </select>
                </div>

                <div className="form-control w-full">
                  <label className="label text-xs font-bold uppercase tracking-wider opacity-70">
                    Original Source URLs (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"><LinkIcon size={16} /></span>
                    <input
                      type="text"
                      name="originalWorkUrls"
                      value={form.originalWorkUrls}
                      onChange={handleChange}
                      placeholder="URLs to your original work (comma separated)"
                      className="input input-bordered w-full focus:outline-none pl-11"
                    />
                  </div>
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label text-xs font-bold uppercase tracking-wider opacity-70">
                  Original Work Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="originalWorkDescription"
                  value={form.originalWorkDescription}
                  onChange={handleChange}
                  placeholder="Provide details about your original copyrighted work (e.g. registration numbers, titles, or identification details)"
                  rows={4}
                  className="textarea textarea-bordered w-full focus:outline-none py-3.5 leading-relaxed"
                  required
                />
              </div>
            </div>

            {/* SECTION 4: Legal Declarations */}
            <div className="space-y-4">
              <h3 className="text-lg font-black border-b border-slate-200 dark:border-slate-800 pb-2">
                4. Legal Declarations
              </h3>
              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="goodFaithDeclaration"
                    name="goodFaithDeclaration"
                    checked={form.goodFaithDeclaration}
                    onChange={handleChange}
                    className="checkbox checkbox-primary checkbox-sm mt-1 rounded-md cursor-pointer"
                    required
                  />
                  <label
                    htmlFor="goodFaithDeclaration"
                    className="text-xs sm:text-sm opacity-80 cursor-pointer select-none leading-relaxed"
                  >
                    I declare that I have a good faith belief that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law. <span className="text-red-500">*</span>
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="accuracyDeclaration"
                    name="accuracyDeclaration"
                    checked={form.accuracyDeclaration}
                    onChange={handleChange}
                    className="checkbox checkbox-primary checkbox-sm mt-1 rounded-md cursor-pointer"
                    required
                  />
                  <label
                    htmlFor="accuracyDeclaration"
                    className="text-xs sm:text-sm opacity-80 cursor-pointer select-none leading-relaxed"
                  >
                    I declare that the information in this notification is accurate, and under penalty of perjury, that I am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed. <span className="text-red-500">*</span>
                  </label>
                </div>
              </div>

              <div className="form-control w-full mt-4">
                <label className="label text-xs font-bold uppercase tracking-wider opacity-70">
                  Electronic Signature <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"><FileText size={16} /></span>
                  <input
                    type="text"
                    name="signature"
                    value={form.signature}
                    onChange={handleChange}
                    placeholder="Type your full legal name as your electronic signature"
                    className="input input-bordered w-full focus:outline-none pl-11 font-semibold italic text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn w-full bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white disabled:opacity-55 disabled:cursor-not-allowed border-none rounded-xl h-12 font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#1D4ED8]/20 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Submitting Legal Claim...
                </>
              ) : (
                "File Copyright Infringement Claim"
              )}
            </button>
          </form>
        )}
        </main>
      </div>
    </div>
  );
}
