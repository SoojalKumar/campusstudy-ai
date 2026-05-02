import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState } from "react";

import type { AuthUser } from "@campusstudy/types";

import { apiFetch, isUnauthorizedApiError } from "./api";

type AuthState = "anonymous" | "authenticated" | "expired";

type SessionContextValue = {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  authState: AuthState;
  setSession: (token: string, user: AuthUser | null) => Promise<void>;
  setToken: (value: string | null) => Promise<void>;
  clearSession: () => Promise<void>;
  markSessionExpired: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const SESSION_KEY = "campusstudy-mobile-session";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("anonymous");

  useEffect(() => {
    let active = true;

    async function hydrateSession() {
      try {
        const stored = await SecureStore.getItemAsync(SESSION_KEY);
        if (!stored) return;
        let parsed: { token: string; user?: AuthUser | null };
        try {
          const json = JSON.parse(stored) as { token?: string; user?: AuthUser | null };
          parsed = json.token ? { token: json.token, user: json.user ?? null } : { token: stored };
        } catch {
          parsed = { token: stored };
        }
        if (!parsed.token || !active) return;
        setTokenState(parsed.token);
        setUserState(parsed.user ?? null);
        const liveUser = await apiFetch<AuthUser>("/auth/me", { token: parsed.token });
        if (!active) return;
        setUserState(liveUser);
        setAuthState("authenticated");
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ token: parsed.token, user: liveUser }));
      } catch (error) {
        if (!active) return;
        setTokenState(null);
        setUserState(null);
        setAuthState(isUnauthorizedApiError(error) ? "expired" : "anonymous");
        await SecureStore.deleteItemAsync(SESSION_KEY);
      } finally {
        if (active) {
          setHydrated(true);
        }
      }
    }

    void hydrateSession();
    return () => {
      active = false;
    };
  }, []);

  const setSession = async (value: string, nextUser: AuthUser | null) => {
    setTokenState(value);
    setUserState(nextUser);
    setAuthState("authenticated");
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ token: value, user: nextUser }));
  };

  const clearSession = async () => {
    setTokenState(null);
    setUserState(null);
    setAuthState("anonymous");
    await SecureStore.deleteItemAsync(SESSION_KEY);
  };

  const markSessionExpired = async () => {
    setTokenState(null);
    setUserState(null);
    setAuthState("expired");
    await SecureStore.deleteItemAsync(SESSION_KEY);
  };

  const setToken = async (value: string | null) => {
    if (!value) {
      await clearSession();
      return;
    }
    await setSession(value, null);
  };

  return (
    <SessionContext.Provider value={{ token, user, hydrated, authState, setSession, setToken, clearSession, markSessionExpired }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
