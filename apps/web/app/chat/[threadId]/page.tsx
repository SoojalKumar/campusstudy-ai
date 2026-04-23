import { LayoutShell } from "@/components/layout-shell";
import { SourceCitationCard } from "@/components/source-citation-card";

export default async function ChatThreadPage({
  params
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  return (
    <LayoutShell>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-tide">RAG Chat</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Thread {threadId}</h1>
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl bg-slate-950/80 p-4">
              <p className="text-sm text-slate-300">How would BFS and DFS show up in an exam question?</p>
            </div>
            <div className="rounded-3xl border border-tide/30 bg-tide/10 p-4">
              <p className="text-sm text-white">
                Expect comparison prompts that ask for traversal order, memory trade-offs, and when
                shortest path guarantees matter. BFS is the safe answer for unweighted shortest path.
              </p>
            </div>
          </div>
        </section>
        <aside className="space-y-3">
          <SourceCitationCard
            citation={{
              chunkId: "chunk-1",
              sourceLabel: "Page 1",
              snippet: "Exam questions often compare time complexity, memory trade-offs, and best-fit use cases."
            }}
          />
          <SourceCitationCard
            citation={{
              chunkId: "chunk-2",
              sourceLabel: "Page 1",
              snippet: "Students should connect each algorithm to queue or stack behavior and trace small graphs."
            }}
          />
        </aside>
      </div>
    </LayoutShell>
  );
}

