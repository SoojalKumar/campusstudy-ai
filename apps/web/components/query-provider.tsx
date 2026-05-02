"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { isUnauthorizedApiError } from "@/lib/api";
import { useSession } from "@/lib/session";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const { markSessionExpired } = useSession();
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (isUnauthorizedApiError(error)) {
              markSessionExpired();
            }
          }
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (isUnauthorizedApiError(error)) {
              markSessionExpired();
            }
          }
        })
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
