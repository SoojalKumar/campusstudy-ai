import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ActionRow, Card, EmptyState, Pill, SectionHeader } from "../../components/primitives";
import { Screen } from "../../components/screen";
import { apiFetch } from "../../lib/api";
import {
  mobileMaterialsByCourse,
  mobileNotesByCourse,
  type MobileMaterial,
  type MobileNote
} from "../../lib/demo-data";
import { useSession } from "../../lib/session";
import { colors, spacing, typography } from "../../lib/theme";

type TranscriptSegment = {
  id: string;
  startSecond: number;
  endSecond: number;
  text: string;
};

const demoMaterials = Object.values(mobileMaterialsByCourse).flat();
const demoNotes = Object.values(mobileNotesByCourse).flat();

function fallbackMaterial(materialId: string): MobileMaterial {
  return (
    demoMaterials.find((material) => material.id === materialId) ?? {
      id: materialId,
      title: `Material ${materialId}`,
      fileName: "source-material.pdf",
      fileType: "pdf",
      sourceKind: "document",
      processingStage: "completed",
      processingStatus: "completed",
      extractedText: "Source preview appears here after live material data loads."
    }
  );
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function MaterialDetailScreen() {
  const { materialId } = useLocalSearchParams<{ materialId: string }>();
  const resolvedMaterialId = materialId ?? "m1";
  const { token, hydrated } = useSession();
  const materialQuery = useQuery<MobileMaterial>({
    queryKey: ["mobile-material", resolvedMaterialId],
    queryFn: () => apiFetch<MobileMaterial>(`/materials/${resolvedMaterialId}`, { token }),
    enabled: hydrated && Boolean(token)
  });
  const notesQuery = useQuery<MobileNote[]>({
    queryKey: ["mobile-material-notes", resolvedMaterialId],
    queryFn: () => apiFetch<MobileNote[]>(`/notes/by-material/${resolvedMaterialId}`, { token }),
    enabled: hydrated && Boolean(token)
  });
  const transcriptQuery = useQuery<TranscriptSegment[]>({
    queryKey: ["mobile-material-transcript", resolvedMaterialId],
    queryFn: () => apiFetch<TranscriptSegment[]>(`/transcripts/materials/${resolvedMaterialId}/transcript`, { token }),
    enabled: hydrated && Boolean(token)
  });
  const material = materialQuery.data ?? fallbackMaterial(resolvedMaterialId);
  const notes = notesQuery.data ?? demoNotes.filter((note) => note.id === "n1" || note.id === "n2");
  const transcript = transcriptQuery.data ?? [];
  const sourcePreview = material.transcriptText ?? material.extractedText;
  const isLoading = materialQuery.isFetching || notesQuery.isFetching || transcriptQuery.isFetching;

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
        <SectionHeader eyebrow="Study Assets" title="Generated from this source" />
        {notes.length ? (
          <View style={styles.stack}>
            {notes.slice(0, 4).map((note) => (
              <ActionRow
                key={note.id}
                title={note.title}
                description={`${note.noteType.replace("_", " ")} · ${note.contentMarkdown.slice(0, 96)}`}
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

