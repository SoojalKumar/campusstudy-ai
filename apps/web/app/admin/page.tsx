"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { LayoutShell } from "@/components/layout-shell";
import { apiFetch } from "@/lib/api";
import { useAuthedQuery } from "@/lib/api-hooks";
import { useSession } from "@/lib/session";

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
  attempts: number;
  errorMessage?: string | null;
  materialId: string;
  logsJson: Array<{ stage?: string; message?: string }>;
};

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { token } = useSession();
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
  const retryMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiFetch<ProcessingJob>(`/admin/jobs/${jobId}/retry`, {
        method: "POST",
        token
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "metrics"] });
    }
  });

  return (
    <LayoutShell>
      <div className="grid gap-6">
        <section className="rounded-[2.5rem] border border-[var(--line)] bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Admin Panel</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink">Operational visibility for a campus pilot.</h1>
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
            <div key={label} className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-5">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="text-xl font-semibold text-ink">Job logs</h2>
          <div className="mt-4 space-y-3">
            {jobs.length ? (
              jobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-[var(--line)] bg-white p-4 text-sm text-slate-600">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">
                        {job.status} · {job.stage}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Material {job.materialId} · attempts {job.attempts}
                      </p>
                    </div>
                    <button
                      className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-[var(--accent-soft)] disabled:opacity-50"
                      disabled={retryMutation.isPending}
                      onClick={() => retryMutation.mutate(job.id)}
                      type="button"
                    >
                      {retryMutation.isPending ? "Retrying..." : "Retry job"}
                    </button>
                  </div>
                  {job.errorMessage ? (
                    <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {job.errorMessage}
                    </p>
                  ) : null}
                  {job.logsJson.length ? (
                    <div className="mt-3 space-y-2">
                      {job.logsJson.slice(-3).map((entry, index) => (
                        <div key={`${job.id}-${index}`} className="rounded-xl border border-[var(--line)] bg-slate-50 px-3 py-2 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">{entry.stage ?? "stage"}</span>
                          {entry.message ? ` · ${entry.message}` : ""}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-[var(--line)] bg-white p-4 text-sm text-slate-500">
                No live admin jobs loaded yet.
              </div>
            )}
          </div>
          {retryMutation.isError ? (
            <p className="mt-4 text-sm text-rose-700">{(retryMutation.error as Error).message}</p>
          ) : null}
        </div>
      </div>
    </LayoutShell>
  );
}
