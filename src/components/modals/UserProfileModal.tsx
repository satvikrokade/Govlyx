import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Crown, Zap, Clock } from "lucide-react";
import axiosInstance from "../../api/axiosConfig";
import { resolveMediaUrl, normalizePassTier } from "../../utils/postUtils";
import { useCurrentUser } from "../../hooks/useUser";
import { useMyBilling } from "../../hooks/useBilling";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  fallbackDisplayName?: string;
  fallbackProfileImage?: string | null;
};

function cleanEmail(val: string): string {
  if (!val) return "";
  if (val.includes("@")) {
    return val.split("@")[0];
  }
  return val;
}

// Date helper
function formatJoinDate(raw: any): string {
  const dateVal = raw || "2026-05-25";
  let d: Date;
  if (Array.isArray(dateVal)) {
    d = new Date(
      dateVal[0],
      dateVal[1] - 1,
      dateVal[2] ?? 1
    );
  } else {
    const ms = Number(dateVal);
    d = isNaN(ms) ? new Date(dateVal as string) : new Date(ms);
  }
  if (isNaN(d.getTime())) return "May 2026";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function UserProfileModal({
  isOpen,
  onClose,
  username,
  fallbackDisplayName,
  fallbackProfileImage,
}: Props) {
  const { data: currentUser } = useCurrentUser();
  const { data: billing } = useMyBilling();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !username) return;

    const cleanQuery = cleanEmail(username);

    // If it's the current user, resolve immediately from active context
    const isSelf = currentUser && (
      cleanEmail(currentUser.actualUsername || currentUser.username || "").toLowerCase() === cleanQuery.toLowerCase() ||
      cleanEmail(currentUser.username || "").toLowerCase() === cleanQuery.toLowerCase()
    );

    if (isSelf) {
      setProfile({
        username: currentUser.username,
        actualUsername: currentUser.actualUsername || currentUser.username,
        profileImage: currentUser.profileImage || null,
        createdAt: currentUser.createdAt || null,
        tier: billing?.currentTier || "GOVLYX_FREE"
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setProfile(null);

    axiosInstance
      .get(`/api/users/search?query=${encodeURIComponent(cleanQuery)}&limit=10`)
      .then((res) => {
        const data =
          res.data?.data?.data ??
          res.data?.data?.content ??
          res.data?.data ??
          res.data?.content ??
          [];
        if (Array.isArray(data)) {
          const match = data.find((u: any) => {
            const candidate1 = cleanEmail(u.actualUsername || u.username || "").toLowerCase();
            const candidate2 = cleanEmail(u.username || "").toLowerCase();
            const candidate3 = cleanEmail(u.displayName || "").toLowerCase();
            const target = cleanQuery.toLowerCase();
            return (
              candidate1 === target ||
              candidate2 === target ||
              candidate3 === target
            );
          });
          if (match) {
            setProfile({
              ...match,
              actualUsername: match.actualUsername || match.displayName || match.username
            });
            return;
          }
        }
        // Fallback for mock users/failed exact matches
        setProfile({
          username: cleanQuery,
          actualUsername: fallbackDisplayName || cleanQuery,
          profileImage: fallbackProfileImage || null,
          createdAt: null,
          tier: "GOVLYX_FREE"
        });
      })
      .catch((err) => {
        console.error("Failed to load user profile in modal, using fallbacks:", err);
        setProfile({
          username: cleanQuery,
          actualUsername: fallbackDisplayName || cleanQuery,
          profileImage: fallbackProfileImage || null,
          createdAt: null,
          tier: "GOVLYX_FREE"
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, username, fallbackDisplayName, fallbackProfileImage, currentUser, billing]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-base-content/10 bg-base-100 p-6 shadow-2xl z-10"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content rounded-full"
            >
              <X size={16} />
            </button>

            {loading ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3">
                <span className="loading loading-spinner loading-md text-[#1D4ED8]" />
                <p className="text-xs text-base-content/50 font-bold uppercase tracking-wider">Loading profile...</p>
              </div>
            ) : profile ? (
              <div className="flex flex-col items-center text-center gap-4 mt-2">
                {/* Avatar */}
                <div className="avatar">
                  <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-blue-700 dark:border-blue-500 shadow-md bg-base-300">
                    <img
                      src={
                        resolveMediaUrl(
                          profile.profileImage || profile.profileImageUrl,
                          "social-posts"
                        ) ||
                        `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(
                          profile.actualUsername || username
                        )}`
                      }
                      alt="User Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Username & Verification */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <h3 className="font-black text-lg text-base-content leading-tight notranslate">
                      {cleanEmail(profile.actualUsername || profile.username || username)}
                    </h3>
                    <ShieldCheck size={16} className="text-[#1D4ED8] shrink-0" />
                  </div>
                  <p className="text-[10px] text-base-content/40 font-black uppercase tracking-wider notranslate">
                    @{profile.actualUsername || username}
                  </p>
                </div>

                {/* Info Cards (Join Date & Tier/Pass) */}
                <div className="grid grid-cols-2 gap-3 w-full mt-2">
                  {/* Join Date Card */}
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-base-200 border border-base-content/5 gap-1 shadow-sm">
                    <Clock size={16} className="text-base-content/50" />
                    <p className="text-[9px] text-base-content/40 font-bold uppercase tracking-wider">Joined</p>
                    <p className="text-xs font-black text-base-content notranslate">
                      {formatJoinDate(profile.createdAt)}
                    </p>
                  </div>

                  {/* Pass Card */}
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-base-200 border border-base-content/5 gap-1 shadow-sm">
                    {(() => {
                      const rawTier =
                        profile.currentTier ||
                        profile.billingTier ||
                        profile.tier ||
                        profile.subscriptionTier ||
                        profile.planTier ||
                        profile.passTier ||
                        profile.authorBillingTier ||
                        profile.userBillingTier ||
                        profile.authorTier ||
                        profile.userTier ||
                        profile.author?.currentTier ||
                        profile.author?.billingTier ||
                        profile.user?.currentTier ||
                        profile.user?.billingTier;

                      const tier = normalizePassTier(rawTier) || "GOVLYX_FREE";

                      if (tier === "GOVLYX_VIP") {
                        return (
                          <>
                            <Crown size={16} className="text-amber-500 fill-amber-500/10" />
                            <p className="text-[9px] text-amber-600/80 dark:text-amber-400/80 font-bold uppercase tracking-wider">Pass</p>
                            <p className="text-xs font-black text-amber-500 uppercase tracking-wide">VIP</p>
                          </>
                        );
                      }
                      if (tier === "GOVLYX_PRO") {
                        return (
                          <>
                            <Zap size={16} className="text-blue-600 dark:text-blue-400 fill-blue-500/10" />
                            <p className="text-[9px] text-blue-600/80 dark:text-blue-400/80 font-bold uppercase tracking-wider">Pass</p>
                            <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide">Pro</p>
                          </>
                        );
                      }
                      return (
                        <>
                          <ShieldCheck size={16} className="text-base-content/40" />
                          <p className="text-[9px] text-base-content/40 font-bold uppercase tracking-wider">Pass</p>
                          <p className="text-xs font-black text-base-content/60 uppercase tracking-wide">Free</p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center mt-2">
                <ShieldCheck size={32} className="text-base-content/20" />
                <h4 className="font-extrabold text-sm text-base-content/75 mt-1">Profile Not Found</h4>
                <p className="text-xs text-base-content/40 max-w-[200px] leading-relaxed">Could not locate profile details for @{username}.</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
