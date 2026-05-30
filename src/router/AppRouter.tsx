import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { clearAuthTokens, getAuthToken, isDepartmentUser } from "../utils/auth";
import { ModalProvider } from "../context/ModalContext";

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

// ── Router ────────────────────────────────────────────────────────────────────
const AppRouter = () => {
  const location = useLocation();
  useTokenExpiryWatcher(); 

  return (
    <ModalProvider>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>

        {/* ── Public landing page route ── */}
        <Route
          path="/"
          element={<PageWrapper><LandingPage /></PageWrapper>}
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
  );
};

export default AppRouter;
