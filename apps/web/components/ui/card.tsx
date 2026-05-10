export function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-5">{children}</div>;
}
