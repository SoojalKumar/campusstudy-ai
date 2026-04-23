import { LayoutShell } from "@/components/layout-shell";

export default function AdminPage() {
  return (
    <LayoutShell>
      <div className="grid gap-6">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Admin Panel</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Operational visibility for a campus pilot.</h1>
        </section>
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            ["Users", "4 active"],
            ["Processing failures", "1 retry needed"],
            ["Open jobs", "7 in queue"]
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
            {[
              "process_material_pipeline :: extracting :: Graph Traversal Lecture Notes",
              "process_material_pipeline :: completed :: Supervised Learning Lecture Audio",
              "retry requested :: legacy-ppt-upload :: awaiting re-run"
            ].map((entry) => (
              <div key={entry} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}

