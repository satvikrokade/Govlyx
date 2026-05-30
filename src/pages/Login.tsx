import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import AuthHeader from "../components/auth/AuthHeader";
import AuthInput from "../components/auth/AuthInput";
import { loginUser, resendVerification } from "../api/authService";
import { Info, Eye, EyeOff } from "lucide-react";
import { queryClient } from "../api/queryClient";
import { persistAuthToken } from "../utils/auth";
import { showToast } from "../utils/toast";
import { parseError } from "../utils/error-handler";

const getAuthResponseMessage = (response: { message?: string; error?: string }) =>
  response.error || response.message;

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

  // Resend Verification states
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  const handleResendVerification = async () => {
    if (!form.email) return;
    setResending(true);
    setResendSuccess(null);
    try {
      const response = await resendVerification(form.email);
      setResendSuccess(getAuthResponseMessage(response) || "Verification link resent successfully.");
    } catch (err: any) {
      showToast.error(parseError(err));
    } finally {
      setResending(false);
    }
  };

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

      const token =
        response.data?.token ||
        response.data?.authToken ||
        response.data?.accessToken ||
        response.data?.jwt;

      if (response.success && token) {
        // Save JWT token under the keys used across the app
        persistAuthToken(token);
        // Ensure the query cache starts fresh for the new user session
        queryClient.clear();
        // Role-based redirect will be handled by DashboardRedirect at /dashboard
        navigate("/dashboard");
      } else {
        setError(getAuthResponseMessage(response) || "Login failed");
      }
    } catch (err: any) {
      setError(parseError(err));
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
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 flex flex-col gap-2">
          <span>{error}</span>
          {error.toLowerCase().includes("verify") && (
            <div className="mt-1 pt-2 border-t border-red-500/20 flex flex-col gap-2">
              {resendSuccess ? (
                <span className="text-xs font-bold text-green-400">{resendSuccess}</span>
              ) : (
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="text-xs font-black uppercase text-left tracking-wider text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
                >
                  {resending ? "Sending Link..." : "Didn't receive email? Resend verification link"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
      >
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
          type="submit"
          className="btn w-full bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90 disabled:opacity-50 disabled:cursor-not-allowed h-12 rounded-xl mt-2 shadow-lg shadow-[#1D4ED8]/20 border-none"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login to Portal"}
        </button>
      </form>

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
