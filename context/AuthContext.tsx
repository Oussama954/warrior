import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const API_BASE = "http://212-115-110-104.eu-fr-cloud-xip.com/api";
const COOKIE_KEY = "warrior_auth_cookie";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  apiRequest: (path: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cookieStr, setCookieStr] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(COOKIE_KEY).then((val) => {
      if (val) {
        setCookieStr(val);
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    });
  }, []);

  const apiRequest = useCallback(
    async (path: string, options: RequestInit = {}): Promise<Response> => {
      const stored = cookieStr ?? (await AsyncStorage.getItem(COOKIE_KEY));
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };
      if (stored) {
        headers["Cookie"] = stored;
      }
      return fetch(`${API_BASE}${path}`, { ...options, headers });
    },
    [cookieStr]
  );

  const login = useCallback(async (password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: (body as { error?: string }).error ?? "Invalid password" };
      }
      const setCookie = res.headers.get("set-cookie") ?? "";
      const match = setCookie.match(/warrior_auth=([^;]+)/);
      if (match) {
        const cookie = `warrior_auth=${match[1]}`;
        await AsyncStorage.setItem(COOKIE_KEY, cookie);
        setCookieStr(cookie);
      }
      setIsAuthenticated(true);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: "Network error. Check connection." };
    }
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("/auth/logout", { method: "POST" }).catch(() => {});
    await AsyncStorage.removeItem(COOKIE_KEY);
    setCookieStr(null);
    setIsAuthenticated(false);
  }, [apiRequest]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, apiRequest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
