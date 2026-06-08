import { useState, useEffect, useRef, useCallback } from "react";
import {
  LogOut, Camera, Trash2, Check, X, AlertTriangle,
  MapPin, Mail, Loader2, Pencil, Info, User as UserIcon,
  Lock, Globe, Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import axiosInstance from "../api/axiosConfig";
import { useCurrentUser } from "../hooks/useUser";
import { clearAuthTokens } from "../utils/auth";
import ImageEditorModal from "../components/modals/ImageEditorModal";
import { useLanguage, type LangCode, SUPPORTED_LANGUAGES } from "../context/LanguageContext";

// ─── Inline Toast ──────────────────────────────────────────────────────────────
function InlineToast({
  message, type, onClose,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg =
    type === "success" ? "bg-green-600" :
    type === "error"   ? "bg-red-600"   :
    "bg-blue-600";

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${bg} text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2`}>
      {type === "success" && <Check size={14} />}
      {type === "error" && <X size={14} />}
      {type === "info" && <Info size={14} />}
      {message}
    </div>
  );
}

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
  hint?: string;
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

// ═════════════════════════════════════════════════════════════════════════════════
// Settings page
// ═════════════════════════════════════════════════════════════════════════════════
const Settings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Toast ──
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => setToast({ message, type }),
    [],
  );

  // ── Account editing ──
  const [editField, setEditField] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pincode, setPincode] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [autoTranslate, setAutoTranslate] = useState(false);
  const { setLanguage: setGlobalLanguage } = useLanguage();
  const [profanityFilterLevel, setProfanityFilterLevel] = useState("STRICT");
  const [mutedWords, setMutedWords] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Password change ──
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // ── Profile image ──
  const [uploadingImg, setUploadingImg] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);

  // ── Deactivation ──
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deactivating, setDeactivating] = useState(false);

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
    // Sync global language from user profile
    const savedLang = localStorage.getItem("govlyx_ui_language");
    if (!savedLang) {
      setGlobalLanguage((u.preferredLanguage || "en") as LangCode);
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
      showToast("Verification link sent! Please check your email.");
      setShowVerificationModal(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to send verification link", "error");
    } finally {
      setSendingVerification(false);
    }
  };

  // ── Save profile ──
  const saveProfile = async () => {
    // Client-side validation
    if (editField === "email" && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showToast("Enter a valid email address", "error");
    }
    if (editField === "pincode" && pincode && !/^[1-9]\d{5}$/.test(pincode)) {
      return showToast("Enter a valid 6-digit Indian pincode", "error");
    }

    setSaving(true);
    try {
      if (editField === "pincode") {
        await axiosInstance.put("/api/users/update-pincode", { pincode });
      } else {
        await axiosInstance.put("/api/users/profile", {
          email: email || undefined,
          pincode: pincode || undefined,
          preferredLanguage,
          autoTranslate,
          profanityFilterLevel,
          mutedWords,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setEditField(null);
      showToast("Profile updated successfully");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Change Password ──
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      return showToast("New password must be at least 8 characters long", "error");
    }
    setChangingPassword(true);
    try {
      await axiosInstance.put("/api/users/change-password", {
        oldPassword,
        newPassword,
      });
      showToast("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to update password. Verify current password.", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  // ── Image upload & edit triggers ──
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return showToast("Upload a JPEG, PNG, or WebP image", "error");
    }
    if (file.size > 5 * 1024 * 1024) {
      return showToast("Image must be under 5 MB", "error");
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
      showToast("Profile photo updated");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to upload photo", "error");
    } finally {
      setUploadingImg(false);
      setEditorImageSrc(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };



  // ── Deactivate ──
  const deactivateAccount = async () => {
    if (confirmText !== "DELETE") return;
    setDeactivating(true);
    try {
      await axiosInstance.delete("/api/users/me");
      clearAuthTokens();
      showToast("Account deleted", "info");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to delete account", "error");
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
      {/* Toast */}
      {toast && (
        <InlineToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

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
              fetchingPincode ? "🔍 Fetching location details..." :
              pincodeDetails ? `📍 ${pincodeDetails}` :
              "6-digit Indian pincode — used for local content"
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

      {/* ═══════════════ LANGUAGE & LOCALIZATION ═══════════════ */}
      <div className="rounded-xl border border-base-300 bg-base-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-blue-700 dark:text-blue-400" />
          <h2 className="font-semibold">Language & Localization</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Preferred Language</p>
              <p className="text-xs opacity-60">Set your primary language for content and interface</p>
            </div>
            <select
              className="select select-bordered select-sm text-sm"
              value={preferredLanguage}
              onChange={(e) => {
                const lang = e.target.value as LangCode;
                setPreferredLanguage(lang);
                setGlobalLanguage(lang);
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

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-Translate Feed</p>
              <p className="text-xs opacity-60">Automatically translate posts to your preferred language</p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
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
            {saving ? "Saving…" : "Save Localization Settings"}
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
            <div className="space-y-1">
              <label className="text-xs font-medium opacity-70">Current Password</label>
              <input
                type="password"
                className="input input-bordered w-full input-sm bg-base-100 text-sm"
                placeholder="Enter current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium opacity-70">New Password</label>
              <input
                type="password"
                className="input input-bordered w-full input-sm bg-base-100 text-sm"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
          </div>

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
    </div>
  );
};

export default Settings;
