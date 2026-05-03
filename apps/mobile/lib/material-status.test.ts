import { canUseProcessedMaterial, materialRecoveryCopy } from "./material-status";

type RecoveryTone = ReturnType<typeof materialRecoveryCopy>["tone"];

function expectTone(_tone: RecoveryTone) {
  return _tone;
}

const runningMaterial = {
  errorMessage: null,
  processingStage: "embedding",
  processingStatus: "running"
};
const completedMaterial = {
  processingStage: "completed",
  processingStatus: "completed"
};
const failedMaterial = {
  errorMessage: "Embedding provider timed out.",
  processingStage: "embedding",
  processingStatus: "failed"
};

const pendingCopy = materialRecoveryCopy(runningMaterial);
const completedCopy = materialRecoveryCopy(completedMaterial);
const failedCopy = materialRecoveryCopy(failedMaterial);

expectTone(pendingCopy.tone);
expectTone(completedCopy.tone);
expectTone(failedCopy.tone);

const recoveryTypeAssertions = {
  completedMaterialReady: canUseProcessedMaterial(completedMaterial),
  failedBodyUsesError: failedCopy.body,
  pendingUnlockCopy: pendingCopy.body,
  runningMaterialReady: canUseProcessedMaterial(runningMaterial)
} satisfies {
  completedMaterialReady: boolean;
  failedBodyUsesError: string;
  pendingUnlockCopy: string;
  runningMaterialReady: boolean;
};

if (!recoveryTypeAssertions.pendingUnlockCopy.includes("unlock")) {
  throw new Error("Pending recovery copy should explain when study actions unlock.");
}

if (recoveryTypeAssertions.failedBodyUsesError !== failedMaterial.errorMessage) {
  throw new Error("Failed recovery copy should preserve the material error message.");
}

if (!recoveryTypeAssertions.completedMaterialReady || recoveryTypeAssertions.runningMaterialReady) {
  throw new Error("Only completed materials should unlock generated study actions.");
}
