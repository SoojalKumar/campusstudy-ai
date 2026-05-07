import { API_UNREACHABLE_MESSAGE, ApiConnectionError, ApiError } from "@/lib/api";
import { loginErrorMessage } from "@/lib/auth-errors";

describe("login error messages", () => {
  it("explains API connectivity failures without exposing raw fetch text", () => {
    expect(loginErrorMessage(new ApiConnectionError())).toBe(API_UNREACHABLE_MESSAGE);
  });

  it("maps credential failures to a simple auth message", () => {
    expect(loginErrorMessage(new ApiError("User not found", 401))).toBe("Invalid email or password");
    expect(loginErrorMessage(new ApiError("Invalid password", 400))).toBe("Invalid email or password");
  });
});
