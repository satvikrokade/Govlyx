import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Crown, Zap, Loader2 } from "lucide-react";
import { useCurrentUser } from "../../hooks/useUser";
import { useMyBilling } from "../../hooks/useBilling";
import { billingApi, type BillingCycle } from "../../api/billing";
import { loadRazorpayScript } from "../../utils/razorpay";
import { showToast } from "../../utils/toast";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

const GOVLYX_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 540">
  <!-- Circle Background -->
  <circle cx="256" cy="270" r="230" fill="#1D4ED8" />

  <!-- Dome & Structure (moved upward by 6px) -->
  <g fill="#FFFFFF" transform="translate(0, -6)">
    <path d="M256 150c-40 0-72 32-72 72v20h144v-20c0-40-32-72-72-72z"/>
    <rect x="220" y="242" width="72" height="16"/>
    <rect x="204" y="220" width="12" height="40"/>
    <rect x="296" y="220" width="12" height="40"/>
  </g>

  <!-- Stars -->
  <g fill="#FFFFFF" transform="translate(0, -6)">
    <circle cx="170" cy="210" r="6"/>
    <circle cx="196" cy="230" r="4"/>
    <circle cx="342" cy="210" r="6"/>
    <circle cx="318" cy="230" r="4"/>
    <circle cx="256" cy="190" r="5"/>
  </g>

  <!-- Circuits Curve -->
  <path fill="#FFFFFF" d="M150 300h212l-8 16H158z"/>

  <!-- Circuit Lines -->
  <g fill="#FFFFFF">
    <rect x="248" y="300" width="16" height="120"/>
    <rect x="198" y="300" width="16" height="80"/>
    <rect x="298" y="300" width="16" height="80"/>
  </g>

  <!-- Circuit Nodes (side circles enlarged) -->
  <g fill="#FFFFFF">
    <circle cx="256" cy="440" r="18"/>
    <circle cx="206" cy="380" r="20"/>
    <circle cx="306" cy="380" r="20"/>
  </g>

  <!-- Flag on Dome Top -->
  <g>
    <rect x="252" y="118" width="8" height="32" fill="#FFFFFF"/>
    <path d="M260 118h45v22l-45-8z" fill="#FFFFFF"/>
    <path d="M260 118l35 16l-35-6z" fill="#FFFFFF" opacity="0.4"/>
  </g>
</svg>`;

const LAUNCH_OFFER = {
  label: "Launch Special - 50% OFF",
  subtext: "Limited time offer for early adopters.",
  pro: { original: 49, discounted: 24 },
  vip: { original: 149, discounted: 74 },
} as const;

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const { data: user } = useCurrentUser();
  const { data: billing } = useMyBilling();
  const queryClient = useQueryClient();
  const [loadingTier, setLoadingTier] = useState<"GOVLYX_PRO" | "GOVLYX_VIP" | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");

  if (!isOpen) return null;

  const currentTier = billing?.currentTier || "GOVLYX_FREE";
  const getLaunchPrice = (tier: "GOVLYX_PRO" | "GOVLYX_VIP", cycle: BillingCycle) => {
    if (cycle === "YEARLY") {
      return tier === "GOVLYX_VIP" ? 745 : 245;
    }
    return tier === "GOVLYX_VIP" ? LAUNCH_OFFER.vip.discounted : LAUNCH_OFFER.pro.discounted;
  };

  const handleUpgrade = async (tier: "GOVLYX_PRO" | "GOVLYX_VIP") => {
    setLoadingTier(tier);
    try {
      // 1. Fetch Razorpay config key
      const config = await billingApi.getConfig();
      if (!config.keyId) {
        throw new Error("Razorpay configuration not available");
      }

      // 2. Load Razorpay checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay SDK. Please check your internet connection.");
      }

      // 3. Create backend order
      const orderData = await billingApi.createOrder(tier, billingCycle);

      // 4. Configure Razorpay checkout options
      const options = {
        key: config.keyId,
        amount: getLaunchPrice(tier, billingCycle) * 100,
        currency: "INR",
        name: "Govlyx",
        image: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(GOVLYX_LOGO_SVG)))}`,
        description: tier === "GOVLYX_VIP"
          ? (billingCycle === "YEARLY"
            ? `Govlyx VIP Yearly Pass - Launch Special Rs 745/yr`
            : `Govlyx VIP Monthly Pass - Launch Special Rs ${LAUNCH_OFFER.vip.discounted}/mo`)
          : (billingCycle === "YEARLY"
            ? `Govlyx Pro Yearly Pass - Launch Special Rs 245/yr`
            : `Govlyx Pro Monthly Pass - Launch Special Rs ${LAUNCH_OFFER.pro.discounted}/mo`),
        order_id: orderData.orderId,
        handler: async (response: any) => {
          const toastId = toast.loading("Verifying payment...");
          try {
            await billingApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.dismiss(toastId);
            showToast.success("Pass activated successfully!");
            // Invalidate queries so settings and chat update immediately
            queryClient.invalidateQueries({ queryKey: ["myBilling"] });
            queryClient.invalidateQueries({ queryKey: ["currentUser"] });
            onClose();
          } catch (err: any) {
            toast.dismiss(toastId);
            showToast.error(err.response?.data?.message || "Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: user?.actualUsername || user?.username || "",
          email: user?.email || "",
        },
        theme: {
          color: tier === "GOVLYX_VIP" ? "#F59E0B" : "#1D4ED8",
        },
        modal: {
          ondismiss: () => {
            showToast.error("Payment cancelled");
          },
        },
      };

      // 5. Open Razorpay checkout modal
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      showToast.error(err.message || "An error occurred during payment setup.");
    } finally {
      setLoadingTier(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-base-200 border border-base-300 p-6 sm:p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-base-content/60 hover:text-base-content hover:bg-base-300 rounded-full transition-colors focus:outline-none"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-6 px-10 sm:px-0">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-base-content tracking-tight">
            Unlock the Full Power of Govlyx
          </h2>
          <p className="text-sm opacity-70 mt-1 max-w-md mx-auto">
            Choose a pass tier to power up your matchmaking, chat experience, and community features.
          </p>
          <div className="mt-4 inline-flex flex-col sm:flex-row items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-emerald-700 dark:text-emerald-300">
            <span className="text-[11px] font-black uppercase tracking-widest">{LAUNCH_OFFER.label}</span>
            <span className="hidden sm:inline text-emerald-500/70">-</span>
            <span className="text-[11px] font-bold">{LAUNCH_OFFER.subtext}</span>
          </div>
        </div>

        {/* Monthly / Yearly Toggle */}
        <div className="flex justify-center mb-8">
          <div className="relative flex items-center bg-base-300 p-1.5 rounded-full border border-base-content/10">
            <button
              type="button"
              onClick={() => setBillingCycle("MONTHLY")}
              className={`px-6 py-2 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                billingCycle === "MONTHLY"
                  ? "bg-primary text-primary-content shadow-md scale-105"
                  : "text-base-content/70 hover:text-base-content"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("YEARLY")}
              className={`px-6 py-2 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                billingCycle === "YEARLY"
                  ? "bg-primary text-primary-content shadow-md scale-105"
                  : "text-base-content/70 hover:text-base-content"
              }`}
            >
              Annually
              <span className="badge badge-[10px] bg-emerald-500 text-white font-black border-none px-1.5 py-0.5 leading-none shrink-0 scale-90">
                Save 50%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          
          {/* FREE TIER CARD */}
          <div className="flex flex-col justify-between p-6 rounded-2xl bg-base-100 border border-base-300 transition-all hover:shadow-md relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-base-content/40">Free Pass</span>
                {currentTier === "GOVLYX_FREE" && (
                  <span className="badge badge-sm badge-outline opacity-60">Active Plan</span>
                )}
              </div>
              <div className="mb-4">
                <span className="text-3xl font-black text-base-content">₹0</span>
                <span className="text-xs opacity-60">/month</span>
              </div>
              <p className="text-xs opacity-70 mb-6">Standard portal access with basic matchmaking limits.</p>
              
              <div className="divider my-0 opacity-40" />
              
              <ul className="space-y-3 mt-6 text-xs text-base-content/80">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-green-500 shrink-0 mt-0.5" />
                  <span>10 matches per 24 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-green-500 shrink-0 mt-0.5" />
                  <span>5 media shares daily within those 10 matches</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-green-500 shrink-0 mt-0.5" />
                  <span>Auto-Translate feed posts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-green-500 shrink-0 mt-0.5" />
                  <span>Standard poll creation</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <button
                disabled
                className="btn btn-sm btn-outline w-full rounded-xl cursor-default opacity-50"
              >
                {currentTier === "GOVLYX_FREE" ? "Current Plan" : "Free Plan"}
              </button>
            </div>
          </div>

          {/* PRO TIER CARD */}
          <div className={`flex flex-col justify-between p-6 rounded-2xl bg-base-100 border ${currentTier === "GOVLYX_PRO" ? "border-blue-500 shadow-md" : "border-base-300"} transition-all hover:shadow-lg relative`}>
            <div className="absolute -top-3 left-6 rounded-full bg-emerald-500 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20">
              Launch Special - 50% OFF
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  <Zap size={12} /> Pro Pass
                </span>
                {currentTier === "GOVLYX_PRO" && (
                  <span className="badge badge-sm badge-primary">Active Plan</span>
                )}
              </div>
              
              {billingCycle === "YEARLY" ? (
                <div className="mb-4">
                  <div className="flex items-end gap-2">
                    <span className="text-sm font-black text-base-content/35 line-through">₹49</span>
                    <span className="text-3xl font-black text-base-content">₹20</span>
                    <span className="text-xs opacity-60 mb-1">/month</span>
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Billed as one payment of ₹245/year. (Regularly ₹490)
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="flex items-end gap-2">
                    <span className="text-sm font-black text-base-content/35 line-through">₹{LAUNCH_OFFER.pro.original}</span>
                    <span className="text-3xl font-black text-base-content">₹{LAUNCH_OFFER.pro.discounted}</span>
                    <span className="text-xs opacity-60 mb-1">/month</span>
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {LAUNCH_OFFER.subtext}
                  </p>
                </div>
              )}

              <p className="text-xs opacity-70 mb-6">Enhance your communication and create exclusive groups.</p>
              
              <div className="divider my-0 opacity-40" />
              
              <ul className="space-y-3 mt-6 text-xs text-base-content/80">
                <li className="flex items-start gap-2 font-semibold">
                  <Check size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <span>Unlimited 1-vs-1 matchmaking</span>
                </li>
                <li className="flex items-start gap-2 font-semibold">
                  <Check size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <span>Rich Media in Chat (Images/Videos)</span>
                </li>
                <li className="flex items-start gap-2 font-semibold">
                  <Check size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <span>Create 3 Private or Secret Communities</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <span>Advanced chat matchmaking filters</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <button
                onClick={() => handleUpgrade("GOVLYX_PRO")}
                disabled={currentTier === "GOVLYX_PRO" || currentTier === "GOVLYX_VIP" || loadingTier !== null}
                className="btn btn-sm btn-primary w-full text-white rounded-xl shadow-md disabled:bg-base-300 disabled:text-base-content/40 border-none bg-blue-700 hover:bg-blue-800 animate-none cursor-pointer"
              >
                {loadingTier === "GOVLYX_PRO" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : currentTier === "GOVLYX_PRO" ? (
                  "Active"
                ) : currentTier === "GOVLYX_VIP" ? (
                  "Downgrade Gated"
                ) : (
                  "Upgrade to Pro"
                )}
              </button>
            </div>
          </div>

          {/* VIP TIER CARD */}
          <div className={`flex flex-col justify-between p-6 rounded-2xl bg-base-100 border-2 ${currentTier === "GOVLYX_VIP" ? "border-amber-500 shadow-md" : "border-amber-500/40"} transition-all hover:shadow-lg relative`}>
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-sm">
                  Launch Special - 50% OFF
                </span>
                <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-amber-950 shadow-sm">
                  Popular
                </span>
                {currentTier === "GOVLYX_VIP" && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-300">
                    Active Plan
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-amber-500">
                  <Crown size={12} /> VIP Pass
                </span>
              </div>
              
              {billingCycle === "YEARLY" ? (
                <div className="mb-4">
                  <div className="flex items-end gap-2">
                    <span className="text-sm font-black text-base-content/35 line-through">₹149</span>
                    <span className="text-3xl font-black text-base-content">₹62</span>
                    <span className="text-xs opacity-60 mb-1">/month</span>
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Billed as one payment of ₹745/year. (Regularly ₹1490)
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="flex items-end gap-2">
                    <span className="text-sm font-black text-base-content/35 line-through">₹{LAUNCH_OFFER.vip.original}</span>
                    <span className="text-3xl font-black text-base-content">₹{LAUNCH_OFFER.vip.discounted}</span>
                    <span className="text-xs opacity-60 mb-1">/month</span>
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {LAUNCH_OFFER.subtext}
                  </p>
                </div>
              )}

              <p className="text-xs opacity-70 mb-6">Complete VIP experience, disappearing messages, priority matching.</p>
              
              <div className="divider my-0 opacity-40" />
              
              <ul className="space-y-3 mt-6 text-xs text-base-content/80">
                <li className="flex items-start gap-2 font-bold text-amber-600 dark:text-amber-400">
                  <Check size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <span>VIP Priority Queue Matchmaking</span>
                </li>
                <li className="flex items-start gap-2 font-bold text-amber-600 dark:text-amber-400">
                  <Check size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <span>Disappearing messages (settings)</span>
                </li>
                <li className="flex items-start gap-2 font-bold text-amber-600 dark:text-amber-400">
                  <Check size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <span>Toggle message pinning in chat</span>
                </li>
                <li className="flex items-start gap-2 font-semibold">
                  <Check size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <span>Create 5 Private or Secret Communities</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <span>Includes all PRO benefits</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <button
                onClick={() => handleUpgrade("GOVLYX_VIP")}
                disabled={currentTier === "GOVLYX_VIP" || loadingTier !== null}
                className="btn btn-sm w-full text-amber-950 font-bold bg-amber-500 hover:bg-amber-600 border-none rounded-xl shadow-md disabled:bg-base-300 disabled:text-base-content/40 cursor-pointer"
              >
                {loadingTier === "GOVLYX_VIP" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : currentTier === "GOVLYX_VIP" ? (
                  "Active"
                ) : (
                  "Upgrade to VIP"
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="text-center mt-8 text-[11px] opacity-50 space-y-1">
          <p>Payments are securely processed via Razorpay. Subscriptions are billed {billingCycle === "YEARLY" ? "annually" : "monthly"}.</p>
          <p>By upgrading, you agree to our Terms of Service and Refund Policy.</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
