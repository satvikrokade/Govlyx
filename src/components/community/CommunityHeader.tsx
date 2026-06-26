import { useState, useRef } from "react";
import { Users, Settings, Crown, Camera, Check, Clock, Trophy, Activity } from "lucide-react";
import { communityService } from "../../api/communityService";
import { showToast } from "../../utils/toast";
import ImageEditorModal from "../modals/ImageEditorModal";

type CommunityHeaderProps = {
  community: {
    id?: number;
    name: string;
    description: string;
    memberCount: number;
    privacy: string;
    avatarUrl?: string | null;
    coverImageUrl?: string | null;
    isMember?: boolean;
    isOwner?: boolean;
    hasPendingRequest?: boolean;
    rankLabel?: string;
    cityRank?: number;
    percentile?: number;
    momentumScore?: number;
    healthScore?: number;
    postCount?: number;
  };
  acting?: boolean;
  onJoinClick?: () => void;
  onImageUploaded?: (type: "avatar" | "cover", url: string) => void;
};

const CommunityHeader = ({ 
  community: c, 
  acting, 
  onJoinClick,
  onImageUploaded
}: CommunityHeaderProps) => {
  const finalMember = c.isMember ?? false;
  const finalOwner = c.isOwner ?? false;
  const finalPending = c.hasPendingRequest ?? false;
  const isSecret = c.privacy === "SECRET" && !finalMember;
  const momentumScore = c.momentumScore ?? c.healthScore ?? Math.min(100, Math.round((c.memberCount * 0.04) + ((c.postCount ?? 0) * 1.8)));
  const rankLabel = c.rankLabel || (c.cityRank && c.cityRank <= 3 ? `#${c.cityRank} Most Active Ward` : c.percentile && c.percentile <= 5 ? `Top ${c.percentile}% in Pune` : momentumScore >= 70 ? "Top 5% Growing" : "Rising Mohalla");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") => {
    const file = e.target.files?.[0];
    if (!file || !c.id) return;

    // Validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast.error("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showToast.error("File size exceeds 5MB limit.");
      return;
    }

    if (type === "avatar") {
      const reader = new FileReader();
      reader.onload = () => {
        setEditorImageSrc(reader.result as string);
        setEditorOpen(true);
      };
      reader.readAsDataURL(file);
    } else {
      setUploadingCover(true);
      try {
        const data = await communityService.uploadCommunityImage(c.id, file, "cover");
        const updatedUrl = data?.coverImageUrl || data?.data?.coverImageUrl || data?.data?.data?.coverImageUrl;
        if (updatedUrl) {
          onImageUploaded?.("cover", updatedUrl);
          showToast.success("Cover image updated!");
        } else {
          showToast.error("Upload succeeded but no image URL was returned.");
        }
      } catch (err: any) {
        console.error(err);
        showToast.error(err.response?.data?.message || err.message || "Upload failed.");
      } finally {
        setUploadingCover(false);
        if (coverInputRef.current) coverInputRef.current.value = "";
      }
    }
  };

  const handleEditorSave = async (editedBlob: Blob) => {
    if (!c.id) return;
    setUploadingAvatar(true);
    setEditorOpen(false);
    try {
      const file = new File([editedBlob], "community_avatar.jpg", { type: "image/jpeg" });
      const data = await communityService.uploadCommunityImage(c.id, file, "avatar");
      const updatedUrl = data?.avatarUrl || data?.data?.avatarUrl || data?.data?.data?.avatarUrl;
      if (updatedUrl) {
        onImageUploaded?.("avatar", updatedUrl);
        showToast.success("Avatar image updated!");
      } else {
        showToast.error("Upload succeeded but no image URL was returned.");
      }
    } catch (err: any) {
      console.error(err);
      showToast.error(err.response?.data?.message || err.message || "Upload failed.");
    } finally {
      setUploadingAvatar(false);
      setEditorImageSrc(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };
  
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 overflow-hidden shadow-sm mb-4 mt-2">
      {/* Cover Image */}
      <div className="h-32 w-full bg-base-200 relative">
        {c.coverImageUrl ? (
          <img src={c.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-700/10 to-blue-500/5 border-b border-base-300" />
        )}

        {finalOwner && c.id && (
          <>
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-xl px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 z-10 border border-white/10 shadow"
            >
              {uploadingCover ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Camera size={14} />
              )}
              <span>Edit Cover</span>
            </button>
            <input
              type="file"
              ref={coverInputRef}
              onChange={(e) => handleUpload(e, "cover")}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </>
        )}
      </div>

      <div className="px-5 pb-5 relative">
        {/* Avatar */}
        <div className="absolute -top-10 left-5 w-20 h-20 rounded-2xl border-4 border-base-100 bg-blue-700/10 flex items-center justify-center font-bold text-3xl text-blue-700 shadow-sm overflow-hidden text-center uppercase group">
          {c.avatarUrl ? (
            <img src={c.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            (c.name?.[0] || "?").toUpperCase()
          )}
          
          {finalOwner && c.id && (
            <>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-bold uppercase tracking-wider"
              >
                {uploadingAvatar ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <>
                    <Camera size={16} className="mb-0.5" />
                    <span>Change</span>
                  </>
                )}
              </button>
              <input
                type="file"
                ref={avatarInputRef}
                onChange={(e) => handleUpload(e, "avatar")}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
            </>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-3 h-10">
          {finalOwner ? (
             <div className="flex items-center gap-2">
               <span className="badge badge-warning gap-1.5 font-bold py-3"><Settings size={14} className="hidden sm:block" /><Crown size={14} /> Owner</span>
             </div>
          ) : (
              <button
                className={`btn btn-sm flex items-center gap-1.5 ${finalMember ? "btn-ghost btn-outline" : finalPending ? "btn-warning btn-outline" : isSecret ? "btn-disabled" : "bg-blue-700 text-white border-none hover:bg-blue-800"}`}
                onClick={onJoinClick} disabled={acting || isSecret}>
                {acting ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : finalMember ? (
                  <>
                    <Check size={14} />
                    <span>Joined</span>
                  </>
                ) : finalPending ? (
                  <>
                    <Clock size={14} />
                    <span>Pending</span>
                  </>
                ) : isSecret ? (
                  "Invite Only"
                ) : c.privacy === "PRIVATE" ? (
                  "Request to Join"
                ) : (
                  "Join Community"
                )}
              </button>
          )}
        </div>

        <div className="mt-2 text-left">
          <h1 className="text-2xl font-bold notranslate">{c.name || "Community"}</h1>
          <p className="mt-1 text-sm opacity-80 break-words leading-relaxed max-w-2xl line-clamp-2">
            {c.description || "No description provided."}
          </p>

          <div className="mt-4 flex items-center gap-4 text-sm font-medium opacity-60">
            <span className="flex items-center gap-1.5">
              <Users size={16} /> 
              {(c.memberCount || 0).toLocaleString()} members
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-black text-amber-700">
              <Trophy size={12} /> {rankLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <Activity size={12} /> {momentumScore} momentum
            </span>
          </div>
        </div>
      </div>
      {editorImageSrc && (
        <ImageEditorModal
          isOpen={editorOpen}
          onClose={() => {
            setEditorOpen(false);
            setEditorImageSrc(null);
            if (avatarInputRef.current) avatarInputRef.current.value = "";
          }}
          imageSrc={editorImageSrc}
          onSave={handleEditorSave}
        />
      )}
    </div>
  );
};

export default CommunityHeader;
