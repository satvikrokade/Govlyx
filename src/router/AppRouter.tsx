import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { isDepartmentUser } from "../utils/auth";
import { ModalProvider } from "../context/ModalContext";

import MainLayout from "../components/layout/MainLayout";

// Pages
import Home from "../pages/Home";
import Communities from "../pages/Communities";
import DepartmentFeed from "../pages/DepartmentFeed";
import DepartmentDashboard from "../pages/DepartmentDashboard";
import AdminDashboard from "../pages/AdminDashboard";
import QuickChatPage from "../pages/QuickChatPage";
import { isSuperAdmin } from "../utils/auth";
import Profile from "../pages/Profile";
import Settings from "../pages/Settings";
import NotificationsPage from "../pages/NotificationsPage";
import PostDetail from "../pages/PostDetail";
import Login from "../pages/Login";
import Register from "../pages/Register";
import { AcceptInvitePage } from "../pages/Communities";

// ── Page transition wrapper ───────────────────────────────────────────────────
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.18, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

// ── Token validation ──────────────────────────────────────────────────────────
const isLoggedIn = (): boolean => {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    const isExpired = decoded.exp * 1000 < Date.now();
    if (isExpired) {
      localStorage.removeItem("token");
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem("token");
    return false;
  }
};

// ── Token expiry watcher ──────────────────────────────────────────────────────
const useTokenExpiryWatcher = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Disable expiry checking if already on public auth routes
    if (location.pathname === "/login" || location.pathname === "/register") {
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
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode<{ exp: number }>(token);
        const msUntilExpiry = decoded.exp * 1000 - Date.now();
        if (msUntilExpiry > 0) {
          const timeout = setTimeout(() => {
            localStorage.removeItem("token");
            navigate("/login?error=expired", { replace: true });
          }, msUntilExpiry);

          return () => {
            clearInterval(interval);
            clearTimeout(timeout);
          };
        }
      } catch {
        localStorage.removeItem("token");
        navigate("/login?error=expired", { replace: true });
      }
       }

    return () => clearInterval(interval);
  }, [navigate, location.pathname]);
};

// ── Router ────────────────────────────────────────────────────────────────────
const AppRouter = () => {
  const location = useLocation();
  useTokenExpiryWatcher(); 

  return (
    <ModalProvider>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>

        {/* ── Public auth routes ── */}
        <Route
          path="/login"
          element={
            isLoggedIn()
              ? <Navigate to="/" replace />
              : <PageWrapper><Login /></PageWrapper>
          }
        />
        <Route
          path="/register"
          element={
            isLoggedIn()
              ? <Navigate to="/" replace />
              : <PageWrapper><Register /></PageWrapper>
          }
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
          <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
          <Route path="/communities/:id?" element={<PageWrapper><Communities /></PageWrapper>} />
          <Route path="/department-feed" element={<PageWrapper><DepartmentFeed /></PageWrapper>} />
          <Route path="/department/dashboard"
            element={
              !isDepartmentUser()
                ? <Navigate to="/" replace />
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
              !isSuperAdmin() 
                ? <Navigate to="/" replace /> 
                : <PageWrapper><AdminDashboard /></PageWrapper>
            } 
          />
        </Route>

        {/* ── Fallback ── */}
        <Route
          path="*"
          element={<Navigate to={isLoggedIn() ? "/" : "/login"} replace />}
        />

      </Routes>
    </AnimatePresence>
    </ModalProvider>
  );
};

export default AppRouter;