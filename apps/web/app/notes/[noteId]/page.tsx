"use client";

import type { NoteSetDTO } from "@campusstudy/types";
import { buildNoteSections, formatNoteTypeLabel } from "@campusstudy/types";
import Link from "next/link";
import { useParams } from "next/navigation";

import { LayoutShell } from "@/components/layout-shell";
import { useAuthedQuery } from "@/lib/api-hooks";

function formatDate(value?: string) {
  if (!value) return "Recently generated";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Recently generated";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
}

export default function NoteDetailPage() {
  const params = useParams<{ noteId: string }>();
  const noteId = params.noteId;
  const noteQuery = useAuthedQuery<NoteSetDTO>({
    queryKey: ["note", noteId],
    path: `/notes/${noteId}`
  });
  const note = noteQuery.data;
  const sections = note ? buildNoteSections(note.contentMarkdown) : [];
  const keyTerms = Array.isArray(note?.metadataJson?.key_terms) ? (note.metadataJson?.key_terms as string[]) : [];
  const examQuestions = Array.isArray(note?.metadataJson?.exam_questions)
    ? (note.metadataJson?.exam_questions as string[])
    : [];

  if (!note && noteQuery.hydrated) {
    return (
      <LayoutShell>
        <div className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Notes</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            {noteQuery.hasSession ? "Note not found" : "Sign in to view this note"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Generated notes are private to the workspace and source material that created them.
          </p>
          <Link className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950" href="/login">
            Sign in
          </Link>
        </div>
      </LayoutShell>
    );
  }

  if (!note) {
    return (
      <LayoutShell>
        <div className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-8 text-sm text-slate-300">
          Loading note...
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <section className="rounded-[2.75rem] border border-white/10 bg-[var(--panel)] p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-tide">Generated Note</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold text-white">{note.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {formatNoteTypeLabel(note.noteType)} view generated from your uploaded course source.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-gold/20 bg-gold/10 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold">{formatNoteTypeLabel(note.noteType)}</p>
              <p className="mt-2 text-sm text-slate-200">{formatDate(note.createdAt)}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            {note.materialId ? (
              <Link className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200 transition hover:border-tide/30" href={`/materials/${note.materialId}`}>
                Open source material
              </Link>
            ) : null}
            {note.courseId ? (
              <Link className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200 transition hover:border-tide/30" href={`/courses/${note.courseId}`}>
                Open course
              </Link>
            ) : null}
          </div>

          <div className="mt-6 space-y-5">
            {sections.map((section, index) => (
              <article key={`${section.title ?? "section"}-${index}`} className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5">
                <h2 className="text-xl font-semibold text-white">{section.title ?? `Section ${index + 1}`}</h2>
                <div className="mt-4 space-y-4">
                  {section.blocks.map((block, blockIndex) =>
                    block.kind === "paragraph" ? (
                      <p key={blockIndex} className="text-sm leading-7 text-slate-200">
                        {block.text}
                      </p>
                    ) : (
                      <div key={blockIndex} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                        <span className="pt-0.5 text-sm font-semibold text-gold">
                          {block.kind === "numbered" ? `${blockIndex + 1}.` : "•"}
                        </span>
                        <p className="text-sm leading-7 text-slate-200">{block.text}</p>
                      </div>
                    )
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="grid gap-6">
          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-gold">Key Terms</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Quick recall anchors</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {keyTerms.length ? keyTerms.map((term) => (
                <span key={term} className="rounded-full border border-gold/20 bg-gold/10 px-3 py-2 text-sm text-gold">
                  {term}
                </span>
              )) : (
                <p className="text-sm text-slate-400">No extracted key terms for this note yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-tide">Exam Mode</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Likely questions to practice</h2>
            <div className="mt-4 space-y-3">
              {examQuestions.length ? examQuestions.map((question) => (
                <div key={question} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-200">
                  {question}
                </div>
              )) : (
                <p className="text-sm text-slate-400">Exam prompts will appear here when the generation pipeline includes them.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </LayoutShell>
  );
}
