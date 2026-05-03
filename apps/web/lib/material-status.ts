type MaterialProcessingState = {
  processingStage: string;
  processingStatus: string;
  errorMessage?: string | null;
};

export function materialRecoveryCopy(material: MaterialProcessingState) {
  if (material.processingStatus === "failed") {
    return {
      tone: "failed" as const,
      title: "Processing needs attention",
      body:
        material.errorMessage ||
        "This source stalled in the processing pipeline. Admin can inspect logs and retry the background job."
    };
  }
  if (material.processingStatus === "completed") {
    return {
      tone: "completed" as const,
      title: "Study pack ready",
      body: "This source is processed, searchable, and ready for notes, flashcards, quizzes, and cited chat."
    };
  }
  return {
    tone: "pending" as const,
    title: "Processing in progress",
    body: "Extraction, chunking, embeddings, and study-pack generation are still running. Study actions unlock when this completes."
  };
}

export function canUseProcessedMaterial(material: MaterialProcessingState) {
  return material.processingStatus === "completed";
}
