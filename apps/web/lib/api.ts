"use client";

export const DEFAULT_API_BASE_URL = "http://127.0.0.1:8020/api/v1";
export const API_UNREACHABLE_MESSAGE = "API is not reachable. Make sure backend is running.";

export function getApiBaseUrl(value = process.env.NEXT_PUBLIC_API_BASE_URL) {
  const configured = value?.trim();
  return (configured || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

export const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class ApiConnectionError extends Error {
  constructor(message = API_UNREACHABLE_MESSAGE) {
    super(message);
    this.name = "ApiConnectionError";
  }
}

export function isUnauthorizedApiError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}

export function isApiConnectionError(error: unknown): error is ApiConnectionError {
  return error instanceof ApiConnectionError;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers, body, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      body,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...headers
      },
      cache: "no-store"
    });
  } catch (error) {
    throw new ApiConnectionError();
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(payload?.detail ?? "Request failed", response.status);
  }
  return response.json() as Promise<T>;
}
