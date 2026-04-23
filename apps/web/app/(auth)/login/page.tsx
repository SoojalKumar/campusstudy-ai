"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useSession();
  const [form, setForm] = useState({ email: "maya@student.pacific.edu", password: "StudentPass123!" });
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await apiFetch<{ access_token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setSession(response.access_token, response.user);
      router.push("/dashboard");
    } catch (nextError) {
      setError((nextError as Error).message);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
      <form onSubmit={onSubmit} className="w-full rounded-[2rem] border border-white/10 bg-[var(--panel)] p-8">
        <h1 className="text-3xl font-semibold text-white">Sign in to CampusStudy AI</h1>
        <p className="mt-2 text-sm text-slate-300">Use the seeded demo user or your own local account.</p>
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
        <button className="mt-6 w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950">
          Sign in
        </button>
      </form>
    </main>
  );
}

