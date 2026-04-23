import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useState } from "react";

import { SessionProvider } from "../lib/session";

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={client}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#0d1321" },
            headerTintColor: "#f4f7fb",
            contentStyle: { backgroundColor: "#081019" }
          }}
        />
      </QueryClientProvider>
    </SessionProvider>
  );
}
