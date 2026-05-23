import axiosInstance from "./axiosConfig";
import type { RegisterRequest, AuthRequest, ApiResponse, AuthResponse } from "../types/auth.types";

// POST /api/auth/register/citizen
export const registerCitizen = async (
  data: RegisterRequest
): Promise<ApiResponse<string>> => {
  const response = await axiosInstance.post<ApiResponse<string>>(
    "/api/auth/register/citizen",
    data
  );
  return response.data;
};

// POST /api/auth/register/department
export const registerDepartment = async (
  data: RegisterRequest
): Promise<ApiResponse<string>> => {
  const response = await axiosInstance.post<ApiResponse<string>>(
    "/api/auth/register/department",
    data
  );
  return response.data;
};

// POST /api/auth/login
export const loginUser = async (
  data: AuthRequest
): Promise<ApiResponse<AuthResponse>> => {
  const response = await axiosInstance.post<ApiResponse<AuthResponse>>(
    "/api/auth/login",
    data
  );
  return response.data;
};