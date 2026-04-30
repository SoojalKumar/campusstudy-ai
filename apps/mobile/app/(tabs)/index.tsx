import type { ChatThreadDTO, DashboardSnapshot, FlashcardDeckDTO } from "@campusstudy/types";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionRow, Card, EmptyState, MetricTile, Pill, ProgressBar, SectionHeader } from "../../components/primitives";
import { Screen } from "../../components/screen";
import { apiFetch } from "../../lib/api";
import { useSession } from "../../lib/session";
import { colors, spacing, typography } from "../../lib/theme";

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function MobileDashboardScreen() {
  const { token, hydrated } = useSession();
  const dashboardQuery = useQuery<DashboardSnapshot & { latestNotes?: Array<{ id: string; title: string; noteType: string; contentMarkdown?: string | null }> }>({
    queryKey: ["mobile-dashboard"],
    queryFn: () => apiFetch<DashboardSnapshot & { latestNotes?: Array<{ id: string; title: string; noteType: string; contentMarkdown?: string | null }> }>("/dashboard/overview", { token }),
    enabled: hydrated && Boolean(token)
  });
  const deckListQuery = useQuery<FlashcardDeckDTO[]>({
    queryKey: ["mobile-flashcard-decks"],
    queryFn: () => apiFetch<FlashcardDeckDTO[]>("/flashcards/decks", { token }),
    enabled: hydrated && Boolean(token)
  });
  const threadListQuery = useQuery<ChatThreadDTO[]>({
    queryKey: ["mobile-chat-threads"],
    queryFn: () => apiFetch<ChatThreadDTO[]>("/chat/threads", { token }),
    enabled: hydrated && Boolean(token)
  });
  const dashboard = dashboardQuery.data;
  const needsSignIn = hydrated && !token;
  const weakestTopic = dashboard?.weakTopics[0];
  const reviewHref = deckListQuery.data?.[0]?.id ? `/flashcards/${deckListQuery.data[0].id}` : null;
  const chatHref = threadListQuery.data?.[0]?.id ? `/chat/${threadListQuery.data[0].id}` : null;

  return (
    <Screen>
      <Card tone="accent" style={styles.hero}>
        <View style={styles.heroTopline}>
          <Pill label={token ? "Workspace" : "Sign in required"} tone={token ? "tide" : "gold"} />
          {dashboardQuery.isFetching ? <ActivityIndicator color={colors.tide} /> : null}
        </View>
        <Text style={typography.title}>Today's study stack</Text>
        <Text style={styles.heroCopy}>
          Pick the next useful action before class: review due cards, patch a weak topic, or skim the latest notes.
        </Text>
        <View style={styles.heroActions}>
          {reviewHref ? <Link href={reviewHref as any} asChild>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Start review</Text>
            </Pressable>
          </Link> : null}
          {chatHref ? <Link href={chatHref as any} asChild>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <Text style={styles.secondaryButtonText}>Ask sources</Text>
            </Pressable>
          </Link> : null}
        </View>
      </Card>

      {needsSignIn ? (
        <Card tone="warning">
          <Text style={styles.noticeTitle}>Sign in to load your workspace</Text>
          <Text style={styles.noticeCopy}>Dashboard metrics, due cards, notes, uploads, and chat history are account-scoped.</Text>
        </Card>
      ) : null}

      {dashboard ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricRail}>
          <MetricTile label="Streak" value={`${dashboard.streakDays}d`} helper="Protect the rhythm." tone="gold" />
          <MetricTile label="Due cards" value={`${dashboard.dueFlashcards}`} helper="Best mobile sprint." />
          <MetricTile label="Quiz avg" value={formatPercent(dashboard.recentQuizAverage)} helper="Recent attempts." tone="ember" />
        </ScrollView>
      ) : null}

      <View style={styles.section}>
        <SectionHeader eyebrow="Revision Radar" title="Weak topics" action={weakestTopic ? formatPercent(weakestTopic.mastery) : undefined} />
        {dashboard?.weakTopics.length ? (
          <View style={styles.stack}>
            {dashboard.weakTopics.map((item, index) => (
              <Card key={item.topic} style={styles.topicCard}>
                <View style={styles.topicHeader}>
                  <View>
                    <Text style={styles.topicTitle}>{item.topic}</Text>
                    <Text style={styles.topicMeta}>
                      {index === 0 ? "Next best target" : "Keep warm"}
                    </Text>
                  </View>
                  <Text style={styles.topicScore}>{formatPercent(item.mastery)}</Text>
                </View>
                <ProgressBar value={item.mastery} tone={index === 0 ? "ember" : "tide"} />
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState title="No weak topics yet" description="Quiz attempts will shape your revision radar." />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Generated Notes" title="Latest study outputs" />
        <View style={styles.stack}>
          {(dashboard?.latestNotes ?? []).map((note) => (
            <ActionRow
              key={note.id}
              title={note.title}
              description={`${note.noteType.replace("_", " ")} · ${note.contentMarkdown ?? "Ready for review"}`}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Processing" title="Recent uploads" />
        <View style={styles.stack}>
          {(dashboard?.recentUploads ?? []).map((upload) => (
            <Card key={upload.id} style={styles.uploadCard}>
              <View style={styles.topicHeader}>
                <View style={styles.uploadText}>
                  <Text style={styles.topicTitle}>{upload.title}</Text>
                  <Text style={styles.topicMeta}>{upload.courseTitle}</Text>
                </View>
                <Pill label={upload.status} tone={upload.status === "completed" ? "tide" : "ember"} />
              </View>
            </Card>
          ))}
          {dashboard && !dashboard.recentUploads.length ? (
            <EmptyState title="No uploads yet" description="Upload a lecture file on web to start the study pipeline." />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.lg,
    overflow: "hidden"
  },
  heroTopline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  heroCopy: {
    ...typography.subtitle,
    maxWidth: 320
  },
  heroActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  primaryButton: {
    backgroundColor: colors.text,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13
  },
  primaryButtonText: {
    color: colors.ink,
    fontWeight: "900"
  },
  secondaryButton: {
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }]
  },
  noticeTitle: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: "900"
  },
  noticeCopy: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 6
  },
  metricRail: {
    gap: spacing.md,
    paddingRight: spacing.lg
  },
  section: {
    gap: spacing.md
  },
  stack: {
    gap: spacing.md
  },
  topicCard: {
    gap: spacing.md
  },
  topicHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  topicTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  topicMeta: {
    color: colors.dim,
    fontSize: 12,
    marginTop: 4,
    textTransform: "uppercase"
  },
  topicScore: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: "900"
  },
  uploadCard: {
    paddingVertical: spacing.md
  },
  uploadText: {
    flex: 1,
    paddingRight: spacing.md
  }
});
