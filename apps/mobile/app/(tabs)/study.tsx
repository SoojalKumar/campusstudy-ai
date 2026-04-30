import type { ChatThreadCreateDTO, ChatThreadDTO, FlashcardDeckDTO, QuizSetDTO } from "@campusstudy/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Card, EmptyState, Pill, SectionHeader } from "../../components/primitives";
import { Screen } from "../../components/screen";
import { apiFetch } from "../../lib/api";
import { useSession } from "../../lib/session";
import { colors, spacing, typography } from "../../lib/theme";

export default function StudyTabScreen() {
  const { token, hydrated } = useSession();
  const isLive = hydrated && Boolean(token);
  const deckListQuery = useQuery<FlashcardDeckDTO[]>({
    queryKey: ["mobile-flashcard-decks"],
    queryFn: () => apiFetch<FlashcardDeckDTO[]>("/flashcards/decks", { token }),
    enabled: isLive
  });
  const quizListQuery = useQuery<QuizSetDTO[]>({
    queryKey: ["mobile-quiz-sets"],
    queryFn: () => apiFetch<QuizSetDTO[]>("/quizzes/sets", { token }),
    enabled: isLive
  });
  const threadListQuery = useQuery<ChatThreadDTO[]>({
    queryKey: ["mobile-chat-threads"],
    queryFn: () => apiFetch<ChatThreadDTO[]>("/chat/threads", { token }),
    enabled: isLive
  });

  const createThreadMutation = useMutation({
    mutationFn: () =>
      apiFetch<ChatThreadDTO>("/chat/threads", {
        body: JSON.stringify({
          answerStyle: "exam-oriented",
          scopeType: "workspace",
          strictMode: true,
          title: "Mobile exam sprint"
        } satisfies ChatThreadCreateDTO),
        method: "POST",
        token
      }),
    onSuccess: (thread) => router.push(`/chat/${thread.id}` as any)
  });

  const firstDeck = deckListQuery.data?.[0];
  const firstQuiz = quizListQuery.data?.[0];
  const recentThread = threadListQuery.data?.[0];
  const displayDeck = firstDeck ?? null;
  const displayQuiz = firstQuiz ?? null;
  const deckHref = firstDeck ? `/flashcards/${firstDeck.id}` : null;
  const quizHref = firstQuiz ? `/quizzes/${firstQuiz.id}` : null;
  const chatHref = recentThread ? `/chat/${recentThread.id}` : null;
  const isLoading = deckListQuery.isFetching || quizListQuery.isFetching || threadListQuery.isFetching;

  return (
    <Screen>
      <Card tone="accent" style={styles.hero}>
        <View style={styles.heroTopline}>
          <Pill label={isLive ? "Workspace" : "Sign in required"} tone={isLive ? "tide" : "gold"} />
          {isLoading ? <ActivityIndicator color={colors.tide} /> : null}
        </View>
        <Text style={typography.title}>Pocket study cockpit</Text>
        <Text style={styles.heroCopy}>
          Jump into due cards, a scored quiz, or a source-grounded chat thread without hunting through courses.
        </Text>
      </Card>

      {!isLive ? (
        <Card tone="warning">
          <Text style={styles.noticeTitle}>Sign in to study on mobile</Text>
          <Text style={styles.noticeCopy}>Your decks, quizzes, and persisted chat threads sync from the API.</Text>
          <Link href="/login" asChild>
            <Pressable style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}>
              <Text style={styles.inlineButtonText}>Sign in</Text>
            </Pressable>
          </Link>
        </Card>
      ) : null}

      <View style={styles.modeGrid}>
        {deckHref ? <Link href={deckHref as any} asChild>
          <Pressable style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}>
            <Text style={styles.modeEyebrow}>Spaced repetition</Text>
            <Text style={styles.modeTitle}>Flashcards</Text>
            <Text style={styles.modeCopy}>{firstDeck?.title}</Text>
          </Pressable>
        </Link> : null}
        {quizHref ? <Link href={quizHref as any} asChild>
          <Pressable style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}>
            <Text style={styles.modeEyebrow}>Active recall</Text>
            <Text style={styles.modeTitle}>Quiz player</Text>
            <Text style={styles.modeCopy}>{firstQuiz?.title}</Text>
          </Pressable>
        </Link> : null}
        {recentThread ? (
          <Link href={chatHref as any} asChild>
            <Pressable style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}>
              <Text style={styles.modeEyebrow}>RAG workspace</Text>
              <Text style={styles.modeTitle}>Chat with sources</Text>
              <Text style={styles.modeCopy}>{recentThread.title}</Text>
            </Pressable>
          </Link>
        ) : (
          <Pressable
            disabled={createThreadMutation.isPending}
            onPress={() => {
              if (token) {
                createThreadMutation.mutate();
                return;
              }
            }}
            style={({ pressed }) => [
              styles.modeCard,
              styles.featuredMode,
              pressed && styles.pressed,
              createThreadMutation.isPending && styles.disabled
            ]}
          >
            <Text style={styles.modeEyebrow}>RAG workspace</Text>
            <Text style={styles.modeTitle}>{createThreadMutation.isPending ? "Starting..." : "Chat with sources"}</Text>
            <Text style={styles.modeCopy}>
              {token ? "Create a strict-source workspace thread." : "Sign in to create a cited chat thread."}
            </Text>
          </Pressable>
        )}
      </View>

      <SectionHeader eyebrow="Live Assets" title="Ready study packs" />
      <View style={styles.assetStack}>
        {displayDeck || displayQuiz ? (
          <>
            {displayDeck ? <AssetRow label="Deck" title={displayDeck.title} meta={displayDeck.sourceScope} href={`/flashcards/${displayDeck.id}`} /> : null}
            {displayQuiz ? (
              <AssetRow label="Quiz" title={displayQuiz.title} meta={`${displayQuiz.questionCount} questions`} href={`/quizzes/${displayQuiz.id}`} />
            ) : null}
          </>
        ) : (
          <EmptyState title="No study packs yet" description="Generate flashcards and quizzes from uploaded course material to fill this queue." />
        )}
      </View>
    </Screen>
  );
}

function AssetRow({ label, title, meta, href }: { label: string; title: string; meta: string; href: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable style={({ pressed }) => [styles.assetRow, pressed && styles.pressed]}>
        <View style={styles.assetCopy}>
          <Text style={styles.assetLabel}>{label}</Text>
          <Text style={styles.assetTitle}>{title}</Text>
          <Text style={styles.assetMeta}>{meta}</Text>
        </View>
        <Text style={styles.assetAction}>Open</Text>
      </Pressable>
    </Link>
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
    ...typography.subtitle,
    maxWidth: 320
  },
  noticeTitle: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: "900"
  },
  noticeCopy: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  inlineButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.gold,
    borderRadius: 999,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  inlineButtonText: {
    color: colors.ink,
    fontWeight: "900"
  },
  modeGrid: {
    gap: spacing.md
  },
  modeCard: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 28,
    borderWidth: 1,
    padding: spacing.lg
  },
  featuredMode: {
    borderColor: "rgba(115,201,199,0.34)"
  },
  modeEyebrow: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.8,
    textTransform: "uppercase"
  },
  modeTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: spacing.sm
  },
  modeCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  assetStack: {
    gap: spacing.md
  },
  assetRow: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md
  },
  assetCopy: {
    flex: 1,
    paddingRight: spacing.md
  },
  assetLabel: {
    color: colors.tide,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  assetTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4
  },
  assetMeta: {
    color: colors.dim,
    fontSize: 12,
    marginTop: 4
  },
  assetAction: {
    color: colors.tide,
    fontWeight: "900"
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }]
  },
  disabled: {
    opacity: 0.55
  }
});
