import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-16">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section>
          <p className="text-xs uppercase tracking-[0.35em] text-gold">CampusStudy AI</p>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight text-white md:text-7xl">
            Your course materials become notes, flashcards, quizzes, and grounded answers.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-200">
            Built for university students who need a structured study workspace: upload lecture
            slides, notes, docs, audio, and video, then turn them into usable study assets with
            source-aware citations.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950"
            >
              Enter Demo Workspace
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white"
            >
              Create account
            </Link>
          </div>
        </section>
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-8 shadow-2xl shadow-black/30">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Course-organized uploads",
              "Timestamped lecture transcripts",
              "Concise + detailed note sets",
              "RAG chat with citations",
              "Mobile flashcard review",
              "Admin job visibility"
            ].map((feature) => (
              <div key={feature} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-200">{feature}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-gradient-to-br from-tide/15 to-ember/10 p-5">
            <p className="text-sm text-slate-200">
              “Week 6 Algorithms” uploaded. Transcript cleaned, flashcards due tomorrow, exam-style
              quiz ready, weak topic detected: graph tracing.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

