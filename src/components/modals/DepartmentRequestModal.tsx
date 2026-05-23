import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X, Send, Building2, User } from "lucide-react";

const DepartmentRequestModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    deptName: "",
    contactEmail: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (window as any).openDeptRequestModal = () => setIsOpen(true);
    return () => { (window as any).openDeptRequestModal = undefined; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));

    // Save to local storage for demo purposes (the admin dashboard will read this)
    const existing = JSON.parse(localStorage.getItem("dept_requests") || "[]");
    const newRequest = {
      id: Date.now(),
      ...form,
      status: "pending",
      timestamp: new Date().toLocaleString(),
    };
    localStorage.setItem("dept_requests", JSON.stringify([...existing, newRequest]));

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setIsOpen(false);
      setSubmitted(false);
      setForm({ deptName: "", contactEmail: "", reason: "" });
    }, 2500);
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
            <div className="relative h-32 bg-[#1D4ED8] p-6 flex items-end">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-all"
              >
                <X size={20} />
              </button>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white/90">
                  <ShieldCheck size={20} />
                  <span className="text-xs font-black uppercase tracking-widest">Official Onboarding</span>
                </div>
                <h2 className="text-2xl font-black text-white">Join as a Department</h2>
              </div>
            </div>

            <div className="p-8">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-12 text-center space-y-4"
                >
                  <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                    <Send size={32} />
                  </div>
                  <h3 className="text-xl font-black">Request Submitted!</h3>
                  <p className="text-sm opacity-70">
                    Our administrators will review your credentials and get back to you with unique login details soon.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-black opacity-60 flex items-center gap-2 px-1">
                      <Building2 size={14} /> Department Name
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g., Pune Municipal Corporation"
                      className="input input-bordered w-full rounded-xl bg-base-200 border-none focus:ring-2 focus:ring-[#1D4ED8]/50 font-bold"
                      value={form.deptName}
                      onChange={e => setForm({ ...form, deptName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-black opacity-60 flex items-center gap-2 px-1">
                      <User size={14} /> Official Email
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="commissioner@pune.gov.in"
                      className="input input-bordered w-full rounded-xl bg-base-200 border-none focus:ring-2 focus:ring-[#1D4ED8]/50 font-bold"
                      value={form.contactEmail}
                      onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-black opacity-60 flex items-center gap-2 px-1">
                      Identity / Purpose
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Briefly describe your role and the area you serve..."
                      className="textarea textarea-bordered w-full rounded-xl bg-base-200 border-none focus:ring-2 focus:ring-[#1D4ED8]/50 font-bold"
                      value={form.reason}
                      onChange={e => setForm({ ...form, reason: e.target.value })}
                    />
                  </div>

                  <button
                    disabled={submitting}
                    className="btn w-full bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white border-none rounded-xl h-12 font-black shadow-lg shadow-[#1D4ED8]/20 disabled:bg-base-300 mt-4"
                  >
                    {submitting ? "Sending Request..." : "Submit Application"}
                  </button>
                </form>
              )}
            </div>

            <div className="bg-base-200/50 px-8 py-4 border-t border-base-300/50">
              <p className="text-[10px] opacity-40 font-bold text-center uppercase tracking-widest">
                Govlyx Trusted Verification Flow
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DepartmentRequestModal;
