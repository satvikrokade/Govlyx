import { useState, useEffect } from "react";
import {
  Users,
  Files,
  Heart,
  MessageCircle,
  Building2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart3,
  Calendar,
  MoreVertical,
  Mail,
  Lock,
  BadgeCheck,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AdminDashboard = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [showApproveModal, setShowApproveModal] = useState<any | null>(null);
  const [approvedForm, setApprovedForm] = useState({
    email: "",
    password: "",
    identity: ""
  });

  // Mock Data
  const stats = [
    { label: "Total Citizens", value: "24,512", icon: Users, color: "text-[#1D4ED8]", bg: "bg-[#1D4ED8]/10" },
    { label: "Public Posts", value: "12,804", icon: Files, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Total Likes", value: "842k", icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "Comments", value: "156k", icon: MessageCircle, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Departments", value: "48", icon: Building2, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  ];

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("dept_requests") || "[]");
    setRequests(data);
  }, []);

  const handleApprove = (req: any) => {
    setShowApproveModal(req);
    // Autofill email based on dept name
    setApprovedForm({
      ...approvedForm,
      email: `${req.deptName.toLowerCase().replace(/\s+/g, '.')}@govlyx.gov`,
      identity: `GOV-${Math.floor(1000 + Math.random() * 9000)}`
    });
  };

  const confirmApprove = () => {
    // In a real app, this would hit the backend to create the account
    const updated = requests.map(r => r.id === showApproveModal.id ? { ...r, status: "approved", ...approvedForm } : r);
    setRequests(updated);
    localStorage.setItem("dept_requests", JSON.stringify(updated));

    // Notify "Simulated"
    alert(`Success! Credentials for ${showApproveModal.deptName} generated.\nEmail: ${approvedForm.email}\nID: ${approvedForm.identity}`);

    setShowApproveModal(null);
  };

  const handleReject = (id: number) => {
    const updated = requests.map(r => r.id === id ? { ...r, status: "rejected" } : r);
    setRequests(updated);
    localStorage.setItem("dept_requests", JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-base-100 p-6 lg:p-10 space-y-10">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[#1D4ED8] bg-[#1D4ED8]/10 w-fit px-3 py-1 rounded-full border border-[#1D4ED8]/20">
            <ShieldCheck size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Global Administration</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            Super Admin Console
            <BadgeCheck className="text-[#1D4ED8] mt-1" size={28} />
          </h1>
          <p className="text-sm opacity-50 font-bold tracking-tight">Tracking unified platform data across all regions.</p>
        </div>

        <div className="flex items-center gap-3 bg-base-200 p-2 rounded-2xl shadow-sm border border-base-300">
          <div className="p-2.5 bg-[#1D4ED8] rounded-xl text-white shadow-lg shadow-[#1D4ED8]/20">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase opacity-40">System Status</p>
            <p className="text-sm font-black">Performance: 100%</p>
          </div>
          <ChevronRight className="ml-4 opacity-20" />
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {stats.map((s) => (
          <motion.div
            key={s.label}
            whileHover={{ y: -4 }}
            className={`p-6 rounded-3xl border border-base-300 bg-base-200/50 backdrop-blur-md flex flex-col justify-between h-40 shadow-sm relative overflow-hidden group`}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 ${s.bg} rounded-bl-[100px] -mr-8 -mt-8 blur-2xl opacity-50 transition-all group-hover:scale-110`} />
            <div className={`w-12 h-12 ${s.bg} rounded-2xl flex items-center justify-center ${s.color} relative z-10`}>
              <s.icon size={24} />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">{s.label}</p>
              <h3 className="text-2xl font-black">{s.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Onboarding Requests Queue */}
        <div className="col-span-12 xl:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="space-y-0.5">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Building2 size={24} className="text-[#1D4ED8]" />
                Department Onboarding Queue
              </h2>
              <p className="text-sm opacity-50 font-bold">Review and provide identity credentials for new bodies.</p>
            </div>
            <button className="btn btn-sm btn-ghost gap-2 opacity-50">
              <BarChart3 size={16} /> History
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-base-300 bg-base-200/30">
            <table className="table w-full">
              <thead className="bg-base-200/80 border-b border-base-300">
                <tr className="border-none">
                  <th className="font-black text-[10px] uppercase opacity-40">Department / Email</th>
                  <th className="font-black text-[10px] uppercase opacity-40">Reason / Identity</th>
                  <th className="font-black text-[10px] uppercase opacity-40">Status</th>
                  <th className="font-black text-[10px] uppercase opacity-40 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300/30">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center opacity-40 font-bold italic">No pending requests at this time.</td>
                  </tr>
                ) : requests.map((req) => (
                  <tr key={req.id} className="hover:bg-base-300/20 transition-all">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1D4ED8]/10 flex items-center justify-center text-[#1D4ED8] font-black">
                          {req.deptName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-sm">{req.deptName}</p>
                          <p className="text-[11px] opacity-40 font-bold">{req.contactEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-xs">
                      <p className="text-[13px] opacity-70 font-medium leading-tight">{req.reason}</p>
                      <p className="text-[10px] opacity-40 mt-1 font-bold tracking-tight">Applied: {req.timestamp}</p>
                    </td>
                    <td>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                        ${req.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            'bg-rose-500/10 text-rose-500 border-rose-500/20'}
                      `}>
                        {req.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-2">
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(req)}
                              className="btn btn-sm btn-ghost hover:bg-emerald-500/10 hover:text-emerald-500 rounded-lg p-2 h-auto min-h-0"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="btn btn-sm btn-ghost hover:bg-rose-500/10 hover:text-rose-500 rounded-lg p-2 h-auto min-h-0"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                        <button className="btn btn-sm btn-ghost rounded-lg p-2 h-auto min-h-0 opacity-20">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Panel / Recent Activity */}
        <div className="col-span-12 xl:col-span-4 space-y-6">
          <div className="space-y-0.5 px-2">
            <h2 className="text-xl font-black">Real-time Feed Data</h2>
            <p className="text-sm opacity-50 font-bold tracking-tight">System event logs and live engagement.</p>
          </div>

          <div className="rounded-3xl border border-base-300 bg-base-200/50 p-6 space-y-6">
            <div className="space-y-4">
              {[
                { type: "post", text: "New post in Community: Delhi NCR", time: "Just now", color: "text-[#1D4ED8]" },
                { type: "user", text: "12 new citizens registered today", time: "4 mins ago", color: "text-emerald-500" },
                { type: "engagement", text: "Trending: 'Pothole Issues' gained 2k likes", time: "12 mins ago", color: "text-rose-500" },
              ].map((log, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className={`mt-1.5 w-2 h-2 rounded-full ${log.color.replace('text', 'bg')} shadow-[0_0_10px_rgba(0,0,0,0.2)]`} />
                  <div>
                    <p className="text-sm font-black group-hover:text-[#1D4ED8] transition-colors uppercase tracking-tight">{log.text}</p>
                    <p className="text-[10px] opacity-40 font-bold">{log.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-base-300/50">
              <div className="rounded-2xl bg-base-300 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-base-100 flex items-center justify-center">
                    <Calendar size={20} className="opacity-40" />
                  </div>
                  <div>
                    <p className="text-xs font-black">Last Sync</p>
                    <p className="text-[10px] opacity-40 font-bold">March 28, 2026 - 11:58 AM</p>
                  </div>
                </div>
                <button className="btn btn-sm btn-circle btn-ghost">
                  <TrendingUp size={16} className="text-[#1D4ED8]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      <AnimatePresence>
        {showApproveModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="w-full max-w-md overflow-hidden rounded-[40px] border border-base-300 bg-base-100 shadow-2xl"
            >
              <div className="p-8 space-y-8">
                <div className="space-y-1.5 flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
                    <ShieldCheck size={40} />
                  </div>
                  <h3 className="text-2xl font-black">Provision Credentials</h3>
                  <p className="text-sm opacity-50 font-bold">Assign unique identity for {showApproveModal.deptName}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Dept. Profile Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                      <input
                        type="email"
                        className="input w-full pl-12 rounded-2xl bg-base-200 border-none font-bold"
                        value={approvedForm.email}
                        onChange={e => setApprovedForm({ ...approvedForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Assignment Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="input w-full pl-12 rounded-2xl bg-base-200 border-none font-bold"
                        onChange={e => setApprovedForm({ ...approvedForm, password: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Dept. GID (Identity)</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                      <input
                        type="text"
                        className="input w-full pl-12 rounded-2xl bg-base-200 border-none font-bold"
                        value={approvedForm.identity}
                        onChange={e => setApprovedForm({ ...approvedForm, identity: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowApproveModal(null)}
                    className="btn flex-1 bg-base-200 hover:bg-base-300 border-none rounded-2xl font-black h-14"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmApprove}
                    className="btn flex-1 bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white border-none rounded-2xl font-black h-14 shadow-lg shadow-[#1D4ED8]/20"
                  >
                    Generate & Notify
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
