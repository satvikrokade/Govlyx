import axios from "axios";
import { parseError } from "../utils/error-handler";
import { showToast } from "../utils/toast";
import { clearAuthTokens, getAuthToken, isTokenExpired, persistAuthToken } from "../utils/auth";

const FALLBACK_URL = "";
const rawUrl = import.meta.env.VITE_API_URL || FALLBACK_URL;
export const API_BASE_URL = ((rawUrl.includes("jan-sahayak-ai-3fl3.onrender.com") || rawUrl.includes("jan-sahayak-ai-2.onrender.com") || rawUrl.includes("jan-sahayak-ai-84vh.onrender.com")) && !import.meta.env.DEV)
  ? ""
  : rawUrl.replace(/\/$/, "");

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  withCredentials: true,
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

let isRefreshing = false;
let failedQueue: { resolve: (value: any) => void; reject: (reason?: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    const isAuthRequest = originalRequest?.url?.includes("/api/auth/");
    const message = String(error.response?.data?.message ?? error.response?.data?.error ?? "").toLowerCase();
    const backendSaysTokenInvalid =
      /(token|jwt|session)/.test(message) && /(expired|invalid|malformed|unauthorized)/.test(message);

    if (
      error.response?.status === 401 &&
      !isAuthRequest &&
      !originalRequest?._retry &&
      (isTokenExpired() || backendSaysTokenInvalid)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        axios
          .post(
            `${API_BASE_URL}/api/auth/refresh`,
            {},
            { withCredentials: true }
          )
          .then((res) => {
            const token =
              res.data?.data?.token ||
              res.data?.token ||
              res.data?.data?.authToken ||
              res.data?.authToken ||
              res.data?.data?.accessToken ||
              res.data?.accessToken ||
              res.data?.data?.jwt ||
              res.data?.jwt;

            if (token) {
              persistAuthToken(token);
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              processQueue(null, token);
              resolve(axiosInstance(originalRequest));
            } else {
              throw new Error("No token returned");
            }
          })
          .catch((err) => {
            processQueue(err, null);
            clearAuthTokens();
            window.location.href = "/login?error=expired";
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
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
