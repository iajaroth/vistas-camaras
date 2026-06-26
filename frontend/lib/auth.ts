// Auth helpers - login, logout, token management

import { apiClient } from "./api";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

export async function login(
  username: string,
  password: string
): Promise<void> {
  const res = await apiClient.post("/api/auth/login/", { username, password });
  setTokens(res.data.access, res.data.refresh);
}

export async function refreshToken(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("No refresh token");
  const res = await apiClient.post("/api/auth/refresh/", { refresh });
  const newAccess: string = res.data.access;
  // If the backend rotates refresh tokens, store the new one
  const newRefresh: string = res.data.refresh ?? refresh;
  setTokens(newAccess, newRefresh);
  return newAccess;
}

export async function logout(): Promise<void> {
  const refresh = getRefreshToken();
  try {
    if (refresh) {
      await apiClient.post("/api/auth/logout/", { refresh });
    }
  } finally {
    clearTokens();
  }
}
