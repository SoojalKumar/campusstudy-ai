import React from "react";
import { formatCitationLocation, normalizeCitationSnippet, type ChatCitation } from "@campusstudy/types";

export function SourceCitationCard({ citation }: { citation: ChatCitation }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{citation.sourceLabel}</p>
        <span className="rounded-full bg-[var(--panel-muted)] px-3 py-1 text-xs text-slate-600">{formatCitationLocation(citation)}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{normalizeCitationSnippet(citation.snippet)}</p>
    </div>
  );
}
