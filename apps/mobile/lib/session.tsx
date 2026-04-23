import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState } from "react";

type SessionContextValue = {
  token: string | null;
  setToken: (value: string | null) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const SESSION_KEY = "campusstudy-mobile-session";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(SESSION_KEY).then((value) => setTokenState(value));
  }, []);

  const setToken = async (value: string | null) => {
    setTokenState(value);
    if (value) {
      await SecureStore.setItemAsync(SESSION_KEY, value);
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
  };

  return <SessionContext.Provider value={{ token, setToken }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}

