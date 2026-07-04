import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import AppRouter from "./router/AppRouter";
import axios from "axios";
import { API_BASE_URL } from "./api/axiosConfig";
import { persistAuthToken, clearAuthTokens } from "./utils/auth";

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isInitializing, setIsInitializing] = useState(() => {
    try {
      return localStorage.getItem("isLoggedIn") === "true";
    } catch {
      return false;
    }
  });

  // Handle Capacitor Android/gesture back button navigation
  useEffect(() => {
    let backButtonListener: any = null;

    const setupListener = async () => {
      backButtonListener = await CapApp.addListener("backButton", () => {
        const currentPath = location.pathname;
        
        // Root-like pages from where clicking "Back" should exit the app
        const rootPaths = ["/", "/dashboard", "/admin/dashboard", "/department/dashboard"];
        
        if (rootPaths.includes(currentPath) || window.history.length <= 1) {
          CapApp.exitApp();
        } else {
          navigate(-1);
        }
      });
    };

    setupListener();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    // Warm up the backend API/cache on initial mount
    fetch("/api/public/health", { method: "HEAD" }).catch(() => {});

    if (isInitializing) {
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
          } else {
            throw new Error("No token returned");
          }
        })
        .catch(() => {
          clearAuthTokens();
        })
        .finally(() => {
          setIsInitializing(false);
        });
    }
  }, [isInitializing]);

  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0B0F19] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-gray-400">Securing session...</p>
        </div>
      </div>
    );
  }

  return <AppRouter />;
};

export default App;
