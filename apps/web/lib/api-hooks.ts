"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";

export function useAuthedQuery<T>({
  queryKey,
  path,
  fallbackData,
  enabled = true
}: {
  queryKey: Array<string | number | null>;
  path: string;
  fallbackData: T;
  enabled?: boolean;
}) {
  const { token, hydrated } = useSession();
  const query = useQuery<T>({
    queryKey,
    queryFn: () => apiFetch<T>(path, { token }),
    enabled: hydrated && Boolean(token) && enabled
  });

  return {
    ...query,
    hydrated,
    hasSession: Boolean(token),
    data: query.data ?? fallbackData
  };
}

