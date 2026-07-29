"use client";

import { optionLabel, type Item } from "@/lib/items";
import { seccionesResueltas } from "@/lib/mapa-colectivo";
import { FacilitadorNav } from "@/components/facilitador-nav";
import { K_ANON_MIN, type ClosedRow, type TextoRow } from "@/lib/analisis-grupal";

// "Nuestro Mapa" — dashboard grupal ANÓNIMO (doc §4).
//
// Se organiza por las preguntas colectivas del documento, no por número de
// ítem: el grupo no debe leer "cómo son los participantes" sino reconocerse.
// Dos garantías que se mantienen visibles para quien facilita:
//   - ningún agregado de una comuna con menos de K_ANON_MIN respuestas,
//   - del texto libre solo se muestra la categoría, nunca lo que alguien
//     escribió.

export function AnalisisView({
  codigoGrupo,
  closedRows,
  textoRows,
  exportSlot,
}: {
  codigoGrupo: string;
  closedRows: ClosedRow[];
  textoRows: TextoRow[];
  exportSlot: React.ReactNode;
}) {
  const secciones = seccionesResueltas();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-7 px-5 py-8">
      <FacilitadorNav codigoGrupo={codigoGrupo} />

      <div className="flex animate-fade-in-up flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-brand-dark">
            Nuestro Mapa de los Sueños
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            Lectura colectiva y anónima, agregada por comuna. No se muestra ningún agregado de una
            comuna con menos de {K_ANON_MIN} respuestas, y del texto libre solo se muestran los
            temas: nunca lo que escribió una persona.
          </p>
        </div>
        {exportSlot}
      </div>

      <div className="flex flex-col gap-8">
        {secciones.map((seccion, si) => (
          <section
            key={seccion.id}
            className="animate-fade-in-up flex flex-col gap-3"
            style={{ animationDelay: `${si * 60}ms` }}
          >
            <div>
              <h2 className="font-display text-lg font-semibold">{seccion.pregunta}</h2>
              <p className="text-sm text-muted">{seccion.descripcion}</p>
            </div>

            {seccion.items.map((it) => (
              <ItemPanel
                key={it.item}
                item={it}
                closedRows={closedRows.filter((r) => r.item === it.item)}
                textoRows={textoRows.filter((r) => r.item === it.item)}
              />
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}

function ItemPanel({
  item,
  closedRows,
  textoRows,
}: {
  item: Item;
  closedRows: ClosedRow[];
  textoRows: TextoRow[];
}) {
  const comunas = agruparPorComuna(closedRows, textoRows);

  return (
    <div className="rounded-xl glass p-4 shadow-[var(--shadow-sm)]">
      <p className="mb-3 text-sm font-medium">
        <span className="mr-1.5 text-xs text-brand-dark/70">{item.codigo}</span>
        {item.etiqueta}
      </p>

      {comunas.length === 0 ? (
        <p className="text-sm text-muted/70">
          Sin datos suficientes (mínimo {K_ANON_MIN} respuestas por comuna).
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {comunas.map(({ comuna, total, cerradas, textos }) => (
            <div key={comuna}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {comuna} · n={total}
              </p>

              {cerradas.length > 0 && (
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {[...cerradas]
                    .sort((a, b) => b.n - a.n)
                    .map((r) => (
                      <BarRow
                        key={r.opcion}
                        label={etiquetaOpcion(item, r.opcion)}
                        pct={r.porcentaje}
                        detail={`${r.n} (${r.porcentaje}%)${
                          r.promedio !== null ? ` · promedio ${r.promedio}` : ""
                        }`}
                      />
                    ))}
                </ul>
              )}

              {/* Categorías del texto libre: la pregunta abierta pura (P20) o el
                  campo de observaciones de una pregunta cerrada. Antes se
                  consultaban y no se mostraban nunca. */}
              {textos.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted/80">
                    {item.tipo === "texto"
                      ? "Temas del mensaje"
                      : `Temas de "${item.abierta?.etiqueta ?? "comentarios"}"`}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {[...textos]
                      .sort((a, b) => b.n - a.n)
                      .map((r) => (
                        <BarRow
                          key={`${r.clave}-${r.categoria_codificada}`}
                          label={r.categoria_codificada}
                          pct={r.porcentaje}
                          detail={`${r.n} (${r.porcentaje}%)`}
                          tono="texto"
                        />
                      ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BarRow({
  label,
  pct,
  detail,
  tono = "cerrada",
}: {
  label: string;
  pct: number;
  detail: string;
  tono?: "cerrada" | "texto";
}) {
  return (
    <li className="text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span>{label}</span>
        <span className="shrink-0 tabular-nums text-muted">{detail}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: tono === "texto" ? "#f2734a" : "#7c3aed",
          }}
        />
      </div>
    </li>
  );
}

function etiquetaOpcion(item: Item, value: string) {
  if (item.tipo === "likert") {
    const n = Number(value);
    return item.escala ? `${n} de ${item.escala.max}` : value;
  }
  return optionLabel(item, value);
}

function agruparPorComuna(closedRows: ClosedRow[], textoRows: TextoRow[]) {
  const nombres = new Set([
    ...closedRows.map((r) => r.comuna_nombre),
    ...textoRows.map((r) => r.comuna_nombre),
  ]);
  return Array.from(nombres)
    .sort((a, b) => a.localeCompare(b))
    .map((comuna) => {
      const cerradas = closedRows.filter((r) => r.comuna_nombre === comuna);
      const textos = textoRows.filter((r) => r.comuna_nombre === comuna);
      return {
        comuna,
        total: cerradas[0]?.total_comuna ?? textos[0]?.total_comuna ?? 0,
        cerradas,
        textos,
      };
    });
}
