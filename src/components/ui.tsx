"use client";

import type { InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from "react";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground/85">
      {label}
      {children}
    </label>
  );
}

const inputBase =
  "rounded-xl border border-white/15 bg-white/5 backdrop-blur-md px-4 py-3 text-base text-foreground shadow-[var(--shadow-sm)] outline-none transition-all duration-200 ease-out placeholder:text-muted/60 focus:border-brand focus:bg-white/10 focus:shadow-[0_0_0_4px_var(--brand-light),0_4px_20px_-4px_rgba(167,139,250,0.5)]";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`${inputBase} ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${inputBase} appearance-none bg-[right_1rem_center] bg-no-repeat pr-10 ${props.className ?? ""}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a78bfa' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
        ...(props.style ?? {}),
      }}
    />
  );
}

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`shine animate-pulse-glow group relative w-full overflow-hidden rounded-2xl px-6 py-4 text-center font-semibold text-white transition-all duration-300 ease-out enabled:hover:-translate-y-0.5 enabled:active:scale-[0.97] disabled:opacity-50 ${props.className ?? ""}`}
      style={{
        background:
          "linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)",
        ...(props.style ?? {}),
      }}
    />
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="animate-fade-in-up flex items-start gap-2 overflow-hidden rounded-xl border border-coral/40 bg-coral-light px-4 py-3 text-sm text-coral-dark backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(255,144,102,0.4)]"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p className="flex-1">{message}</p>
    </div>
  );
}
