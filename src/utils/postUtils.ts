import type { AnyPost, GovernmentPost } from "../components/post/PostCard";

export function decodeHTML(str: string): string {
  if (!str) return "";
  if (typeof document === "undefined") {
    return str
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

export function resolveMediaUrl(path?: string | null, type: "posts" | "social-posts" = "posts"): string {
  if (!path) return "";

  // If it's already a full URL (Cloudinary, S3, etc.)
  if (path.startsWith("http")) return path;

  // If it starts with a slash, it's an absolute path from the root
  if (path.startsWith("/")) return path;

  // Special case: "hasImage: false" in some DTOs
  if (path === "false") return "";

  // Fallback for legacy filenames that are strictly just IDs/filenames
  // We point them to the proper /uploads/ endpoint, but we don't automatically
  // include the prefix if the path already seems resolved.
  return `/uploads/${type === "posts" ? "posts" : "social-posts"}/${path}`;
}

export function formatTimeAgo(dateVal: any): string {
  if (!dateVal) return "just now";
  const date = typeof dateVal === "string" || typeof dateVal === "number"
    ? new Date(dateVal)
    : dateVal;
  if (isNaN(date.getTime())) return "just now";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHrs = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

export function formatTimeLeft(expiresAtVal: any): string | null {
  if (!expiresAtVal) return null;
  const expiresAt = typeof expiresAtVal === "string" || typeof expiresAtVal === "number"
    ? new Date(expiresAtVal)
    : expiresAtVal;
  if (isNaN(expiresAt.getTime())) return null;
  
  const diffMs = expiresAt.getTime() - Date.now();
  if (diffMs <= 0) return "Ended";
  
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHrs = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  
  if (diffDays > 0) {
    return `${diffDays}d left`;
  }
  if (diffHrs > 0) {
    return `${diffHrs}h left`;
  }
  if (diffMins > 0) {
    return `${diffMins}m left`;
  }
  return "less than a minute left";
}

function cleanEmail(val: string): string {
  if (!val) return "";
  if (val.includes("@")) {
    return val.split("@")[0];
  }
  return val;
}

export function toPostCardPost(dto: any): AnyPost {
  if (!dto) return {} as AnyPost;

  // ── Normalize author fields ──────────────────────────────────────────────
  // AuthorDto fields: { username, actualUsername, profileImage, roleName, isActive }
  // PostCard AuthorRow expects top-level: username, userDisplayName, userProfileImage
  const rawAuthorUsername = 
    dto.authorActualUsername ?? 
    dto.author?.actualUsername ?? 
    dto.user?.actualUsername ?? 
    dto.actualUsername ?? 
    dto.authorUsername ?? 
    dto.author?.username ?? 
    dto.user?.username ?? 
    dto.username ?? 
    "";
    
  const authorUsername = cleanEmail(rawAuthorUsername);
    
  const authorImage = resolveMediaUrl(
    dto.userProfileImage ??
    dto.author?.profileImage ??
    dto.author?.profileImageUrl ??
    dto.user?.profileImage ??
    dto.authorProfileImage ??
    null
  );
  const timeAgo = dto.timeAgo ?? formatTimeAgo(dto.createdAt);

  const content = dto.content ? decodeHTML(dto.content) : "";
  const translatedContent = dto.translatedContent ? decodeHTML(dto.translatedContent) : undefined;

  const normalized = {
    ...dto,
    content,
    translatedContent,
    id: dto.id ?? dto.socialPostId ?? (dto.poll ? dto.poll.socialPostId : undefined),
    username: authorUsername,
    userDisplayName: cleanEmail(dto.userDisplayName ?? authorUsername), // AuthorDto has no displayName
    userProfileImage: authorImage,
    timeAgo,
    contentHidden: dto.contentHidden || dto.isFlagged || dto.status === "FLAGGED" || false,
    hiddenReason: dto.hiddenReason || dto.flagReason || "Violates community guidelines",
    isLikedByCurrentUser: dto.isLikedByMe ?? dto.likedByMe ?? dto.isLikedByCurrentUser ?? false,
    isSavedByCurrentUser: dto.isSavedByMe ?? dto.savedByMe ?? dto.isSavedByCurrentUser ?? dto.isSaved ?? false,
  };

  // If it's explicitly a government post or is marked as a government broadcast
  if (
    dto.variant === "government" || 
    dto.isGovernmentBroadcast === true
  ) {
    return {
      ...normalized,
      variant: "government",
      department: dto.department ?? normalized.userDisplayName ?? normalized.username,
      isGovernmentBroadcast: true,
    } as GovernmentPost;
  }

  // If it's an issue post (has target pincode, explicit variant, or unique PostResponse fields)
  if (
    dto.variant === "issue" ||
    dto.isResolved !== undefined ||
    dto.canBeResolved !== undefined ||
    dto.targetPincodes ||
    dto.issueType
  ) {
    return {
      ...normalized,
      variant: "issue",
    } as AnyPost;
  }

  // Handle Polls — poll data lives in dto.poll (PollSummaryDto)
  if (dto.variant === "poll" || dto.isPoll === true) {
    const poll = dto.poll || {};
    const questionText = poll.question ?? dto.question ?? dto.content ?? "";
    return {
      ...normalized,
      variant: "poll",
      id: normalized.id ?? poll.socialPostId ?? poll.pollId ?? dto.pollId ?? dto.id,
      content: normalized.content || decodeHTML(questionText),
      pollId: poll.pollId ?? dto.pollId ?? dto.id,
      question: decodeHTML(questionText),
      options: (poll.options ?? dto.options ?? []).map((o: any) => ({
        id: o.optionId ?? o.id,
        optionText: decodeHTML(o.optionText ?? ""),
        voteCount: o.voteCount ?? 0,
        percentage: o.votePercentage ?? o.percentage ?? 0,
      })),
      totalVotes: poll.totalVotes ?? dto.totalVotes ?? 0,
      allowMultipleVotes: poll.allowMultipleVotes ?? dto.allowMultipleVotes ?? false,
      isExpired: poll.expired ?? poll.isExpired ?? dto.expired ?? dto.isExpired ?? false,
      userHasVoted: poll.userHasVoted ?? dto.userHasVoted ?? false,
      votedOptionIds: poll.userVotedOptionIds ?? poll.votedOptionIds ?? dto.userVotedOptionIds ?? dto.votedOptionIds ?? [],
      showResults: poll.showResults ?? (poll.userHasVoted || poll.expired) ?? dto.showResults ?? false,
      timeLeft: poll.timeLeft ?? dto.timeLeft ?? formatTimeLeft(poll.expiresAt ?? dto.expiresAt),
      expiresAt: poll.expiresAt ?? dto.expiresAt ?? null,
    } as any;
  }

  // Default to social (includes community posts)
  return { ...normalized, variant: dto.variant ?? "social" } as AnyPost;
}