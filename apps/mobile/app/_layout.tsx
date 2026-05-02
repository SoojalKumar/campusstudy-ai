import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useState } from "react";

import { SessionProvider } from "../lib/session";
import { isUnauthorizedApiError } from "../lib/api";
import { useSession } from "../lib/session";
import { colors } from "../lib/theme";

export default function RootLayout() {
  return (
    <SessionProvider>
      <MobileQueryProvider>
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.inkSoft },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.ink }
          }}
        />
      </MobileQueryProvider>
    </SessionProvider>
  );
}

function MobileQueryProvider({ children }: { children: React.ReactNode }) {
  const { markSessionExpired } = useSession();
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (isUnauthorizedApiError(error)) {
              void markSessionExpired();
            }
          }
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (isUnauthorizedApiError(error)) {
              void markSessionExpired();
            }
          }
        })
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
