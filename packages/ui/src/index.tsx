import type { PropsWithChildren, ReactNode } from "react";

export function SectionCard({
  title,
  eyebrow,
  action,
  children
}: PropsWithChildren<{ title: string; eyebrow?: string; action?: ReactNode }>) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-cyan-950/10 backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/80 p-8 text-center">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
