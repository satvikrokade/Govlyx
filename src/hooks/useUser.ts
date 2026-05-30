import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../api/axiosConfig";

export type UserRole = "ROLE_USER" | "ROLE_DEPARTMENT" | "ROLE_ADMIN";

export interface UserProfile {
  id: number;
  username: string;
  actualUsername: string;
  email: string;
  profileImage: string | null;
  role: UserRole;
  createdAt: string;
  pincode?: string;
  address?: string;
  preferredLanguage?: string;
  autoTranslate?: boolean;
  profanityFilterLevel?: "STRICT" | "BLUR" | "OFF";
  mutedWords?: string;
  hasInvalidPincode?: boolean;
}

/**
 * Hook to fetch and cache the currently authenticated user's profile.
 * Standardizes access to 'actualUsername' and 'profileImage'.
 */
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await axiosInstance.get<{ data: UserProfile }>("/api/users/me");
      return response.data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
};
