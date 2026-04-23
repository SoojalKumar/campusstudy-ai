import { MetricCard, SectionCard } from "@campusstudy/ui";

import { LayoutShell } from "@/components/layout-shell";
import { UploadDropzone } from "@/components/upload-dropzone";
import { demoDashboard } from "@/lib/demo-data";

export default function DashboardPage() {
  return (
    <LayoutShell>
      <div className="grid gap-6">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-tide">Student Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Study this week with structure.</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Recent uploads, due flashcards, weak topics, and generated note sets live here.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <MetricCard label="Streak" value={`${demoDashboard.streakDays} days`} helper="Consistency score is rising." />
            <MetricCard label="Due cards" value={`${demoDashboard.dueFlashcards}`} helper="Perfect for a mobile review sprint." />
            <MetricCard label="Quiz avg" value={`${Math.round(demoDashboard.recentQuizAverage * 100)}%`} helper="Across the latest attempts." />
            <MetricCard label="Weakest topic" value="Graphs" helper="Needs one more active recall cycle." />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="Upload Materials" eyebrow="Pipeline">
            <UploadDropzone />
          </SectionCard>

          <SectionCard title="Weak Topics" eyebrow="Revision Radar">
            <div className="space-y-3">
              {demoDashboard.weakTopics.map((item) => (
                <div key={item.topic} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white">{item.topic}</p>
                    <span className="text-sm text-amber-200">{Math.round(item.mastery * 100)}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-ember" style={{ width: `${item.mastery * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Recent Uploads" eyebrow="Processing">
          <div className="grid gap-3">
            {demoDashboard.recentUploads.map((upload) => (
              <div key={upload.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div>
                  <p className="font-medium text-white">{upload.title}</p>
                  <p className="text-sm text-slate-400">{upload.courseTitle}</p>
                </div>
                <span className="rounded-full bg-tide/15 px-3 py-1 text-sm text-tide">{upload.status}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </LayoutShell>
  );
}

