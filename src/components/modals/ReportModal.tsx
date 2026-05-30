import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, X, CheckCircle2, ShieldAlert, Clock } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";
import { showToast } from "../../utils/toast";
import { parseError } from "../../utils/error-handler";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "POST" | "SOCIAL_POST" | "COMMENT";
  targetId: number;
}

interface CategoryOption {
  value: string;
  label: string;
  description: string;
  isEmergency: boolean;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    value: "HARASSMENT",
    label: "Harassment & Defamation",
    description: "Harassment, defamation, or gender-based insults.",
    isEmergency: true,
  },
  {
    value: "OBSCENITY",
    label: "Obscenity & Bodily Privacy",
    description: "Nudity, sexually explicit content, or bodily privacy violations.",
    isEmergency: true,
  },
  {
    value: "IMPERSONATION",
    label: "Impersonation",
    description: "Pretending to be another citizen or using a fake profile.",
    isEmergency: true,
  },
  {
    value: "NATIONAL_SECURITY",
    label: "National Security & Sovereignty",
    description: "Threats to unity, integrity, defense, security, or sovereignty of India.",
    isEmergency: true,
  },
  {
    value: "MISINFORMATION",
    label: "Misinformation & Fake News",
    description: "Deceptive, misleading, or intentionally false information.",
    isEmergency: false,
  },
  {
    value: "HATE_SPEECH",
    label: "Hate Speech & Incitement",
    description: "Promoting hatred or inciting violence against communities.",
    isEmergency: false,
  },
  {
    value: "SPAM",
    label: "Spam & Unsolicited Ads",
    description: "Spam content, phishing, or commercial advertisements.",
    isEmergency: false,
  },
  {
    value: "IP_INFRINGEMENT",
    label: "IP Infringement",
    description: "Intellectual property or copyright infringement.",
    isEmergency: false,
  },
  {
    value: "MALWARE",
    label: "Malware & Harmful Software",
    description: "Links to malicious websites or harmful software downloads.",
    isEmergency: false,
  },
];

const ReportModal = ({ isOpen, onClose, targetType, targetId }: ReportModalProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const selectedOption = CATEGORY_OPTIONS.find((c) => c.value === selectedCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) {
      showToast.error("Please select a category");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axiosInstance.post("/api/reports", {
        targetType,
        targetId,
        category: selectedCategory,
        description: description.trim() || undefined,
      });

      const message = response.data?.data ?? response.data?.message ?? "Report submitted successfully.";
      setSuccessMessage(message);
      setSubmitted(true);
      showToast.success("Report filed successfully.");
    } catch (err: any) {
      console.error("Failed to submit report:", err);
      showToast.error(parseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state after transition completes
    setTimeout(() => {
      setSelectedCategory("");
      setDescription("");
      setSubmitted(false);
      setSuccessMessage("");
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl"
          >
            {/* Header */}
            <div className="relative h-28 bg-gradient-to-r from-red-600 to-rose-500 p-6 flex items-end">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-all"
              >
                <X size={20} />
              </button>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white/90">
                  <Flag size={18} className="fill-white" />
                  <span className="text-xs font-black uppercase tracking-widest">IT Act / BNS Compliance</span>
                </div>
                <h2 className="text-xl font-black text-white">Report Violating Content</h2>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-8 text-center space-y-4"
                >
                  <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-lg font-black">Report Filed</h3>
                  <p className="text-sm opacity-80 px-4 leading-relaxed">
                    {successMessage}
                  </p>
                  <button
                    onClick={handleClose}
                    className="btn bg-base-200 hover:bg-base-300 text-base-content border-none rounded-xl px-6 font-bold"
                  >
                    Close
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-xs text-base-content/60 font-medium">
                    Help keep our platform safe and compliant. Select a category below that best describes the violation under Indian IT guidelines.
                  </p>

                  <div className="space-y-2">
                    <label className="text-xs font-black opacity-60 px-1">
                      Violation Category
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1 border border-base-300 rounded-xl p-2 bg-base-200/50">
                      {CATEGORY_OPTIONS.map((option) => (
                        <div
                          key={option.value}
                          onClick={() => setSelectedCategory(option.value)}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                            selectedCategory === option.value
                              ? "bg-red-500/5 border-red-500/30 text-red-500"
                              : "border-transparent bg-base-100 hover:bg-base-200"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            selectedCategory === option.value
                              ? "border-red-500 bg-red-500"
                              : "border-base-content/20"
                          }`}>
                            {selectedCategory === option.value && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-base-content leading-none">
                                {option.label}
                              </span>
                              {option.isEmergency && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                  <ShieldAlert size={8} /> Emergency
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-base-content/60 mt-1">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedOption && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border ${
                        selectedOption.isEmergency
                          ? "bg-rose-500/5 border-rose-500/10 text-rose-600"
                          : "bg-amber-500/5 border-amber-500/10 text-amber-600"
                      }`}
                    >
                      {selectedOption.isEmergency ? (
                        <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                      ) : (
                        <Clock size={16} className="shrink-0 mt-0.5" />
                      )}
                      <div className="text-[10px] font-medium leading-relaxed">
                        {selectedOption.isEmergency ? (
                          <span>
                            <strong>Emergency SLA:</strong> Under IT Rules 2021, emergency complaints are fast-tracked and resolved by admins within <strong>24 hours</strong>.
                          </span>
                        ) : (
                          <span>
                            <strong>Standard SLA:</strong> Complaints under this category are standard and will be investigated and resolved within <strong>15 days</strong>.
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-black opacity-60 px-1">
                      Additional Context (Optional)
                    </label>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      placeholder="Please provide specific details, links, or context that can help our moderation team review this post quickly..."
                      className="textarea textarea-bordered w-full rounded-xl bg-base-200/50 border-none focus:ring-2 focus:ring-red-500/50 font-medium text-xs placeholder-base-content/40 transition-all resize-none"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="btn flex-1 bg-base-200 hover:bg-base-300 text-base-content border-none rounded-xl h-11 font-bold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !selectedCategory}
                      className="btn flex-1 bg-red-600 hover:bg-red-700 text-white border-none rounded-xl h-11 font-black text-xs shadow-lg shadow-red-600/20 disabled:bg-base-300"
                    >
                      {submitting ? "Submitting..." : "Submit Report"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="bg-base-200/50 px-6 py-3 border-t border-base-300/50 flex justify-between items-center text-[9px] opacity-50 font-bold uppercase tracking-widest">
              <span>Indian IT Act Compliance</span>
              <span>Govlyx Moderation</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReportModal;
