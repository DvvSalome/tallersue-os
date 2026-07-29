"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TOTAL_ITEMS_OBLIGATORIOS } from "@/lib/items";

export type ParticipantRow = {
  user_id: string;
  apodo: string;
  edad: number;
  comuna_id: number;
  comuna_nombre: string;
  equipo_codigo: string;
  equipo_nombre: string | null;
  items_respondidos: number;
  bloque_alcanzado: number;
  estado: "sin_iniciar" | "en_proceso" | "completado";
  ultima_actividad: string | null;
};

const ESTADO_LABEL: Record<ParticipantRow["estado"], string> = {
  sin_iniciar: "Sin iniciar",
  en_proceso: "En proceso",
  completado: "Completado",
};

const ESTADO_CLASS: Record<ParticipantRow["estado"], string> = {
  completado: "bg-success-light text-success",
  en_proceso: "bg-warning-light text-warning",
  sin_iniciar: "bg-border text-muted",
};

const inputClass =
  "rounded-lg border border-white/15 bg-white/5 backdrop-blur-md px-3 py-2 text-sm text-foreground outline-none transition-all duration-200 focus:border-brand focus:bg-white/10 focus:shadow-[0_0_0_3px_var(--brand-light)]";

export function DashboardClient({
  rows,
  scopedToOneComuna,
}: {
  rows: ParticipantRow[];
  scopedToOneComuna: boolean;
}) {
  const [search, setSearch] = useState("");
  const [comuna, setComuna] = useState("");
  const [estado, setEstado] = useState("");

  const comunas = useMemo(
    () => Array.from(new Set(rows.map((r) => r.comuna_nombre))).sort(),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (search && !r.apodo.toLowerCase().includes(search.toLowerCase())) return false;
    if (comuna && r.comuna_nombre !== comuna) return false;
    if (estado && r.estado !== estado) return false;
    return true;
  });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por apodo..."
          className={`min-w-0 flex-1 ${inputClass}`}
        />
        {!scopedToOneComuna && (
          <select value={comuna} onChange={(e) => setComuna(e.target.value)} className={inputClass}>
            <option value="">Todas las comunas</option>
            {comunas.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className={inputClass}>
          <option value="">Todos los estados</option>
          <option value="sin_iniciar">Sin iniciar</option>
          <option value="en_proceso">En proceso</option>
          <option value="completado">Completado</option>
        </select>
      </div>

      <div className="glass overflow-x-auto rounded-2xl shadow-[var(--shadow-md)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-white/10 bg-gradient-to-r from-brand-light to-transparent text-xs uppercase tracking-wide text-brand-dark">
            <tr>
              <th className="px-4 py-3">Apodo</th>
              <th className="px-4 py-3">Equipo</th>
              <th className="px-4 py-3">Comuna</th>
              <th className="px-4 py-3">Edad</th>
              <th className="px-4 py-3">Bloque alcanzado</th>
              <th className="px-4 py-3">Progreso</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
                <tr
                  key={r.user_id}
                  className="border-b border-white/10 last:border-0 transition-colors duration-150 hover:bg-brand-light"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/facilitador/dashboard/${r.user_id}`}
                      className="font-medium text-brand underline underline-offset-4 transition-colors hover:text-brand-dark"
                    >
                      {r.apodo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-brand-light px-1.5 py-0.5 font-display text-xs font-semibold tracking-wide text-brand-dark">
                      {r.equipo_codigo}
                    </span>
                    {r.equipo_nombre && <span className="ml-1.5 text-muted">{r.equipo_nombre}</span>}
                  </td>
                  <td className="px-4 py-3">{r.comuna_nombre}</td>
                  <td className="px-4 py-3 tabular-nums">{r.edad}</td>
                  <td className="px-4 py-3 tabular-nums">{r.bloque_alcanzado}/4</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-border/60">
                        <span
                          className="block h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(r.items_respondidos / TOTAL_ITEMS_OBLIGATORIOS) * 100}%`,
                            background:
                              "linear-gradient(90deg, #7c3aed 0%, #a78bfa 60%, #f2734a 100%)",
                          }}
                        />
                      </span>
                      <span className="tabular-nums text-muted">
                        {r.items_respondidos}/{TOTAL_ITEMS_OBLIGATORIOS}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${ESTADO_CLASS[r.estado]}`}>
                      {ESTADO_LABEL[r.estado]}
                    </span>
                  </td>
                </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">
                  No hay participantes que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
