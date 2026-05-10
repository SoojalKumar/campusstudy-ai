"use client";

import type { QuizAttemptDTO, QuizPerformanceOverviewDTO, QuizQuestionDTO, QuizSetDTO } from "@campusstudy/types";
import { useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

import { LayoutShell } from "@/components/layout-shell";
import { apiFetch } from "@/lib/api";
import { useAuthedQuery } from "@/lib/api-hooks";
import { useSession } from "@/lib/session";

type AnswerMap = Record<string, string>;

function questionType(question: QuizQuestionDTO) {
  return question.questionType ?? question.type;
}

function isCorrect(question: QuizQuestionDTO, answer?: string) {
  if (!answer || !question.correctAnswer) return null;
  return answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
}

export default function QuizPage() {
  const params = useParams<{ quizId?: string }>();
  const quizId = params.quizId;
  const { token } = useSession();
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [startedAt] = useState(() => Date.now());

  const quizQuery = useAuthedQuery<QuizSetDTO>({
    queryKey: ["quiz-set", quizId],
    path: `/quizzes/sets/${quizId}`
  });
  const performanceQuery = useAuthedQuery<QuizPerformanceOverviewDTO>({
    queryKey: ["quiz-performance"],
    path: "/quizzes/performance/overview"
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
  const answeredCount = Object.keys(answers).length;
  const progress = quiz?.questions.length ? Math.round((answeredCount / quiz.questions.length) * 100) : 0;
  const canSubmit = Boolean(token && quiz) && answeredCount === (quiz?.questions.length ?? 0) && !attempt;
  const scorePercent = attempt ? Math.round(attempt.score * 100) : null;

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

  if (!quiz && quizQuery.hydrated) {
    return (
      <LayoutShell>
        <div className="rounded-[2.5rem] border border-[var(--line)] bg-[var(--panel)] p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-tide">Quiz Focus</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink">
            {quizQuery.hasSession ? "Quiz not found" : "Sign in to take quizzes"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Quiz sets are generated from your uploaded materials and scored against your account.
          </p>
        </div>
      </LayoutShell>
    );
  }

  if (!quiz) {
    return (
      <LayoutShell>
        <div className="rounded-[2.5rem] border border-[var(--line)] bg-[var(--panel)] p-8 text-sm text-slate-600">
          Loading quiz...
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="rounded-[2.5rem] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl shadow-slate-200/70">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-tide">Quiz Focus</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold text-ink">{quiz.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Active recall sprint with immediate rationale, final scoring, and topic mastery updates.
              </p>
            </div>
            <div className="rounded-full border border-gold/20 bg-gold/10 px-4 py-2 text-sm font-semibold capitalize text-gold">
              {quiz.difficulty}
            </div>
          </div>

          {quizQuery.isError ? (
            <p className="mt-5 rounded-2xl border border-ember/20 bg-[var(--ember-soft)] px-4 py-3 text-sm text-ember">
              This quiz could not load. Refresh or open a quiz from your dashboard.
            </p>
          ) : null}

          <div className="mt-6 overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Progress</p>
                <p className="mt-1 text-2xl font-semibold text-ink">
                  {answeredCount}/{quiz.questions.length} answered
                </p>
              </div>
              {scorePercent == null ? (
                <p className="text-sm font-semibold text-tide">{progress}% complete</p>
              ) : (
                <p className="text-sm font-semibold text-tide">{scorePercent}% scored</p>
              )}
            </div>
            <div className="h-3 bg-slate-50">
              <div
                className="h-full rounded-r-full bg-gradient-to-r from-tide to-gold transition-all duration-300"
                style={{ width: `${scorePercent ?? progress}%` }}
              />
            </div>
          </div>

          {attempt ? (
            <div className="mt-6 rounded-[2rem] border border-tide/20 bg-tide/10 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-tide">Attempt scored</p>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-6xl font-semibold text-ink">{scorePercent}%</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {attempt.correctCount}/{attempt.totalQuestions} correct in this sprint.
                  </p>
                </div>
                <button
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[var(--accent-soft)]"
                  onClick={resetQuiz}
                  type="button"
                >
                  Retake quiz
                </button>
              </div>
            </div>
          ) : null}

          {submitMutation.isError ? (
            <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Could not save this attempt. Your answers are still on screen, so you can retry.
            </p>
          ) : null}

          {activeQuestion ? (
            <div className="mt-6 rounded-[2.25rem] border border-[var(--line)] bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-gold">
                  Question {activeIndex + 1} of {quiz.questions.length}
                </p>
                <span className="rounded-full border border-[var(--line)] bg-slate-50 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                  {questionType(activeQuestion).replace("_", " ")}
                </span>
              </div>
              <h2 className="mt-6 text-3xl font-semibold leading-tight text-ink">{activeQuestion.prompt}</h2>

              {activeQuestion.options?.length ? (
                <div className="mt-6 grid gap-3">
                  {activeQuestion.options.map((option) => {
                    const selected = selectedAnswer === option;
                    const correctness = selected ? isCorrect(activeQuestion, option) : null;
                    const selectedClass = selected ? "border-gold/50 bg-gold/10 text-ink" : "border-[var(--line)] bg-slate-50 text-slate-700";
                    const feedbackClass =
                      correctness === true
                        ? "border-emerald-300/40 bg-emerald-400/10"
                        : correctness === false
                          ? "border-rose-300/40 bg-rose-400/10"
                          : "";
                    return (
                      <button
                        className={`rounded-2xl border px-5 py-4 text-left text-sm font-semibold transition hover:-translate-y-0.5 hover:border-tide/40 ${selectedClass} ${feedbackClass}`}
                        key={option}
                        onClick={() => chooseAnswer(activeQuestion, option)}
                        type="button"
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  className="mt-6 min-h-32 w-full rounded-2xl border border-[var(--line)] bg-white p-4 text-sm text-ink outline-none transition placeholder:text-slate-500 focus:border-tide/50"
                  disabled={Boolean(attempt)}
                  onChange={(event) => chooseAnswer(activeQuestion, event.target.value)}
                  placeholder="Type a concise answer, then compare it with the explanation."
                  value={selectedAnswer ?? ""}
                />
              )}

              {selectedAnswer ? (
                <div className="mt-6 rounded-2xl border border-tide/20 bg-tide/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-tide">
                    {isCorrect(activeQuestion, selectedAnswer) === false ? "Review this reasoning" : "Explanation"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{activeQuestion.explanation}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 rounded-[2rem] border border-[var(--line)] bg-white p-6">
              <p className="text-xl font-semibold text-ink">No questions yet</p>
              <p className="mt-2 text-sm text-slate-600">Generate a quiz from a document, topic, or full course.</p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-2xl border border-[var(--line)] bg-slate-50 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((value) => Math.max(0, value - 1))}
              type="button"
            >
              Previous
            </button>
            {activeIndex < quiz.questions.length - 1 ? (
              <button
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[var(--accent-soft)]"
                onClick={() => setActiveIndex((value) => Math.min(quiz.questions.length - 1, value + 1))}
                type="button"
              >
                Next question
              </button>
            ) : (
              <button
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canSubmit || submitMutation.isPending}
                onClick={finishQuiz}
                type="button"
              >
                {submitMutation.isPending ? "Scoring..." : "Finish and score"}
              </button>
            )}
          </div>
        </section>

        <aside className="grid gap-6">
          <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-tide">Answer Map</p>
                <h2 className="mt-2 text-xl font-semibold text-ink">Jump through the sprint</h2>
              </div>
              <span className="text-sm font-semibold text-gold">{progress}%</span>
            </div>
            <div className="mt-5 space-y-3">
              {quiz.questions.map((question, index) => {
                const answer = answers[question.id];
                const attemptAnswer = attempt?.answers.find((item) => item.quizQuestionId === question.id);
                const correct = attemptAnswer?.isCorrect ?? isCorrect(question, answer);
                const status = correct == null ? (answer ? "Answered" : "Open") : correct ? "Correct" : "Review";
                return (
                  <button
                    className="w-full rounded-2xl border border-[var(--line)] bg-white p-4 text-left transition hover:border-tide/30 hover:bg-slate-50"
                    key={question.id}
                    onClick={() => setActiveIndex(index)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">Question {index + 1}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{answer ?? question.prompt}</p>
                      </div>
                      <span
                        className={
                          status === "Correct"
                            ? "text-xs font-semibold text-emerald-700"
                            : status === "Review"
                              ? "text-xs font-semibold text-rose-700"
                              : "text-xs font-semibold text-gold"
                        }
                      >
                        {status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-ember">Topic Performance</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">Weak areas after attempts</h2>
            <div className="mt-5 space-y-3">
              {performanceQuery.data?.weakTopics.map((topic) => (
                <div className="rounded-2xl border border-[var(--line)] bg-white p-4" key={topic.topicId}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-ink">{topic.topic ?? "Untitled topic"}</p>
                    <span className="text-sm font-semibold text-gold">{Math.round(topic.masteryScore * 100)}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-50">
                    <div className="h-full rounded-full bg-ember" style={{ width: `${topic.masteryScore * 100}%` }} />
                  </div>
                  {topic.reason ? <p className="mt-3 text-xs leading-5 text-slate-500">{topic.reason}</p> : null}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Average score: <span className="font-semibold text-tide">{Math.round((performanceQuery.data?.averageScore ?? 0) * 100)}%</span>
            </p>
          </div>
        </aside>
      </div>
    </LayoutShell>
  );
}
