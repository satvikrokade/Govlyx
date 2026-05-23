import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerCitizen } from "../api/authService";

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  pincode: string;
}

export const useRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRegister = async (formData: RegisterFormData) => {
    setError(null);
    setSuccess(null);

    // Frontend validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.pincode.length !== 6) {
      setError("Pincode must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      const response = await registerCitizen({
        email: formData.email,
        password: formData.password,
        pincode: formData.pincode,
      });

      if (response.success) {
        setSuccess(response.message); // "Citizen registered successfully"
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return { handleRegister, loading, error, success };
};