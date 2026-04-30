"use client";

import type { QuizAttemptDTO, QuizQuestionDTO, QuizSetDTO } from "@campusstudy/types";
import { useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

import { LayoutShell } from "@/components/layout-shell";
import { apiFetch } from "@/lib/api";
import { useAuthedQuery } from "@/lib/api-hooks";
import { demoQuizPerformance, demoQuizSet } from "@/lib/demo-data";
import { useSession } from "@/lib/session";

type AnswerMap = Record<string, string>;

function questionType(question: QuizQuestionDTO) {
  return question.questionType ?? question.type;
}

function isCorrect(question: QuizQuestionDTO, answer?: string) {
  if (!answer || !question.correctAnswer) return null;
  return answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
}

function scoreLocalAttempt(quiz: QuizSetDTO, answers: AnswerMap): QuizAttemptDTO {
  const answerRows = quiz.questions.map((question) => {
    const submittedAnswer = answers[question.id] ?? "";
    const correct = isCorrect(question, submittedAnswer) === true;
    return {
      correctAnswer: question.correctAnswer ?? null,
      feedback: question.explanation,
      id: `${question.id}-answer`,
      isCorrect: correct,
      quizQuestionId: question.id,
      scoreAwarded: correct ? 1 : 0,
      submittedAnswer
    };
  });
  const correctCount = answerRows.filter((answer) => answer.isCorrect).length;
  return {
    answers: answerRows,
    completedAt: new Date().toISOString(),
    correctCount,
    id: "local-attempt",
    quizSetId: quiz.id,
    score: correctCount / Math.max(1, quiz.questions.length),
    totalQuestions: quiz.questions.length
  };
}

export default function QuizPage() {
  const params = useParams<{ quizId?: string }>();
  const quizId = params.quizId ?? "demo";
  const { token } = useSession();
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [startedAt] = useState(() => Date.now());
  const [localAttempt, setLocalAttempt] = useState<QuizAttemptDTO | null>(null);

  const quizQuery = useAuthedQuery<QuizSetDTO>({
    queryKey: ["quiz-set", quizId],
    path: `/quizzes/sets/${quizId}`,
    fallbackData: demoQuizSet
  });
  const performanceQuery = useAuthedQuery({
    queryKey: ["quiz-performance"],
    path: "/quizzes/performance/overview",
    fallbackData: demoQuizPerformance
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
          quizSetId: quiz.id
        }),
        method: "POST",
        token
      })
  });

  const attempt = submitMutation.data ?? localAttempt;
  const activeQuestion = quiz.questions[activeIndex] ?? quiz.questions[0];
  const selectedAnswer = activeQuestion ? answers[activeQuestion.id] : undefined;
  const answeredCount = Object.keys(answers).length;
  const progress = quiz.questions.length ? Math.round((answeredCount / quiz.questions.length) * 100) : 100;
  const canSubmit = answeredCount === quiz.questions.length && !attempt;
  const scorePercent = attempt ? Math.round(attempt.score * 100) : null;

  const chooseAnswer = (question: QuizQuestionDTO, answer: string) => {
    if (attempt) return;
    setAnswers((current) => ({ ...current, [question.id]: answer }));
  };

  const finishQuiz = () => {
    if (!canSubmit) return;
    if (token) {
      submitMutation.mutate();
      return;
    }
    setLocalAttempt(scoreLocalAttempt(quiz, answers));
  };

  const resetQuiz = () => {
    setAnswers({});
    setActiveIndex(0);
    setLocalAttempt(null);
    submitMutation.reset();
  };

  return (
    <LayoutShell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-tide">Quiz Focus</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold text-white">{quiz.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Active recall sprint with immediate rationale, final scoring, and topic mastery updates.
              </p>
            </div>
            <div className="rounded-full border border-gold/20 bg-gold/10 px-4 py-2 text-sm font-semibold capitalize text-gold">
              {quiz.difficulty}
            </div>
          </div>

          {!quizQuery.hasSession && quizQuery.hydrated ? (
            <p className="mt-5 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">
              Demo quiz is showing. Sign in to save attempts and sync weak-topic mastery.
            </p>
          ) : null}

          {quizQuery.isError ? (
            <p className="mt-5 rounded-2xl border border-ember/20 bg-ember/10 px-4 py-3 text-sm text-orange-100">
              Live quiz could not load, so the local exam sprint is ready.
            </p>
          ) : null}

          <div className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/60">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Progress</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {answeredCount}/{quiz.questions.length} answered
                </p>
              </div>
              {scorePercent == null ? (
                <p className="text-sm font-semibold text-tide">{progress}% complete</p>
              ) : (
                <p className="text-sm font-semibold text-tide">{scorePercent}% scored</p>
              )}
            </div>
            <div className="h-3 bg-white/5">
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
                  <p className="text-6xl font-semibold text-white">{scorePercent}%</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {attempt.correctCount}/{attempt.totalQuestions} correct in this sprint.
                  </p>
                </div>
                <button
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-tide"
                  onClick={resetQuiz}
                  type="button"
                >
                  Retake quiz
                </button>
              </div>
            </div>
          ) : null}

          {submitMutation.isError ? (
            <p className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              Could not save this attempt. Your answers are still on screen, so you can retry.
            </p>
          ) : null}

          {activeQuestion ? (
            <div className="mt-6 rounded-[2.25rem] border border-white/10 bg-gradient-to-br from-slate-950/90 via-slate-950/70 to-tide/10 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-gold">
                  Question {activeIndex + 1} of {quiz.questions.length}
                </p>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold capitalize text-slate-300">
                  {questionType(activeQuestion).replace("_", " ")}
                </span>
              </div>
              <h2 className="mt-6 text-3xl font-semibold leading-tight text-white">{activeQuestion.prompt}</h2>

              {activeQuestion.options?.length ? (
                <div className="mt-6 grid gap-3">
                  {activeQuestion.options.map((option) => {
                    const selected = selectedAnswer === option;
                    const correctness = selected ? isCorrect(activeQuestion, option) : null;
                    const selectedClass = selected ? "border-gold/50 bg-gold/10 text-white" : "border-white/10 bg-white/[0.03] text-slate-200";
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
                  className="mt-6 min-h-32 w-full rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-tide/50"
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
                  <p className="mt-2 text-sm leading-6 text-slate-200">{activeQuestion.explanation}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/60 p-6">
              <p className="text-xl font-semibold text-white">No questions yet</p>
              <p className="mt-2 text-sm text-slate-300">Generate a quiz from a document, topic, or full course.</p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((value) => Math.max(0, value - 1))}
              type="button"
            >
              Previous
            </button>
            {activeIndex < quiz.questions.length - 1 ? (
              <button
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-tide"
                onClick={() => setActiveIndex((value) => Math.min(quiz.questions.length - 1, value + 1))}
                type="button"
              >
                Next question
              </button>
            ) : (
              <button
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-tide disabled:cursor-not-allowed disabled:opacity-40"
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
          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-tide">Answer Map</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Jump through the sprint</h2>
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
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-left transition hover:border-tide/30 hover:bg-slate-900"
                    key={question.id}
                    onClick={() => setActiveIndex(index)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">Question {index + 1}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-400">{answer ?? question.prompt}</p>
                      </div>
                      <span
                        className={
                          status === "Correct"
                            ? "text-xs font-semibold text-emerald-200"
                            : status === "Review"
                              ? "text-xs font-semibold text-rose-200"
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

          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-ember">Topic Performance</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Weak areas after attempts</h2>
            <div className="mt-5 space-y-3">
              {performanceQuery.data.weakTopics.map((topic) => (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4" key={topic.topicId}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{topic.topic ?? "Untitled topic"}</p>
                    <span className="text-sm font-semibold text-gold">{Math.round(topic.masteryScore * 100)}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-ember" style={{ width: `${topic.masteryScore * 100}%` }} />
                  </div>
                  {topic.reason ? <p className="mt-3 text-xs leading-5 text-slate-400">{topic.reason}</p> : null}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Average score: <span className="font-semibold text-tide">{Math.round(performanceQuery.data.averageScore * 100)}%</span>
            </p>
          </div>
        </aside>
      </div>
    </LayoutShell>
  );
}
