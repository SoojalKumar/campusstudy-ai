"use client";

import type { ChatThreadDTO, NoteSetDTO } from "@campusstudy/types";
import { formatNoteTypeLabel } from "@campusstudy/types";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { LayoutShell } from "@/components/layout-shell";
import { apiFetch } from "@/lib/api";
import { useAuthedQuery } from "@/lib/api-hooks";
import { useSession } from "@/lib/session";

type CourseDetail = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  topics: Array<{ id: string; title: string; description?: string | null }>;
};

type MaterialSummary = {
  id: string;
  title: string;
  processingStage: string;
  fileType: string;
};

export default function CourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const { token } = useSession();
  const courseId = params.courseId;
  const courseQuery = useAuthedQuery<CourseDetail>({
    queryKey: ["course", courseId],
    path: `/courses/${courseId}`
  });
  const materialsQuery = useAuthedQuery<MaterialSummary[]>({
    queryKey: ["materials", courseId],
    path: `/materials?course_id=${courseId}`
  });
  const notesQuery = useAuthedQuery<NoteSetDTO[]>({
    queryKey: ["course-notes", courseId],
    path: `/notes/by-course/${courseId}`
  });
  const course = courseQuery.data;
  const materials = materialsQuery.data ?? [];
  const notes = notesQuery.data ?? [];
  const courseChatMutation = useMutation({
    mutationFn: () =>
      apiFetch<ChatThreadDTO>("/chat/threads", {
        body: JSON.stringify({
          answerStyle: "exam-oriented",
          courseId,
          scopeType: "course",
          strictMode: true,
          title: `${course?.code ?? "Course"} tutor`
        }),
        method: "POST",
        token
      }),
    onSuccess: (thread) => router.push(`/chat/${thread.id}`)
  });
  const noteTypeSummary = Array.from(new Set(notes.map((note) => formatNoteTypeLabel(note.noteType))));

  if (!course && courseQuery.hydrated) {
    return (
      <LayoutShell>
        <div className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-tide">Course Workspace</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            {courseQuery.hasSession ? "Course not found" : "Sign in to view this course"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Course workspaces are scoped to your university account and enrollments.
          </p>
        </div>
      </LayoutShell>
    );
  }

  if (!course) {
    return (
      <LayoutShell>
        <div className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-8 text-sm text-slate-300">
          Loading course workspace...
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="grid gap-6">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-tide">Course Workspace</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">
            {course.code} · {course.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            {course.description ??
              "Topic folders, generated note packs, transcript-driven revision, and material-level chat all roll up here."}
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              ["Topics", `${course.topics.length}`],
              ["Materials", `${materials.length}`],
              ["Generated notes", `${notes.length}`]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-tide disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!token || courseChatMutation.isPending}
              onClick={() => courseChatMutation.mutate()}
              type="button"
            >
              {courseChatMutation.isPending ? "Opening tutor..." : "Open course tutor"}
            </button>
            <Link
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-3 text-sm font-semibold text-white transition hover:border-gold/30"
              href="#generated-notes"
            >
              Jump to notes library
            </Link>
          </div>
          {courseChatMutation.isError ? (
            <p className="mt-4 text-sm text-rose-200">{(courseChatMutation.error as Error).message}</p>
          ) : null}
        </section>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <h2 className="text-xl font-semibold text-white">Topic folders</h2>
            <div className="mt-4 space-y-3">
              {course.topics.length ? (
                course.topics.map((topic) => (
                  <div key={topic.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="font-medium text-white">{topic.title}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {topic.description ?? "Notes, flashcards, quizzes, transcript clips"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-400">
                  Sign in to load live topics for this course.
                </div>
              )}
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <h2 className="text-xl font-semibold text-white">Course materials</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              {materials.length ? (
                materials.map((material) => (
                  <Link
                    key={material.id}
                    href={`/materials/${material.id}`}
                    className="block rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                  >
                    <p className="font-medium text-white">{material.title}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {material.fileType.toUpperCase()} · {material.processingStage}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-slate-400">
                  No live materials yet. Upload a lecture file from the dashboard.
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Course study library</h2>
              <p className="mt-2 text-sm text-slate-400">
                Source-grounded notes accumulate here as students process lectures, slides, and readings.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {noteTypeSummary.length ? noteTypeSummary.map((label) => (
                <span key={label} className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                  {label}
                </span>
              )) : (
                <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-400">
                  Waiting for first generated pack
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5" id="generated-notes">
          <h2 className="text-xl font-semibold text-white">Generated notes</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {notes.length ? (
              notes.map((note) => (
                <Link key={note.id} href={`/notes/${note.id}`} className="block rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-tide/30">
                  <p className="font-medium text-white">{note.title}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatNoteTypeLabel(note.noteType)} · {note.contentMarkdown.slice(0, 120)}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-slate-400">
                No generated notes for this course yet. Generate one from a material to start building a study library.
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
