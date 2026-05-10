import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-ink outline-none ring-0 transition focus:border-tide ${className}`}
      {...props}
    />
  );
}

