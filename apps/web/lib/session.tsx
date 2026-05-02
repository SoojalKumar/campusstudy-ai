"use client";

import { createContext, useContext, useEffect, useState } from "react";

import type { AuthUser } from "@campusstudy/types";

import { apiFetch, isUnauthorizedApiError } from "@/lib/api";

type AuthState = "anonymous" | "authenticated" | "expired";

type SessionState = {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  authState: AuthState;
  setSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
  markSessionExpired: () => void;
};

const SessionContext = createContext<SessionState | null>(null);
const SESSION_KEY = "campusstudy-session";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("anonymous");

  useEffect(() => {
    let active = true;

    async function hydrateSession() {
      const stored = window.localStorage.getItem(SESSION_KEY);
      if (!stored) {
        if (active) {
          setHydrated(true);
        }
        return;
      }

      try {
        const parsed = JSON.parse(stored) as { token: string; user?: AuthUser | null };
        if (!parsed.token) {
          throw new Error("Missing token");
        }
        if (!active) return;
        setToken(parsed.token);
        setUser(parsed.user ?? null);
        const liveUser = await apiFetch<AuthUser>("/auth/me", { token: parsed.token });
        if (!active) return;
        setUser(liveUser);
        setAuthState("authenticated");
        window.localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ token: parsed.token, user: liveUser })
        );
      } catch (error) {
        if (!active) return;
        setToken(null);
        setUser(null);
        setAuthState(isUnauthorizedApiError(error) ? "expired" : "anonymous");
        window.localStorage.removeItem(SESSION_KEY);
      }

      if (active) {
        setHydrated(true);
      }
    }

    void hydrateSession();
    return () => {
      active = false;
    };
  }, []);

  const setSession = (nextToken: string, nextUser: AuthUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setAuthState("authenticated");
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token: nextToken, user: nextUser }));
  };

  const clearSession = () => {
    setToken(null);
    setUser(null);
    setAuthState("anonymous");
    window.localStorage.removeItem(SESSION_KEY);
  };

  const markSessionExpired = () => {
    setToken(null);
    setUser(null);
    setAuthState("expired");
    window.localStorage.removeItem(SESSION_KEY);
  };

  return (
    <SessionContext.Provider value={{ token, user, hydrated, authState, setSession, clearSession, markSessionExpired }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}
