import type { CourseSummary } from "@campusstudy/types";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Card, EmptyState, Pill, ProgressBar, SectionHeader } from "../../components/primitives";
import { Screen } from "../../components/screen";
import { apiFetch } from "../../lib/api";
import { mobileCourses } from "../../lib/demo-data";
import { useSession } from "../../lib/session";
import { colors, spacing, typography } from "../../lib/theme";

function courseReadiness(course: CourseSummary) {
  const materialSignal = Math.min(1, course.materialCount / 12);
  const topicSignal = Math.min(1, course.topicCount / 8);
  return Math.max(0.2, (materialSignal + topicSignal) / 2);
}

function CourseCard({ course }: { course: CourseSummary }) {
  const readiness = courseReadiness(course);
  return (
    <Link href={`/courses/${course.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.coursePressable, pressed && styles.pressed]}>
        <Card style={styles.courseCard}>
          <View style={styles.courseHeader}>
            <View style={styles.courseTitleGroup}>
              <Pill label={course.code} tone="tide" />
              <Text style={styles.courseTitle}>{course.title}</Text>
              <Text style={styles.courseDepartment}>{course.departmentName}</Text>
            </View>
            <View style={styles.readinessBadge}>
              <Text style={styles.readinessValue}>{Math.round(readiness * 100)}</Text>
              <Text style={styles.readinessLabel}>ready</Text>
            </View>
          </View>
          <View style={styles.courseMeta}>
            <Text style={styles.metaText}>{course.topicCount} topics</Text>
            <Text style={styles.metaText}>{course.materialCount} materials</Text>
          </View>
          <ProgressBar value={readiness} />
        </Card>
      </Pressable>
    </Link>
  );
}

export default function CoursesScreen() {
  const { token, hydrated } = useSession();
  const coursesQuery = useQuery<CourseSummary[]>({
    queryKey: ["mobile-courses"],
    queryFn: () => apiFetch<CourseSummary[]>("/courses", { token }),
    enabled: hydrated && Boolean(token)
  });
  const courses = coursesQuery.data ?? mobileCourses;
  const isDemoMode = hydrated && !token;

  return (
    <Screen>
      <Card tone="accent" style={styles.hero}>
        <View style={styles.heroTopline}>
          <Pill label={isDemoMode ? "Demo semester" : "Live courses"} tone={isDemoMode ? "gold" : "tide"} />
          {coursesQuery.isFetching ? <ActivityIndicator color={colors.tide} /> : null}
        </View>
        <Text style={typography.title}>Course command center</Text>
        <Text style={styles.heroCopy}>
          Jump from a class into topic folders, uploaded lectures, generated study packs, and mobile review loops.
        </Text>
      </Card>

      {coursesQuery.error ? (
        <Card tone="warning">
          <Text style={styles.warningTitle}>Could not load live courses</Text>
          <Text style={styles.warningCopy}>{(coursesQuery.error as Error).message}</Text>
        </Card>
      ) : null}

      <SectionHeader eyebrow="Semester" title="Your courses" action={`${courses.length} active`} />
      {courses.length ? (
        <View style={styles.stack}>
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </View>
      ) : (
        <EmptyState title="No courses yet" description="Enroll in a course to unlock study packs and uploads." />
      )}
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
  stack: {
    gap: spacing.md
  },
  coursePressable: {
    borderRadius: 28
  },
  pressed: {
    opacity: 0.74,
    transform: [{ scale: 0.99 }]
  },
  courseCard: {
    gap: spacing.md
  },
  courseHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  courseTitleGroup: {
    flex: 1,
    paddingRight: spacing.md
  },
  courseTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
    marginTop: spacing.md
  },
  courseDepartment: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 5
  },
  readinessBadge: {
    alignItems: "center",
    backgroundColor: colors.goldSoft,
    borderColor: "rgba(246,215,139,0.24)",
    borderRadius: 999,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    width: 68
  },
  readinessValue: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: "900"
  },
  readinessLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  courseMeta: {
    flexDirection: "row",
    gap: spacing.sm
  },
  metaText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
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
  }
});
