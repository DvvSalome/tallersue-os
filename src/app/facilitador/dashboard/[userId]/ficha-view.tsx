"use client";

import Link from "next/link";
import { BLOQUES } from "@/lib/items";
import { FacilitadorNav } from "@/components/facilitador-nav";
import { describirValor, type RespuestasAbiertas, type RespuestasCerradas } from "@/lib/respuestas";

// Ficha individual. El facilitador está autorizado a verla (RLS la limita a su
// comuna), así que aquí sí aparece el texto tal como lo escribió la persona.
// La anonimización aplica a los AGREGADOS y a las exportaciones, no a esta
// vista de acompañamiento.

export function FichaView({
  codigoGrupo,
  apodo,
  edad,
  comunaNombre,
  ciudad,
  pais,
  equipoCodigo,
  equipoNombre,
  registradoEn,
  cerradas,
  abiertas,
}: {
  codigoGrupo: string;
  apodo: string;
  edad: number;
  comunaNombre: string;
  ciudad: string;
  pais: string;
  equipoCodigo: string;
  equipoNombre: string | null;
  registradoEn: string;
  cerradas: RespuestasCerradas;
  abiertas: RespuestasAbiertas;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-8">
      <FacilitadorNav codigoGrupo={codigoGrupo} />

      <Link href="/facilitador/dashboard" className="text-sm text-brand underline underline-offset-4">
        ← Volver a participantes
      </Link>

      <header className="animate-fade-in-up rounded-xl glass p-4 shadow-[var(--shadow-sm)]">
        <h1 className="font-display text-xl font-semibold text-brand-dark">{apodo}</h1>
        <p className="text-sm text-muted">
          {edad} años · {comunaNombre} · {ciudad}, {pais}
        </p>
        <p className="mt-1 text-xs text-muted">
          Equipo:{" "}
          <span className="font-display font-semibold tracking-wide text-brand-dark">
            {equipoCodigo}
          </span>
          {equipoNombre ? ` — ${equipoNombre}` : ""}
        </p>
        <p className="mt-1 text-xs text-muted/70">Registrado el {registradoEn}</p>
      </header>

      <div className="flex flex-col gap-6">
        {BLOQUES.map((bloque, bi) => (
          <section
            key={bloque.bloque}
            className="animate-fade-in-up flex flex-col gap-3"
            style={{ animationDelay: `${bi * 60}ms` }}
          >
            <h2 className="font-display font-semibold">
              Bloque {bloque.bloque} · {bloque.titulo}
            </h2>
            {bloque.items.map((it) => {
              const valor = cerradas[it.item];
              const principal =
                it.tipo === "texto"
                  ? (abiertas[it.clave] ?? "").trim()
                  : valor
                    ? describirValor(it, valor)
                    : "";
              const observacion = it.abierta ? (abiertas[it.abierta.clave] ?? "").trim() : "";
              return (
                <div key={it.item} className="rounded-xl glass p-4 shadow-[var(--shadow-sm)]">
                  <p className="text-sm font-medium">
                    <span className="mr-1.5 text-xs text-brand-dark/70">{it.codigo}</span>
                    {it.etiqueta}
                  </p>
                  <p className="mt-1 text-sm text-brand-dark">
                    {principal || <span className="text-muted/70">Sin responder.</span>}
                  </p>
                  {observacion && (
                    <div className="mt-2 border-l-2 border-white/15 pl-2.5">
                      <p className="text-xs text-muted">{it.abierta?.etiqueta}</p>
                      <p className="text-sm text-foreground/90">{observacion}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </main>
  );
}
