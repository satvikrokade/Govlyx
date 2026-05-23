import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 5, // Keep unused cache for 5 minutes in memory
      staleTime: 0, // Immediately fetch fresh data from the server on page mount
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});