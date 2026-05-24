import { toast } from "react-hot-toast";

/**
 * Standardized hot-toast helper with custom theme styling.
 */
export const showToast = {
  success: (msg: string) => {
    toast.success(msg, {
      style: {
        borderRadius: "12px",
        background: "#1F2937",
        color: "#F3F4F6",
        fontSize: "13px",
        fontWeight: "600",
      },
      duration: 3000,
    });
  },
  error: (msg: string) => {
    toast.error(msg, {
      style: {
        borderRadius: "12px",
        background: "#1F2937",
        color: "#F3F4F6",
        fontSize: "13px",
        fontWeight: "600",
      },
      duration: 4000,
    });
  },
  info: (msg: string) => {
    toast(msg, {
      style: {
        borderRadius: "12px",
        background: "#1F2937",
        color: "#F3F4F6",
        fontSize: "13px",
        fontWeight: "600",
      },
      duration: 3000,
    });
  },
};
