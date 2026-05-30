import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import AuthHeader from "../components/auth/AuthHeader";
import AuthInput from "../components/auth/AuthInput";
import { registerCitizen } from "../api/authService";
import { Mail, Eye, EyeOff } from "lucide-react";
import { parseError } from "../utils/error-handler";

type RegisterType = "citizen" | "department";

const Register = () => {
  const navigate = useNavigate();

  const [type] = useState<RegisterType>("citizen");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    pincode: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    if (name === "pincode") {
      // Only allow digits and cap at 6 digits
      value = value.replace(/\D/g, "").slice(0, 6);
    }
    setForm({ ...form, [name]: value });
  };

  const handleRegister = async () => {
    setError(null);
    setSuccess(null);

    // Frontend validation
    if (!form.email || !form.password || !form.confirmPassword || !form.pincode) {
      setError("All fields are required");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const pincodeRegex = /^[1-9][0-9]{5}$/;
    if (!pincodeRegex.test(form.pincode)) {
      setError("Please enter a valid 6-digit Indian pincode (cannot start with 0)");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        pincode: form.pincode,
        username: "anonymous", // Satisfies backend validation requirement; ignored by citizen registration logic
      };

      const response = await registerCitizen(payload);

      if (response.success) {
        setSuccess(
          response.error ||
          response.message ||
            "Welcome to Govlyx!\nA verification link has been sent to your email address.\nPlease check your inbox and click the verification link to activate your account."
        );
      } else {
        setError(response.error || response.message || "Registration failed");
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
        title={type === "citizen" ? "Join Govlyx" : "Onboard Department"}
        subtitle={type === "citizen" ? "Join Govlyx anonymously" : "Register a verified government body"}
      />

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="h-1 w-1 rounded-full bg-red-500" />
          {error}
        </div>
      )}

      {success ? (
        <div className="mt-6 flex flex-col items-center justify-center p-6 bg-base-200/50 rounded-3xl border border-base-300 backdrop-blur-md text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
            <Mail size={36} />
          </div>
          <h3 className="text-lg font-black text-green-400">Check Your Email</h3>
          <p className="text-sm opacity-80 px-2 leading-relaxed whitespace-pre-line">
            {success}
          </p>
          <button
            onClick={() => navigate("/login")}
            className="btn bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white border-none rounded-xl h-11 px-6 font-bold flex items-center gap-2 mt-4 shadow-lg shadow-[#1D4ED8]/20 w-full"
          >
            Go to Login
          </button>
        </div>
      ) : (
        <>
          {/* Form */}
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleRegister();
            }}
          >
            <AuthInput
              label="Email Address"
              type="email"
              placeholder="user@govlyx.com"
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

            <div className="space-y-1">
              <label className="text-sm opacity-80">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="input input-bordered w-full focus:border-blue-700 focus:outline-none pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70 transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <AuthInput
              label="Pincode"
              type="text"
              placeholder="110001"
              helperText="Used to show you local civic issues"
              name="pincode"
              value={form.pincode}
              onChange={handleChange}
            />

            <button
              type="submit"
              className="btn w-full bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90 disabled:opacity-50 disabled:cursor-not-allowed h-12 rounded-xl mt-2 shadow-lg shadow-[#1D4ED8]/20 border-none"
              disabled={loading}
            >
              {loading ? "Registering..." : "Join Govlyx"}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm opacity-70">
            Already have an account?{" "}
            <NavLink
              to="/login"
              className="text-red-400 font-bold hover:underline"
            >
              Login
            </NavLink>
          </p>
        </>
      )}
    </AuthLayout>
  );
};

export default Register;
