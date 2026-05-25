import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  sub: string;         // userId
  username: string;
  email: string;
  role: string | null; // e.g. "ROLE_DEPARTMENT", "ROLE_USER", "ROLE_ADMIN"
  isActive: boolean;
  exp: number;
  iat: number;
}

const TOKEN_KEYS = ["token", "authToken", "jwt", "access_token"];

export function getAuthToken(): string | null {
  for (const key of TOKEN_KEYS) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }
  return null;
}

export function persistAuthToken(token: string) {
  localStorage.setItem("token", token);
  localStorage.setItem("authToken", token);
  localStorage.removeItem("jwt");
  localStorage.removeItem("access_token");
}

export function clearAuthTokens() {
  TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function decodeAuthToken(token = getAuthToken()): JwtPayload | null {
  if (!token) return null;
  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

export function isTokenExpired(token = getAuthToken()): boolean {
  const decoded = decodeAuthToken(token);
  if (!decoded?.exp) return true;
  return decoded.exp * 1000 <= Date.now();
}

/** Returns the decoded JWT payload, or null if no valid token is present. */
export function getTokenPayload(): JwtPayload | null {
  const decoded = decodeAuthToken();
  if (!decoded) return null;

  // Treat expired tokens as absent
  if (isTokenExpired()) {
    clearAuthTokens();
    return null;
  }

  return decoded;
}

/** Returns the raw role string from the JWT (e.g. "ROLE_DEPARTMENT"). */
export function getUserRole(): string | null {
  return getTokenPayload()?.role ?? null;
}

/** True if the logged-in user has the DEPARTMENT or ADMIN role. */
export function isDepartmentUser(): boolean {
  const role = getUserRole();
  return role === "ROLE_DEPARTMENT" || role === "ROLE_ADMIN";
}

/** True if the logged-in user has the ADMIN role. */
export function isAdminUser(): boolean {
  return getUserRole() === "ROLE_ADMIN";
}

/** True if the logged-in user is a regular CITIZEN/USER. */
export function isCitizenUser(): boolean {
  const role = getUserRole();
  return role === "ROLE_USER" || role === "ROLE_CITIZEN" || role === null;
}

/** True if the logged-in user is the Super Admin (hardcoded email check). */
export function isSuperAdmin(): boolean {
  const payload = getTokenPayload();
  // We'll check the 'sub' or 'username' depending on where the email is stored.
  // Based on your backend, 'username' often holds the email.
  return payload?.username === "madhavrakhonde7@gmail.com" || payload?.email === "madhavrakhonde7@gmail.com" || payload?.username === "samarthbhagwanpawar098@gmail.com" || payload?.email === "samarthbhagwanpawar098@gmail.com";
}
