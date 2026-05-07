import { API_UNREACHABLE_MESSAGE, apiFetch, getApiBaseUrl, isApiConnectionError } from "@/lib/api";

describe("web API client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults local development to the demo API port", () => {
    expect(getApiBaseUrl(undefined)).toBe("http://127.0.0.1:8020/api/v1");
    expect(getApiBaseUrl("")).toBe("http://127.0.0.1:8020/api/v1");
  });

  it("normalizes configured API URLs without trailing slashes", () => {
    expect(getApiBaseUrl(" http://localhost:9000/api/v1/// ")).toBe("http://localhost:9000/api/v1");
  });

  it("formats browser fetch failures into a clear API reachability error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    try {
      await apiFetch("/health");
      throw new Error("Expected apiFetch to reject");
    } catch (error) {
      expect(isApiConnectionError(error)).toBe(true);
      expect((error as Error).message).toBe(API_UNREACHABLE_MESSAGE);
    }
  });
});
