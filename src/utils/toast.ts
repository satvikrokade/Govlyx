import { toast } from "react-hot-toast";

/**
 * Helper to dynamically style hot-toast:
 * - When in dark mode: use light theme colors (inverse UI).
 * - When in light mode: use dark theme colors (inverse UI).
 */
const getToastStyle = (isDarkMode: boolean) => {
  return {
    borderRadius: "16px",
    background: isDarkMode ? "#FFFFFF" : "#1D232A",
    color: isDarkMode ? "#1F2937" : "#F8FAFC",
    fontSize: "14px",
    fontWeight: "600",
    padding: "12px 20px",
    border: isDarkMode ? "1px solid #E5E7EB" : "1px solid #2A303C",
    boxShadow: isDarkMode 
      ? "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.08)" 
      : "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.2)",
  };
};

export const showToast = {
  success: (msg: string) => {
    const isDarkMode = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    toast.success(msg, {
      style: getToastStyle(isDarkMode),
      iconTheme: {
        primary: "#10B981",
        secondary: isDarkMode ? "#FFFFFF" : "#1D232A",
      },
      duration: 3000,
    });
  },
  error: (msg: string) => {
    const isDarkMode = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    toast.error(msg, {
      style: getToastStyle(isDarkMode),
      iconTheme: {
        primary: "#EF4444",
        secondary: isDarkMode ? "#FFFFFF" : "#1D232A",
      },
      duration: 4000,
    });
  },
  info: (msg: string) => {
    const isDarkMode = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    toast(msg, {
      style: getToastStyle(isDarkMode),
      duration: 3000,
    });
  },
};

