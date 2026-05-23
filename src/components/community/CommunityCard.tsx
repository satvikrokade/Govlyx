import { useNavigate } from "react-router-dom";
import { Users, Lock, EyeOff, ArrowRight } from "lucide-react";

export type CommunityCardProps = {
  id: number;
  slug?: string;
  name: string;
  description: string;
  members: number;
  avatarUrl?: string | null;
  privacy?: string;
  isMember?: boolean;
  isOwner?: boolean;
  hasPendingRequest?: boolean;
  onClick?: () => void;
};

const CommunityCard = ({ id, slug, name, description, members, avatarUrl, privacy, isMember, isOwner, hasPendingRequest, onClick }: CommunityCardProps) => {
  const navigate = useNavigate();

  const handlePress = () => {
    if (onClick) onClick();
    else navigate(`/communities/${slug || id}`);
  };

  const imgSrc = avatarUrl || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(name)}`;

  return (
    <div
      className="group relative rounded-2xl border border-base-300 bg-base-100 overflow-hidden cursor-pointer transition-all duration-200 min-w-0"
      style={{ transform: "translateZ(0)" }}
      onClick={handlePress}
    >
      <div className="p-4 flex gap-3.5 items-start relative">
        {/* Avatar */}
        <div className="shrink-0 relative">
          <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-base-300 transition-all duration-200 shadow-sm">
            <img
              src={imgSrc}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-300"
              onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(name)}`; }}
            />
          </div>
          {/* Public indicator dot */}
          {privacy === "PUBLIC" && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-base-100 block" title="Public" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <h3 className="font-bold text-sm leading-tight truncate">
              {name}
            </h3>
            {privacy && privacy !== "PUBLIC" && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-base-200 text-base-content/60 border border-base-300">
                {privacy === "SECRET"
                  ? <><EyeOff size={9} /> Secret</>
                  : <><Lock size={9} /> Private</>
                }
              </span>
            )}
            {isOwner ? (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/20">
                Owner
              </span>
            ) : isMember ? (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-success/15 text-success border border-success/20">
                Joined
              </span>
            ) : hasPendingRequest ? (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/20">
                Requested
              </span>
            ) : null}
          </div>

          {description ? (
            <p className="text-xs text-base-content/60 line-clamp-2 leading-relaxed">{description}</p>
          ) : (
            <p className="text-xs text-base-content/35 italic">No description provided.</p>
          )}

          <div className="flex items-center justify-between mt-2.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-base-content/50">
              <Users size={12} className="text-[#1D4ED8]/70" />
              {members.toLocaleString()} members
            </span>
          </div>
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div className="border-t border-base-200 px-4 py-2.5 flex items-center justify-center gap-2 transition-colors duration-200">
        <span className="text-xs font-semibold text-base-content/60 flex items-center gap-1.5">
          View Community <ArrowRight size={12} className="transition-transform duration-200" />
        </span>
      </div>
    </div>
  );
};

export default CommunityCard;
