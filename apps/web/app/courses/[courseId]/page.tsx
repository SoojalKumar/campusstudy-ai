import { LayoutShell } from "@/components/layout-shell";

export default async function CourseDetailPage({
  params
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <LayoutShell>
      <div className="grid gap-6">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-tide">Course Workspace</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Course {courseId}</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Topic folders, generated note packs, transcript-driven revision, and material-level chat
            all roll up here.
          </p>
        </section>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <h2 className="text-xl font-semibold text-white">Topic folders</h2>
            <div className="mt-4 space-y-3">
              {["Week 4 Graphs", "Week 5 Heaps", "Exam 1 Revision"].map((topic) => (
                <div key={topic} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="font-medium text-white">{topic}</p>
                  <p className="mt-1 text-sm text-slate-400">Notes, flashcards, quizzes, transcript clips</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
            <h2 className="text-xl font-semibold text-white">Study pack</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>Clean notes with lecture order preserved</li>
              <li>Likely exam questions and confusion points</li>
              <li>Revision sheet for the next review block</li>
              <li>Material-level RAG chat with citations</li>
            </ul>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}

