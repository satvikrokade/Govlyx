import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import AuthHeader from "../components/auth/AuthHeader";
import AuthInput from "../components/auth/AuthInput";
import { registerCitizen } from "../api/authService";

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

    if (form.pincode.length !== 6) {
      setError("Pincode must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        pincode: form.pincode,
      };

      const response = await registerCitizen(payload);

      if (response.success) {
        setSuccess(response.message || "Welcome to Govlyx! Your account is ready.");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setError(response.message || "Registration failed");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Registration failed. Please try again.";
      setError(msg);
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

      {/* No switcher — citizens only */}

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="h-1 w-1 rounded-full bg-red-500" />
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-2.5 text-sm text-green-400 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="h-1 w-1 rounded-full bg-green-500" />
          {success}
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <AuthInput
          label="Email Address"
          type="email"
          placeholder="user@govlyx.com"
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

        <AuthInput
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={handleChange}
        />

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
          className="btn w-full bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90 disabled:opacity-50 disabled:cursor-not-allowed h-12 rounded-xl mt-2 shadow-lg shadow-[#1D4ED8]/20 border-none"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Registering..." : "Join Govlyx"}
        </button>
      </div>

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
    </AuthLayout>
  );
};

export default Register;
