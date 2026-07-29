"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Field, TextInput, PrimaryButton, ErrorBanner } from "@/components/ui";
import { DEMO_MODE } from "@/lib/demo/config";
import { setSession } from "@/lib/demo/store";

export default function FacilitadorLoginPage() {
  const router = useRouter();
  const [codigoGrupo, setCodigoGrupo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (DEMO_MODE) {
        if (!codigoGrupo.trim() || !password) {
          setError("Completa el código de grupo y la contraseña.");
          return;
        }
        setSession({ kind: "facilitador", codigoGrupo: codigoGrupo.trim(), comunaId: null });
        router.push("/facilitador/dashboard");
        return;
      }

      const res = await fetch("/api/auth/facilitador/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigoGrupo, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión.");
        return;
      }
      router.push("/facilitador/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-10">
      <div className="animate-fade-in-up flex flex-col gap-6">
        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-coral-dark shadow-[var(--shadow-sm)]">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            Facilitador/a
          </div>
          <h1
            className="font-display bg-clip-text text-3xl font-bold text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #ffb494 100%)",
            }}
          >
            Acceso de facilitador/a
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Ingresa con el código de grupo asignado por la coordinación del Taller.
          </p>
        </div>

        {DEMO_MODE && (
          <p className="glass rounded-xl px-4 py-3 text-sm text-brand-dark shadow-[var(--shadow-sm)]">
            Modo demo: cualquier código y contraseña funcionan.
          </p>
        )}

        <form
          onSubmit={onSubmit}
          className="glass flex flex-col gap-4 rounded-2xl p-5 shadow-[var(--shadow-lg)]"
        >
          <Field label="Código de grupo">
            <TextInput
              required
              value={codigoGrupo}
              onChange={(e) => setCodigoGrupo(e.target.value)}
              placeholder="Ej. GRUPO-COMUNA13"
            />
          </Field>

          <Field label="Contraseña">
            <TextInput
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <ErrorBanner message={error} />

          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </PrimaryButton>
        </form>

        <Link
          href="/"
          className="group inline-flex min-h-11 items-center justify-center gap-1.5 self-center px-4 text-sm font-medium text-muted transition-colors hover:text-brand-dark"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200 group-hover:-translate-x-0.5"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Volver
        </Link>
      </div>
    </main>
  );
}
