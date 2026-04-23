export function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5">{children}</div>;
}
