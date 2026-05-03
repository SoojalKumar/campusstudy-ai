type MaterialProcessingState = {
  processingStage: string;
  processingStatus: string;
  errorMessage?: string | null;
};

export function materialRecoveryCopy(material: MaterialProcessingState) {
  if (material.processingStatus === "failed") {
    return {
      body:
        material.errorMessage ||
        "This source stalled in the processing pipeline. Admin can inspect logs and retry the background job.",
      title: "Processing needs attention",
      tone: "failed" as const
    };
  }

  if (material.processingStatus === "completed") {
    return {
      body: "This source is processed, searchable, and ready for notes, flashcards, quizzes, and cited chat.",
      title: "Study pack ready",
      tone: "completed" as const
    };
  }

  return {
    body: "Extraction, chunking, embeddings, and study-pack generation are still running. Study actions unlock when this completes.",
    title: "Processing in progress",
    tone: "pending" as const
  };
}

export function canUseProcessedMaterial(material: MaterialProcessingState) {
  return material.processingStatus === "completed";
}
