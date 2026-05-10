"use client";

import type { AuthUser } from "@campusstudy/types";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { loginErrorMessage } from "@/lib/auth-errors";
import { useSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const { setSession, authState } = useSession();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);

  async function loginWith(credentials: { email: string; password: string }, label: string) {
    setError(null);
    setLoadingLabel(label);
    try {
      const response = await apiFetch<{ accessToken: string; user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials)
      });
      setSession(response.accessToken, response.user);
      router.push("/dashboard");
    } catch (nextError) {
      setError(loginErrorMessage(nextError));
    } finally {
      setLoadingLabel(null);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loginWith(form, "custom");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12 text-ink">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="cs-card overflow-hidden p-8 md:p-10">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-tide text-sm font-bold text-white shadow-lg shadow-tide/20">
              CS
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">CampusStudy AI</p>
              <p className="text-xs text-slate-500">University study workspace</p>
            </div>
          </div>
          <h1 className="mt-10 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.03em] text-ink md:text-5xl">
            Your course materials, organized into a study system.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
            CampusStudy AI keeps uploads, generated notes, quizzes, flashcards, transcripts, and source-grounded chat
            tied to your student account and enrolled courses.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              "Upload lecture files and course readings",
              "Generate notes, flashcards, and quizzes",
              "Keep transcripts and citations tied to the source"
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <span className="grid size-8 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-tide">
                  {index + 1}
                </span>
                <p className="text-sm font-medium text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={onSubmit} className="cs-card p-8 md:p-10">
          <p className="cs-eyebrow">Secure sign in</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Welcome back</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use your university email and password.</p>
        {authState === "expired" ? (
          <p className="mt-5 rounded-2xl border border-gold/30 bg-[var(--gold-soft)] px-4 py-3 text-sm text-gold">
            Your session expired. Sign back in to continue your study workspace.
          </p>
        ) : null}
        <div className="mt-7 space-y-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Email
            <input
              value={form.email}
              type="email"
              autoComplete="email"
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="cs-input px-4 py-3 font-normal"
              placeholder="maya@student.pacific.edu"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Password
            <input
              value={form.password}
              type="password"
              autoComplete="current-password"
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="cs-input px-4 py-3 font-normal"
              placeholder="Enter your password"
            />
          </label>
        </div>
        {error ? (
          <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        <button
          className="cs-button-primary mt-6 w-full px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={Boolean(loadingLabel)}
        >
          {loadingLabel === "custom" ? "Signing in..." : "Sign in"}
        </button>
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Built for pilot courses: private materials, account-scoped study assets, and cited answers.
        </p>
      </form>
      </div>
    </main>
  );
}
