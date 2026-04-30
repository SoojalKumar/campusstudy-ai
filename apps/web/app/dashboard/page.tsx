"use client";

import type { FlashcardDeckDTO, QuizSetDTO } from "@campusstudy/types";
import { MetricCard, SectionCard } from "@campusstudy/ui";
import Link from "next/link";

import { LayoutShell } from "@/components/layout-shell";
import { MaterialUploadPanel } from "@/components/material-upload-panel";
import { demoCourses, demoDashboard, demoFlashcardDeck, demoQuizSet } from "@/lib/demo-data";
import { useAuthedQuery } from "@/lib/api-hooks";

type DashboardResponse = typeof demoDashboard & {
  latestNotes: Array<{ id: string; title: string; noteType: string }>;
};

type CourseResponse = (typeof demoCourses)[number];

export default function DashboardPage() {
  const dashboardQuery = useAuthedQuery<DashboardResponse>({
    queryKey: ["dashboard"],
    path: "/dashboard/overview",
    fallbackData: {
      ...demoDashboard,
      latestNotes: []
    }
  });
  const coursesQuery = useAuthedQuery<CourseResponse[]>({
    queryKey: ["courses"],
    path: "/courses",
    fallbackData: demoCourses
  });
  const decksQuery = useAuthedQuery<FlashcardDeckDTO[]>({
    queryKey: ["flashcard-decks"],
    path: "/flashcards/decks",
    fallbackData: [demoFlashcardDeck]
  });
  const quizzesQuery = useAuthedQuery<QuizSetDTO[]>({
    queryKey: ["quiz-sets"],
    path: "/quizzes/sets",
    fallbackData: [demoQuizSet]
  });
  const dashboard = dashboardQuery.data;
  const courses = coursesQuery.data;
  const latestDeck = decksQuery.data[0];
  const latestQuiz = quizzesQuery.data[0];

  return (
    <LayoutShell>
      <div className="grid gap-6">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-tide">Student Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Study this week with structure.</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Recent uploads, due flashcards, weak topics, and generated note sets live here.
          </p>
          {!dashboardQuery.hasSession && dashboardQuery.hydrated ? (
            <p className="mt-4 text-sm text-gold">
              Demo data is showing right now. Sign in to pull your real dashboard and upload files.
            </p>
          ) : null}
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
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="Upload Materials" eyebrow="Pipeline">
            <MaterialUploadPanel courses={courses} />
          </SectionCard>

          <div className="grid gap-6">
            <SectionCard title="Live Study Packs" eyebrow="Seeded Workflow">
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
                <Link
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm font-semibold text-white transition hover:border-tide/30"
                  href="/chat/demo"
                >
                  Open source-grounded chat
                </Link>
              </div>
            </SectionCard>

            <SectionCard title="Weak Topics" eyebrow="Revision Radar">
              <div className="space-y-3">
                {dashboard.weakTopics.map((item) => (
                  <div key={item.topic} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white">{item.topic}</p>
                      <span className="text-sm text-amber-200">{Math.round(item.mastery * 100)}%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-ember" style={{ width: `${item.mastery * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

        <SectionCard title="Recent Uploads" eyebrow="Processing">
          <div className="grid gap-3">
            {dashboard.recentUploads.map((upload) => (
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
            ))}
          </div>
        </SectionCard>
      </div>
    </LayoutShell>
  );
}
