import type { QuizAttemptDTO, QuizQuestionDTO, QuizSetDTO } from "@campusstudy/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, EmptyState, Pill, ProgressBar, SectionHeader } from "../../components/primitives";
import { Screen } from "../../components/screen";
import { apiFetch } from "../../lib/api";
import { useSession } from "../../lib/session";
import { colors, radius, spacing, typography } from "../../lib/theme";

type AnswerMap = Record<string, string>;

function questionType(question: QuizQuestionDTO) {
  return question.questionType ?? question.type;
}

function isCorrect(question: QuizQuestionDTO, answer?: string) {
  if (!answer || !question.correctAnswer) return null;
  return answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
}

export default function QuizScreen() {
  const params = useLocalSearchParams<{ quizId?: string | string[] }>();
  const routeQuizId = Array.isArray(params.quizId) ? params.quizId[0] : params.quizId;
  const quizId = routeQuizId;
  const { token, hydrated } = useSession();
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [startedAt] = useState(() => Date.now());

  const quizQuery = useQuery<QuizSetDTO>({
    queryKey: ["quiz-set", quizId],
    queryFn: () => apiFetch<QuizSetDTO>(`/quizzes/sets/${quizId}`, { token }),
    enabled: hydrated && Boolean(token) && Boolean(quizId)
  });

  const quiz = quizQuery.data;

  const submitMutation = useMutation({
    mutationFn: () =>
      apiFetch<QuizAttemptDTO>("/quizzes/attempts", {
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, submittedAnswer]) => ({
            questionId,
            submittedAnswer
          })),
          durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
          quizSetId: quiz?.id
        }),
        method: "POST",
        token
      })
  });

  const attempt = submitMutation.data;
  const activeQuestion = quiz?.questions[activeIndex] ?? quiz?.questions[0];
  const selectedAnswer = activeQuestion ? answers[activeQuestion.id] : undefined;
  const activeOptions =
    activeQuestion?.options ?? (activeQuestion && questionType(activeQuestion) === "true_false" ? ["True", "False"] : []);
  const answeredCount = Object.keys(answers).length;
  const progress = quiz?.questions.length ? answeredCount / quiz.questions.length : 0;
  const canSubmit = Boolean(token && quiz) && answeredCount === (quiz?.questions.length ?? 0) && !attempt;

  const chooseAnswer = (question: QuizQuestionDTO, answer: string) => {
    if (attempt) return;
    setAnswers((current) => ({ ...current, [question.id]: answer }));
  };

  const finishQuiz = () => {
    if (!canSubmit) return;
    submitMutation.mutate();
  };

  const resetQuiz = () => {
    setAnswers({});
    setActiveIndex(0);
    submitMutation.reset();
  };

  if (!quiz && hydrated) {
    return (
      <Screen>
        <Card tone="warning">
          <Text style={styles.noticeText}>{token ? "Quiz not found" : "Sign in to take quizzes"}</Text>
        </Card>
      </Screen>
    );
  }

  if (!quiz) {
    return (
      <Screen>
        <Card tone="accent"><Text style={styles.noticeText}>Loading quiz...</Text></Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={typography.eyebrow}>Quiz Focus</Text>
          <Text style={styles.title}>{quiz.title}</Text>
        </View>
        <Pill label={quiz.difficulty} tone="tide" />
      </View>

      {quizQuery.isError ? (
        <Card tone="warning" style={styles.notice}>
          <Text style={styles.noticeText}>Could not load this quiz. Open a quiz from your study tab and try again.</Text>
        </Card>
      ) : null}

      <Card tone="accent" style={styles.progressCard}>
        <View style={styles.progressMeta}>
          <Text style={styles.progressLabel}>Answered</Text>
          <Text style={styles.progressValue}>
            {answeredCount}/{quiz.questions.length}
          </Text>
        </View>
        <ProgressBar value={progress} />
      </Card>

      {attempt ? (
        <Card tone={attempt.score >= 0.7 ? "accent" : "warning"} style={styles.resultCard}>
          <Text style={styles.resultScore}>{Math.round(attempt.score * 100)}%</Text>
          <Text style={styles.resultTitle}>
            {attempt.correctCount}/{attempt.totalQuestions} correct
          </Text>
          <Text style={styles.resultCopy}>
            Review the explanations below, then rerun this quiz after one more active recall pass.
          </Text>
          <Pressable onPress={resetQuiz} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Retake quiz</Text>
          </Pressable>
        </Card>
      ) : null}

      {activeQuestion ? (
        <Card tone="strong" style={styles.questionCard}>
          <View style={styles.questionMeta}>
            <Text style={styles.questionIndex}>
              Question {activeIndex + 1} of {quiz.questions.length}
            </Text>
            <Text style={styles.questionKind}>{questionType(activeQuestion).replace("_", " ")}</Text>
          </View>
          <Text style={styles.prompt}>{activeQuestion.prompt}</Text>
          {activeOptions.length ? (
            <View style={styles.optionStack}>
              {activeOptions.map((option) => {
                const selected = selectedAnswer === option;
                const correctness = selected ? isCorrect(activeQuestion, option) : null;
                return (
                  <Pressable
                    key={option}
                    onPress={() => chooseAnswer(activeQuestion, option)}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.selectedOption,
                      correctness === true && styles.correctOption,
                      correctness === false && styles.incorrectOption,
                      pressed && styles.pressed
                    ]}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <TextInput
              editable={!attempt}
              multiline
              onChangeText={(value) => chooseAnswer(activeQuestion, value)}
              placeholder="Type a concise answer, then compare it with the explanation."
              placeholderTextColor={colors.muted}
              style={styles.shortAnswerInput}
              value={selectedAnswer ?? ""}
            />
          )}
          {selectedAnswer ? (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationTitle}>
                {isCorrect(activeQuestion, selectedAnswer) === false ? "Watch this one" : "Explanation"}
              </Text>
              <Text style={styles.explanationText}>{activeQuestion.explanation}</Text>
            </View>
          ) : null}
        </Card>
      ) : (
        <EmptyState title="No questions yet" description="Generate a quiz from a material or course to study here." />
      )}

      <View style={styles.navRow}>
        <Pressable
          disabled={activeIndex === 0}
          onPress={() => setActiveIndex((value) => Math.max(0, value - 1))}
          style={({ pressed }) => [styles.secondaryButton, activeIndex === 0 && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>Previous</Text>
        </Pressable>
        {activeIndex < quiz.questions.length - 1 ? (
          <Pressable
            onPress={() => setActiveIndex((value) => Math.min(quiz.questions.length - 1, value + 1))}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </Pressable>
        ) : (
          <Pressable
            disabled={!canSubmit || submitMutation.isPending}
            onPress={finishQuiz}
            style={({ pressed }) => [styles.primaryButton, (!canSubmit || submitMutation.isPending) && styles.disabled, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>{submitMutation.isPending ? "Scoring..." : "Finish"}</Text>
          </Pressable>
        )}
      </View>

      <SectionHeader eyebrow="Answer Map" title="Topic feedback" />
      <View style={styles.reviewList}>
        {quiz.questions.map((question, index) => {
          const answer = answers[question.id];
          const attemptAnswer = attempt?.answers.find((item) => item.quizQuestionId === question.id);
          const correct = attemptAnswer?.isCorrect ?? isCorrect(question, answer);
          return (
            <Pressable
              key={question.id}
              onPress={() => setActiveIndex(index)}
              style={({ pressed }) => [styles.reviewRow, pressed && styles.pressed]}
            >
              <View style={styles.reviewCopy}>
                <Text style={styles.reviewTitle}>Question {index + 1}</Text>
                <Text style={styles.reviewMeta}>{answer ?? "Unanswered"}</Text>
              </View>
              <Text style={[styles.reviewStatus, correct === true && styles.correctText, correct === false && styles.incorrectText]}>
                {correct == null ? "Open" : correct ? "Correct" : "Review"}
              </Text>
            </Pressable>
          );
        })}
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
  headerText: {
    flex: 1
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
  resultCard: {
    gap: spacing.sm
  },
  resultScore: {
    color: colors.text,
    fontSize: 42,
    fontWeight: "900"
  },
  resultTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  resultCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  questionCard: {
    gap: spacing.lg
  },
  questionMeta: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  questionIndex: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.8,
    textTransform: "uppercase"
  },
  questionKind: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  prompt: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 31
  },
  optionStack: {
    gap: spacing.sm
  },
  option: {
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md
  },
  selectedOption: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(246,215,139,0.5)"
  },
  correctOption: {
    backgroundColor: "rgba(158,230,181,0.16)",
    borderColor: "rgba(158,230,181,0.45)"
  },
  incorrectOption: {
    backgroundColor: "rgba(255,143,163,0.16)",
    borderColor: "rgba(255,143,163,0.45)"
  },
  optionText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  shortAnswerInput: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 120,
    padding: spacing.md,
    textAlignVertical: "top"
  },
  explanationBox: {
    backgroundColor: colors.tideSoft,
    borderColor: "rgba(115,201,199,0.24)",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md
  },
  explanationTitle: {
    color: colors.tide,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  explanationText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  navRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  primaryButton: {
    backgroundColor: colors.tide,
    borderRadius: radius.md,
    flex: 1,
    padding: spacing.md
  },
  primaryButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center"
  },
  secondaryButton: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center"
  },
  disabled: {
    opacity: 0.45
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  },
  reviewList: {
    gap: spacing.sm
  },
  reviewRow: {
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
  reviewCopy: {
    flex: 1
  },
  reviewTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900"
  },
  reviewMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  },
  reviewStatus: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  correctText: {
    color: colors.success
  },
  incorrectText: {
    color: colors.danger
  }
});
