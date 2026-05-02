import { formatCitationLocation, normalizeCitationSnippet, type ChatAnswerStyle, type ChatCitation, type ChatThreadCreateDTO, type ChatThreadDTO, type RAGAnswerDTO } from "@campusstudy/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, EmptyState, Pill, SectionHeader } from "../../components/primitives";
import { Screen } from "../../components/screen";
import { apiFetch } from "../../lib/api";
import { useSession } from "../../lib/session";
import { colors, radius, spacing, typography } from "../../lib/theme";

const answerStyles: ChatAnswerStyle[] = ["exam-oriented", "concise", "beginner", "detailed", "bullet-summary"];

export default function ChatScreen() {
  const params = useLocalSearchParams<{ threadId?: string | string[] }>();
  const routeThreadId = Array.isArray(params.threadId) ? params.threadId[0] : params.threadId;
  const threadId = routeThreadId;
  const { token, hydrated } = useSession();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [draftStyle, setDraftStyle] = useState<ChatAnswerStyle>("exam-oriented");
  const [strictMode, setStrictMode] = useState(true);

  const threadQuery = useQuery<ChatThreadDTO>({
    queryKey: ["mobile-chat-thread", threadId],
    queryFn: () => apiFetch<ChatThreadDTO>(`/chat/threads/${threadId}`, { token }),
    enabled: hydrated && Boolean(token) && Boolean(threadId)
  });

  const createThreadMutation = useMutation({
    mutationFn: () =>
      apiFetch<ChatThreadDTO>("/chat/threads", {
        body: JSON.stringify({
          answerStyle: draftStyle,
          scopeType: "workspace",
          strictMode,
          title: strictMode ? "Mobile strict-source sprint" : "Mobile study sprint"
        } satisfies ChatThreadCreateDTO),
        method: "POST",
        token
      }),
    onSuccess: (thread) => {
      void queryClient.invalidateQueries({ queryKey: ["mobile-chat-threads"] });
      router.replace(`/chat/${thread.id}` as any);
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      apiFetch<RAGAnswerDTO>(`/chat/threads/${threadId}/messages`, {
        body: JSON.stringify({ content }),
        method: "POST",
        token
      }),
    onSuccess: () => {
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: ["mobile-chat-thread", threadId] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-chat-threads"] });
    }
  });

  const thread = threadQuery.data;
  const assistantMessages = thread?.messages.filter((item) => item.role === "assistant") ?? [];
  const citations = assistantMessages.flatMap((item) => item.citations);
  const canSend = Boolean(token && threadId && thread) && message.trim().length > 0 && !sendMessageMutation.isPending;

  return (
    <Screen>
      <Card tone="accent" style={styles.hero}>
        <View style={styles.heroTopline}>
          <Pill label={thread ? "Source chat" : "Start chat"} tone={thread ? "tide" : "gold"} />
          {threadQuery.isFetching ? <ActivityIndicator color={colors.tide} /> : null}
        </View>
        <Text style={typography.title}>{thread?.title ?? "Source-grounded chat"}</Text>
        <Text style={styles.heroCopy}>
          {thread?.strictMode ?? strictMode ? "Strict-source mode is on: answers should cite uploaded material or refuse gracefully." : "Open study mode with source citations when available."}
        </Text>
      </Card>

      {!token && hydrated ? (
        <Card tone="warning">
          <Text style={styles.noticeTitle}>Sign in to create chat threads</Text>
          <Text style={styles.noticeCopy}>Sign in to create persisted threads, ask follow-ups, and save citations.</Text>
          <Link href="/login" asChild>
            <Pressable style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}>
              <Text style={styles.inlineButtonText}>Sign in</Text>
            </Pressable>
          </Link>
        </Card>
      ) : null}

      {!thread && token ? (
        <Card tone="strong" style={styles.createCard}>
          <Text style={styles.cardTitle}>Start a live workspace thread</Text>
          <Text style={styles.cardCopy}>Choose an answer style, keep strict citations on for exam prep, then ask against your uploaded materials.</Text>
          <View style={styles.chipRow}>
            {answerStyles.map((style) => (
              <Pressable
                key={style}
                onPress={() => setDraftStyle(style)}
                style={({ pressed }) => [styles.chip, draftStyle === style && styles.activeChip, pressed && styles.pressed]}
              >
                <Text style={[styles.chipText, draftStyle === style && styles.activeChipText]}>{style}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => setStrictMode((value) => !value)}
            style={({ pressed }) => [styles.strictToggle, strictMode && styles.strictToggleActive, pressed && styles.pressed]}
          >
            <Text style={styles.strictText}>{strictMode ? "Strict source mode on" : "Strict source mode off"}</Text>
          </Pressable>
          <Pressable
            disabled={createThreadMutation.isPending}
            onPress={() => createThreadMutation.mutate()}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, createThreadMutation.isPending && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>{createThreadMutation.isPending ? "Starting..." : "Start live thread"}</Text>
          </Pressable>
        </Card>
      ) : null}

      {threadQuery.isError ? (
        <Card tone="warning">
          <Text style={styles.noticeTitle}>Could not load this thread</Text>
          <Text style={styles.noticeCopy}>Open a recent thread from Study or create a new workspace thread.</Text>
        </Card>
      ) : null}

      <SectionHeader eyebrow="Conversation" title="Source-grounded thread" action={thread ? `${thread.messages.length} turns` : undefined} />
      <View style={styles.messageStack}>
        {thread?.messages.length ? (
          thread.messages.map((item) => (
            <View key={item.id} style={[styles.messageBubble, item.role === "assistant" ? styles.assistantBubble : styles.userBubble]}>
              <Text style={styles.messageRole}>{item.role === "assistant" ? "CampusStudy AI" : "You"}</Text>
              <Text style={styles.messageText}>{item.content}</Text>
              {item.citations.length ? (
                <View style={styles.citationInline}>
                  <Text style={styles.citationInlineText}>
                    {item.citations.length} citation{item.citations.length === 1 ? "" : "s"} attached
                  </Text>
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <EmptyState title="No messages yet" description="Ask a question about the selected source scope to start this thread." />
        )}
      </View>

      <Card tone="strong" style={styles.composerCard}>
        <TextInput
          editable={Boolean(token && threadId && thread)}
          multiline
          onChangeText={setMessage}
          placeholder={thread ? "Ask about exam traps, lecture concepts, or confusing passages..." : "Start a thread before sending."}
          placeholderTextColor={colors.dim}
          style={styles.composerInput}
          value={message}
        />
        {sendMessageMutation.isError ? <Text style={styles.errorText}>{(sendMessageMutation.error as Error).message}</Text> : null}
        <Pressable
          disabled={!canSend}
          onPress={() => sendMessageMutation.mutate(message.trim())}
          style={({ pressed }) => [styles.primaryButton, (!canSend || sendMessageMutation.isPending) && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>{sendMessageMutation.isPending ? "Asking..." : "Ask with sources"}</Text>
        </Pressable>
      </Card>

      <SectionHeader eyebrow="Citation Tray" title="Evidence used" action={citations.length ? `${citations.length}` : undefined} />
      <View style={styles.citationStack}>
        {citations.length ? (
          citations.map((citation) => (
            <Card key={`${citation.chunkId}-${citation.sourceLabel}`} style={styles.citationCard}>
              <View style={styles.citationTopline}>
                <Text style={styles.citationSource}>{citation.sourceLabel}</Text>
                <Text style={styles.citationLocation}>{formatCitationLocation(citation)}</Text>
              </View>
              <Text style={styles.citationSnippet}>{normalizeCitationSnippet(citation.snippet)}</Text>
            </Card>
          ))
        ) : (
          <EmptyState title="No citations yet" description="Strict mode will show source chunks here once the API retrieves matching material." />
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
    ...typography.subtitle,
    maxWidth: 330
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
  createCard: {
    gap: spacing.md
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  cardCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  activeChip: {
    backgroundColor: colors.tideSoft,
    borderColor: "rgba(115,201,199,0.42)"
  },
  chipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  activeChipText: {
    color: colors.tide
  },
  strictToggle: {
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md
  },
  strictToggleActive: {
    backgroundColor: colors.goldSoft,
    borderColor: "rgba(246,215,139,0.34)"
  },
  strictText: {
    color: colors.text,
    fontWeight: "900"
  },
  messageStack: {
    gap: spacing.md
  },
  messageBubble: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg
  },
  assistantBubble: {
    backgroundColor: colors.tideSoft,
    borderColor: "rgba(115,201,199,0.28)"
  },
  userBubble: {
    backgroundColor: colors.panel,
    borderColor: colors.line
  },
  messageRole: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.8,
    textTransform: "uppercase"
  },
  messageText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.sm
  },
  citationInline: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(7,17,29,0.48)",
    borderRadius: 999,
    marginTop: spacing.md,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  citationInlineText: {
    color: colors.tide,
    fontSize: 12,
    fontWeight: "900"
  },
  composerCard: {
    gap: spacing.md
  },
  composerInput: {
    backgroundColor: colors.ink,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 120,
    padding: spacing.md,
    textAlignVertical: "top"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.tide,
    borderRadius: radius.md,
    padding: spacing.md
  },
  primaryButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.5
  },
  errorText: {
    color: colors.ember,
    fontSize: 13,
    lineHeight: 18
  },
  citationStack: {
    gap: spacing.md
  },
  citationCard: {
    padding: spacing.md
  },
  citationTopline: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  citationSource: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: "900"
  },
  citationLocation: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900"
  },
  citationSnippet: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm
  },
  pressed: {
    opacity: 0.74,
    transform: [{ scale: 0.99 }]
  }
});
