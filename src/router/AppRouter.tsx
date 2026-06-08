import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { clearAuthTokens, getAuthToken, isDepartmentUser } from "../utils/auth";
import { ModalProvider } from "../context/ModalContext";
import { LanguageProvider } from "../context/LanguageContext";

import MainLayout from "../components/layout/MainLayout";

// Pages
import Home from "../pages/Home";
import Communities from "../pages/Communities";
import DepartmentFeed from "../pages/DepartmentFeed";
import DepartmentDashboard from "../pages/DepartmentDashboard";
import AdminDashboard from "../pages/AdminDashboard";
import QuickChatPage from "../pages/QuickChatPage";
import { isAdminUser } from "../utils/auth";
import Profile from "../pages/Profile";
import Settings from "../pages/Settings";
import NotificationsPage from "../pages/NotificationsPage";
import PostDetail from "../pages/PostDetail";
import Login from "../pages/Login";
import Register from "../pages/Register";
import LandingPage from "../pages/LandingPage";
import { AcceptInvitePage } from "../pages/Communities";
import VerifyEmail from "../pages/VerifyEmail";
import UpcomingUpdates from "../pages/UpcomingUpdates";

// ── Page transition wrapper ───────────────────────────────────────────────────
const PageWrapper = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.18, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);

// ── Token validation ──────────────────────────────────────────────────────────
const isLoggedIn = (): boolean => {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    const isExpired = decoded.exp * 1000 < Date.now();
    if (isExpired) {
      clearAuthTokens();
      return false;
    }
    return true;
  } catch {
    clearAuthTokens();
    return false;
  }
};

// ── Token expiry watcher ──────────────────────────────────────────────────────
const useTokenExpiryWatcher = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Disable expiry checking if already on public routes
    if (
      location.pathname === "/" ||
      location.pathname === "/login" ||
      location.pathname === "/register" ||
      location.pathname === "/verify-email" ||
      location.pathname.startsWith("/invite/")
    ) {
      return;
    }

    const check = () => {
      if (!isLoggedIn()) {
        navigate("/login?error=expired", { replace: true });
      }
    };

    // Check every 60 seconds
    const interval = setInterval(check, 60 * 1000);

    // Also schedule a precise redirect exactly when the token expires
    const token = getAuthToken();
    if (token) {
      try {
        const decoded = jwtDecode<{ exp: number }>(token);
        const msUntilExpiry = decoded.exp * 1000 - Date.now();
        if (msUntilExpiry > 0) {
          const timeout = setTimeout(() => {
            clearAuthTokens();
            navigate("/login?error=expired", { replace: true });
          }, msUntilExpiry);

          return () => {
            clearInterval(interval);
            clearTimeout(timeout);
          };
        }
      } catch {
        clearAuthTokens();
        navigate("/login?error=expired", { replace: true });
      }
       }

    return () => clearInterval(interval);
  }, [navigate, location.pathname]);
};

// ── Dashboard Redirect Helper ──────────────────────────────────────────────────
const DashboardRedirect = () => {
  if (isAdminUser()) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (isDepartmentUser()) {
    return <Navigate to="/department/dashboard" replace />;
  }
  return <Home />;
};

// Custom mouse cursor follow effect
const CustomCursor = () => {
  const location = useLocation();
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const isCursorPage = location.pathname === "/" || location.pathname === "/upcoming-updates";

  useEffect(() => {
    if (isCursorPage) {
      document.body.classList.add("custom-cursor-active");
    } else {
      document.body.classList.remove("custom-cursor-active");
    }
    return () => {
      document.body.classList.remove("custom-cursor-active");
    };
  }, [isCursorPage]);

  useEffect(() => {
    if (!isCursorPage) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.closest("button") ||
        target.closest("a") ||
        window.getComputedStyle(target).cursor === "pointer"
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isVisible, isCursorPage]);

  if (!isCursorPage || !isVisible) return null;

  return (
    <div
      className="fixed pointer-events-none z-[9999] w-2 h-2 -ml-1 -mt-1 rounded-full bg-[#2563eb] shadow-[0_0_10px_4px_rgba(37,99,235,0.4),_0_0_4px_1px_rgba(37,99,235,0.65)] transition-transform duration-150 ease-out"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `scale(${isHovered ? 1.6 : 1})`,
      }}
    />
  );
};

// ── Router ────────────────────────────────────────────────────────────────────
const AppRouter = () => {
  const location = useLocation();
  useTokenExpiryWatcher(); 

  const getTransitionKey = (path: string) => {
    if (path.startsWith("/communities")) {
      return "/communities";
    }
    return path;
  };

  return (
    <LanguageProvider>
    <ModalProvider>
      <CustomCursor />
      <AnimatePresence mode="wait">
        <Routes location={location} key={getTransitionKey(location.pathname)}>

        {/* ── Public landing page route ── */}
        <Route
          path="/"
          element={<PageWrapper><LandingPage /></PageWrapper>}
        />
        <Route
          path="/upcoming-updates"
          element={<PageWrapper><UpcomingUpdates /></PageWrapper>}
        />
        <Route
          path="/docs"
          element={<Navigate to="/upcoming-updates" replace />}
        />

        {/* ── Public auth routes ── */}
        <Route
          path="/login"
          element={
            isLoggedIn()
              ? <Navigate to="/dashboard" replace />
              : <PageWrapper className="w-full h-full"><Login /></PageWrapper>
          }
        />
        <Route
          path="/register"
          element={
            isLoggedIn()
              ? <Navigate to="/dashboard" replace />
              : <PageWrapper className="w-full h-full"><Register /></PageWrapper>
          }
        />
        <Route
          path="/verify-email"
          element={<PageWrapper className="w-full h-full"><VerifyEmail /></PageWrapper>}
        />

        {/* ── Invite accept route ── */}
        <Route
          path="/invite/:token"
          element={
            <PageWrapper>
              <AcceptInvitePage />
            </PageWrapper>
          }
        />

        {/* ── Protected routes ── */}
        <Route
          element={isLoggedIn() ? <MainLayout /> : <Navigate to="/login" replace />}
        >
          <Route path="/dashboard" element={<PageWrapper><DashboardRedirect /></PageWrapper>} />
          <Route path="/communities/:id?" element={<PageWrapper><Communities /></PageWrapper>} />
          <Route path="/department-feed" element={<PageWrapper><DepartmentFeed /></PageWrapper>} />
          <Route path="/department/dashboard"
            element={
              !isDepartmentUser()
                ? <Navigate to="/dashboard" replace />
                : <PageWrapper><DepartmentDashboard /></PageWrapper>
            }
          />
          <Route path="/quick-chat" element={<PageWrapper><QuickChatPage /></PageWrapper>} />
          <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
          <Route path="/notifications" element={<PageWrapper><NotificationsPage /></PageWrapper>} />
          <Route path="/post/:id" element={<PageWrapper><PostDetail /></PageWrapper>} />
          <Route path="/settings" element={<PageWrapper><Settings /></PageWrapper>} />
          <Route path="/admin/dashboard" 
            element={
              !isAdminUser() 
                ? <Navigate to="/dashboard" replace /> 
                : <PageWrapper><AdminDashboard /></PageWrapper>
            } 
          />

        </Route>

        {/* ── Fallback ── */}
        <Route
          path="*"
          element={<Navigate to={isLoggedIn() ? "/dashboard" : "/"} replace />}
        />

      </Routes>
    </AnimatePresence>
    </ModalProvider>
    </LanguageProvider>
  );
};

export default AppRouter;
