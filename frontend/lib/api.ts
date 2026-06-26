// API client - Axios instance with JWT interceptors

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
});

// --- Request interceptor: attach Authorization header ---
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window === "undefined") return config;
  const token = localStorage.getItem("access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor: refresh token on 401, retry once ---
let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh for 401 and when we haven't retried yet
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      !originalRequest
    ) {
      return Promise.reject(error);
    }

    // Don't refresh on auth endpoints themselves
    const url = originalRequest.url ?? "";
    if (url.includes("/api/auth/login") || url.includes("/api/auth/refresh")) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Deduplicate concurrent refresh attempts
      if (!refreshPromise) {
        refreshPromise = doRefresh();
      }
      const newAccess = await refreshPromise;
      refreshPromise = null;

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      }
      return apiClient(originalRequest);
    } catch {
      refreshPromise = null;
      // Refresh failed — clear tokens and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  }
);

/** Calls the refresh endpoint directly (avoids circular import with auth.ts) */
async function doRefresh(): Promise<string> {
  const refresh =
    typeof window !== "undefined"
      ? localStorage.getItem("refresh_token")
      : null;
  if (!refresh) throw new Error("No refresh token");

  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/auth/refresh/`,
    { refresh }
  );
  const newAccess: string = res.data.access;
  const newRefresh: string = res.data.refresh ?? refresh;
  if (typeof window !== "undefined") {
    localStorage.setItem("access_token", newAccess);
    localStorage.setItem("refresh_token", newRefresh);
  }
  return newAccess;
}
