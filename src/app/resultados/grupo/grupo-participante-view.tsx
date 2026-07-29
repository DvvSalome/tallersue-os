"use client";

import Link from "next/link";
import { AnalisisView } from "@/app/facilitador/dashboard/analisis/analisis-view";
import { LogoutButton } from "@/components/logout-button";
import type { ClosedRow, TextoRow } from "@/lib/analisis-grupal";
import type { PerfilRow } from "@/lib/perfiles-grupales";

// Reusa el mismo cuerpo del mapa colectivo que ve el facilitador (secciones,
// gráficas, filtro de grupo si aplicara) pero con una cabecera propia del
// participante: sin enlaces a "Participantes" ni "Códigos de equipo" — esos sí
// llevan datos identificables (apodo, progreso individual) y no son para acá —
// y sin el botón de exportar CSV.
export function GrupoParticipanteView({
  apodo,
  closedRows,
  textoRows,
  perfilRows,
}: {
  apodo: string;
  closedRows: ClosedRow[];
  textoRows: TextoRow[];
  perfilRows: PerfilRow[];
}) {
  return (
    <AnalisisView
      nav={
        <header className="glass sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-[var(--shadow-sm)]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-coral-dark">
              {apodo}
            </p>
            <h1
              className="font-display bg-clip-text text-lg font-bold leading-tight text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #ffb494 100%)",
              }}
            >
              Nuestro Mapa
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/resultados"
              className="inline-flex min-h-11 items-center rounded-lg px-3 py-1.5 text-sm font-medium text-brand-dark/80 transition-colors hover:text-brand-dark sm:min-h-0"
            >
              ← Mi Brújula
            </Link>
            <LogoutButton />
          </div>
        </header>
      }
      closedRows={closedRows}
      textoRows={textoRows}
      perfilRows={perfilRows}
      // Sin exportSlot: la exportación en CSV queda solo para quien facilita.
    />
  );
}
