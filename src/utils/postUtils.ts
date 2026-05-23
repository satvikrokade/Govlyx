import type { AnyPost, GovernmentPost } from "../components/post/PostCard";

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

export function toPostCardPost(dto: any): AnyPost {
  if (!dto) return {} as AnyPost;

  // ── Normalize author fields ──────────────────────────────────────────────
  // AuthorDto fields: { username, actualUsername, profileImage, roleName, isActive }
  // PostCard AuthorRow expects top-level: username, userDisplayName, userProfileImage
  const authorUsername = 
    dto.authorActualUsername ?? 
    dto.author?.actualUsername ?? 
    dto.user?.actualUsername ?? 
    dto.actualUsername ?? 
    dto.authorUsername ?? 
    dto.author?.username ?? 
    dto.user?.username ?? 
    dto.username ?? 
    "";
    
  const authorImage = resolveMediaUrl(
    dto.userProfileImage ??
    dto.author?.profileImage ??
    dto.author?.profileImageUrl ??
    dto.user?.profileImage ??
    dto.authorProfileImage ??
    null
  );
  const timeAgo = dto.timeAgo ?? formatTimeAgo(dto.createdAt);

  const normalized = {
    ...dto,
    username: authorUsername,
    userDisplayName: dto.userDisplayName ?? authorUsername, // AuthorDto has no displayName
    userProfileImage: authorImage,
    timeAgo,
  };

  // If it's explicitly a government post or has a broadcast scope
  if (dto.variant === "government" || dto.isGovernmentBroadcast === true) {
    return {
      ...normalized,
      variant: "government",
      department: dto.department ?? normalized.userDisplayName ?? normalized.username,
      isGovernmentBroadcast: true,
    } as GovernmentPost;
  }

  // If it's an issue post (has target pincode or explicit variant)
  if (dto.variant === "issue" || dto.targetPincodes || dto.issueType) {
    return {
      ...normalized,
      variant: "issue",
    } as AnyPost;
  }

  // Handle Polls — poll data lives in dto.poll (PollSummaryDto)
  if (dto.variant === "poll" || dto.isPoll === true) {
    const poll = dto.poll || {};
    return {
      ...normalized,
      variant: "poll",
      pollId: poll.pollId ?? dto.pollId ?? dto.id,
      question: poll.question ?? dto.question ?? dto.content ?? "",
      options: (poll.options ?? dto.options ?? []).map((o: any) => ({
        id: o.optionId ?? o.id,
        optionText: o.optionText ?? "",
        voteCount: o.voteCount ?? 0,
        percentage: o.votePercentage ?? o.percentage ?? 0,
      })),
      totalVotes: poll.totalVotes ?? dto.totalVotes ?? 0,
      allowMultipleVotes: poll.allowMultipleVotes ?? dto.allowMultipleVotes ?? false,
      isExpired: poll.expired ?? poll.isExpired ?? dto.isExpired ?? false,
      userHasVoted: poll.userHasVoted ?? dto.userHasVoted ?? false,
      votedOptionIds: poll.userVotedOptionIds ?? poll.votedOptionIds ?? dto.votedOptionIds ?? [],
      showResults: poll.showResults ?? (poll.userHasVoted || poll.expired) ?? dto.showResults ?? false,
      timeLeft: poll.timeLeft ?? dto.timeLeft ?? null,
      expiresAt: poll.expiresAt ?? dto.expiresAt ?? null,
    } as any;
  }

  // Default to social (includes community posts)
  return { ...normalized, variant: dto.variant ?? "social" } as AnyPost;
}