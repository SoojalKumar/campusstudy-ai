"use client";

import type { FlashcardDeckDTO, NoteSetDTO, QuizSetDTO } from "@campusstudy/types";
import { formatNoteTypeLabel } from "@campusstudy/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { LayoutShell } from "@/components/layout-shell";
import { SourceFileActions, SourceTimestampButton } from "@/components/source-file-actions";
import { SourceCitationCard } from "@/components/source-citation-card";
import { apiFetch } from "@/lib/api";
import { useAuthedQuery } from "@/lib/api-hooks";
import { useSession } from "@/lib/session";

type MaterialResponse = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  processingStage: string;
  processingStatus: string;
  downloadUrl?: string | null;
  extractedText?: string | null;
  transcriptText?: string | null;
};

type TranscriptSegment = {
  id: string;
  startSecond: number;
  endSecond: number;
  text: string;
};

type ChunkResponse = {
  id: string;
  text: string;
  pageNumber?: number | null;
  slideNumber?: number | null;
  startSecond?: number | null;
  endSecond?: number | null;
};

const processingTimeline = [
  "uploaded",
  "extracting",
  "transcribing",
  "chunking",
  "embedding",
  "generating_notes",
  "generating_flashcards",
  "generating_quiz",
  "completed"
] as const;

const noteGenerationModes = [
  { value: "summary", label: "Summary", helper: "Fast overview for first pass" },
  { value: "concise", label: "Concise", helper: "Trimmed revision-friendly notes" },
  { value: "detailed", label: "Detailed", helper: "Full lecture breakdown" },
  { value: "glossary", label: "Glossary", helper: "Key terms and definitions" },
  { value: "exam_questions", label: "Exam Qs", helper: "Likely exam-style prompts" },
  { value: "teach_me", label: "Teach Me", helper: "Simple explanation mode" },
  { value: "revision_sheet", label: "Revision Sheet", helper: "Last-minute prep format" }
] as const;

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function MaterialDetailPage() {
  const params = useParams<{ materialId: string }>();
  const materialId = params.materialId;
  const { token, hydrated } = useSession();
  const queryClient = useQueryClient();
  const [generatedNoteId, setGeneratedNoteId] = useState<string | null>(null);
  const [generatedDeckId, setGeneratedDeckId] = useState<string | null>(null);
  const [generatedQuizId, setGeneratedQuizId] = useState<string | null>(null);
  const [selectedNoteType, setSelectedNoteType] = useState<(typeof noteGenerationModes)[number]["value"]>("revision_sheet");
  const materialQuery = useAuthedQuery<MaterialResponse>({
    queryKey: ["material", materialId],
    path: `/materials/${materialId}`
  });
  const notesQuery = useAuthedQuery<NoteSetDTO[]>({
    queryKey: ["notes", materialId],
    path: `/notes/by-material/${materialId}`
  });
  const transcriptQuery = useAuthedQuery<TranscriptSegment[]>({
    queryKey: ["transcript", materialId],
    path: `/transcripts/materials/${materialId}/transcript`
  });
  const chunksQuery = useAuthedQuery<ChunkResponse[]>({
    queryKey: ["chunks", materialId],
    path: `/materials/${materialId}/chunks`
  });
  const material = materialQuery.data;
  const notes = notesQuery.data ?? [];
  const transcriptSegments = transcriptQuery.data ?? [];
  const chunks = chunksQuery.data ?? [];
  const canGenerate = hydrated && Boolean(token) && material?.processingStatus === "completed";
  const noteMutation = useMutation({
    mutationFn: () =>
      apiFetch<NoteSetDTO>("/notes/generate", {
        body: JSON.stringify({ materialId, noteType: selectedNoteType }),
        method: "POST",
        token
      }),
    onSuccess: (note) => {
      setGeneratedNoteId(note.id);
      void queryClient.invalidateQueries({ queryKey: ["notes", materialId] });
    }
  });
  const deckMutation = useMutation({
    mutationFn: () =>
      apiFetch<FlashcardDeckDTO>("/flashcards/generate", {
        body: JSON.stringify({ limit: 8, materialId }),
        method: "POST",
        token
      }),
    onSuccess: (deck) => {
      setGeneratedDeckId(deck.id);
      void queryClient.invalidateQueries({ queryKey: ["flashcard-decks"] });
    }
  });
  const quizMutation = useMutation({
    mutationFn: () =>
      apiFetch<QuizSetDTO>("/quizzes/generate", {
        body: JSON.stringify({ count: 5, difficulty: "medium", includeScenarios: true, materialId }),
        method: "POST",
        token
      }),
    onSuccess: (quiz) => {
      setGeneratedQuizId(quiz.id);
      void queryClient.invalidateQueries({ queryKey: ["quiz-sets"] });
    }
  });
  const citations = chunks.slice(0, 4).map((chunk) => ({
    chunkId: chunk.id,
    sourceLabel:
      chunk.pageNumber != null
        ? `Page ${chunk.pageNumber}`
        : chunk.slideNumber != null
          ? `Slide ${chunk.slideNumber}`
          : chunk.startSecond != null
            ? `${chunk.startSecond}s-${chunk.endSecond ?? chunk.startSecond}s`
            : "Chunk",
    snippet: chunk.text.slice(0, 220)
  }));
  const sourcePreviewText = material?.transcriptText || material?.extractedText;
  const supportsTimestampLinks = material?.mimeType.startsWith("audio/") || material?.mimeType.startsWith("video/");
  const activeTimelineIndex = processingTimeline.indexOf((material?.processingStage as (typeof processingTimeline)[number]) ?? "uploaded");

  if (!material && materialQuery.hydrated) {
    return (
      <LayoutShell>
        <div className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Material Detail</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            {materialQuery.hasSession ? "Material not found" : "Sign in to view this material"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Materials are private to the student workspace that uploaded them.
          </p>
          <Link className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950" href="/login">
            Sign in
          </Link>
        </div>
      </LayoutShell>
    );
  }

  if (!material) {
    return (
      <LayoutShell>
        <div className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-8 text-sm text-slate-300">
          Loading material...
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Material Detail</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">{material.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1">{material.fileName}</span>
            <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1">{material.mimeType}</span>
            <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1">
              Stage: {material.processingStage}
            </span>
            <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1">
              Status: {material.processingStatus}
            </span>
          </div>
          <SourceFileActions downloadUrl={material.downloadUrl} fileName={material.fileName} />
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/60 p-5">
            <h2 className="text-lg font-semibold text-white">Processing timeline</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {processingTimeline.map((stage, index) => {
                const isActive = stage === material.processingStage;
                const isComplete = activeTimelineIndex >= 0 && index <= activeTimelineIndex;
                return (
                  <div
                    key={stage}
                    className={`rounded-2xl border p-4 transition ${
                      isActive
                        ? "border-tide/40 bg-tide/10"
                        : isComplete
                          ? "border-gold/25 bg-gold/10"
                          : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{index + 1}</p>
                    <p className={`mt-2 text-sm font-semibold ${isActive ? "text-tide" : isComplete ? "text-gold" : "text-slate-200"}`}>
                      {formatNoteTypeLabel(stage)}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-slate-400">
              {material.processingStatus === "failed"
                ? "This source stalled in the pipeline. Admin can inspect logs and retry the background job."
                : "Each upload moves through extraction, chunking, embeddings, and study-pack generation before it becomes fully usable."}
            </p>
          </div>
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/60 p-5">
            <h2 className="text-lg font-semibold text-white">Transcript timeline</h2>
            <div className="mt-4 space-y-3">
              {transcriptSegments.length ? (
                transcriptSegments.map((segment) => (
                  <div key={segment.id} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gold">
                        {formatSeconds(segment.startSecond)} - {formatSeconds(segment.endSecond)}
                      </span>
                      {supportsTimestampLinks && material.downloadUrl ? (
                        <SourceTimestampButton
                          downloadUrl={material.downloadUrl}
                          fileName={material.fileName}
                          startSecond={segment.startSecond}
                        />
                      ) : null}
                    </div>
                    <p className="mt-3">{segment.text}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-400">
                  No transcript segments yet. For documents, chunk citations will still appear on the right.
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/60 p-5">
            <h2 className="text-lg font-semibold text-white">Extracted source text</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {sourcePreviewText
                ? `${sourcePreviewText.slice(0, 1600)}${sourcePreviewText.length > 1600 ? "..." : ""}`
                : "The source preview will appear here after extraction or transcription completes."}
            </p>
          </div>
        </section>
        <aside className="grid gap-6">
          <div className="rounded-[2rem] border border-cyan-200/15 bg-[var(--panel)] p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-tide">Generate Study Pack</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Turn this source into action</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Create fresh notes, due-card decks, and a scored quiz directly from this material.
            </p>
            <div className="mt-5 grid gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Note mode</p>
              <div className="grid gap-2">
                {noteGenerationModes.map((mode) => {
                  const selected = mode.value === selectedNoteType;
                  return (
                    <button
                      key={mode.value}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        selected
                          ? "border-tide/40 bg-tide/10"
                          : "border-white/10 bg-slate-950/55 hover:border-white/20"
                      }`}
                      onClick={() => setSelectedNoteType(mode.value)}
                      type="button"
                    >
                      <p className={`text-sm font-semibold ${selected ? "text-tide" : "text-white"}`}>{mode.label}</p>
                      <p className="mt-1 text-xs text-slate-400">{mode.helper}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <button
                className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canGenerate || noteMutation.isPending}
                onClick={() => noteMutation.mutate()}
              >
                {noteMutation.isPending ? `Generating ${formatNoteTypeLabel(selectedNoteType)}...` : `Generate ${formatNoteTypeLabel(selectedNoteType)}`}
              </button>
              <button
                className="rounded-2xl border border-white/10 bg-tide/90 px-4 py-3 text-left text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canGenerate || deckMutation.isPending}
                onClick={() => deckMutation.mutate()}
              >
                {deckMutation.isPending ? "Building flashcards..." : "Generate flashcard deck"}
              </button>
              <button
                className="rounded-2xl border border-white/10 bg-gold/90 px-4 py-3 text-left text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canGenerate || quizMutation.isPending}
                onClick={() => quizMutation.mutate()}
              >
                {quizMutation.isPending ? "Writing quiz..." : "Generate quiz set"}
              </button>
            </div>
            {!canGenerate ? (
              <p className="mt-4 text-xs text-slate-500">
                Sign in and wait for processing to complete before generating new study outputs.
              </p>
            ) : null}
            {noteMutation.isSuccess ? <p className="mt-4 text-sm text-tide">Revision notes added below.</p> : null}
            {generatedDeckId ? (
              <Link className="mt-4 block text-sm font-semibold text-tide" href={`/flashcards/${generatedDeckId}`}>
                Open generated flashcards
              </Link>
            ) : null}
            {generatedQuizId ? (
              <Link className="mt-2 block text-sm font-semibold text-gold" href={`/quizzes/${generatedQuizId}`}>
                Open generated quiz
              </Link>
            ) : null}
            {noteMutation.isError || deckMutation.isError || quizMutation.isError ? (
              <p className="mt-4 text-sm text-ember">
                {(noteMutation.error as Error | null)?.message ||
                  (deckMutation.error as Error | null)?.message ||
                  (quizMutation.error as Error | null)?.message}
              </p>
            ) : null}
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <h2 className="text-xl font-semibold text-white">Note outputs</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {notes.length ? (
                notes.map((note) => (
                  <li key={note.id}>
                    <Link className="transition hover:text-tide" href={`/notes/${note.id}`}>
                      {formatNoteTypeLabel(note.noteType)} · {note.title}
                    </Link>
                  </li>
                ))
              ) : (
                <li>No live notes found yet.</li>
              )}
            </ul>
            {generatedNoteId ? (
              <Link className="mt-4 block text-sm font-semibold text-white" href={`/notes/${generatedNoteId}`}>
                Open generated note
              </Link>
            ) : null}
          </div>
          <div className="grid gap-3">
            {citations.length ? (
              citations.map((citation) => <SourceCitationCard key={citation.chunkId} citation={citation} />)
            ) : (
              <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5 text-sm text-slate-400">
                Source citations will appear here once chunked text is available.
              </div>
            )}
          </div>
        </aside>
      </div>
    </LayoutShell>
  );
}
