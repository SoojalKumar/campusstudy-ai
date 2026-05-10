import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-16">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section>
          <p className="text-xs uppercase tracking-[0.35em] text-gold">CampusStudy AI</p>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight text-ink md:text-7xl">
            Your course materials become notes, flashcards, quizzes, and grounded answers.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-700">
            Built for university students who need a structured study workspace: upload lecture
            slides, notes, docs, audio, and video, then turn them into usable study assets with
            source-aware citations.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950"
            >
              Open workspace
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-[var(--line)] px-6 py-3 text-sm font-semibold text-ink"
            >
              Create account
            </Link>
          </div>
        </section>
        <section className="rounded-[2.5rem] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-2xl shadow-slate-200/70">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Course-organized uploads",
              "Timestamped lecture transcripts",
              "Concise + detailed note sets",
              "RAG chat with citations",
              "Mobile flashcard review",
              "Admin job visibility"
            ].map((feature) => (
              <div key={feature} className="rounded-3xl border border-[var(--line)] bg-white p-4">
                <p className="text-sm text-slate-700">{feature}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[2rem] border border-[var(--line)] bg-gradient-to-br from-tide/15 to-ember/10 p-5">
            <p className="text-sm text-slate-700">
              Upload a lecture pack, generate a revision sheet, then ask exam-style questions with citations back to
              the exact source pages, slides, or timestamps.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
