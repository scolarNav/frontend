"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setToken, clearToken } from "./api";
import { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (fullName: string, email: string, password: string, country?: string, referralCode?: string) => Promise<User>;
  googleLogin: (credential: string, referralCode?: string) => Promise<{ isNew?: boolean; user: User }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    try {
      const data = await api.get<{ user: User }>("/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ScolarNav_token") : null;
    if (!token) {
      setLoading(false);
      return;
    }
    refreshUser().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string): Promise<User> {
    const data = await api.post<{ token: string; user: User }>("/auth/login", { email, password: password }, { auth: false });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(fullName: string, email: string, password: string, country?: string, referralCode?: string): Promise<User> {
    const body: Record<string, string | string[]> = { fullName, email, password, ...(country && { country }) };
    if (referralCode) body.referralCode = referralCode;
    const data = await api.post<{ token: string; user: User }>("/auth/register", body, { auth: false });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function googleLogin(credential: string, referralCode?: string): Promise<{ isNew?: boolean; user: User }> {
    const body: Record<string, string> = { credential };
    if (referralCode) body.referralCode = referralCode;
    const data = await api.post<{ token: string; user: User; isNew?: boolean }>("/auth/google", body, { auth: false });
    setToken(data.token);
    setUser(data.user);
    return { isNew: data.isNew, user: data.user };
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout, refreshUser } as AuthContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
