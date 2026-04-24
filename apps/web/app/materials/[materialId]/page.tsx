"use client";

import { useParams } from "next/navigation";

import { LayoutShell } from "@/components/layout-shell";
import { SourceCitationCard } from "@/components/source-citation-card";
import { useAuthedQuery } from "@/lib/api-hooks";

type MaterialResponse = {
  id: string;
  title: string;
  processingStage: string;
  extractedText?: string | null;
  transcriptText?: string | null;
};

type NoteResponse = {
  id: string;
  title: string;
  noteType: string;
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

export default function MaterialDetailPage() {
  const params = useParams<{ materialId: string }>();
  const materialId = params.materialId;
  const materialQuery = useAuthedQuery<MaterialResponse>({
    queryKey: ["material", materialId],
    path: `/materials/${materialId}`,
    fallbackData: {
      id: materialId,
      title: `Material ${materialId}`,
      processingStage: "completed",
      extractedText: null,
      transcriptText: null
    }
  });
  const notesQuery = useAuthedQuery<NoteResponse[]>({
    queryKey: ["notes", materialId],
    path: `/notes/by-material/${materialId}`,
    fallbackData: []
  });
  const transcriptQuery = useAuthedQuery<TranscriptSegment[]>({
    queryKey: ["transcript", materialId],
    path: `/transcripts/materials/${materialId}/transcript`,
    fallbackData: []
  });
  const chunksQuery = useAuthedQuery<ChunkResponse[]>({
    queryKey: ["chunks", materialId],
    path: `/materials/${materialId}/chunks`,
    fallbackData: []
  });
  const material = materialQuery.data;
  const citations = chunksQuery.data.slice(0, 4).map((chunk) => ({
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

  return (
    <LayoutShell>
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Material Detail</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">{material.title}</h1>
          <p className="mt-3 text-sm text-slate-400">Pipeline stage: {material.processingStage}</p>
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/60 p-5">
            <h2 className="text-lg font-semibold text-white">Transcript timeline</h2>
            <div className="mt-4 space-y-3">
              {transcriptQuery.data.length ? (
                transcriptQuery.data.map((segment) => (
                  <div key={segment.id} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300">
                    {segment.startSecond}s - {segment.endSecond}s · {segment.text}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-400">
                  No transcript segments yet. For documents, chunk citations will still appear on the right.
                </div>
              )}
            </div>
          </div>
        </section>
        <aside className="grid gap-6">
          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <h2 className="text-xl font-semibold text-white">Note outputs</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {notesQuery.data.length ? (
                notesQuery.data.map((note) => <li key={note.id}>{note.noteType} · {note.title}</li>)
              ) : (
                <li>No live notes found yet.</li>
              )}
            </ul>
          </div>
          <div className="grid gap-3">
            {citations.map((citation) => (
              <SourceCitationCard key={citation.chunkId} citation={citation} />
            ))}
          </div>
        </aside>
      </div>
    </LayoutShell>
  );
}
