import React from "react";
import { formatCitationLocation, normalizeCitationSnippet, type ChatCitation } from "@campusstudy/types";

export function SourceCitationCard({ citation }: { citation: ChatCitation }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{citation.sourceLabel}</p>
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{formatCitationLocation(citation)}</span>
      </div>
      <p className="mt-3 text-sm text-slate-300">{normalizeCitationSnippet(citation.snippet)}</p>
    </div>
  );
}
