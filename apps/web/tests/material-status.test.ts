import { canUseProcessedMaterial, materialRecoveryCopy } from "@/lib/material-status";

describe("material status helpers", () => {
  it("keeps study actions disabled until processing completes", () => {
    expect(canUseProcessedMaterial({ processingStage: "chunking", processingStatus: "running" })).toBe(false);
    expect(canUseProcessedMaterial({ processingStage: "completed", processingStatus: "completed" })).toBe(true);
  });

  it("shows a clear failed-state recovery message", () => {
    const copy = materialRecoveryCopy({
      processingStage: "failed",
      processingStatus: "failed",
      errorMessage: "Worker queue unavailable."
    });

    expect(copy.tone).toBe("failed");
    expect(copy.title).toBe("Processing needs attention");
    expect(copy.body).toBe("Worker queue unavailable.");
  });

  it("explains that pending uploads are not ready for study actions", () => {
    const copy = materialRecoveryCopy({ processingStage: "embedding", processingStatus: "running" });

    expect(copy.tone).toBe("pending");
    expect(copy.body).toContain("Study actions unlock when this completes");
  });
});
