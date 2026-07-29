"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateCodigo } from "@/lib/team-code";
import { createClient } from "@/lib/supabase/client";
import { Field, TextInput, PrimaryButton, ErrorBanner } from "@/components/ui";

export type EquipoRow = {
  id: string;
  codigo: string;
  nombre: string | null;
  activo: boolean;
  participantes: number;
  createdAt: string;
};

async function defaultCreate(input: { codigo: string; nombre: string | null }) {
  const supabase = createClient();
  const { error } = await supabase.from("equipos").insert({
    codigo: input.codigo,
    nombre: input.nombre,
  });
  return { error: error ? "No se pudo crear el equipo. Intenta de nuevo." : undefined };
}

async function defaultToggle(row: EquipoRow) {
  const supabase = createClient();
  await supabase.from("equipos").update({ activo: !row.activo }).eq("id", row.id);
}

export function EquiposClient({
  rows,
  onCreate = defaultCreate,
  onToggle = defaultToggle,
}: {
  rows: EquipoRow[];
  onCreate?: (input: { codigo: string; nombre: string | null }) => Promise<{ error?: string }>;
  onToggle?: (row: EquipoRow) => Promise<void>;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [ultimoCodigo, setUltimoCodigo] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    setUltimoCodigo(null);
    try {
      const codigo = generateCodigo();
      const { error: createError } = await onCreate({
        codigo,
        nombre: nombre.trim() || null,
      });
      if (createError) {
        setError(createError);
        return;
      }
      setUltimoCodigo(codigo);
      setNombre("");
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(row: EquipoRow) {
    await onToggle(row);
    router.refresh();
  }

  async function copiar(row: EquipoRow) {
    await navigator.clipboard.writeText(row.codigo);
    setCopiedId(row.id);
    setTimeout(() => setCopiedId((c) => (c === row.id ? null : c)), 1500);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-brand-dark">Códigos de equipo</h1>
        <p className="text-sm text-muted">
          Crea un código y compártelo con el equipo — lo usan para entrar sin cuenta personal.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 rounded-2xl glass p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-end sm:gap-3"
      >
        <div className="flex-1">
          <Field label="Nombre del equipo (opcional)">
            <TextInput
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Semillero San Javier"
            />
          </Field>
        </div>
        <PrimaryButton type="submit" disabled={creating} className="w-auto px-6 py-3 sm:mb-0">
          {creating ? "Creando..." : "Crear código"}
        </PrimaryButton>
      </form>

      <ErrorBanner message={error} />

      {ultimoCodigo && (
        <div className="animate-fade-in-up rounded-xl border border-success bg-success-light/60 px-4 py-3 text-sm">
          Equipo creado. Código: <span className="font-display text-lg font-semibold tracking-widest">{ultimoCodigo}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl glass p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => copiar(row)}
                className="rounded-lg bg-brand-light px-3 py-1.5 font-display text-base font-semibold tracking-widest text-brand-dark transition-colors hover:bg-brand/20"
                title="Copiar código"
              >
                {copiedId === row.id ? "Copiado ✓" : row.codigo}
              </button>
              <div>
                <p className="font-medium">{row.nombre ?? "Sin nombre"}</p>
                <p className="text-xs text-muted">
                  {row.participantes} participante{row.participantes === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  row.activo ? "bg-success-light text-success" : "bg-border text-muted"
                }`}
              >
                {row.activo ? "Activo" : "Inactivo"}
              </span>
              <button
                onClick={() => handleToggle(row)}
                className="text-sm font-medium text-brand underline underline-offset-4 transition-colors hover:text-brand-dark"
              >
                {row.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-muted">Aún no has creado ningún equipo.</p>
        )}
      </div>
    </div>
  );
}
