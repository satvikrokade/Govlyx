import axios from "axios";
import { parseError } from "../utils/error-handler";
import { showToast } from "../utils/toast";
import { clearAuthTokens, getAuthToken, isTokenExpired } from "../utils/auth";

const FALLBACK_URL = "";
const rawUrl = import.meta.env.VITE_API_URL || FALLBACK_URL;
export const API_BASE_URL = (rawUrl.includes("jan-sahayak-ai-84vh.onrender.com") && !import.meta.env.DEV)
  ? ""
  : rawUrl.replace(/\/$/, "");
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT to every request
axiosInstance.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't treat a 401 on login/register endpoints or a single forbidden API
    // call as a session timeout. Only force logout when the JWT is actually
    // expired/invalid according to the token or backend auth message.
    const isAuthRequest = error.config?.url?.includes("/api/auth/");
    const message = String(error.response?.data?.message ?? error.response?.data?.error ?? "").toLowerCase();
    const backendSaysTokenInvalid =
      /(token|jwt|session)/.test(message) && /(expired|invalid|malformed|unauthorized)/.test(message);

    if (error.response?.status === 401 && !isAuthRequest && (isTokenExpired() || backendSaysTokenInvalid)) {
      clearAuthTokens();
      window.location.href = "/login?error=expired";
    }

    // Call parseError to log the requestId and parse details
    const parsed = parseError(error);

    // Support optional auto-toasting if requested
    if (error.config?.autoToast || error.config?.headers?.["X-Auto-Toast"] === "true") {
      showToast.error(parsed);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
