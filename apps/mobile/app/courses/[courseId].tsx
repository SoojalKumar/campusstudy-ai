import { useQuery } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ActionRow, Card, EmptyState, Pill, ProgressBar, SectionHeader } from "../../components/primitives";
import { Screen } from "../../components/screen";
import { apiFetch } from "../../lib/api";
import {
  mobileCourseDetails,
  mobileCourses,
  mobileMaterialsByCourse,
  mobileNotesByCourse,
  type MobileCourseDetail,
  type MobileMaterial,
  type MobileNote
} from "../../lib/demo-data";
import { useSession } from "../../lib/session";
import { colors, spacing, typography } from "../../lib/theme";

function fallbackCourse(courseId: string): MobileCourseDetail {
  return (
    mobileCourseDetails[courseId] ?? {
      id: courseId,
      code: "COURSE",
      title: `Course ${courseId}`,
      departmentName: "Live course",
      description: "Live course details appear here after sign-in.",
      materialCount: 0,
      topicCount: 0,
      topics: []
    }
  );
}

function statusTone(status: MobileMaterial["processingStatus"]) {
  if (status === "completed") return "tide";
  if (status === "failed") return "ember";
  return "gold";
}

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const resolvedCourseId = courseId ?? "c1";
  const { token, hydrated } = useSession();
  const courseQuery = useQuery<MobileCourseDetail>({
    queryKey: ["mobile-course", resolvedCourseId],
    queryFn: () => apiFetch<MobileCourseDetail>(`/courses/${resolvedCourseId}`, { token }),
    enabled: hydrated && Boolean(token)
  });
  const materialsQuery = useQuery<MobileMaterial[]>({
    queryKey: ["mobile-materials", resolvedCourseId],
    queryFn: () => apiFetch<MobileMaterial[]>(`/materials?course_id=${resolvedCourseId}`, { token }),
    enabled: hydrated && Boolean(token)
  });
  const notesQuery = useQuery<MobileNote[]>({
    queryKey: ["mobile-notes", resolvedCourseId],
    queryFn: () => apiFetch<MobileNote[]>(`/notes/by-course/${resolvedCourseId}`, { token }),
    enabled: hydrated && Boolean(token)
  });
  const course = courseQuery.data ?? fallbackCourse(resolvedCourseId);
  const materials = materialsQuery.data ?? mobileMaterialsByCourse[resolvedCourseId] ?? [];
  const notes = notesQuery.data ?? mobileNotesByCourse[resolvedCourseId] ?? [];
  const completion = Math.max(0.12, Math.min(1, materials.filter((item) => item.processingStatus === "completed").length / Math.max(1, materials.length)));
  const isLoading = courseQuery.isFetching || materialsQuery.isFetching || notesQuery.isFetching;

  return (
    <Screen>
      <Card tone="accent" style={styles.hero}>
        <View style={styles.heroTopline}>
          <Pill label={course.code} tone="tide" />
          {isLoading ? <ActivityIndicator color={colors.tide} /> : null}
        </View>
        <Text style={typography.title}>{course.title}</Text>
        <Text style={styles.heroCopy}>{course.description ?? "Mobile study pack and course materials."}</Text>
        <View style={styles.metaRail}>
          <Text style={styles.metaText}>{course.departmentName}</Text>
          <Text style={styles.metaText}>{course.term ?? "Term"} {course.year ?? ""}</Text>
        </View>
        <ProgressBar value={completion} />
      </Card>

      <View style={styles.quickGrid}>
        <Card style={styles.quickCard}>
          <Text style={styles.quickValue}>{course.topics.length || course.topicCount}</Text>
          <Text style={styles.quickLabel}>topics</Text>
        </Card>
        <Card style={styles.quickCard}>
          <Text style={styles.quickValue}>{materials.length || course.materialCount}</Text>
          <Text style={styles.quickLabel}>materials</Text>
        </Card>
        <Card style={styles.quickCard}>
          <Text style={styles.quickValue}>{notes.length}</Text>
          <Text style={styles.quickLabel}>study packs</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Study Pack" title="Generated outputs" action={notes.length ? `${notes.length} ready` : undefined} />
        {notes.length ? (
          <View style={styles.stack}>
            {notes.map((note) => (
              <ActionRow
                key={note.id}
                title={note.title}
                description={`${note.noteType.replace("_", " ")} · ${note.contentMarkdown.slice(0, 96)}`}
              />
            ))}
          </View>
        ) : (
          <EmptyState title="No study pack yet" description="Upload materials and let the pipeline generate notes." />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Topics" title="Course map" />
        {course.topics.length ? (
          <View style={styles.topicGrid}>
            {course.topics.map((topic) => (
              <Card key={topic.id} style={styles.topicCard}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicDescription}>{topic.description ?? "Generated notes, quizzes, and source chat."}</Text>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState title="No topics loaded" description="Live topics will appear here after sign-in." />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Uploads" title="Materials" action={materials.length ? "Source ready" : undefined} />
        {materials.length ? (
          <View style={styles.stack}>
            {materials.map((material) => (
              <Link key={material.id} href={`/materials/${material.id}`} asChild>
                <Pressable style={({ pressed }) => [styles.materialRow, pressed && styles.pressed]}>
                  <View style={styles.materialText}>
                    <Text style={styles.materialTitle}>{material.title}</Text>
                    <Text style={styles.materialMeta}>
                      {material.fileType.toUpperCase()} · {material.sourceKind} · {material.processingStage}
                    </Text>
                  </View>
                  <Pill label={material.processingStatus} tone={statusTone(material.processingStatus)} />
                </Pressable>
              </Link>
            ))}
          </View>
        ) : (
          <EmptyState title="No materials yet" description="Use web upload for larger files, then review here on mobile." />
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
  metaRail: {
    flexDirection: "row",
    gap: spacing.sm
  },
  metaText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  quickGrid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  quickCard: {
    flex: 1,
    padding: spacing.md
  },
  quickValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900"
  },
  quickLabel: {
    color: colors.dim,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
    textTransform: "uppercase"
  },
  section: {
    gap: spacing.md
  },
  stack: {
    gap: spacing.md
  },
  topicGrid: {
    gap: spacing.md
  },
  topicCard: {
    gap: spacing.sm,
    padding: spacing.md
  },
  topicTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  topicDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  materialRow: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md
  },
  materialText: {
    flex: 1,
    paddingRight: spacing.md
  },
  materialTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  materialMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 5,
    textTransform: "uppercase"
  },
  pressed: {
    opacity: 0.74,
    transform: [{ scale: 0.99 }]
  }
});
