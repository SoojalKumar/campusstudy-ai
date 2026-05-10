"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "@/lib/session";

const navItems: Array<{ href: string; label: string }> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/courses", label: "Courses" },
  { href: "/admin", label: "Admin" }
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, clearSession } = useSession();

  return (
    <div className="app-shell min-h-screen text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-5 px-4 py-5 md:px-6">
        <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-72 shrink-0 rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-soft)] md:flex md:flex-col">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-tide text-sm font-bold text-white shadow-lg shadow-tide/20">
                CS
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">CampusStudy AI</p>
                <p className="text-xs text-slate-500">Student workspace</p>
              </div>
            </div>
            <p className="mt-6 text-sm leading-6 text-slate-600">
              A focused home for uploads, cited study assets, quizzes, and active recall.
            </p>
          </div>
          <nav className="mt-8 space-y-1.5">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-tide text-white shadow-sm"
                      : "border border-transparent text-slate-600 hover:border-[var(--line)] hover:bg-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-3xl border border-[var(--line)] bg-[var(--panel-muted)] p-4">
            <p className="text-sm font-semibold text-ink">{user?.name ?? "Signed out"}</p>
            <p className="mt-1 break-words text-xs text-slate-500">{user?.email ?? "Sign in to access your workspace"}</p>
            {user ? (
              <button
                className="cs-button-secondary mt-4 w-full px-4 py-3 text-sm text-ember"
                onClick={clearSession}
                type="button"
              >
                Sign out
              </button>
            ) : (
              <Link
                className="cs-button-primary mt-4 block w-full px-4 py-3 text-center text-sm"
                href="/login"
              >
                Sign in
              </Link>
            )}
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="mb-4 rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel)] p-3 shadow-sm md:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-tide text-xs font-bold text-white">CS</div>
                <div>
                  <p className="text-sm font-semibold text-ink">CampusStudy AI</p>
                  <p className="text-xs text-slate-500">{user?.name ?? "Student workspace"}</p>
                </div>
              </Link>
              {user ? (
                <button className="rounded-2xl border border-[var(--line)] px-3 py-2 text-xs font-semibold text-slate-600" onClick={clearSession} type="button">
                  Sign out
                </button>
              ) : (
                <Link className="rounded-2xl bg-tide px-3 py-2 text-xs font-semibold text-white" href="/login">
                  Sign in
                </Link>
              )}
            </div>
            <nav className="mt-3 grid grid-cols-3 gap-2">
              {navItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-2xl px-3 py-2 text-center text-xs font-semibold ${
                      active ? "bg-tide text-white" : "bg-white text-slate-600"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
