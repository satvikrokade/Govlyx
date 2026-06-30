import { useState, useEffect, useRef, useCallback } from "react";
import {
  LogOut, Camera, Trash2, Check, X, AlertTriangle,
  MapPin, Mail, Loader2, Pencil, User as UserIcon,
  Lock, Globe, Shield, Eye, EyeOff, UserX, Crown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import axiosInstance from "../api/axiosConfig";
import { useCurrentUser } from "../hooks/useUser";
import { useMyBilling } from "../hooks/useBilling";
import { clearAuthTokens } from "../utils/auth";
import ImageEditorModal from "../components/modals/ImageEditorModal";
import PricingModal from "../components/billing/PricingModal";
import { useLanguage, type LangCode, SUPPORTED_LANGUAGES } from "../context/LanguageContext";
import { showToast } from "../utils/toast";



// ─── Editable Row ──────────────────────────────────────────────────────────────
function EditableRow({
  icon, label, value, placeholder, editing, onEdit, onCancel,
  inputValue, onInputChange, type = "text", maxLength, hint,
  rightContent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  inputValue: string;
  onInputChange: (v: string) => void;
  type?: string;
  maxLength?: number;
  hint?: React.ReactNode;
  rightContent?: React.ReactNode;
}) {
  if (editing) {
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium opacity-70">{label}</label>
        {type === "textarea" ? (
          <textarea
            className="textarea textarea-bordered w-full text-sm bg-base-100 min-h-[80px]"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
          />
        ) : (
          <input
            className="input input-bordered w-full input-sm bg-base-100 text-sm"
            type={type}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus
          />
        )}
        {hint && <p className="text-xs opacity-50">{hint}</p>}
        {type === "textarea" && maxLength && (
          <p className="text-xs text-right opacity-50">{inputValue.length}/{maxLength}</p>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn btn-xs btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-3 min-w-0">
        <span className="opacity-60 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs opacity-60 truncate">
              {value || <span className="italic">Not set</span>}
            </p>
            {rightContent}
          </div>
        </div>
      </div>
      <button className="btn btn-xs btn-ghost text-blue-700 dark:text-white shrink-0" onClick={onEdit}>
        <Pencil size={12} /> Edit
      </button>
    </div>
  );
}

const getErrorMessage = (err: any, fallback: string): string => {
  if (err.response?.data) {
    const data = err.response.data;
    if (data.error && typeof data.error === "string") {
      return data.error;
    }
    if (data.message && typeof data.message === "string") {
      return data.message;
    }
    if (data.data && typeof data.data === "object") {
      const values = Object.values(data.data);
      if (values.length > 0 && typeof values[0] === "string") {
        return values[0];
      }
    }
  }
  return err.message || fallback;
};

// ═════════════════════════════════════════════════════════════════════════════════
// Settings page
// ═════════════════════════════════════════════════════════════════════════════════
const Settings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: billing } = useMyBilling();
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);



  // ── Account editing ──
  const [editField, setEditField] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pincode, setPincode] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [interfaceLanguage, setInterfaceLanguage] = useState("en");
  const [autoTranslate, setAutoTranslate] = useState(false);
  const { setLanguage: setGlobalLanguage } = useLanguage();
  const [profanityFilterLevel, setProfanityFilterLevel] = useState("STRICT");
  const [mutedWords, setMutedWords] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Password change ──
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // ── Profile image ──
  const [uploadingImg, setUploadingImg] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);

  // ── Deactivation ──
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deactivating, setDeactivating] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // ── Scenario B: Pincode Auto-Lookup & Email Verification ──
  const [pincodeDetails, setPincodeDetails] = useState<string | null>(null);
  const [fetchingPincode, setFetchingPincode] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // ── Sync user data ──
  // ── Sync user data ──
  useEffect(() => {
    if (!user) return;
    const u = user as any;
    setEmail(u.email || "");
    setPincode(u.pincode || "");
    setPreferredLanguage(u.preferredLanguage || "en");
    setAutoTranslate(u.autoTranslate || false);
    setProfanityFilterLevel(u.profanityFilterLevel || "STRICT");
    setMutedWords(u.mutedWords || "");
    
    // Sync global interface language from localStorage, fallback to profile preference
    const savedInterfaceLang = localStorage.getItem("govlyx_ui_language");
    if (savedInterfaceLang) {
      setInterfaceLanguage(savedInterfaceLang);
    } else {
      const fallbackLang = u.interfaceLanguage || u.preferredLanguage || "en";
      setInterfaceLanguage(fallbackLang);
      setGlobalLanguage(fallbackLang as LangCode);
    }
  }, [user]);

  // ── Scenario B Hooks & Methods ──
  useEffect(() => {
    if (editField === "pincode" && /^[1-9]\d{5}$/.test(pincode)) {
      const fetchPincodeDetails = async () => {
        setFetchingPincode(true);
        setPincodeDetails(null);
        try {
          const res = await axiosInstance.get(`/api/pincode/${pincode}`);
          if (res.data?.success && res.data?.data) {
            const data = res.data.data;
            const locationStr = `${data.areaName ? data.areaName + ", " : ""}${data.city || data.district}, ${data.state}`;
            setPincodeDetails(locationStr);
          } else {
            setPincodeDetails("Invalid location");
          }
        } catch (err) {
          setPincodeDetails("Location not found");
        } finally {
          setFetchingPincode(false);
        }
      };
      fetchPincodeDetails();
    } else {
      setPincodeDetails(null);
    }
  }, [pincode, editField]);

  const handleSendVerification = async () => {
    if (!user?.email) return;
    setSendingVerification(true);
    try {
      await axiosInstance.post(`/api/auth/resend-verification?email=${encodeURIComponent(user.email)}`);
      showToast.success("Verification link sent! Please check your email.");
      setShowVerificationModal(true);
    } catch (err: any) {
      showToast.error(getErrorMessage(err, "Failed to send verification link"));
    } finally {
      setSendingVerification(false);
    }
  };

  // ── Save profile ──
  const saveProfile = async () => {
    // Client-side validation
    if (editField === "email" && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showToast.error("Enter a valid email address");
    }
    if (editField === "pincode" && pincode && !/^[1-9]\d{5}$/.test(pincode)) {
      return showToast.error("Enter a valid 6-digit Indian pincode");
    }

    setSaving(true);
    try {
      if (editField === "pincode") {
        await axiosInstance.put("/api/users/update-pincode", { pincode });
      } else {
        if (editField === "localization") {
          localStorage.setItem("govlyx_ui_language", interfaceLanguage);
          setGlobalLanguage(interfaceLanguage as LangCode);
        }
        await axiosInstance.put("/api/users/profile", {
          email: email || undefined,
          pincode: pincode || undefined,
          preferredLanguage,
          interfaceLanguage, // Sync preference to backend database
          autoTranslate,
          profanityFilterLevel,
          mutedWords,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setEditField(null);
      showToast.success("Changes saved successfully");
    } catch (err: any) {
      showToast.error(getErrorMessage(err, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  // ── Change Password ──
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!.*_\-])(?=\S+$).{8,20}$/;
    if (!passwordRegex.test(newPassword)) {
      return setPasswordStatus({ 
        message: "New password does not meet the strength requirements. Verify the requirements below.", 
        type: "error" 
      });
    }
    setChangingPassword(true);
    try {
      await axiosInstance.put("/api/users/change-password", {
        oldPassword,
        newPassword,
      });
      setPasswordStatus({ message: "Password updated successfully!", type: "success" });
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPasswordStatus({ message: getErrorMessage(err, "Failed to update password. Verify current password."), type: "error" });
    } finally {
      setChangingPassword(false);
    }
  };

  // ── Image upload & edit triggers ──
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return showToast.error("Upload a JPEG, PNG, or WebP image");
    }
    if (file.size > 5 * 1024 * 1024) {
      return showToast.error("Image must be under 5 MB");
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditorImageSrc(reader.result as string);
      setEditorOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleEditorSave = async (editedBlob: Blob) => {
    setUploadingImg(true);
    setEditorOpen(false);
    try {
      const fd = new FormData();
      const file = new File([editedBlob], "profile.jpg", { type: "image/jpeg" });
      fd.append("file", file);
      
      await axiosInstance.post("/api/users/profile-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      showToast.success("Profile photo updated");
    } catch (err: any) {
      showToast.error(getErrorMessage(err, "Failed to upload photo"));
    } finally {
      setUploadingImg(false);
      setEditorImageSrc(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };



  const handleConfirmDeleteRedirect = useCallback(() => {
    clearAuthTokens();
    queryClient.clear();
    navigate("/login", { replace: true });
  }, [navigate, queryClient]);

  useEffect(() => {
    if (!showDeletedModal) return;
    if (countdown <= 0) {
      handleConfirmDeleteRedirect();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [showDeletedModal, countdown, handleConfirmDeleteRedirect]);

  // ── Deactivate ──
  const deactivateAccount = async () => {
    if (confirmText !== "DELETE") return;
    setDeactivating(true);
    try {
      await axiosInstance.delete("/api/users/me");
      setShowDeactivate(false);
      setShowDeletedModal(true);
    } catch (err: any) {
      showToast.error(getErrorMessage(err, "Failed to delete account"));
      setDeactivating(false);
    }
  };

  // ── Logout ──
  const handleLogout = () => {
    clearAuthTokens();
    navigate("/login", { replace: true });
  };

  // ── Derived ──
  const username = user?.actualUsername || user?.username || "User";
  const avatarUrl = user?.profileImage
    ? (user.profileImage.startsWith("http") ? user.profileImage : user.profileImage)
    : `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(username)}`;

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm opacity-70">
          Manage your account, privacy, and preferences
        </p>
      </div>

      {/* ═══════════════ ACCOUNT ═══════════════ */}
      <div className="rounded-xl border border-base-300 bg-base-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <UserIcon size={18} className="text-blue-700 dark:text-blue-400" />
          <h2 className="font-semibold">Account</h2>
        </div>

        {/* Profile photo + identity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-base-300 bg-base-300">
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              {uploadingImg && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader2 size={16} className="animate-spin text-white" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{username}</p>
            </div>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImg}
              className="btn btn-xs btn-ghost text-blue-700 dark:text-white"
            >
              <Camera size={12} /> Photo
            </button>
          </div>
        </div>

        <div className="divider my-0 opacity-30" />

        {/* Email */}
        <EditableRow
          icon={<Mail size={15} />}
          label="Email"
          value={user?.email || ""}
          placeholder="your@email.com"
          editing={editField === "email"}
          onEdit={() => setEditField("email")}
          onCancel={() => { setEditField(null); setEmail(user?.email || ""); }}
          inputValue={email}
          onInputChange={setEmail}
          type="email"
          hint="Used for login and account recovery"
          rightContent={
            user?.role === "ROLE_USER" && user?.email ? (
              user.isEmailVerified ? (
                <span className="badge badge-success badge-sm text-[10px] py-2 font-semibold text-white flex items-center gap-0.5 shrink-0">
                  <Check size={10} /> Verified
                </span>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="badge badge-warning badge-sm text-[10px] py-2 font-semibold text-white">
                    Unverified
                  </span>
                  <button
                    onClick={handleSendVerification}
                    disabled={sendingVerification}
                    className="text-[10px] text-blue-700 dark:text-blue-400 hover:underline font-semibold focus:outline-none"
                  >
                    {sendingVerification ? "Sending..." : "Verify"}
                  </button>
                </div>
              )
            ) : null
          }
        />



        {/* Pincode / Location */}
        <div className="space-y-1">
          <EditableRow
            icon={<MapPin size={15} />}
            label="Location (Pincode)"
            value={user?.pincode || ""}
            placeholder="e.g. 411001"
            editing={editField === "pincode"}
            onEdit={() => setEditField("pincode")}
            onCancel={() => { setEditField(null); setPincode(user?.pincode || ""); setPincodeDetails(null); }}
            inputValue={pincode}
            onInputChange={setPincode}
            hint={
              fetchingPincode ? (
                <span className="flex items-center gap-1.5 text-base-content/70">
                  <Loader2 size={13} className="animate-spin text-blue-600 dark:text-blue-400" />
                  <span>Fetching location details...</span>
                </span>
              ) : pincodeDetails ? (
                <span className="flex items-center gap-1.5 text-base-content/90 font-semibold">
                  <MapPin size={13} className="text-red-500 fill-red-500/10 shrink-0" />
                  <span>{pincodeDetails}</span>
                </span>
              ) : (
                "6-digit Indian pincode — used for local content"
              )
            }
          />
          {user?.hasInvalidPincode && editField !== "pincode" && (
            <p className="text-xs text-error font-semibold flex items-center gap-1.5 mt-1 bg-error/10 border border-error/20 p-2.5 rounded-xl">
              ⚠️ Your stored pincode is invalid. Please update it to a valid Indian pincode.
            </p>
          )}
        </div>


        {/* Save button (shown when an account field is being edited) */}
        {(editField === "email" || editField === "pincode") && (
          <button
            id="save-profile-btn"
            className="btn btn-sm w-full bg-[#1D4ED8] text-white hover:bg-blue-800 border-none"
            onClick={saveProfile}
            disabled={saving}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        )}
      </div>

      {/* ═══════════════ SUBSCRIPTION & PASS ═══════════════ */}
      <div className="rounded-xl border border-base-300 bg-base-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Crown size={18} className="text-amber-500" />
          <h2 className="font-semibold">Subscription & Pass</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Current Pass:</span>
              <span className={`badge font-bold uppercase py-2.5 ${
                billing?.currentTier === "GOVLYX_VIP" 
                  ? "bg-amber-500 text-amber-950 border-none" 
                  : billing?.currentTier === "GOVLYX_PRO" 
                    ? "bg-blue-700 text-white border-none" 
                    : "badge-ghost"
              }`}>
                {billing?.currentTier === "GOVLYX_VIP" ? "VIP Pass" : billing?.currentTier === "GOVLYX_PRO" ? "Pro Pass" : "Free Pass"}
              </span>
            </div>
            {billing?.validUntil && (
              <p className="text-xs opacity-65 font-medium">
                Valid until: {new Date(billing.validUntil).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
            {billing?.currentTier === "GOVLYX_VIP" ? (
              <p className="text-xs opacity-60 leading-relaxed max-w-[370px]">
                Priority matchmaking, disappearing messages settings,
                <br />
                toggle pinning in chat, and 5 private community creation quota.
              </p>
            ) : (
              <p className="text-xs opacity-60 leading-relaxed max-w-xl">
                {billing?.currentTier === "GOVLYX_PRO" 
                  ? "Unlimited matchmaking, chat media, matchmaking filters, and 3 private community creation quota." 
                  : "10 matches per day limit with 5 media shares daily within those matches."}
              </p>
            )}
            {billing?.currentTier !== "GOVLYX_FREE" && typeof billing?.privateCommunityQuota === "number" && (
              <div className="pt-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
                Private Community Quota: {billing.privateCommunityQuota} remaining
              </div>
            )}
          </div>
          
          <button
            onClick={() => setIsPricingModalOpen(true)}
            className="btn btn-sm bg-[#1D4ED8] hover:bg-blue-800 text-white border-none shrink-0"
          >
            {billing?.currentTier === "GOVLYX_FREE" ? "Upgrade Plan" : "Change Pass"}
          </button>
        </div>
      </div>

      {/* ═══════════════ LANGUAGE & LOCALIZATION ═══════════════ */}
      <div className="rounded-xl border border-base-300 bg-base-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-blue-700 dark:text-blue-400" />
          <h2 className="font-semibold">Language & Localization</h2>
        </div>

        <div className="space-y-4">
          {/* 1. Interface Language (Stored locally in browser localStorage) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Interface Language</p>
              <p className="text-xs opacity-60">Set the primary language for buttons, menus, and application layout</p>
            </div>
            <select
              className="select select-bordered select-sm text-sm notranslate w-full sm:w-auto shrink-0"
              value={interfaceLanguage}
              onChange={(e) => {
                const lang = e.target.value as LangCode;
                setInterfaceLanguage(lang);
                setEditField("localization");
              }}
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.code === "en" ? "English" : `${l.label} (${l.nativeLabel})`}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-base-300/40 my-2"></div>

          {/* 2. Post Translation Language (Stored on backend) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Post Translation Language</p>
              <p className="text-xs opacity-60">Set the target language for translating feed posts</p>
            </div>
            <select
              className="select select-bordered select-sm text-sm notranslate w-full sm:w-auto shrink-0"
              value={preferredLanguage}
              onChange={(e) => {
                const lang = e.target.value as LangCode;
                setPreferredLanguage(lang);
                setEditField("localization");
              }}
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.code === "en" ? "English" : `${l.label} (${l.nativeLabel})`}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Auto-Translate Feed Toggle (Stored on backend) */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Auto-Translate Feed</p>
              <p className="text-xs opacity-60">Automatically translate posts to your post translation language</p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm shrink-0"
              checked={autoTranslate}
              onChange={(e) => {
                setAutoTranslate(e.target.checked);
                setEditField("localization");
              }}
            />
          </div>
        </div>

        {editField === "localization" && (
          <button
            className="btn btn-sm w-full bg-[#1D4ED8] text-white hover:bg-blue-800 border-none mt-2"
            onClick={saveProfile}
            disabled={saving}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? "Saving…" : "Save Translation Settings"}
          </button>
        )}
      </div>

      {/* ═══════════════ FEED FILTERING & MODERATION ═══════════════ */}
      <div className="rounded-xl border border-base-300 bg-base-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-blue-700 dark:text-blue-400" />
          <h2 className="font-semibold">Feed Filtering & Moderation</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">Profanity Filter Level</p>
              <p className="text-xs opacity-60">Control how sensitive content is displayed in your feed</p>
            </div>
            <select
              className="select select-bordered select-sm w-full text-sm"
              value={profanityFilterLevel}
              onChange={(e) => {
                setProfanityFilterLevel(e.target.value);
                setEditField("moderation");
              }}
            >
              <option value="STRICT">Strict (Hide completely)</option>
              <option value="BLUR">Blur (Click to reveal)</option>
              <option value="OFF">Off (Show all content)</option>
            </select>
          </div>

          <div className="space-y-2 pt-2 border-t border-base-300">
            <div>
              <p className="text-sm font-medium">Muted Words</p>
              <p className="text-xs opacity-60">Hide posts containing specific words (comma-separated)</p>
            </div>
            <textarea
              className="textarea textarea-bordered w-full text-sm min-h-[60px]"
              placeholder="e.g. politics, violence, spam"
              value={mutedWords}
              onChange={(e) => {
                setMutedWords(e.target.value);
                setEditField("moderation");
              }}
            />
          </div>
        </div>

        {editField === "moderation" && (
          <button
            className="btn btn-sm w-full bg-[#1D4ED8] text-white hover:bg-blue-800 border-none mt-2"
            onClick={saveProfile}
            disabled={saving}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? "Saving…" : "Save Moderation Filters"}
          </button>
        )}
      </div>

      {/* ═══════════════ SECURITY & PASSWORD ═══════════════ */}
      <div className="rounded-xl border border-base-300 bg-base-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={18} className="text-blue-700 dark:text-blue-400" />
          <h2 className="font-semibold">Security & Password</h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1 relative">
              <label className="text-xs font-medium opacity-70">Current Password</label>
              <div className="relative">
                <input
                  type={showOldPassword ? "text" : "password"}
                  className="input input-bordered w-full input-sm bg-base-100 text-sm pr-9"
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={(e) => { setOldPassword(e.target.value); setPasswordStatus(null); }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70 transition-colors bg-transparent border-none p-0 flex items-center justify-center cursor-pointer"
                  aria-label={showOldPassword ? "Hide password" : "Show password"}
                >
                  {showOldPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="space-y-1 relative">
              <label className="text-xs font-medium opacity-70">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="input input-bordered w-full input-sm bg-base-100 text-sm pr-9"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordStatus(null); }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70 transition-colors bg-transparent border-none p-0 flex items-center justify-center cursor-pointer"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {newPassword.length > 0 && (
              <div className="col-span-1 md:col-span-2 space-y-1.5 p-3 rounded-xl bg-base-300/30 border border-base-300 text-xs mt-1">
                <p className="font-semibold opacity-70">Password Requirements:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                  {[
                    { label: "8-20 characters", met: newPassword.length >= 8 && newPassword.length <= 20 },
                    { label: "1 uppercase letter (A-Z)", met: /[A-Z]/.test(newPassword) },
                    { label: "1 lowercase letter (a-z)", met: /[a-z]/.test(newPassword) },
                    { label: "1 number (0-9)", met: /\d/.test(newPassword) },
                    { label: "1 special character (@#$%^&+=!.*_-)", met: /[@#$%^&+=!.*_\-]/.test(newPassword) },
                    { label: "No spaces", met: !/\s/.test(newPassword) && newPassword.length > 0 },
                  ].map((check, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 py-0.5">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                        check.met 
                          ? "bg-green-500/10 text-green-500 border-green-500/30" 
                          : "bg-red-500/10 text-red-500 border-red-500/30"
                      }`}>
                        {check.met ? <Check size={10} /> : <X size={10} />}
                      </span>
                      <span className={check.met ? "opacity-90 font-medium" : "opacity-50"}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {passwordStatus && (
            <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              passwordStatus.type === "success" 
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200/50 dark:border-green-800/50" 
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200/50 dark:border-red-800/50"
            }`}>
              {passwordStatus.type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
              <span>{passwordStatus.message}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              id="change-password-btn"
              className="btn btn-sm bg-[#1D4ED8] text-white hover:bg-blue-800 border-none px-4"
              disabled={changingPassword}
            >
              {changingPassword ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {changingPassword ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>



      {/* ═══════════════ DANGER ZONE ═══════════════ */}
      <div className="rounded-xl border border-red-500/30 bg-base-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-500" />
          <h2 className="font-semibold text-red-500">Danger Zone</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Delete Account</p>
            <p className="text-xs opacity-60">
              Permanently delete your account and all your data
            </p>
          </div>
          <button
            id="deactivate-btn"
            className="btn btn-xs btn-outline btn-error"
            onClick={() => setShowDeactivate(true)}
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* ═══════════════ LOGOUT ═══════════════ */}
      <div className="rounded-xl border border-base-300 bg-base-200 p-4">
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {/* ═══════════════ DEACTIVATION MODAL ═══════════════ */}
      {showDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-base-200 border border-base-300 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={20} />
              <h3 className="font-semibold text-base">Delete Account</h3>
            </div>

            <div className="space-y-2 text-sm opacity-80">
              <p>This will:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Permanently delete your account and profile</li>
                <li>Remove all your posts, comments, and data</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>

            <div>
              <label className="text-xs font-medium">
                Type <span className="font-bold text-red-500">DELETE</span> to confirm
              </label>
              <input
                className="input input-bordered input-sm w-full mt-1 bg-base-100"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoFocus
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => { setShowDeactivate(false); setConfirmText(""); }}
                disabled={deactivating}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm btn-error"
                onClick={deactivateAccount}
                disabled={confirmText !== "DELETE" || deactivating}
              >
                {deactivating ? (
                  <><Loader2 size={14} className="animate-spin" /> Deleting…</>
                ) : (
                  <><Trash2 size={14} /> Delete Account</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ PRICING Pass MODAL ═══════════════ */}
      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
      />

      {/* ═══════════════ IMAGE EDITOR MODAL ═══════════════ */}
      {editorImageSrc && (
        <ImageEditorModal
          isOpen={editorOpen}
          onClose={() => {
            setEditorOpen(false);
            setEditorImageSrc(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          imageSrc={editorImageSrc}
          onSave={handleEditorSave}
        />
      )}
      {/* ═══════════════ VERIFICATION EMAIL MODAL ═══════════════ */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-base-200 border border-base-300 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Mail size={20} />
              <h3 className="font-semibold text-base">Verify Your Email</h3>
            </div>
            <div className="text-sm opacity-80 space-y-2">
              <p>We've sent a verification link to your registered email address:</p>
              <p className="font-semibold text-center py-1.5 bg-base-100 rounded-lg text-xs break-all">{user?.email}</p>
              <p className="text-xs text-error">Note: Please check your Spam or Junk folder if you do not receive the email within 2 minutes.</p>
            </div>
            <div className="flex justify-end">
              <button
                className="btn btn-sm btn-primary text-white"
                onClick={() => setShowVerificationModal(false)}
              >
                Okay, I'll Check
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ SUCCESSFUL DELETION MODAL ═══════════════ */}
      {showDeletedModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-base-200 border border-base-300 p-6 text-center space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Premium Animated Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 ring-8 ring-red-50 dark:ring-red-950/20">
              <UserX size={32} className="animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-lg text-base-content">Account Deleted</h3>
              <p className="text-sm opacity-70 leading-relaxed">
                Your account and all associated data have been permanently removed. We're sorry to see you go!
              </p>
            </div>

            {/* Auto-redirect progress indicator */}
            <div className="space-y-1.5">
              <div className="w-full bg-base-300 dark:bg-base-700 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-red-500 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 5) * 100}%` }}
                />
              </div>
              <p className="text-xs opacity-50">
                Redirecting to login in {countdown}s...
              </p>
            </div>

            <button
              className="btn btn-sm btn-error w-full text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
              onClick={handleConfirmDeleteRedirect}
            >
              Okay, Go to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
