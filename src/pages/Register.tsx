import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import AuthHeader from "../components/auth/AuthHeader";
import AuthInput from "../components/auth/AuthInput";
import { registerCitizen } from "../api/authService";
import { Mail, Eye, EyeOff, Info, ArrowLeft, Sun, Moon, Check, X } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { parseError } from "../utils/error-handler";

type RegisterType = "citizen" | "department";

const Register = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

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

    const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!.*_\-])(?=\S+$).{8,20}$/;
    if (!passwordRegex.test(form.password)) {
      setError("Password does not meet the strength requirements. Verify the checklist below.");
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
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-xs font-bold text-base-content/60 hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none p-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Landing Page
        </button>
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg bg-base-300/50 hover:bg-base-300 text-base-content/60 transition-colors cursor-pointer border-none"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
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
          <div className="mt-2 rounded-xl bg-red-500/5 border border-red-500/20 px-4 py-3 text-xs flex items-start text-left gap-3 animate-subtle-blink w-full">
            <Info size={16} className="shrink-0 mt-0.5 glow-red-text" />
            <span className="glow-red-text">If you do not see the verification email in your inbox, please check your <strong>Spam</strong> or <strong>Junk</strong> folder.</span>
          </div>
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

            {form.password.length > 0 && (
              <div className="space-y-1.5 p-3 rounded-xl bg-base-300/30 border border-base-300 text-xs mt-1">
                <p className="font-semibold opacity-70">Password Requirements:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                  {[
                    { label: "8-20 characters", met: form.password.length >= 8 && form.password.length <= 20 },
                    { label: "1 uppercase letter (A-Z)", met: /[A-Z]/.test(form.password) },
                    { label: "1 lowercase letter (a-z)", met: /[a-z]/.test(form.password) },
                    { label: "1 number (0-9)", met: /\d/.test(form.password) },
                    { label: "1 special character (@#$%^&+=!.*_-)", met: /[@#$%^&+=!.*_\-]/.test(form.password) },
                    { label: "No spaces", met: !/\s/.test(form.password) && form.password.length > 0 },
                  ].map((check, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 py-0.5">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                        check.met 
                          ? "bg-green-500/10 text-green-500 border-green-500/30" 
                          : "bg-red-500/10 text-red-500 border-red-500/30"
                      }`}>
                        {check.met ? <Check size={10} /> : <X size={10} />}
                      </span>
                      <span className={check.met ? "opacity-90 font-medium" : "opacity-50"}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
