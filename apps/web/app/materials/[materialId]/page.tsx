import { LayoutShell } from "@/components/layout-shell";
import { SourceCitationCard } from "@/components/source-citation-card";

export default async function MaterialDetailPage({
  params
}: {
  params: Promise<{ materialId: string }>;
}) {
  const { materialId } = await params;
  return (
    <LayoutShell>
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Material Detail</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Material {materialId}</h1>
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/60 p-5">
            <h2 className="text-lg font-semibold text-white">Transcript timeline</h2>
            <div className="mt-4 space-y-3">
              {[
                "00:00 - Learning objectives and exam framing",
                "00:46 - Core theory and worked example",
                "02:01 - Revision tips and common mistakes"
              ].map((line) => (
                <div key={line} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </section>
        <aside className="grid gap-6">
          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <h2 className="text-xl font-semibold text-white">Note outputs</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>Summary</li>
              <li>Detailed notes</li>
              <li>Concise notes</li>
              <li>Revision sheet</li>
              <li>Teach me this topic</li>
            </ul>
          </div>
          <div className="grid gap-3">
            {[
              {
                chunkId: "chunk-1",
                sourceLabel: "Page 1",
                snippet: "Breadth-first search visits nodes level by level and is ideal for shortest path questions."
              },
              {
                chunkId: "chunk-2",
                sourceLabel: "00:46-01:30",
                snippet: "The lecture compares memory trade-offs and the role of stack versus queue behavior."
              }
            ].map((citation) => (
              <SourceCitationCard key={citation.chunkId} citation={citation} />
            ))}
          </div>
        </aside>
      </div>
    </LayoutShell>
  );
}

