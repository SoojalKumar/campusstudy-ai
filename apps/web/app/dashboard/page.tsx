"use client";

import type { ChatThreadDTO, CourseSummary, DashboardSnapshot, FlashcardDeckDTO, QuizSetDTO } from "@campusstudy/types";
import { EmptyState, MetricCard, SectionCard } from "@campusstudy/ui";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { LayoutShell } from "@/components/layout-shell";
import { MaterialUploadPanel } from "@/components/material-upload-panel";
import { apiFetch } from "@/lib/api";
import { useAuthedQuery } from "@/lib/api-hooks";
import { useSession } from "@/lib/session";

type DashboardResponse = DashboardSnapshot & {
  latestNotes: Array<{ id: string; title: string; noteType: string }>;
};

export default function DashboardPage() {
  const router = useRouter();
  const { token } = useSession();
  const dashboardQuery = useAuthedQuery<DashboardResponse>({
    queryKey: ["dashboard"],
    path: "/dashboard/overview"
  });
  const coursesQuery = useAuthedQuery<CourseSummary[]>({
    queryKey: ["courses"],
    path: "/courses"
  });
  const decksQuery = useAuthedQuery<FlashcardDeckDTO[]>({
    queryKey: ["flashcard-decks"],
    path: "/flashcards/decks"
  });
  const quizzesQuery = useAuthedQuery<QuizSetDTO[]>({
    queryKey: ["quiz-sets"],
    path: "/quizzes/sets"
  });
  const createChatMutation = useMutation({
    mutationFn: () =>
      apiFetch<ChatThreadDTO>("/chat/threads", {
        body: JSON.stringify({
          answerStyle: "exam-oriented",
          scopeType: "workspace",
          strictMode: true,
          title: "Workspace study chat"
        }),
        method: "POST",
        token
      }),
    onSuccess: (thread) => router.push(`/chat/${thread.id}`)
  });

  const dashboard = dashboardQuery.data;
  const courses = coursesQuery.data ?? [];
  const latestDeck = decksQuery.data?.[0];
  const latestQuiz = quizzesQuery.data?.[0];
  const needsSignIn = dashboardQuery.hydrated && !dashboardQuery.hasSession;
  const isLoading = dashboardQuery.hasSession && dashboardQuery.isLoading;

  return (
    <LayoutShell>
      <div className="grid gap-6">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-tide">Student Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Study this week with structure.</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Recent uploads, due flashcards, weak topics, and generated note sets live here.
          </p>
          {needsSignIn ? (
            <div className="mt-5 rounded-3xl border border-gold/20 bg-gold/10 p-5">
              <p className="font-semibold text-white">Sign in to load your study workspace.</p>
              <p className="mt-2 text-sm text-slate-300">
                Dashboard metrics, uploads, due flashcards, quizzes, and chat history are account-scoped.
              </p>
              <Link className="mt-4 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950" href="/login">
                Sign in
              </Link>
            </div>
          ) : null}
          {isLoading ? <p className="mt-5 text-sm text-slate-400">Loading your dashboard...</p> : null}
          {dashboard ? (
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <MetricCard label="Streak" value={`${dashboard.streakDays} days`} helper="Consistency score is rising." />
              <MetricCard label="Due cards" value={`${dashboard.dueFlashcards}`} helper="Perfect for a mobile review sprint." />
              <MetricCard label="Quiz avg" value={`${Math.round(dashboard.recentQuizAverage * 100)}%`} helper="Across the latest attempts." />
              <MetricCard
                label="Weakest topic"
                value={dashboard.weakTopics[0]?.topic ?? "None"}
                helper="Needs one more active recall cycle."
              />
            </div>
          ) : null}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="Upload Materials" eyebrow="Pipeline">
            <MaterialUploadPanel courses={courses} />
          </SectionCard>

          <div className="grid gap-6">
            <SectionCard title="Study Packs" eyebrow="Generated Assets">
              <div className="grid gap-3">
                {latestDeck ? (
                  <Link
                    className="rounded-2xl border border-tide/20 bg-tide/10 p-4 transition hover:-translate-y-0.5"
                    href={`/flashcards/${latestDeck.id}`}
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-tide">Flashcards</p>
                    <p className="mt-2 font-semibold text-white">{latestDeck.title}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {latestDeck.flashcards.length ? `${latestDeck.flashcards.length} cards ready` : "Review deck ready"}
                    </p>
                  </Link>
                ) : null}
                {latestQuiz ? (
                  <Link
                    className="rounded-2xl border border-gold/20 bg-gold/10 p-4 transition hover:-translate-y-0.5"
                    href={`/quizzes/${latestQuiz.id}`}
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold">Quiz</p>
                    <p className="mt-2 font-semibold text-white">{latestQuiz.title}</p>
                    <p className="mt-1 text-sm text-slate-300">{latestQuiz.questionCount} questions ready</p>
                  </Link>
                ) : null}
                {!latestDeck && !latestQuiz ? (
                  <EmptyState
                    title="No study packs yet"
                    description="Upload a material or open an existing course to generate flashcards and quizzes."
                  />
                ) : null}
                <button
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm font-semibold text-white transition hover:border-tide/30"
                  disabled={!token || createChatMutation.isPending}
                  onClick={() => createChatMutation.mutate()}
                  type="button"
                >
                  {createChatMutation.isPending ? "Starting chat..." : "Open source-grounded chat"}
                </button>
                {createChatMutation.isError ? (
                  <p className="text-sm text-rose-200">{(createChatMutation.error as Error).message}</p>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Weak Topics" eyebrow="Revision Radar">
              <div className="space-y-3">
                {dashboard?.weakTopics.length ? dashboard.weakTopics.map((item) => (
                  <div key={item.topic} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white">{item.topic}</p>
                      <span className="text-sm text-amber-200">{Math.round(item.mastery * 100)}%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-ember" style={{ width: `${item.mastery * 100}%` }} />
                    </div>
                  </div>
                )) : (
                  <EmptyState title="No weak topics yet" description="Complete quizzes to build a topic mastery map." />
                )}
              </div>
            </SectionCard>
          </div>
        </div>

        <SectionCard title="Recent Uploads" eyebrow="Processing">
          <div className="grid gap-3">
            {dashboard?.recentUploads.length ? dashboard.recentUploads.map((upload) => (
              <Link
                key={upload.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-tide/30"
                href={`/materials/${upload.id}`}
              >
                <div>
                  <p className="font-medium text-white">{upload.title}</p>
                  <p className="text-sm text-slate-400">{upload.courseTitle}</p>
                </div>
                <span className="rounded-full bg-tide/15 px-3 py-1 text-sm text-tide">{upload.status}</span>
              </Link>
            )) : (
              <EmptyState
                title="No uploads yet"
                description="Add a PDF, slide deck, doc, audio, or video file to start the processing pipeline."
              />
            )}
          </div>
        </SectionCard>
      </div>
    </LayoutShell>
  );
}
