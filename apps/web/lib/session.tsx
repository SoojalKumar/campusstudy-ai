"use client";

import { createContext, useContext, useEffect, useState } from "react";

import type { AuthUser } from "@campusstudy/types";

type SessionState = {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("campusstudy-session");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { token: string; user: AuthUser };
      setToken(parsed.token);
      setUser(parsed.user);
    } catch {
      window.localStorage.removeItem("campusstudy-session");
    }
  }, []);

  const setSession = (nextToken: string, nextUser: AuthUser) => {
    setToken(nextToken);
    setUser(nextUser);
    window.localStorage.setItem(
      "campusstudy-session",
      JSON.stringify({ token: nextToken, user: nextUser })
    );
  };

  const clearSession = () => {
    setToken(null);
    setUser(null);
    window.localStorage.removeItem("campusstudy-session");
  };

  return (
    <SessionContext.Provider value={{ token, user, setSession, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}

