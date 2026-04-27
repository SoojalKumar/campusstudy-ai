"use client";

import { useParams } from "next/navigation";

import { LayoutShell } from "@/components/layout-shell";
import { SourceFileActions, SourceTimestampButton } from "@/components/source-file-actions";
import { SourceCitationCard } from "@/components/source-citation-card";
import { useAuthedQuery } from "@/lib/api-hooks";

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

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function MaterialDetailPage() {
  const params = useParams<{ materialId: string }>();
  const materialId = params.materialId;
  const materialQuery = useAuthedQuery<MaterialResponse>({
    queryKey: ["material", materialId],
    path: `/materials/${materialId}`,
    fallbackData: {
      id: materialId,
      title: `Material ${materialId}`,
      fileName: "demo-material.txt",
      mimeType: "text/plain",
      processingStage: "completed",
      processingStatus: "completed",
      downloadUrl: null,
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
  const sourcePreviewText = material.transcriptText || material.extractedText;
  const supportsTimestampLinks = material.mimeType.startsWith("audio/") || material.mimeType.startsWith("video/");

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
            <h2 className="text-lg font-semibold text-white">Transcript timeline</h2>
            <div className="mt-4 space-y-3">
              {transcriptQuery.data.length ? (
                transcriptQuery.data.map((segment) => (
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
