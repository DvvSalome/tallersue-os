"use client";

import { useMemo, useState } from "react";
import { optionLabel, type Item } from "@/lib/items";
import { seccionesResueltas, type SerieResuelta } from "@/lib/mapa-colectivo";
import { FacilitadorNav } from "@/components/facilitador-nav";
import { K_ANON_MIN, nombreGrupo, type ClosedRow, type TextoRow } from "@/lib/analisis-grupal";

// "Nuestro Mapa de los Sueños" — dashboard colectivo y anónimo.
//
// Se recorre como una historia en diez secciones, no como una lista de
// preguntas. Cuatro reglas que la pantalla hace cumplir:
//
// 1. TRANSPARENCIA DEL DATO: cada serie muestra su N. Si no alcanza el umbral de
//    k-anonimato se dice explícitamente, en lugar de dejar el hueco en blanco —
//    un vacío sin explicación se lee como un error.
// 2. NADA ATRIBUIBLE: del texto libre solo salen categorías agregadas, nunca lo
//    que escribió una persona.
// 3. SIN SOBREINTERPRETAR: el encabezado aclara que esto representa a quienes
//    participaron, no a la juventud ni al territorio.
// 4. LEGIBLE SIN COLOR: cada barra lleva su valor y su etiqueta en texto, así
//    la lectura no depende de distinguir tonos.

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
  const [grupoActivo, setGrupoActivo] = useState("");
  const [seccionActiva, setSeccionActiva] = useState(secciones[0]?.id ?? "");

  const grupos = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const r of [...closedRows, ...textoRows]) {
      mapa.set(r.equipo_id, nombreGrupo(r.equipo_codigo, r.equipo_nombre));
    }
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [closedRows, textoRows]);

  const cerradas = grupoActivo
    ? closedRows.filter((f) => f.equipo_id === grupoActivo)
    : closedRows;
  const textos = grupoActivo ? textoRows.filter((f) => f.equipo_id === grupoActivo) : textoRows;
  const hayDatos = cerradas.length > 0 || textos.length > 0;
  const seccion = secciones.find((s) => s.id === seccionActiva) ?? secciones[0];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-5 pb-24 pt-8">
      <FacilitadorNav codigoGrupo={codigoGrupo} />

      <header className="animate-fade-in-up flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/80">
              Nuestro Mapa de los Sueños
            </p>
            <h1
              className="font-display mt-1 bg-clip-text text-2xl font-bold leading-tight text-transparent sm:text-3xl"
              style={{
                backgroundImage: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 55%, #ffb494 100%)",
              }}
            >
              Nuestros sueños, nuestras realidades y nuestras posibilidades
            </h1>
          </div>
          {exportSlot}
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Esta información reúne las respuestas de las personas que participaron en esta actividad y
          se presenta de forma agregada y anónima. No es una muestra estadística de la juventud ni
          del territorio.
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-muted/80">
          <Chip>Mínimo {K_ANON_MIN} respuestas por grupo para publicar un resultado</Chip>
          <Chip>Del texto libre solo se muestran temas</Chip>
        </div>
      </header>

      {!hayDatos ? (
        <SinDatos secciones={secciones.map((s) => `${s.numero} · ${s.pregunta}`)} />
      ) : (
        <>
          {grupos.length > 1 && (
            <div className="animate-fade-in-up flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Grupo</span>
              <Pill activo={grupoActivo === ""} onClick={() => setGrupoActivo("")}>
                Todos
              </Pill>
              {grupos.map(([id, etiqueta]) => (
                <Pill key={id} activo={grupoActivo === id} onClick={() => setGrupoActivo(id)}>
                  {etiqueta}
                </Pill>
              ))}
            </div>
          )}

          <nav
            aria-label="Secciones del mapa"
            className="animate-fade-in-up -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1"
          >
            {secciones.map((s) => (
              <button
                key={s.id}
                onClick={() => setSeccionActiva(s.id)}
                aria-current={s.id === seccion?.id ? "true" : undefined}
                className={`shrink-0 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                  s.id === seccion?.id
                    ? "bg-brand/20 text-foreground"
                    : "bg-white/[0.04] text-muted hover:bg-white/[0.08]"
                }`}
              >
                <span className="block font-display font-bold opacity-60">{s.numero}</span>
                <span className="block max-w-[8.5rem] font-medium leading-tight">{s.pregunta}</span>
              </button>
            ))}
          </nav>

          {seccion && (
            <section key={seccion.id} className="animate-fade-in-up flex flex-col gap-5">
              <div>
                <p className="font-display text-sm font-bold text-brand-dark">{seccion.numero}</p>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {seccion.pregunta}
                </h2>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{seccion.descripcion}</p>
              </div>

              {seccion.series.map((serie) => (
                <Serie
                  key={serie.clave}
                  serie={serie}
                  cerradas={serie.esTexto ? [] : cerradas.filter((r) => r.item === serie.item.item)}
                  textos={textos.filter((r) => r.clave === serie.clave)}
                />
              ))}
            </section>
          )}

          <footer className="animate-fade-in-up rounded-2xl border border-brand/25 bg-brand/[0.07] p-5 text-center">
            <p className="font-display text-base font-semibold text-foreground">
              Cuando conocemos nuestros sueños, podemos empezar a conversar sobre el futuro que
              queremos construir juntos.
            </p>
          </footer>
        </>
      )}
    </main>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1">
      {children}
    </span>
  );
}

function Pill({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        activo ? "bg-brand text-white" : "bg-white/[0.06] text-muted hover:bg-white/[0.12]"
      }`}
    >
      {children}
    </button>
  );
}

/** Estado vacío honesto: muestra la estructura y explica por qué está vacía. */
function SinDatos({ secciones }: { secciones: string[] }) {
  return (
    <div className="animate-fade-in-up flex flex-col gap-4 rounded-2xl border border-dashed border-white/20 p-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Todavía no hay suficientes respuestas para mostrar el mapa
        </h2>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">
          Para proteger el anonimato, un resultado se publica solo cuando al menos{" "}
          <strong className="text-foreground/90">{K_ANON_MIN} personas del mismo grupo</strong> han
          respondido esa pregunta. Con menos, cualquiera podría deducir quién dijo qué.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          No es un error: el mapa aparecerá solo, sin que tengas que hacer nada, cuando el grupo
          alcance ese mínimo.
        </p>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Lo que verás aquí
        </p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {secciones.map((s) => (
            <li key={s} className="flex items-center gap-2 text-sm text-muted/80">
              <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-brand/60" />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Serie({
  serie,
  cerradas,
  textos,
}: {
  serie: SerieResuelta;
  cerradas: ClosedRow[];
  textos: TextoRow[];
}) {
  const titulo = serie.titulo ?? serie.item.etiqueta;

  // Escala: promedio + distribución, no una barra por opción sin contexto.
  if (serie.forma === "escala" && cerradas.length > 0) {
    const total = cerradas[0].total_grupo;
    const promedio = cerradas[0].promedio;
    const max = serie.item.escala?.max ?? 5;
    return (
      <Panel titulo={titulo} n={total} nota={serie.nota}>
        <div className="flex items-end gap-2">
          <span className="font-display text-3xl font-bold tabular-nums text-brand-dark">
            {promedio ?? "—"}
          </span>
          <span className="pb-1 text-sm text-muted">de {max} en promedio</span>
        </div>
        <ul className="mt-3 flex flex-col gap-1.5">
          {Array.from({ length: max }, (_, i) => String(i + 1)).map((v) => {
            const fila = cerradas.find((r) => r.opcion === v);
            return (
              <Barra
                key={v}
                etiqueta={`${v} de ${max}`}
                n={fila?.n ?? 0}
                pct={fila?.porcentaje ?? 0}
                total={total}
              />
            );
          })}
        </ul>
      </Panel>
    );
  }

  const filas = serie.esTexto
    ? textos.map((r) => ({
        etiqueta: r.categoria_codificada,
        n: r.n,
        pct: r.porcentaje,
        total: r.total_grupo,
      }))
    : cerradas.map((r) => ({
        etiqueta: etiquetaOpcion(serie.item, r.opcion),
        n: r.n,
        pct: r.porcentaje,
        total: r.total_grupo,
      }));

  if (filas.length === 0) {
    return (
      <Panel titulo={titulo} n={null} nota={serie.nota}>
        <p className="text-sm leading-relaxed text-muted/80">
          Todavía no hay suficientes respuestas para mostrar este resultado de forma segura (mínimo{" "}
          {K_ANON_MIN} por grupo).
        </p>
      </Panel>
    );
  }

  const ordenadas = serie.forma === "emociones" ? filas : [...filas].sort((a, b) => b.n - a.n);
  const total = filas[0].total;

  if (serie.forma === "mosaico") {
    return (
      <Panel titulo={titulo} n={total} nota={serie.nota}>
        <div className="flex flex-wrap gap-2">
          {ordenadas.map((f) => (
            <span
              key={f.etiqueta}
              className="rounded-xl border border-brand/25 bg-brand/[0.08] px-3 py-1.5 text-sm text-foreground/90"
            >
              {f.etiqueta}{" "}
              <span className="tabular-nums text-muted">
                {f.n} · {f.pct}%
              </span>
            </span>
          ))}
        </div>
      </Panel>
    );
  }

  return (
    <Panel titulo={titulo} n={total} nota={serie.nota}>
      <ul className="flex flex-col gap-1.5">
        {ordenadas.map((f) => (
          <Barra key={f.etiqueta} etiqueta={f.etiqueta} n={f.n} pct={f.pct} total={f.total} />
        ))}
      </ul>
      {serie.esTexto && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted/70">
          ✦ Temas agrupados automáticamente a partir de las respuestas escritas. No se muestra
          ningún texto individual.
        </p>
      )}
    </Panel>
  );
}

function Panel({
  titulo,
  n,
  nota,
  children,
}: {
  titulo: string;
  n: number | null;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{titulo}</p>
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {n === null ? "sin datos" : `n = ${n}`}
        </span>
      </div>
      {nota && <p className="mb-2.5 text-xs leading-relaxed text-muted/80">{nota}</p>}
      {children}
    </div>
  );
}

/** Barra con valor en texto: la lectura no depende del color ni del ancho. */
function Barra({
  etiqueta,
  n,
  pct,
  total,
}: {
  etiqueta: string;
  n: number;
  pct: number;
  total: number;
}) {
  return (
    <li className="text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-foreground/90">{etiqueta}</span>
        <span className="shrink-0 tabular-nums text-muted">
          {n} de {total} · {pct}%
        </span>
      </div>
      <div
        className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"
        role="img"
        aria-label={`${etiqueta}: ${n} de ${total}, ${pct} por ciento`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
          }}
        />
      </div>
    </li>
  );
}

function etiquetaOpcion(item: Item, value: string) {
  if (item.tipo === "likert") {
    return item.escala ? `${value} de ${item.escala.max}` : value;
  }
  return optionLabel(item, value);
}
