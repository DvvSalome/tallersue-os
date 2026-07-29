// Port en JS de las funciones SQL de análisis grupal (v_group_analysis_closed /
// v_group_analysis_texto en supabase/schema.sql), para el modo demo.
//
// Misma regla que la BD: la unidad de agregación es el GRUPO (equipo) y no se
// publica ningún agregado de un grupo con menos de K_ANON_MIN respondientes
// distintos en esa pregunta. Del texto libre solo sale la categoría codificada.
// La comuna no participa: el participante la declara solo para ver puntos de
// atención cerca de donde vive.

import { INSTRUMENTO_VERSION } from "@/lib/items";
import { K_ANON_MIN, type ClosedRow, type TextoRow } from "@/lib/analisis-grupal";
import type { DemoEquipo, DemoRespuestaAbierta, DemoResponse, DemoUser } from "./types";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function computeGroupAnalysis(
  responses: DemoResponse[],
  abiertas: DemoRespuestaAbierta[],
  users: DemoUser[],
  equipos: DemoEquipo[],
) {
  const equipoById = new Map(equipos.map((e) => [e.id, e]));
  const equipoDeUsuario = new Map(users.map((u) => [u.id, u.equipoId]));

  const cerradas = responses.filter(
    (r) => r.version === INSTRUMENTO_VERSION && r.tipo !== "texto" && r.tipo !== "adjunto",
  );
  // El texto sale del repositorio independiente, no de `responses`.
  const textos = abiertas.filter((r) => r.version === INSTRUMENTO_VERSION && r.categoriaCodificada);

  /** Respondientes distintos por (serie, grupo): el umbral de k-anonimato. */
  function totalesPorGrupo<T extends { userId: string }>(filas: T[], serie: (x: T) => string) {
    const distintos = new Map<string, Set<string>>();
    for (const f of filas) {
      const equipoId = equipoDeUsuario.get(f.userId);
      if (!equipoId) continue;
      const k = `${serie(f)}::${equipoId}`;
      if (!distintos.has(k)) distintos.set(k, new Set());
      distintos.get(k)!.add(f.userId);
    }
    return new Map([...distintos].map(([k, set]) => [k, set.size]));
  }

  const etiquetasDe = (equipoId: string) => {
    const e = equipoById.get(equipoId);
    return { equipo_codigo: e?.codigo ?? "—", equipo_nombre: e?.nombre ?? null };
  };

  // ------------------------------------------------------ preguntas cerradas
  const serieCerrada = (r: { bloque: number; item: number }) => `${r.bloque}:${r.item}`;
  const totalCerradas = totalesPorGrupo(cerradas, serieCerrada);

  type AccCerrada = {
    n: number;
    bloque: number;
    item: number;
    tipo: ClosedRow["tipo"];
    equipoId: string;
    opcion: string;
  };
  const accCerradas = new Map<string, AccCerrada>();

  for (const r of cerradas) {
    const equipoId = equipoDeUsuario.get(r.userId);
    if (!equipoId) continue;
    if ((totalCerradas.get(`${serieCerrada(r)}::${equipoId}`) ?? 0) < K_ANON_MIN) continue;

    const opciones =
      r.tipo === "multiple" && "opciones" in r.valor
        ? r.valor.opciones
        : r.tipo === "unica" && "opcion" in r.valor
          ? [r.valor.opcion]
          : r.tipo === "likert" && "valor" in r.valor
            ? [r.valor.valor]
            : [];

    for (const opcion of opciones) {
      const k = `${serieCerrada(r)}::${equipoId}::${opcion}`;
      const previo = accCerradas.get(k);
      accCerradas.set(k, {
        n: (previo?.n ?? 0) + 1,
        bloque: r.bloque,
        item: r.item,
        tipo: r.tipo as ClosedRow["tipo"],
        equipoId,
        opcion,
      });
    }
  }

  const closed: ClosedRow[] = [...accCerradas.values()].map((a) => {
    const total = totalCerradas.get(`${a.bloque}:${a.item}::${a.equipoId}`) ?? 0;
    return {
      bloque: a.bloque,
      item: a.item,
      equipo_id: a.equipoId,
      ...etiquetasDe(a.equipoId),
      tipo: a.tipo,
      opcion: a.opcion,
      n: a.n,
      total_grupo: total,
      porcentaje: round1((100 * a.n) / total),
      promedio: null,
    };
  });

  // El promedio de una escala se calcula sobre la serie completa del grupo, no
  // por opción: se resuelve después de tener todos los conteos.
  for (const fila of closed) {
    if (fila.tipo !== "likert") continue;
    const serie = closed.filter(
      (f) => f.item === fila.item && f.equipo_id === fila.equipo_id && f.tipo === "likert",
    );
    const suma = serie.reduce((s, f) => s + Number(f.opcion) * f.n, 0);
    const cuenta = serie.reduce((s, f) => s + f.n, 0);
    fila.promedio = cuenta > 0 ? round1(suma / cuenta) : null;
  }

  // ----------------------------------------------------------- texto libre
  const totalTextos = totalesPorGrupo(textos, (r) => r.clave);

  type AccTexto = {
    n: number;
    bloque: number;
    item: number;
    clave: string;
    equipoId: string;
    categoria: string;
  };
  const accTextos = new Map<string, AccTexto>();

  for (const r of textos) {
    const equipoId = equipoDeUsuario.get(r.userId);
    if (!equipoId || !r.categoriaCodificada) continue;
    if ((totalTextos.get(`${r.clave}::${equipoId}`) ?? 0) < K_ANON_MIN) continue;
    const k = `${r.clave}::${equipoId}::${r.categoriaCodificada}`;
    const previo = accTextos.get(k);
    accTextos.set(k, {
      n: (previo?.n ?? 0) + 1,
      bloque: r.bloque,
      item: r.item,
      clave: r.clave,
      equipoId,
      categoria: r.categoriaCodificada,
    });
  }

  const texto: TextoRow[] = [...accTextos.values()].map((a) => {
    const total = totalTextos.get(`${a.clave}::${a.equipoId}`) ?? 0;
    return {
      bloque: a.bloque,
      item: a.item,
      clave: a.clave,
      equipo_id: a.equipoId,
      ...etiquetasDe(a.equipoId),
      categoria_codificada: a.categoria,
      n: a.n,
      total_grupo: total,
      porcentaje: round1((100 * a.n) / total),
    };
  });

  return { closed, texto };
}
