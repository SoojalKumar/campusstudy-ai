"use client";

import type { AuthUser } from "@campusstudy/types";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useSession();
  const [form, setForm] = useState({ email: "maya@student.pacific.edu", password: "StudentPass123!" });
  const [error, setError] = useState<string | null>(null);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);

  async function loginWith(credentials: { email: string; password: string }, label: string) {
    setError(null);
    setLoadingLabel(label);
    try {
      const response = await apiFetch<{ access_token: string; user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials)
      });
      setSession(response.access_token, response.user);
      router.push("/dashboard");
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setLoadingLabel(null);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loginWith(form, "custom");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-12">
      <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2.5rem] border border-white/10 bg-[var(--panel)] p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-tide">Local Pilot</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Jump into the seeded campus workspace.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Use these buttons after `make seed` or Docker seed. They log into real API accounts, not a fake client-only
            demo, so uploads, chat, flashcards, quizzes, and admin checks all hit the backend.
          </p>
          <div className="mt-6 grid gap-3">
            <button
              className="rounded-2xl bg-white px-5 py-4 text-left font-semibold text-slate-950 transition hover:bg-tide disabled:opacity-50"
              disabled={Boolean(loadingLabel)}
              onClick={() =>
                loginWith(
                  { email: "maya@student.pacific.edu", password: "StudentPass123!" },
                  "student"
                )
              }
              type="button"
            >
              {loadingLabel === "student" ? "Signing in..." : "Enter as Maya, CS student"}
              <span className="mt-1 block text-xs font-medium text-slate-600">
                Dashboard, CS220 materials, RAG chat, quiz attempts, flashcards.
              </span>
            </button>
            <button
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-left font-semibold text-white transition hover:border-gold/40 disabled:opacity-50"
              disabled={Boolean(loadingLabel)}
              onClick={() => loginWith({ email: "admin@pacific.edu", password: "AdminPass123!" }, "admin")}
              type="button"
            >
              {loadingLabel === "admin" ? "Signing in..." : "Enter as Campus Admin"}
              <span className="mt-1 block text-xs font-medium text-slate-400">
                Users, uploads, failures, processing jobs, metrics.
              </span>
            </button>
          </div>
        </section>

        <form onSubmit={onSubmit} className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-8">
          <h2 className="text-3xl font-semibold text-white">Sign in manually</h2>
          <p className="mt-2 text-sm text-slate-300">Use a seeded user or your own local account.</p>
        <div className="mt-6 space-y-4">
          <input
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
            placeholder="student email"
          />
          <input
            value={form.password}
            type="password"
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
            placeholder="password"
          />
        </div>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        <button
          className="mt-6 w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
          disabled={Boolean(loadingLabel)}
        >
          {loadingLabel === "custom" ? "Signing in..." : "Sign in"}
        </button>
      </form>
      </div>
    </main>
  );
}
