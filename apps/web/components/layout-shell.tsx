"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "@/lib/session";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/courses", label: "Courses" },
  { href: "/flashcards/demo", label: "Flashcards" },
  { href: "/quizzes/demo", label: "Quizzes" },
  { href: "/chat/demo", label: "Study Chat" },
  { href: "/admin", label: "Admin" }
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, clearSession } = useSession();

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="hidden w-72 shrink-0 rounded-[2rem] border border-white/10 bg-[var(--panel)] p-5 md:flex md:flex-col">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-tide">CampusStudy AI</p>
            <h1 className="mt-3 text-2xl font-semibold">Structured study, not chat sludge.</h1>
            <p className="mt-3 text-sm text-slate-300">
              Upload lectures, generate notes, quiz yourself, and keep citations visible.
            </p>
          </div>
          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm transition ${
                    active
                      ? "bg-white text-slate-950"
                      : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-3xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-sm font-medium text-white">{user?.name ?? "Demo student"}</p>
            <p className="mt-1 text-xs text-slate-400">{user?.email ?? "student.pacific.edu"}</p>
            <button
              className="mt-4 w-full rounded-2xl bg-ember px-4 py-3 text-sm font-semibold text-ink"
              onClick={clearSession}
              type="button"
            >
              Sign out
            </button>
          </div>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

