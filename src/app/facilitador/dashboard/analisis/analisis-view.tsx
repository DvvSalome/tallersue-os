"use client";

import { useMemo, useState } from "react";
import { optionLabel, type Item } from "@/lib/items";
import { seccionesResueltas, type SerieResuelta } from "@/lib/mapa-colectivo";
import { FacilitadorNav } from "@/components/facilitador-nav";
import { K_ANON_MIN, nombreGrupo, type ClosedRow, type TextoRow } from "@/lib/analisis-grupal";
import { Dona, Medidor } from "@/components/charts";
import type { PerfilRow } from "@/lib/perfiles-grupales";

/** Con más de esto, un anillo vuelve las porciones hilos y se pierde la
 *  comparación: ahí las barras se leen mejor (brief §5 y §29). */
const MAX_PORCIONES_ANILLO = 6;

type Forma = "auto" | "circular" | "barras";

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
  perfilRows,
  exportSlot,
}: {
  codigoGrupo: string;
  closedRows: ClosedRow[];
  textoRows: TextoRow[];
  perfilRows: PerfilRow[];
  exportSlot: React.ReactNode;
}) {
  const secciones = seccionesResueltas();
  const [grupoActivo, setGrupoActivo] = useState("");
  const [seccionActiva, setSeccionActiva] = useState(secciones[0]?.id ?? "");
  const [forma, setForma] = useState<Forma>("circular");

  const grupos = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const r of [...closedRows, ...textoRows, ...perfilRows]) {
      mapa.set(r.equipo_id, nombreGrupo(r.equipo_codigo, r.equipo_nombre));
    }
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [closedRows, textoRows, perfilRows]);

  // Con "Todos" seleccionado hay una fila POR GRUPO para la misma opción. Si se
  // pintan tal cual, la misma categoría aparece repetida tantas veces como
  // grupos la tengan — que es exactamente lo que se veía. Se suman.
  const cerradas = useMemo(
    () => (grupoActivo ? closedRows.filter((f) => f.equipo_id === grupoActivo) : unirCerradas(closedRows)),
    [closedRows, grupoActivo],
  );
  const textos = useMemo(
    () => (grupoActivo ? textoRows.filter((f) => f.equipo_id === grupoActivo) : unirTextos(textoRows)),
    [textoRows, grupoActivo],
  );
  const perfiles = useMemo(
    () =>
      grupoActivo ? perfilRows.filter((f) => f.equipo_id === grupoActivo) : unirPerfiles(perfilRows),
    [perfilRows, grupoActivo],
  );
  const hayDatos = cerradas.length > 0 || textos.length > 0 || perfiles.length > 0;
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
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted/80">
          <Chip>Mínimo {K_ANON_MIN} respuestas por grupo para publicar un resultado</Chip>
          <Chip>Del texto libre solo se muestran temas</Chip>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Gráficas</span>
          <Pill activo={forma === "circular"} onClick={() => setForma("circular")}>
            Circulares
          </Pill>
          <Pill activo={forma === "auto"} onClick={() => setForma("auto")}>
            Mixtas
          </Pill>
          <Pill activo={forma === "barras"} onClick={() => setForma("barras")}>
            Barras
          </Pill>
          <span className="w-full text-xs sm:text-[11px] leading-relaxed text-muted/70">
            <strong className="text-foreground/80">Circulares:</strong> todo en anillo, agrupando
            la cola cuando hay más de {MAX_PORCIONES_ANILLO} categorías.{" "}
            <strong className="text-foreground/80">Mixtas:</strong> anillo solo cuando hay pocas
            categorías, barras cuando son muchas.{" "}
            <strong className="text-foreground/80">Barras:</strong> todas las categorías por
            separado. Las escalas siempre usan medidor salvo en barras.
          </span>
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
                className={`min-h-14 shrink-0 rounded-xl px-3.5 py-2.5 text-left text-[13px] transition-colors sm:min-h-0 sm:px-3 sm:py-2 sm:text-xs ${
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
                  forma={forma}
                  serie={serie}
                  cerradas={serie.esTexto ? [] : cerradas.filter((r) => r.item === serie.item.item)}
                  textos={textos.filter((r) => r.clave === serie.clave)}
                />
              ))}

              {seccion.id === "con_que_contamos" && (
                <PanelPerfiles perfiles={perfiles} forma={forma} />
              )}
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
      // min-h-11 = 44px, el mínimo recomendado para tocar con el pulgar.
      className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs ${
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
  forma,
}: {
  serie: SerieResuelta;
  cerradas: ClosedRow[];
  textos: TextoRow[];
  forma: Forma;
}) {
  const titulo = serie.titulo ?? serie.item.etiqueta;

  // Escala: promedio + distribución, no una barra por opción sin contexto.
  if (serie.forma === "escala" && cerradas.length > 0) {
    const total = cerradas[0].total_grupo;
    const promedio = cerradas[0].promedio;
    const max = serie.item.escala?.max ?? 5;
    const conMedidor = forma !== "barras";
    return (
      <Panel titulo={titulo} n={total} nota={serie.nota}>
        {conMedidor ? (
          <Medidor
            promedio={promedio}
            max={max}
            n={total}
            etiquetaMin={serie.item.escala?.etiquetaMin}
            etiquetaMax={serie.item.escala?.etiquetaMax}
          />
        ) : (
          <div className="flex items-end gap-2">
            <span className="font-display text-3xl font-bold tabular-nums text-brand-dark">
              {promedio ?? "—"}
            </span>
            <span className="pb-1 text-sm text-muted">de {max} en promedio</span>
          </div>
        )}
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
    // Un panel vacío tiene dos causas distintas y conviene no confundirlas: o no
    // se alcanzó el umbral de anonimato, o esta serie viene de un comentario
    // OPCIONAL que nadie escribió. Decir "faltan respuestas" en el segundo caso
    // haría pensar que el grupo no participó.
    const esComentarioOpcional = serie.esTexto && serie.item.tipo !== "texto";
    return (
      <Panel titulo={titulo} n={null} nota={serie.nota}>
        <p className="text-sm leading-relaxed text-muted/80">
          {esComentarioOpcional
            ? `Este panel se construye con los comentarios, que son opcionales. Todavía no hay al menos ${K_ANON_MIN} personas del mismo grupo que hayan escrito algo aquí. El resto de la sección no depende de esto.`
            : `Todavía no hay suficientes respuestas para mostrar este resultado de forma segura (mínimo ${K_ANON_MIN} por grupo).`}
        </p>
      </Panel>
    );
  }

  const ordenadas = serie.forma === "emociones" ? filas : [...filas].sort((a, b) => b.n - a.n);
  const total = filas[0].total;

  // "circular" fuerza el anillo agrupando la cola; "auto" lo usa solo cuando hay
  // pocas categorías, que es donde un anillo compara de verdad.
  const usarAnillo =
    forma === "circular" || (forma === "auto" && ordenadas.length <= MAX_PORCIONES_ANILLO);

  if (usarAnillo) {
    // Con demasiadas porciones el anillo deja de comparar nada, así que la cola
    // se agrupa — pero se dice cuántas categorías quedaron dentro, para no
    // esconder que hubo un recorte.
    const visibles = ordenadas.slice(0, MAX_PORCIONES_ANILLO);
    const cola = ordenadas.slice(MAX_PORCIONES_ANILLO);
    const porciones = visibles.map((f) => ({ etiqueta: f.etiqueta, n: f.n, pct: f.pct }));
    if (cola.length > 0) {
      const nCola = cola.reduce((acc, f) => acc + f.n, 0);
      porciones.push({
        etiqueta: `Otras ${cola.length} categorías`,
        n: nCola,
        pct: Math.round((1000 * nCola) / total) / 10,
      });
    }
    return (
      <Panel titulo={titulo} n={total} nota={serie.nota}>
        <Dona porciones={porciones} total={total} etiquetaCentro={`n=${total}`} />
        {cola.length > 0 && (
          <p className="mt-2 text-xs sm:text-[11px] leading-relaxed text-muted/70">
            Se agruparon {cola.length} categorías con menos menciones. Cambia a &ldquo;Barras&rdquo;
            para verlas una por una.
          </p>
        )}
        {serie.esTexto && <NotaTexto />}
      </Panel>
    );
  }

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
      {serie.esTexto && <NotaTexto />}
    </Panel>
  );
}

/** Distribución de perfiles de liderazgo (doc §4). Es un indicador DERIVADO de
 *  dos respuestas, no una pregunta: la nota lo dice para que no se lea como algo
 *  que el grupo respondió directamente. */
function PanelPerfiles({ perfiles, forma }: { perfiles: PerfilRow[]; forma: Forma }) {
  if (perfiles.length === 0) {
    return (
      <Panel titulo="Orientaciones de liderazgo en el grupo" n={null}>
        <p className="text-sm leading-relaxed text-muted/80">
          Todavía no hay suficientes respuestas para mostrar esta distribución de forma segura
          (mínimo {K_ANON_MIN} por grupo).
        </p>
      </Panel>
    );
  }

  const ordenadas = [...perfiles].sort((a, b) => b.n - a.n);
  const total = ordenadas[0].total_grupo;

  return (
    <Panel
      titulo="Orientaciones de liderazgo en el grupo"
      n={total}
      nota="No es una pregunta del formulario: se deriva de la fortaleza que cada persona reconoce y de los temas en los que le interesa participar. Describe orientaciones del momento, no tipos de persona."
    >
      {forma === "barras" ? (
        <ul className="flex flex-col gap-1.5">
          {ordenadas.map((f) => (
            <Barra
              key={f.perfil}
              etiqueta={f.nombre}
              n={f.n}
              pct={f.porcentaje}
              total={f.total_grupo}
            />
          ))}
        </ul>
      ) : (
        <Dona
          porciones={ordenadas.map((f) => ({ etiqueta: f.nombre, n: f.n, pct: f.porcentaje }))}
          total={total}
          etiquetaCentro={`n=${total}`}
        />
      )}
    </Panel>
  );
}

function NotaTexto() {
  return (
    <p className="mt-3 text-xs sm:text-[11px] leading-relaxed text-muted/70">
      ✦ Temas agrupados automáticamente a partir de las respuestas escritas. No se muestra ningún
      texto individual.
    </p>
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

/** Suma las filas de todos los grupos para una misma pregunta y opción. El
 *  denominador es la suma de los respondientes de cada grupo presente, no una
 *  media de porcentajes: promediar porcentajes de grupos de distinto tamaño da
 *  un número que no significa nada. */
function unirCerradas(filas: ClosedRow[]): ClosedRow[] {
  const totalPorSerie = totalesPorSerie(filas, (f) => `${f.bloque}:${f.item}`);
  const acc = new Map<string, ClosedRow>();
  for (const f of filas) {
    const k = `${f.bloque}:${f.item}:${f.opcion}`;
    const previo = acc.get(k);
    acc.set(k, previo ? { ...previo, n: previo.n + f.n } : { ...f });
  }
  const unidas = [...acc.values()];
  // El promedio de una escala se recalcula ponderando por los conteos sumados:
  // heredar el promedio del primer grupo daría el número de un solo grupo.
  const promedioPorSerie = new Map<string, number>();
  for (const f of unidas) {
    if (f.tipo !== "likert") continue;
    const k = `${f.bloque}:${f.item}`;
    if (promedioPorSerie.has(k)) continue;
    const serie = unidas.filter((x) => `${x.bloque}:${x.item}` === k);
    const suma = serie.reduce((acc2, x) => acc2 + Number(x.opcion) * x.n, 0);
    const cuenta = serie.reduce((acc2, x) => acc2 + x.n, 0);
    if (cuenta > 0) promedioPorSerie.set(k, Math.round((100 * suma) / cuenta) / 100);
  }

  return unidas.map((f) => {
    const total = totalPorSerie.get(`${f.bloque}:${f.item}`) ?? f.total_grupo;
    return {
      ...f,
      equipo_id: "todos",
      equipo_codigo: "Todos los grupos",
      equipo_nombre: null,
      total_grupo: total,
      porcentaje: Math.round((1000 * f.n) / total) / 10,
      promedio: promedioPorSerie.get(`${f.bloque}:${f.item}`) ?? f.promedio,
    };
  });
}

function unirTextos(filas: TextoRow[]): TextoRow[] {
  const totalPorSerie = totalesPorSerie(filas, (f) => f.clave);
  const acc = new Map<string, TextoRow>();
  for (const f of filas) {
    const k = `${f.clave}:${f.categoria_codificada}`;
    const previo = acc.get(k);
    acc.set(k, previo ? { ...previo, n: previo.n + f.n } : { ...f });
  }
  return [...acc.values()].map((f) => {
    const total = totalPorSerie.get(f.clave) ?? f.total_grupo;
    return {
      ...f,
      equipo_id: "todos",
      equipo_codigo: "Todos los grupos",
      equipo_nombre: null,
      total_grupo: total,
      porcentaje: Math.round((1000 * f.n) / total) / 10,
    };
  });
}

/** Respondientes totales de una serie: suma de `total_grupo` una sola vez por
 *  grupo (las filas lo repiten por cada opción). */
function totalesPorSerie<T extends { equipo_id: string; total_grupo: number }>(
  filas: T[],
  serie: (f: T) => string,
): Map<string, number> {
  const vistos = new Set<string>();
  const totales = new Map<string, number>();
  for (const f of filas) {
    const marca = `${serie(f)}::${f.equipo_id}`;
    if (vistos.has(marca)) continue;
    vistos.add(marca);
    totales.set(serie(f), (totales.get(serie(f)) ?? 0) + f.total_grupo);
  }
  return totales;
}

/** Suma los perfiles de todos los grupos. El denominador es la suma de los
 *  participantes con perfil calculable de cada grupo. */
function unirPerfiles(filas: PerfilRow[]): PerfilRow[] {
  const totalPorGrupo = new Map<string, number>();
  for (const f of filas) totalPorGrupo.set(f.equipo_id, f.total_grupo);
  const total = [...totalPorGrupo.values()].reduce((a, b) => a + b, 0);

  const acc = new Map<string, PerfilRow>();
  for (const f of filas) {
    const previo = acc.get(f.perfil);
    acc.set(f.perfil, previo ? { ...previo, n: previo.n + f.n } : { ...f });
  }
  return [...acc.values()].map((f) => ({
    ...f,
    equipo_id: "todos",
    equipo_codigo: "Todos los grupos",
    equipo_nombre: null,
    total_grupo: total,
    porcentaje: Math.round((1000 * f.n) / total) / 10,
  }));
}
