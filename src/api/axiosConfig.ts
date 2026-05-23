import axios from "axios";

const FALLBACK_URL = import.meta.env.DEV ? "" : "https://jan-sahayak-ai-84vh.onrender.com";
export const API_BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
  : FALLBACK_URL;
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT to every request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken") || 
                localStorage.getItem("token") || 
                localStorage.getItem("jwt") || 
                localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't treat a 401 on login/register endpoints as a session timeout
    const isAuthRequest = error.config?.url?.includes("/api/auth/");
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem("token");
      window.location.href = "/login?error=expired";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;