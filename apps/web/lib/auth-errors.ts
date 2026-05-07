import { API_UNREACHABLE_MESSAGE, ApiError, isApiConnectionError } from "@/lib/api";

export function loginErrorMessage(error: unknown) {
  if (isApiConnectionError(error)) {
    return API_UNREACHABLE_MESSAGE;
  }

  if (error instanceof ApiError && (error.status === 400 || error.status === 401)) {
    return "Invalid email or password";
  }

  return error instanceof Error ? error.message : "Unable to sign in. Please try again.";
}
