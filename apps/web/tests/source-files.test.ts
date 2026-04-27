import { fetchSourceFile, withDisposition } from "@/lib/source-files";

describe("source file helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds the requested content disposition to download URLs", () => {
    expect(withDisposition("http://api.test/materials/mat-1/download", "inline")).toBe(
      "http://api.test/materials/mat-1/download?disposition=inline"
    );
    expect(withDisposition("http://api.test/materials/mat-1/download?x=1", "attachment")).toBe(
      "http://api.test/materials/mat-1/download?x=1&disposition=attachment"
    );
  });

  it("fetches protected source files with the bearer token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Binary study notes.", {
        status: 200,
        headers: {
          "content-disposition": "attachment; filename*=UTF-8''lecture%20notes.pdf"
        }
      })
    );

    const source = await fetchSourceFile({
      url: "http://api.test/materials/mat-1/download",
      token: "student-token",
      disposition: "attachment",
      fallbackFileName: "fallback.pdf"
    });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/materials/mat-1/download?disposition=attachment", {
      cache: "no-store",
      headers: { Authorization: "Bearer student-token" }
    });
    expect(source.fileName).toBe("lecture notes.pdf");
    expect(await source.blob.text()).toBe("Binary study notes.");
  });
});
