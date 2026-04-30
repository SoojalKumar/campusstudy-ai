import type { FlashcardDTO, FlashcardDeckDTO, FlashcardReviewDTO } from "@campusstudy/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card, EmptyState, Pill, ProgressBar, SectionHeader } from "../../components/primitives";
import { Screen } from "../../components/screen";
import { apiFetch } from "../../lib/api";
import { useSession } from "../../lib/session";
import { colors, radius, spacing, typography } from "../../lib/theme";

const reviewActions = [
  { label: "Again", rating: 1, helper: "Tomorrow", tone: "danger" },
  { label: "Hard", rating: 2, helper: "Soon", tone: "ember" },
  { label: "Good", rating: 4, helper: "Later", tone: "tide" },
  { label: "Easy", rating: 5, helper: "Long", tone: "success" }
] as const;

function isDue(card: FlashcardDTO) {
  if (!card.dueAt) return true;
  const dueAt = Date.parse(card.dueAt);
  return Number.isNaN(dueAt) || dueAt <= Date.now();
}

function formatDue(dueAt?: string | null) {
  if (!dueAt) return "Due now";
  const parsed = Date.parse(dueAt);
  if (Number.isNaN(parsed)) return "Due now";
  const deltaDays = Math.ceil((parsed - Date.now()) / 86_400_000);
  if (deltaDays <= 0) return "Due now";
  if (deltaDays === 1) return "Due tomorrow";
  return `Due in ${deltaDays} days`;
}

export default function FlashcardsScreen() {
  const params = useLocalSearchParams<{ deckId?: string | string[] }>();
  const routeDeckId = Array.isArray(params.deckId) ? params.deckId[0] : params.deckId;
  const deckId = routeDeckId;
  const { token, hydrated } = useSession();
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => new Set());

  const deckQuery = useQuery<FlashcardDeckDTO>({
    queryKey: ["flashcard-deck", deckId],
    queryFn: () => apiFetch<FlashcardDeckDTO>(`/flashcards/decks/${deckId}`, { token }),
    enabled: hydrated && Boolean(token) && Boolean(deckId)
  });

  const reviewMutation = useMutation({
    mutationFn: ({ flashcardId, rating }: { flashcardId: string; rating: number }) =>
      apiFetch<FlashcardReviewDTO>(`/flashcards/decks/${deckId}/review`, {
        body: JSON.stringify({ flashcardId, rating }),
        method: "POST",
        token
      }),
    onSuccess: (_payload, variables) => {
      setReviewedIds((current) => {
        const next = new Set(current);
        next.add(variables.flashcardId);
        return next;
      });
      setActiveIndex(0);
      setRevealed(false);
      void queryClient.invalidateQueries({ queryKey: ["flashcard-deck", deckId] });
    }
  });

  const deck = deckQuery.data;
  const dueCards = deck?.flashcards.filter((card) => isDue(card) && !reviewedIds.has(card.id)) ?? [];
  const activeCard = dueCards[activeIndex] ?? dueCards[0];
  const completedCount = deck ? deck.flashcards.length - dueCards.length : 0;
  const progress = deck?.flashcards.length ? completedCount / deck.flashcards.length : 0;

  const reviewCard = (card: FlashcardDTO, rating: number) => {
    reviewMutation.mutate({ flashcardId: card.id, rating });
  };

  if (!deck && hydrated) {
    return (
      <Screen>
        <Card tone="warning">
          <Text style={styles.noticeText}>{token ? "Deck not found" : "Sign in to review flashcards"}</Text>
        </Card>
      </Screen>
    );
  }

  if (!deck) {
    return (
      <Screen>
        <Card tone="accent"><Text style={styles.noticeText}>Loading flashcards...</Text></Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={typography.eyebrow}>Flashcard Sprint</Text>
          <Text style={styles.title}>{deck.title}</Text>
        </View>
        <Pill label={`${dueCards.length} due`} tone={dueCards.length ? "gold" : "tide"} />
      </View>

      {deckQuery.isError ? (
        <Card tone="warning" style={styles.notice}>
          <Text style={styles.noticeText}>Could not load this deck. Open a deck from your study tab and try again.</Text>
        </Card>
      ) : null}

      <Card tone="accent" style={styles.progressCard}>
        <View style={styles.progressMeta}>
          <Text style={styles.progressLabel}>Review progress</Text>
          <Text style={styles.progressValue}>
            {completedCount}/{deck.flashcards.length}
          </Text>
        </View>
        <ProgressBar value={progress} />
      </Card>

      {activeCard ? (
        <View style={styles.reviewStack}>
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            style={({ pressed }) => [styles.reviewCard, pressed && styles.pressed]}
          >
            <View style={styles.cardTopRow}>
              <Text style={styles.cardSide}>{revealed ? "Back" : "Front"}</Text>
              <Text style={styles.cardDue}>{formatDue(activeCard.dueAt)}</Text>
            </View>
            <Text style={styles.prompt}>{revealed ? activeCard.back : activeCard.front}</Text>
            {revealed && activeCard.explanation ? (
              <Text style={styles.explanation}>{activeCard.explanation}</Text>
            ) : null}
            <View style={styles.tagRow}>
              {activeCard.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </Pressable>

          {!revealed ? (
            <Pressable style={({ pressed }) => [styles.revealButton, pressed && styles.pressed]} onPress={() => setRevealed(true)}>
              <Text style={styles.revealButtonText}>Reveal answer</Text>
            </Pressable>
          ) : (
            <View style={styles.actionGrid}>
              {reviewActions.map((action) => (
                <Pressable
                  disabled={!token || reviewMutation.isPending}
                  key={action.label}
                  onPress={() => reviewCard(activeCard, action.rating)}
                  style={({ pressed }) => [
                    styles.reviewAction,
                    styles[action.tone],
                    pressed && styles.pressed,
                    reviewMutation.isPending && styles.disabled
                  ]}
                >
                  <Text style={styles.reviewActionLabel}>{action.label}</Text>
                  <Text style={styles.reviewActionHelper}>{action.helper}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ) : (
        <EmptyState title="Review sprint complete" description="All due cards are handled. New due cards will appear here after the next spacing window." />
      )}

      <SectionHeader eyebrow="Deck Queue" title="Upcoming cards" />
      <View style={styles.queue}>
        {deck.flashcards.map((card) => (
          <Pressable
            key={card.id}
            onPress={() => {
              const index = dueCards.findIndex((dueCard) => dueCard.id === card.id);
              if (index >= 0) {
                setActiveIndex(index);
                setRevealed(false);
              }
            }}
            style={({ pressed }) => [styles.queueRow, pressed && styles.pressed]}
          >
            <View style={styles.queueText}>
              <Text style={styles.queueTitle}>{card.front}</Text>
              <Text style={styles.queueMeta}>
                {card.difficulty} - {formatDue(card.dueAt)}
              </Text>
            </View>
            <Text style={[styles.queueStatus, reviewedIds.has(card.id) && styles.queueDone]}>
              {reviewedIds.has(card.id) ? "Done" : isDue(card) ? "Due" : "Later"}
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
    marginTop: spacing.xs
  },
  notice: {
    padding: spacing.md
  },
  noticeText: {
    color: colors.gold,
    fontSize: 13,
    lineHeight: 19
  },
  progressCard: {
    gap: spacing.md
  },
  progressMeta: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  progressLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  progressValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  reviewStack: {
    gap: spacing.md
  },
  reviewCard: {
    backgroundColor: colors.panelStrong,
    borderColor: "rgba(115,201,199,0.28)",
    borderRadius: radius.xl,
    borderWidth: 1,
    minHeight: 330,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 24
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  },
  cardTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  cardSide: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase"
  },
  cardDue: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  prompt: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 36,
    marginTop: 44
  },
  explanation: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.md
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xl
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  tagText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800"
  },
  revealButton: {
    backgroundColor: colors.tide,
    borderRadius: radius.md,
    padding: spacing.md
  },
  revealButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center"
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  reviewAction: {
    borderRadius: radius.md,
    flexBasis: "48%",
    flexGrow: 1,
    padding: spacing.md
  },
  danger: {
    backgroundColor: "rgba(255,143,163,0.24)"
  },
  ember: {
    backgroundColor: colors.emberSoft
  },
  tide: {
    backgroundColor: colors.tideSoft
  },
  success: {
    backgroundColor: "rgba(158,230,181,0.18)"
  },
  disabled: {
    opacity: 0.5
  },
  reviewActionLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  reviewActionHelper: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4
  },
  queue: {
    gap: spacing.sm
  },
  queueRow: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md
  },
  queueText: {
    flex: 1
  },
  queueTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20
  },
  queueMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
    textTransform: "capitalize"
  },
  queueStatus: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  queueDone: {
    color: colors.success
  }
});
