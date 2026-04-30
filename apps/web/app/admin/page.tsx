"use client";

import { LayoutShell } from "@/components/layout-shell";
import { useAuthedQuery } from "@/lib/api-hooks";

type AdminMetrics = {
  totalUsers: number;
  totalCourses: number;
  totalMaterials: number;
  failedJobs: number;
  activeStudents: number;
};

type ProcessingJob = {
  id: string;
  stage: string;
  status: string;
  errorMessage?: string | null;
  materialId: string;
};

export default function AdminPage() {
  const metricsQuery = useAuthedQuery<AdminMetrics>({
    queryKey: ["admin", "metrics"],
    path: "/admin/metrics"
  });
  const jobsQuery = useAuthedQuery<ProcessingJob[]>({
    queryKey: ["admin", "jobs"],
    path: "/admin/jobs"
  });
  const metrics = metricsQuery.data;
  const jobs = jobsQuery.data ?? [];

  return (
    <LayoutShell>
      <div className="grid gap-6">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Admin Panel</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Operational visibility for a campus pilot.</h1>
          {!metricsQuery.hasSession && metricsQuery.hydrated ? (
            <p className="mt-4 text-sm text-gold">Admin live data unlocks after sign-in with an admin account.</p>
          ) : null}
        </section>
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            ["Users", `${metrics?.totalUsers ?? "-"}`],
            ["Processing failures", `${metrics?.failedJobs ?? "-"}`],
            ["Open jobs", `${jobs.length}`]
          ].map(([label, value]) => (
            <div key={label} className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">
          <h2 className="text-xl font-semibold text-white">Job logs</h2>
          <div className="mt-4 space-y-3">
            {jobs.length ? (
              jobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                  {job.status} :: {job.stage} :: {job.materialId}
                  {job.errorMessage ? ` :: ${job.errorMessage}` : ""}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-400">
                No live admin jobs loaded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
