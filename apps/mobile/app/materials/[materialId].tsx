import type { FlashcardDeckDTO, QuizSetDTO } from "@campusstudy/types";
import { formatNoteTypeLabel } from "@campusstudy/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ActionRow, Card, EmptyState, Pill, SectionHeader } from "../../components/primitives";
import { Screen } from "../../components/screen";
import { apiFetch } from "../../lib/api";
import { useSession } from "../../lib/session";
import { colors, spacing, typography } from "../../lib/theme";

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
  processingStage: string;
  processingStatus: string;
  extractedText?: string | null;
  transcriptText?: string | null;
};

type MobileNote = {
  id: string;
  title: string;
  noteType: string;
  contentMarkdown: string;
};

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function MaterialDetailScreen() {
  const { materialId } = useLocalSearchParams<{ materialId: string }>();
  const resolvedMaterialId = materialId;
  const { token, hydrated } = useSession();
  const queryClient = useQueryClient();
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
  const material = materialQuery.data;
  const notes = notesQuery.data ?? [];
  const transcript = transcriptQuery.data ?? [];
  const sourcePreview = material?.transcriptText ?? material?.extractedText;
  const isLoading = materialQuery.isFetching || notesQuery.isFetching || transcriptQuery.isFetching;
  const canGenerate = hydrated && Boolean(token) && material?.processingStatus === "completed";
  const noteMutation = useMutation({
    mutationFn: () =>
      apiFetch<MobileNote>("/notes/generate", {
        body: JSON.stringify({ materialId: resolvedMaterialId, noteType: "revision_sheet" }),
        method: "POST",
        token
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["mobile-material-notes", resolvedMaterialId] })
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

  if (!material && hydrated) {
    return (
      <Screen>
        <Card tone="warning">
          <Text style={styles.errorText}>{token ? "Material not found" : "Sign in to view this material"}</Text>
          <Text style={styles.generateHint}>Materials are private to the workspace that uploaded them.</Text>
        </Card>
      </Screen>
    );
  }

  if (!material) {
    return (
      <Screen>
        <Card tone="accent"><Text style={styles.generateHint}>Loading material...</Text></Card>
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
          {material.fileName} · {material.fileType.toUpperCase()} · {material.processingStage}
        </Text>
        <Pill label={material.processingStatus} tone={material.processingStatus === "completed" ? "tide" : "ember"} />
      </Card>

      <View style={styles.section}>
        <SectionHeader eyebrow="Generate" title="Build a study pack" />
        <Card tone="strong" style={styles.generateCard}>
          <Text style={styles.generateCopy}>
            Create fresh revision notes, a flashcard sprint, or a scored quiz from this source.
          </Text>
          <View style={styles.generateGrid}>
            <GenerateButton
              disabled={!canGenerate || noteMutation.isPending}
              label={noteMutation.isPending ? "Writing notes..." : "Revision notes"}
              onPress={() => noteMutation.mutate()}
              tone="light"
            />
            <GenerateButton
              disabled={!canGenerate || deckMutation.isPending}
              label={deckMutation.isPending ? "Building cards..." : "Flashcards"}
              onPress={() => deckMutation.mutate()}
              tone="tide"
            />
            <GenerateButton
              disabled={!canGenerate || quizMutation.isPending}
              label={quizMutation.isPending ? "Writing quiz..." : "Quiz set"}
              onPress={() => quizMutation.mutate()}
              tone="gold"
            />
          </View>
          {!canGenerate ? (
            <Text style={styles.generateHint}>Sign in and wait for processing to complete before generating new outputs.</Text>
          ) : null}
          {noteMutation.isSuccess ? <Text style={styles.successText}>Revision sheet added to this material.</Text> : null}
          {noteMutation.isError || deckMutation.isError || quizMutation.isError ? (
            <Text style={styles.errorText}>
              {(noteMutation.error as Error | null)?.message ||
                (deckMutation.error as Error | null)?.message ||
                (quizMutation.error as Error | null)?.message}
            </Text>
          ) : null}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Study Assets" title="Generated from this source" />
        {notes.length ? (
          <View style={styles.stack}>
            {notes.slice(0, 4).map((note) => (
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
          <EmptyState title="No notes yet" description="The processing pipeline will add notes after generation." />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Source Preview" title={material.sourceKind === "document" ? "Extracted text" : "Transcript"} />
        {sourcePreview ? (
          <Card>
            <Text style={styles.previewText}>{sourcePreview.slice(0, 520)}</Text>
          </Card>
        ) : (
          <EmptyState title="Preview pending" description="Source text appears after extraction or transcription." />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Timeline" title="Transcript segments" action={transcript.length ? `${transcript.length}` : undefined} />
        {transcript.length ? (
          <View style={styles.stack}>
            {transcript.map((segment) => (
              <Card key={segment.id} style={styles.segmentCard}>
                <Text style={styles.segmentTime}>
                  {formatSeconds(segment.startSecond)} - {formatSeconds(segment.endSecond)}
                </Text>
                <Text style={styles.previewText}>{segment.text}</Text>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState title="No transcript timeline" description="Audio/video uploads will show timestamped segments here." />
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
  section: {
    gap: spacing.md
  },
  generateCard: {
    gap: spacing.md
  },
  generateCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
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
  successText: {
    color: colors.tide,
    fontSize: 13,
    fontWeight: "800"
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
  stack: {
    gap: spacing.md
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
