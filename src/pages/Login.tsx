import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import AuthHeader from "../components/auth/AuthHeader";
import AuthInput from "../components/auth/AuthInput";
import { loginUser } from "../api/authService";
import { Info, Eye, EyeOff } from "lucide-react";
import { queryClient } from "../api/queryClient";
import { persistAuthToken } from "../utils/auth";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
  const isExpired = queryParams.get("error") === "expired";
  const [showExpiredMsg, setShowExpiredMsg] = useState(isExpired);
  const [showPassword, setShowPassword] = useState(false);

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
        // Save JWT token under the keys used across the app
        persistAuthToken(response.data.token);
        // Ensure the query cache starts fresh for the new user session
        queryClient.clear();
        // Admin Redirect
        if (form.email === "madhavrakhonde7@gmail.com" || form.email === "samarthbhagwanpawar098@gmail.com") {
          navigate("/admin/dashboard");
        } else {
          navigate("/dashboard");
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

        <div className="space-y-1">
          <label className="text-sm opacity-80">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="input input-bordered w-full focus:border-blue-700 focus:outline-none pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

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
