"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Field, TextInput, Select, PrimaryButton, ErrorBanner } from "@/components/ui";
import { COMUNAS } from "@/lib/comunas";
import { DEMO_MODE } from "@/lib/demo/config";
import { apodoDisponible, createUser, findEquipoByCodigo, listEquipos, setSession } from "@/lib/demo/store";
import { normalizeCodigo } from "@/lib/team-code";

export default function ParticiparPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [apodo, setApodo] = useState("");
  const [edad, setEdad] = useState("");
  const [comunaId, setComunaId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [codigosDemo, setCodigosDemo] = useState<string[]>([]);

  // One-time read of localStorage on mount for a display hint — not a
  // derived-state mirror of props/state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (DEMO_MODE) {
      setCodigosDemo(listEquipos().filter((e) => e.activo).map((e) => e.codigo));
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (DEMO_MODE) {
        const equipo = findEquipoByCodigo(normalizeCodigo(codigo));
        if (!equipo || !equipo.activo) {
          setError("Ese código de equipo no existe o ya no está activo. Verifícalo con tu facilitador/a.");
          return;
        }
        if (!apodoDisponible(equipo.id, apodo.trim())) {
          setError("Ese apodo ya está en uso en este equipo. Elige otro.");
          return;
        }
        const user = createUser({
          apodo: apodo.trim(),
          edad: Number(edad),
          equipoId: equipo.id,
          comunaId: Number(comunaId),
        });
        setSession({ kind: "participante", userId: user.id });
        router.push("/home");
        return;
      }

      const res = await fetch("/api/auth/participant/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, apodo, edad: Number(edad), comunaId: Number(comunaId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo unir al equipo.");
        return;
      }
      router.push("/home");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-10">
      <div className="animate-fade-in-up flex flex-col gap-6">
        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-dark shadow-[var(--shadow-sm)]">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Participante
          </div>
          <h1
            className="font-display bg-clip-text text-3xl font-bold text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #ffb494 100%)",
            }}
          >
            Ya soy participante
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Pide el código de equipo a tu facilitador/a y elige un apodo para identificarte.
          </p>
        </div>

        {DEMO_MODE && (
          <div className="glass rounded-xl px-4 py-3 text-sm text-brand-dark shadow-[var(--shadow-sm)]">
            {codigosDemo.length > 0 ? (
              <>Códigos de equipo activos: <span className="font-display font-semibold tracking-widest text-brand">{codigosDemo.join(", ")}</span></>
            ) : (
              <>
                No hay ningún equipo creado todavía. Entra como{" "}
                <Link href="/facilitador/login" className="underline underline-offset-4">
                  facilitador/a
                </Link>{" "}
                y crea uno en &ldquo;Códigos de equipo&rdquo; (cualquier código/contraseña funciona en modo demo).
              </>
            )}
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="glass flex flex-col gap-4 rounded-2xl p-5 shadow-[var(--shadow-lg)]"
        >
          <Field label="Código de equipo">
            <TextInput
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ej. K7MQ3T"
              className="uppercase tracking-widest"
              autoCapitalize="characters"
            />
          </Field>

          <Field label="Apodo">
            <TextInput
              required
              minLength={2}
              maxLength={40}
              value={apodo}
              onChange={(e) => setApodo(e.target.value)}
              placeholder="¿Cómo quieres que te llamemos?"
            />
          </Field>

          <Field label="Edad">
            <TextInput
              required
              type="number"
              inputMode="numeric"
              min={9}
              max={35}
              value={edad}
              onChange={(e) => setEdad(e.target.value)}
            />
          </Field>

          <Field label="¿De qué comuna eres?">
            <Select required value={comunaId} onChange={(e) => setComunaId(e.target.value)}>
              <option value="" disabled>
                Selecciona tu comuna
              </option>
              {COMUNAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}. {c.nombre}
                </option>
              ))}
            </Select>
            <span className="text-xs font-normal text-muted">
              Solo la usamos para mostrarte las líneas y lugares de atención cerca de ti. No cambia
              nada del taller ni de tus respuestas.
            </span>
          </Field>

          <ErrorBanner message={error} />

          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </PrimaryButton>
        </form>

        <Link
          href="/"
          className="group inline-flex items-center justify-center gap-1.5 self-center text-sm font-medium text-muted transition-colors hover:text-brand-dark"
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
