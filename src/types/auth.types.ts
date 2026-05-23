
export interface RegisterRequest {
  email: string;
  password: string;
  pincode: string;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}


export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}