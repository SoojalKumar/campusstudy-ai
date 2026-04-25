"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";

type RegisterForm = {
  email: string;
  password: string;
  name: string;
  major: string;
  semester: string;
};

const registerFields: Array<{
  key: keyof RegisterForm;
  placeholder: string;
  type?: "text" | "password";
}> = [
  { key: "name", placeholder: "Full name" },
  { key: "email", placeholder: "University email" },
  { key: "password", placeholder: "Password", type: "password" },
  { key: "major", placeholder: "Major" },
  { key: "semester", placeholder: "Semester" }
];

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useSession();
  const [form, setForm] = useState<RegisterForm>({
    email: "",
    password: "",
    name: "",
    major: "",
    semester: ""
  });
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await apiFetch<{ access_token: string; user: any }>("/auth/register", {
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
        <h1 className="text-3xl font-semibold text-white">Create your study workspace</h1>
        <div className="mt-6 grid gap-4">
          {registerFields.map(({ key, placeholder, type = "text" }) => (
            <input
              key={key}
              value={form[key]}
              type={type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [key]: event.target.value
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white"
              placeholder={placeholder}
            />
          ))}
        </div>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        <button className="mt-6 w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950">
          Create account
        </button>
      </form>
    </main>
  );
}
