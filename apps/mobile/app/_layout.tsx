import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useState } from "react";

import { SessionProvider } from "../lib/session";
import { colors } from "../lib/theme";

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={client}>
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.inkSoft },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.ink }
          }}
        />
      </QueryClientProvider>
    </SessionProvider>
  );
}
