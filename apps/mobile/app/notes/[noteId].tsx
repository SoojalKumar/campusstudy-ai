import type { NoteSetDTO } from "@campusstudy/types";
import { buildNoteSections, formatNoteTypeLabel } from "@campusstudy/types";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, EmptyState, Pill, SectionHeader } from "../../components/primitives";
import { Screen } from "../../components/screen";
import { apiFetch } from "../../lib/api";
import { useSession } from "../../lib/session";
import { colors, spacing, typography } from "../../lib/theme";

function formatDate(value?: string) {
  if (!value) return "Recently generated";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Recently generated";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
}

export default function NoteScreen() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const resolvedNoteId = noteId;
  const { token, hydrated } = useSession();
  const noteQuery = useQuery<NoteSetDTO>({
    queryKey: ["mobile-note", resolvedNoteId],
    queryFn: () => apiFetch<NoteSetDTO>(`/notes/${resolvedNoteId}`, { token }),
    enabled: hydrated && Boolean(token) && Boolean(resolvedNoteId)
  });
  const note = noteQuery.data;
  const sections = note ? buildNoteSections(note.contentMarkdown) : [];
  const keyTerms = Array.isArray(note?.metadataJson?.key_terms) ? (note.metadataJson?.key_terms as string[]) : [];
  const examQuestions = Array.isArray(note?.metadataJson?.exam_questions)
    ? (note.metadataJson?.exam_questions as string[])
    : [];

  if (!note && hydrated) {
    return (
      <Screen>
        <Card tone="warning">
          <Text style={styles.warningTitle}>{token ? "Note not found" : "Sign in to view this note"}</Text>
          <Text style={styles.warningCopy}>Generated notes stay scoped to your student workspace.</Text>
        </Card>
      </Screen>
    );
  }

  if (!note) {
    return (
      <Screen>
        <Card tone="accent">
          <Text style={styles.warningCopy}>Loading note...</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card tone="accent" style={styles.hero}>
        <Pill label={formatNoteTypeLabel(note.noteType)} tone="gold" />
        <Text style={typography.title}>{note.title}</Text>
        <Text style={styles.heroCopy}>{formatDate(note.createdAt)}</Text>
        <View style={styles.linkRow}>
          {note.materialId ? (
            <Link href={`/materials/${note.materialId}` as any} asChild>
              <Pressable style={({ pressed }) => [styles.linkChip, pressed && styles.pressed]}>
                <Text style={styles.linkChipText}>Source material</Text>
              </Pressable>
            </Link>
          ) : null}
          {note.courseId ? (
            <Link href={`/courses/${note.courseId}` as any} asChild>
              <Pressable style={({ pressed }) => [styles.linkChip, pressed && styles.pressed]}>
                <Text style={styles.linkChipText}>Course</Text>
              </Pressable>
            </Link>
          ) : null}
        </View>
      </Card>

      <ScrollView contentContainerStyle={styles.stack}>
        <View style={styles.stack}>
          {sections.map((section, index) => (
            <Card key={`${section.title ?? "section"}-${index}`} style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{section.title ?? `Section ${index + 1}`}</Text>
              <View style={styles.sectionBody}>
                {section.blocks.map((block, blockIndex) => (
                  <View key={blockIndex} style={block.kind === "paragraph" ? undefined : styles.lineRow}>
                    {block.kind === "paragraph" ? (
                      <Text style={styles.paragraphText}>{block.text}</Text>
                    ) : (
                      <>
                        <Text style={styles.lineMarker}>{block.kind === "numbered" ? `${blockIndex + 1}.` : "•"}</Text>
                        <Text style={styles.lineText}>{block.text}</Text>
                      </>
                    )}
                  </View>
                ))}
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.stack}>
          <SectionHeader eyebrow="Key Terms" title="Recall anchors" />
          {keyTerms.length ? (
            <Card style={styles.termCard}>
              <View style={styles.termWrap}>
                {keyTerms.map((term) => (
                  <View key={term} style={styles.termChip}>
                    <Text style={styles.termChipText}>{term}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : (
            <EmptyState title="No key terms yet" description="This note did not return tagged recall anchors." />
          )}

          <SectionHeader eyebrow="Exam Mode" title="Practice prompts" />
          {examQuestions.length ? (
            <View style={styles.stack}>
              {examQuestions.map((question) => (
                <Card key={question}>
                  <Text style={styles.questionText}>{question}</Text>
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState title="No exam prompts yet" description="Exam-style prompts appear here when available in metadata." />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.md
  },
  heroCopy: {
    ...typography.subtitle
  },
  linkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  linkChip: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  linkChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  stack: {
    gap: spacing.md
  },
  sectionCard: {
    gap: spacing.md
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  sectionBody: {
    gap: spacing.sm
  },
  paragraphText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24
  },
  lineRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  lineMarker: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "900",
    paddingTop: 1
  },
  lineText: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    lineHeight: 24
  },
  termCard: {
    gap: spacing.sm
  },
  termWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  termChip: {
    backgroundColor: colors.goldSoft,
    borderColor: "rgba(246,215,139,0.28)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  termChipText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: "800"
  },
  questionText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22
  },
  warningTitle: {
    color: colors.ember,
    fontSize: 15,
    fontWeight: "900"
  },
  warningCopy: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 6
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }]
  }
});
