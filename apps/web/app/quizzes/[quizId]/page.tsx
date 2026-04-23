import { LayoutShell } from "@/components/layout-shell";
import { demoQuiz } from "@/lib/demo-data";

export default async function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  return (
    <LayoutShell>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-tide">Quiz Player</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Quiz {quizId}</h1>
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/60 p-5">
            <p className="text-sm text-slate-300">{demoQuiz[0]?.prompt}</p>
            <div className="mt-4 grid gap-3">
              {demoQuiz[0]?.options?.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="rounded-2xl border border-white/10 px-4 py-3 text-left text-sm text-white hover:bg-white/5"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </section>
        <aside className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
          <h2 className="text-xl font-semibold text-white">Performance by topic</h2>
          <div className="mt-4 space-y-3">
            {[
              ["Graphs", "72%"],
              ["Model evaluation", "81%"],
              ["Definitions", "88%"]
            ].map(([topic, score]) => (
              <div key={topic} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <span className="text-sm text-white">{topic}</span>
                <span className="text-sm text-tide">{score}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </LayoutShell>
  );
}

