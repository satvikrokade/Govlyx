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

/** Returns the decoded JWT payload, or null if no valid token is present. */
export function getTokenPayload(): JwtPayload | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    // Treat expired tokens as absent
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
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
  return payload?.username === "admin@govlyx.com" || payload?.email === "admin@govlyx.com";
}
