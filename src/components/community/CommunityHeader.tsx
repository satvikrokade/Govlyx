import { Users, Settings, Crown } from "lucide-react";

type CommunityHeaderProps = {
  community: {
    name: string;
    description: string;
    memberCount: number;
    privacy: string;
    avatarUrl?: string | null;
    coverImageUrl?: string | null;
    isMember?: boolean;
    isOwner?: boolean;
    hasPendingRequest?: boolean;
  };
  acting?: boolean;
  onJoinClick?: () => void;
};

const CommunityHeader = ({ 
  community: c, 
  acting, 
  onJoinClick 
}: CommunityHeaderProps) => {
  const finalMember = c.isMember ?? false;
  const finalOwner = c.isOwner ?? false;
  const finalPending = c.hasPendingRequest ?? false;
  const isSecret = c.privacy === "SECRET" && !finalMember;
  
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 overflow-hidden shadow-sm mb-4 mt-2">
      {/* Cover Image */}
      <div className="h-32 w-full bg-base-200 relative">
        {c.coverImageUrl ? (
          <img src={c.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-700/10 to-blue-500/5 border-b border-base-300" />
        )}
      </div>

      <div className="px-5 pb-5 relative">
        {/* Avatar */}
        <div className="absolute -top-10 left-5 w-20 h-20 rounded-2xl border-4 border-base-100 bg-blue-700/10 flex items-center justify-center font-bold text-3xl text-blue-700 shadow-sm overflow-hidden text-center uppercase">
          {c.avatarUrl ? (
            <img src={c.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            (c.name?.[0] || "?").toUpperCase()
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
               className={`btn btn-sm ${finalMember ? "btn-ghost btn-outline" : finalPending ? "btn-warning btn-outline" : isSecret ? "btn-disabled" : "bg-blue-700 text-white border-none hover:bg-blue-800"}`}
               onClick={onJoinClick} disabled={acting || isSecret}>
               {acting ? <span className="loading loading-spinner loading-xs" /> : finalMember ? "✓ Joined" : finalPending ? "⏳ Pending" : isSecret ? "Invite Only" : c.privacy === "PRIVATE" ? "Request to Join" : "Join Community"}
             </button>
          )}
        </div>

        <div className="mt-2 text-left">
          <h1 className="text-2xl font-bold">{c.name || "Community"}</h1>
          <p className="mt-1 text-sm opacity-80 break-words leading-relaxed max-w-2xl line-clamp-2">
            {c.description || "No description provided."}
          </p>

          <div className="mt-4 flex items-center gap-4 text-sm font-medium opacity-60">
            <span className="flex items-center gap-1.5">
              <Users size={16} /> 
              {(c.memberCount || 0).toLocaleString()} members
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityHeader;
