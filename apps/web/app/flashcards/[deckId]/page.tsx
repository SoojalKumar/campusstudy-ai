import { LayoutShell } from "@/components/layout-shell";
import { demoFlashcards } from "@/lib/demo-data";

export default async function FlashcardDeckPage({
  params
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  return (
    <LayoutShell>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Spaced Repetition</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Deck {deckId}</h1>
          <div className="mt-6 rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-tide/20 to-transparent p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-300">Front</p>
            <p className="mt-10 text-3xl font-semibold text-white">{demoFlashcards[0]?.front}</p>
            <p className="mt-10 text-sm text-slate-400">Tap or swipe on mobile to reveal the answer.</p>
          </div>
        </section>
        <aside className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
          <h2 className="text-xl font-semibold text-white">Due cards</h2>
          <div className="mt-4 space-y-3">
            {demoFlashcards.map((card) => (
              <div key={card.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="font-medium text-white">{card.front}</p>
                <p className="mt-2 text-sm text-slate-400">{card.tags.join(" • ")}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </LayoutShell>
  );
}

