"use client";

import type { AuthUser } from "@campusstudy/types";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
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
          <p className="text-xs uppercase tracking-[0.35em] text-tide">Secure Workspace</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Sign in to your course study system.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            CampusStudy AI keeps uploads, generated notes, quizzes, flashcards, transcripts, and source-grounded chat
            tied to your student account and enrolled courses.
          </p>
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/60 p-5">
            <p className="text-sm font-semibold text-white">What happens after sign-in</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              You land in a real workspace backed by the API: upload materials, generate study packs, review due cards,
              and ask cited questions across your courses.
            </p>
          </div>
        </section>

        <form onSubmit={onSubmit} className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-8">
          <h2 className="text-3xl font-semibold text-white">Sign in</h2>
          <p className="mt-2 text-sm text-slate-300">Use your university email and password.</p>
        {authState === "expired" ? (
          <p className="mt-4 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">
            Your session expired. Sign back in to continue your study workspace.
          </p>
        ) : null}
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
