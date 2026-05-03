import type { ChatThreadDTO, FlashcardDeckDTO, ProcessingStage, QuizSetDTO } from "@campusstudy/types";
import { formatCitationLocation, formatNoteTypeLabel, formatTimestampSeconds } from "@campusstudy/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ActionRow, Card, EmptyState, Pill, SectionHeader } from "../../components/primitives";
import { Screen } from "../../components/screen";
import { apiFetch } from "../../lib/api";
import { canUseProcessedMaterial, materialRecoveryCopy } from "../../lib/material-status";
import { useSession } from "../../lib/session";
import { colors, radius, spacing, typography } from "../../lib/theme";

type TranscriptSegment = {
  id: string;
  startSecond: number;
  endSecond: number;
  text: string;
};

type MobileMaterial = {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  sourceKind: string;
  processingStage: ProcessingStage;
  processingStatus: string;
  errorMessage?: string | null;
  extractedText?: string | null;
  transcriptText?: string | null;
};

type MobileNote = {
  id: string;
  title: string;
  noteType: string;
  contentMarkdown: string;
};

type ProcessingJob = {
  id: string;
  materialId: string;
  status: string;
  stage: string;
  attempts: number;
  errorMessage?: string | null;
  logsJson: Array<{ stage?: string; message?: string; timestamp?: string }>;
};

const processingTimeline: ProcessingStage[] = [
  "uploaded",
  "extracting",
  "transcribing",
  "chunking",
  "embedding",
  "generating_notes",
  "generating_flashcards",
  "generating_quiz",
  "completed"
];

const noteGenerationModes = [
  { value: "summary", label: "Summary", helper: "Fast lecture sweep" },
  { value: "concise", label: "Concise", helper: "Trimmed revision view" },
  { value: "detailed", label: "Detailed", helper: "Full lecture breakdown" },
  { value: "exam_questions", label: "Exam Qs", helper: "Probable paper prompts" },
  { value: "teach_me", label: "Teach Me", helper: "Simple explanation mode" },
  { value: "revision_sheet", label: "Revision Sheet", helper: "Last-minute prep" }
] as const;

function statusTone(status: string): "tide" | "gold" | "ember" {
  if (status === "completed") return "tide";
  if (status === "failed") return "ember";
  return "gold";
}

export default function MaterialDetailScreen() {
  const { materialId } = useLocalSearchParams<{ materialId: string }>();
  const resolvedMaterialId = materialId;
  const { token, hydrated, user, authState } = useSession();
  const queryClient = useQueryClient();
  const [selectedNoteType, setSelectedNoteType] = useState<(typeof noteGenerationModes)[number]["value"]>("revision_sheet");

  const materialQuery = useQuery<MobileMaterial>({
    queryKey: ["mobile-material", resolvedMaterialId],
    queryFn: () => apiFetch<MobileMaterial>(`/materials/${resolvedMaterialId}`, { token }),
    enabled: hydrated && Boolean(token) && Boolean(resolvedMaterialId)
  });
  const notesQuery = useQuery<MobileNote[]>({
    queryKey: ["mobile-material-notes", resolvedMaterialId],
    queryFn: () => apiFetch<MobileNote[]>(`/notes/by-material/${resolvedMaterialId}`, { token }),
    enabled: hydrated && Boolean(token) && Boolean(resolvedMaterialId)
  });
  const transcriptQuery = useQuery<TranscriptSegment[]>({
    queryKey: ["mobile-material-transcript", resolvedMaterialId],
    queryFn: () => apiFetch<TranscriptSegment[]>(`/transcripts/materials/${resolvedMaterialId}/transcript`, { token }),
    enabled: hydrated && Boolean(token) && Boolean(resolvedMaterialId)
  });
  const jobsQuery = useQuery<ProcessingJob[]>({
    queryKey: ["mobile-processing-jobs", resolvedMaterialId],
    queryFn: () => apiFetch<ProcessingJob[]>(`/processing/jobs?material_id=${resolvedMaterialId}`, { token }),
    enabled: hydrated && Boolean(token) && Boolean(resolvedMaterialId)
  });

  const material = materialQuery.data;
  const notes = notesQuery.data ?? [];
  const transcript = transcriptQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];
  const activeJob = jobs[0] ?? null;
  const sourcePreview = material?.transcriptText ?? material?.extractedText;
  const isLoading = materialQuery.isFetching || notesQuery.isFetching || transcriptQuery.isFetching || jobsQuery.isFetching;
  const materialReady = material ? canUseProcessedMaterial(material) : false;
  const canGenerate = hydrated && Boolean(token) && materialReady;
  const canChat = canGenerate;
  const canRetryJob = Boolean(activeJob && activeJob.status === "failed" && (user?.role === "admin" || user?.role === "moderator"));
  const activeTimelineIndex = processingTimeline.indexOf(material?.processingStage ?? "uploaded");
  const transcriptDuration = transcript.length ? transcript[transcript.length - 1]?.endSecond ?? 0 : 0;
  const transcriptHighlights = transcript.slice(0, 3);
  const recoveryCopy = material ? materialRecoveryCopy(material) : null;

  const noteMutation = useMutation({
    mutationFn: () =>
      apiFetch<MobileNote>("/notes/generate", {
        body: JSON.stringify({ materialId: resolvedMaterialId, noteType: selectedNoteType }),
        method: "POST",
        token
      }),
    onSuccess: (note) => {
      void queryClient.invalidateQueries({ queryKey: ["mobile-material-notes", resolvedMaterialId] });
      router.push(`/notes/${note.id}` as any);
    }
  });
  const deckMutation = useMutation({
    mutationFn: () =>
      apiFetch<FlashcardDeckDTO>("/flashcards/generate", {
        body: JSON.stringify({ limit: 8, materialId: resolvedMaterialId }),
        method: "POST",
        token
      }),
    onSuccess: (deck) => {
      void queryClient.invalidateQueries({ queryKey: ["mobile-flashcard-decks"] });
      router.push(`/flashcards/${deck.id}` as any);
    }
  });
  const quizMutation = useMutation({
    mutationFn: () =>
      apiFetch<QuizSetDTO>("/quizzes/generate", {
        body: JSON.stringify({ count: 5, difficulty: "medium", includeScenarios: true, materialId: resolvedMaterialId }),
        method: "POST",
        token
      }),
    onSuccess: (quiz) => {
      void queryClient.invalidateQueries({ queryKey: ["mobile-quiz-sets"] });
      router.push(`/quizzes/${quiz.id}` as any);
    }
  });
  const sourceChatMutation = useMutation({
    mutationFn: () =>
      apiFetch<ChatThreadDTO>("/chat/threads", {
        body: JSON.stringify({
          answerStyle: "exam-oriented",
          materialId: resolvedMaterialId,
          scopeType: "material",
          strictMode: true,
          title: material?.title ? `${material.title} source chat` : "Material source chat"
        }),
        method: "POST",
        token
      }),
    onSuccess: (thread) => {
      void queryClient.invalidateQueries({ queryKey: ["mobile-chat-threads"] });
      router.push(`/chat/${thread.id}` as any);
    }
  });
  const retryMutation = useMutation({
    mutationFn: () => apiFetch<ProcessingJob>(`/processing/jobs/${activeJob?.id}/retry`, { method: "POST", token }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mobile-processing-jobs", resolvedMaterialId] });
      await queryClient.invalidateQueries({ queryKey: ["mobile-material", resolvedMaterialId] });
    }
  });

  if (!material && hydrated) {
    const title =
      authState === "expired"
        ? "Session expired"
        : token
          ? "Material not found"
          : "Sign in to view this material";
    const description =
      authState === "expired"
        ? "Sign back in to recover your course workspace, uploads, and generated study assets."
        : "Materials are private to the workspace that uploaded them.";
    return (
      <Screen>
        <Card tone="warning">
          <Text style={styles.errorText}>{title}</Text>
          <Text style={styles.generateHint}>{description}</Text>
        </Card>
      </Screen>
    );
  }

  if (!material) {
    return (
      <Screen>
        <Card tone="accent">
          <Text style={styles.generateHint}>Loading material...</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card tone="accent" style={styles.hero}>
        <View style={styles.heroTopline}>
          <Pill label={material.sourceKind} tone={material.sourceKind === "document" ? "tide" : "gold"} />
          {isLoading ? <ActivityIndicator color={colors.tide} /> : null}
        </View>
        <Text style={typography.title}>{material.title}</Text>
        <Text style={styles.heroCopy}>
          {material.fileName} · {material.fileType.toUpperCase()} · {formatNoteTypeLabel(material.processingStage)}
        </Text>
        <View style={styles.statusRow}>
          <Pill label={material.processingStatus} tone={statusTone(material.processingStatus)} />
          {activeJob ? <Text style={styles.statusMeta}>Attempt {activeJob.attempts}</Text> : null}
        </View>
        {recoveryCopy ? (
          <View
            style={[
              styles.recoveryBox,
              recoveryCopy.tone === "failed" && styles.recoveryBoxFailed,
              recoveryCopy.tone === "completed" && styles.recoveryBoxReady
            ]}
          >
            <Text style={styles.recoveryTitle}>{recoveryCopy.title}</Text>
            <Text style={recoveryCopy.tone === "failed" ? styles.errorText : styles.generateHint}>
              {recoveryCopy.tone === "failed" ? material.errorMessage ?? activeJob?.errorMessage ?? recoveryCopy.body : recoveryCopy.body}
            </Text>
          </View>
        ) : null}
      </Card>

      <View style={styles.metricGrid}>
        <Card style={styles.metricCard}>
          <Text style={styles.metricValue}>{notes.length}</Text>
          <Text style={styles.metricLabel}>note packs</Text>
        </Card>
        <Card style={styles.metricCard}>
          <Text style={styles.metricValue}>{transcript.length}</Text>
          <Text style={styles.metricLabel}>segments</Text>
        </Card>
        <Card style={styles.metricCard}>
          <Text style={styles.metricValue}>{transcriptDuration ? formatTimestampSeconds(transcriptDuration) : "0:00"}</Text>
          <Text style={styles.metricLabel}>source time</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Pipeline" title="Processing status" action={activeJob ? activeJob.stage : undefined} />
        <Card tone="strong" style={styles.pipelineCard}>
          <View style={styles.timelineGrid}>
            {processingTimeline.map((stage, index) => {
              const isActive = stage === material.processingStage;
              const isComplete = activeTimelineIndex >= 0 && index <= activeTimelineIndex;
              return (
                <View
                  key={stage}
                  style={[
                    styles.timelineStep,
                    isActive && styles.timelineStepActive,
                    !isActive && isComplete && styles.timelineStepComplete
                  ]}
                >
                  <Text style={styles.timelineIndex}>{index + 1}</Text>
                  <Text style={[styles.timelineLabel, isActive && styles.timelineLabelActive]}>
                    {formatNoteTypeLabel(stage)}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.generateHint}>{recoveryCopy?.body}</Text>
        </Card>
      </View>

      {activeJob ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Job logs" title="Latest worker events" action={activeJob.logsJson.length ? `${activeJob.logsJson.length}` : undefined} />
          <View style={styles.stack}>
            {activeJob.logsJson.slice(-3).map((entry, index) => (
              <Card key={`${activeJob.id}-${index}`} style={styles.logCard}>
                <Text style={styles.logStage}>{formatNoteTypeLabel(entry.stage ?? "stage")}</Text>
                <Text style={styles.logMessage}>{entry.message ?? "Worker updated the processing state."}</Text>
                {entry.timestamp ? <Text style={styles.logTime}>{entry.timestamp}</Text> : null}
              </Card>
            ))}
            {canRetryJob ? (
              <Pressable
                disabled={retryMutation.isPending}
                onPress={() => retryMutation.mutate()}
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed, retryMutation.isPending && styles.disabled]}
              >
                <Text style={styles.retryButtonText}>{retryMutation.isPending ? "Retrying..." : "Retry failed job"}</Text>
              </Pressable>
            ) : null}
            {retryMutation.isError ? <Text style={styles.errorText}>{(retryMutation.error as Error).message}</Text> : null}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader eyebrow="Study Pack" title="Build from this source" />
        <Card tone="strong" style={styles.generateCard}>
          <Text style={styles.generateCopy}>
            Generate notes in the mode you need, open a strict-source chat, or spin up flashcards and a quiz from the same material.
          </Text>
          <View style={styles.modeGrid}>
            {noteGenerationModes.map((mode) => {
              const selected = mode.value === selectedNoteType;
              return (
                <Pressable
                  key={mode.value}
                  onPress={() => setSelectedNoteType(mode.value)}
                  style={({ pressed }) => [styles.modeChip, selected && styles.modeChipActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.modeChipTitle, selected && styles.modeChipTitleActive]}>{mode.label}</Text>
                  <Text style={styles.modeChipHelper}>{mode.helper}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.generateGrid}>
            <GenerateButton
              disabled={!canChat || sourceChatMutation.isPending}
              label={sourceChatMutation.isPending ? "Opening source chat..." : "Ask this source"}
              onPress={() => sourceChatMutation.mutate()}
              tone="gold"
            />
            <GenerateButton
              disabled={!canGenerate || noteMutation.isPending}
              label={noteMutation.isPending ? `Generating ${formatNoteTypeLabel(selectedNoteType)}...` : `Generate ${formatNoteTypeLabel(selectedNoteType)}`}
              onPress={() => noteMutation.mutate()}
              tone="light"
            />
            <GenerateButton
              disabled={!canGenerate || deckMutation.isPending}
              label={deckMutation.isPending ? "Building cards..." : "Generate flashcards"}
              onPress={() => deckMutation.mutate()}
              tone="tide"
            />
            <GenerateButton
              disabled={!canGenerate || quizMutation.isPending}
              label={quizMutation.isPending ? "Writing quiz..." : "Generate quiz"}
              onPress={() => quizMutation.mutate()}
              tone="gold"
            />
          </View>
          {!canGenerate ? (
            <Text style={styles.generateHint}>Sign in and wait for processing to complete before generating new outputs.</Text>
          ) : (
            <Text style={styles.generateHint}>Strict-source chat keeps answers tied to this uploaded material and its citations.</Text>
          )}
          {noteMutation.isError || deckMutation.isError || quizMutation.isError || sourceChatMutation.isError ? (
            <Text style={styles.errorText}>
              {(noteMutation.error as Error | null)?.message ||
                (deckMutation.error as Error | null)?.message ||
                (quizMutation.error as Error | null)?.message ||
                (sourceChatMutation.error as Error | null)?.message}
            </Text>
          ) : null}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Study Assets" title="Generated from this source" action={notes.length ? `${notes.length} ready` : undefined} />
        {notes.length ? (
          <View style={styles.stack}>
            {notes.slice(0, 6).map((note) => (
              <ActionRow
                key={note.id}
                title={note.title}
                description={`${formatNoteTypeLabel(note.noteType)} · ${note.contentMarkdown.slice(0, 96)}`}
                onPress={() => {
                  router.push(`/notes/${note.id}` as any);
                }}
              />
            ))}
          </View>
        ) : (
          <EmptyState title="No notes yet" description="The processing pipeline will add notes here after generation completes." />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          eyebrow="Transcript"
          title={material.sourceKind === "document" ? "Source boundaries" : "Lecture timeline"}
          action={transcript.length ? `${transcript.length} segments` : undefined}
        />
        {transcript.length ? (
          <View style={styles.stack}>
            <Card style={styles.transcriptSummaryCard}>
              <Text style={styles.transcriptSummaryTitle}>Transcript highlights</Text>
              <Text style={styles.generateHint}>
                {transcript.length} timestamped segments · {transcriptDuration ? formatTimestampSeconds(transcriptDuration) : "0:00"} total
              </Text>
            </Card>
            {transcriptHighlights.map((segment, index) => (
              <Card key={segment.id} style={styles.segmentCard}>
                <Text style={styles.segmentTime}>
                  Chapter {index + 1} · {formatCitationLocation(segment)}
                </Text>
                <Text style={styles.previewText}>{segment.text}</Text>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState
            title={material.sourceKind === "document" ? "No transcript timeline" : "Transcript pending"}
            description={
              material.sourceKind === "document"
                ? "Document uploads still preserve chunk citations even when there is no lecture timeline."
                : "Audio and video uploads will show timestamped segments after transcription finishes."
            }
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Source Preview" title={material.sourceKind === "document" ? "Extracted text" : "Transcript body"} />
        {sourcePreview ? (
          <Card>
            <Text style={styles.previewText}>{sourcePreview.slice(0, 900)}</Text>
          </Card>
        ) : (
          <EmptyState title="Preview pending" description="Source text appears here after extraction or transcription completes." />
        )}
      </View>
    </Screen>
  );
}

function GenerateButton({
  disabled,
  label,
  onPress,
  tone
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  tone: "light" | "tide" | "gold";
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.generateButton,
        tone === "light" && styles.lightButton,
        tone === "tide" && styles.tideButton,
        tone === "gold" && styles.goldButton,
        disabled && styles.disabled,
        pressed && styles.pressed
      ]}
    >
      <Text style={styles.generateButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.md
  },
  heroTopline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  heroCopy: {
    ...typography.subtitle
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  statusMeta: {
    color: colors.dim,
    fontSize: 12,
    fontWeight: "700"
  },
  recoveryBox: {
    backgroundColor: colors.goldSoft,
    borderColor: "rgba(246,215,139,0.22)",
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  recoveryBoxFailed: {
    backgroundColor: colors.emberSoft,
    borderColor: "rgba(255,139,93,0.28)"
  },
  recoveryBoxReady: {
    backgroundColor: colors.tideSoft,
    borderColor: "rgba(115,201,199,0.3)"
  },
  recoveryTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900"
  },
  metricGrid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  metricCard: {
    flex: 1,
    minHeight: 100
  },
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  metricLabel: {
    color: colors.dim,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 6,
    textTransform: "uppercase"
  },
  section: {
    gap: spacing.md
  },
  pipelineCard: {
    gap: spacing.md
  },
  timelineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  timelineStep: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    minWidth: 148,
    padding: spacing.md
  },
  timelineStepActive: {
    backgroundColor: colors.tideSoft,
    borderColor: "rgba(115,201,199,0.38)"
  },
  timelineStepComplete: {
    backgroundColor: colors.goldSoft,
    borderColor: "rgba(246,215,139,0.2)"
  },
  timelineIndex: {
    color: colors.dim,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  timelineLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: spacing.xs
  },
  timelineLabelActive: {
    color: colors.tide
  },
  stack: {
    gap: spacing.md
  },
  logCard: {
    gap: spacing.xs,
    padding: spacing.md
  },
  logStage: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  logMessage: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  logTime: {
    color: colors.dim,
    fontSize: 11
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: colors.text,
    borderRadius: radius.md,
    padding: spacing.md
  },
  retryButtonText: {
    color: colors.ink,
    fontWeight: "900"
  },
  generateCard: {
    gap: spacing.md
  },
  generateCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  modeGrid: {
    gap: spacing.sm
  },
  modeChip: {
    backgroundColor: colors.ink,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md
  },
  modeChipActive: {
    backgroundColor: colors.tideSoft,
    borderColor: "rgba(115,201,199,0.34)"
  },
  modeChipTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  modeChipTitleActive: {
    color: colors.tide
  },
  modeChipHelper: {
    color: colors.dim,
    fontSize: 12,
    marginTop: 4
  },
  generateGrid: {
    gap: spacing.sm
  },
  generateButton: {
    borderRadius: 18,
    padding: spacing.md
  },
  lightButton: {
    backgroundColor: colors.text
  },
  tideButton: {
    backgroundColor: colors.tide
  },
  goldButton: {
    backgroundColor: colors.gold
  },
  generateButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center"
  },
  generateHint: {
    color: colors.dim,
    fontSize: 12,
    lineHeight: 18
  },
  errorText: {
    color: colors.ember,
    fontSize: 13,
    lineHeight: 18
  },
  disabled: {
    opacity: 0.5
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  },
  transcriptSummaryCard: {
    gap: spacing.xs
  },
  transcriptSummaryTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  previewText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22
  },
  segmentCard: {
    gap: spacing.sm
  },
  segmentTime: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  }
});
