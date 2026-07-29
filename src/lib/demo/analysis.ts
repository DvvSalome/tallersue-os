// JS port of the k-anonymity group-analysis SQL functions in
// supabase/schema.sql (v_group_analysis_closed / v_group_analysis_texto),
// for demo mode. Same rule: no aggregate shown for a comuna with < 5
// distinct respondents on that item.

import { comunaNombre } from "@/lib/comunas";
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
  // La comuna de agregación es la del EQUIPO (unidad territorial del taller),
  // no la que declaró el participante: esa es solo para sus líneas de atención.
  const comunaByEquipo = new Map(equipos.map((e) => [e.id, e.comunaId]));
  const comunaByUser = new Map(
    users
      .map((u) => [u.id, comunaByEquipo.get(u.equipoId)] as const)
      .filter((par): par is readonly [string, number] => par[1] !== undefined),
  );

  const closedResponses = responses.filter(
    (r) => r.version === INSTRUMENTO_VERSION && r.tipo !== "texto" && r.tipo !== "adjunto",
  );
  // El texto sale del repositorio independiente, no de `responses`.
  const textoResponses = abiertas.filter(
    (r) => r.version === INSTRUMENTO_VERSION && r.categoriaCodificada,
  );

  function totalComunaPorItem(rows: { bloque: number; item: number; userId: string }[]) {
    const key = (bloque: number, item: number, comunaId: number) => `${bloque}:${item}:${comunaId}`;
    const distinctUsers = new Map<string, Set<string>>();
    for (const r of rows) {
      const comunaId = comunaByUser.get(r.userId);
      if (comunaId === undefined) continue;
      const k = key(r.bloque, r.item, comunaId);
      if (!distinctUsers.has(k)) distinctUsers.set(k, new Set());
      distinctUsers.get(k)!.add(r.userId);
    }
    const totals = new Map<string, number>();
    for (const [k, set] of distinctUsers) totals.set(k, set.size);
    return { key, totals };
  }

  // --- closed items (likert / multiple / unica) ---
  const { key: closedKey, totals: closedTotals } = totalComunaPorItem(closedResponses);
  const closedCounts = new Map<string, number>(); // key: bloque:item:comunaId:opcion -> n
  const likertSums = new Map<string, number>(); // for promedio

  for (const r of closedResponses) {
    const comunaId = comunaByUser.get(r.userId);
    if (comunaId === undefined) continue;
    const total = closedTotals.get(closedKey(r.bloque, r.item, comunaId)) ?? 0;
    if (total < K_ANON_MIN) continue;

    const opciones: string[] =
      r.tipo === "multiple" && "opciones" in r.valor
        ? r.valor.opciones
        : r.tipo === "unica" && "opcion" in r.valor
          ? [r.valor.opcion]
          : r.tipo === "likert" && "valor" in r.valor
            ? [r.valor.valor]
            : [];

    for (const opcion of opciones) {
      const k = `${r.bloque}:${r.item}:${comunaId}:${opcion}`;
      closedCounts.set(k, (closedCounts.get(k) ?? 0) + 1);
      if (r.tipo === "likert") likertSums.set(k, (likertSums.get(k) ?? 0) + Number(opcion));
    }
  }

  const closed: ClosedRow[] = [];
  for (const [k, n] of closedCounts) {
    const [bloqueStr, itemStr, comunaIdStr, opcion] = k.split(":");
    const bloque = Number(bloqueStr);
    const item = Number(itemStr);
    const comuna_id = Number(comunaIdStr);
    const total_comuna = closedTotals.get(closedKey(bloque, item, comuna_id)) ?? 0;
    const original = closedResponses.find((r) => r.bloque === bloque && r.item === item);
    closed.push({
      bloque,
      item,
      comuna_id,
      comuna_nombre: comunaNombre(comuna_id),
      tipo: (original?.tipo as ClosedRow["tipo"]) ?? "unica",
      opcion,
      n,
      total_comuna,
      porcentaje: round1((100 * n) / total_comuna),
      promedio: likertSums.has(k) ? round1((likertSums.get(k) ?? 0) / n) : null,
    });
  }

  // --- free text (coded category only) ---
  // Se agrupa por CLAVE, no por ítem: una pregunta cerrada puede traer además
  // su campo de observaciones, y son series distintas.
  const textoKey = (clave: string, comunaId: number) => `${clave}|${comunaId}`;
  const textoDistinct = new Map<string, Set<string>>();
  for (const r of textoResponses) {
    const comunaId = comunaByUser.get(r.userId);
    if (comunaId === undefined) continue;
    const k = textoKey(r.clave, comunaId);
    if (!textoDistinct.has(k)) textoDistinct.set(k, new Set());
    textoDistinct.get(k)!.add(r.userId);
  }
  const textoTotals = new Map<string, number>();
  for (const [k, set] of textoDistinct) textoTotals.set(k, set.size);

  // El agrupador guarda las PARTES en el valor, no solo en la llave: las
  // categorías llevan espacios y tildes, así que reconstruirlas partiendo el
  // string sería frágil.
  type Acumulado = {
    n: number;
    clave: string;
    comunaId: number;
    categoria: string;
    bloque: number;
    item: number;
  };
  const textoCounts = new Map<string, Acumulado>();
  for (const r of textoResponses) {
    const comunaId = comunaByUser.get(r.userId);
    if (comunaId === undefined || !r.categoriaCodificada) continue;
    if ((textoTotals.get(textoKey(r.clave, comunaId)) ?? 0) < K_ANON_MIN) continue;
    const k = `${textoKey(r.clave, comunaId)}|${r.categoriaCodificada}`;
    const previo = textoCounts.get(k);
    textoCounts.set(k, {
      n: (previo?.n ?? 0) + 1,
      clave: r.clave,
      comunaId,
      categoria: r.categoriaCodificada,
      bloque: r.bloque,
      item: r.item,
    });
  }

  const texto: TextoRow[] = [];
  for (const acc of textoCounts.values()) {
    const total_comuna = textoTotals.get(textoKey(acc.clave, acc.comunaId)) ?? 0;
    texto.push({
      bloque: acc.bloque,
      item: acc.item,
      clave: acc.clave,
      comuna_id: acc.comunaId,
      comuna_nombre: comunaNombre(acc.comunaId),
      categoria_codificada: acc.categoria,
      n: acc.n,
      total_comuna,
      porcentaje: round1((100 * acc.n) / total_comuna),
    });
  }

  return { closed, texto };
}
