import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import AuthHeader from "../components/auth/AuthHeader";
import AuthInput from "../components/auth/AuthInput";
import { loginUser } from "../api/authService";
import { Info } from "lucide-react";
import { queryClient } from "../api/queryClient";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
  const isExpired = queryParams.get("error") === "expired";
  const [showExpiredMsg, setShowExpiredMsg] = useState(isExpired);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

   const handleLogin = async () => {
    setError(null);
    setShowExpiredMsg(false); // Hide the session expired message on new login attempt

    // Frontend validation


    if (!form.email || !form.password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const response = await loginUser({
        email: form.email,
        password: form.password,
      });

      if (response.success && response.data?.token) {
        // Save JWT token to localStorage
        localStorage.setItem("token", response.data.token);
        // Ensure the query cache starts fresh for the new user session
        queryClient.clear();
        // Admin Redirect
        if (form.email === "admin@govlyx.com") {
          navigate("/admin/dashboard");
        } else {
          navigate("/");
        }
      } else {
        setError(response.message || "Login failed");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeader
        title="Welcome back"
        subtitle="Access your Govlyx portal"
      />

            {/* Session Expired Message */}
      {showExpiredMsg && !error && (
        <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-500 flex items-center gap-3">
          <Info size={16} />
          <span>Session expired. Please log in again to continue.</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <AuthInput
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          name="email"
          value={form.email}
          onChange={handleChange}
        />

        <AuthInput
          label="Password"
          type="password"
          placeholder="••••••••"
          name="password"
          value={form.password}
          onChange={handleChange}
        />

        <button
          className="btn w-full bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90 disabled:opacity-50 disabled:cursor-not-allowed h-12 rounded-xl mt-2 shadow-lg shadow-[#1D4ED8]/20 border-none"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login to Portal"}
        </button>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-sm opacity-70">
        Don't have an account?{" "}
        <NavLink
          to="/register"
          className="text-red-400 font-bold hover:underline"
        >
          Register here
        </NavLink>
      </p>
    </AuthLayout>
  );
};

export default Login;