import {
  ALL_ITEMS,
  INSTRUMENTO_VERSION,
  ITEMS_ABIERTOS_PUROS,
  TOTAL_ITEMS_OBLIGATORIOS,
  camposAbiertos,
} from "@/lib/items";
import { describirValor } from "@/lib/respuestas";
import type { DemoRespuestaAbierta, DemoResponse, DemoUser } from "./types";
import { listEquipos } from "./store";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** CSV del participante: sus propias respuestas, texto incluido (es SU dato). */
export function buildParticipantCsv(
  responses: DemoResponse[],
  abiertas: DemoRespuestaAbierta[],
) {
  const byItem = new Map(responses.map((r) => [r.item, r]));
  const byClave = new Map(abiertas.map((r) => [r.clave, r.texto]));

  const lines = ["codigo,pregunta,respuesta,comentario"];
  for (const it of ALL_ITEMS) {
    const r = byItem.get(it.item);
    const principal =
      it.tipo === "texto" ? (byClave.get(it.clave) ?? "") : r ? describirValor(it, r.valor) : "";
    const comentario = it.abierta ? (byClave.get(it.abierta.clave) ?? "") : "";
    lines.push(
      [it.codigo, csvEscape(it.etiqueta), csvEscape(principal), csvEscape(comentario)].join(","),
    );
  }
  return lines.join("\n");
}

/** CSV del facilitador: ANONIMIZADO. Nunca incluye el texto libre de nadie —
 *  solo la categoría codificada, igual que las vistas de análisis grupal
 *  (doc §5: "El sistema deberá implementar anonimización antes de cualquier
 *  proceso analítico"). Tampoco incluye el apodo. */
export function buildFacilitadorCsv(
  users: DemoUser[],
  responses: DemoResponse[],
  abiertas: DemoRespuestaAbierta[],
) {
  const equipos = new Map(listEquipos().map((e) => [e.id, e]));
  const clavesTexto = camposAbiertos().map((c) => c.clave);
  const clavesPuras = new Set(ITEMS_ABIERTOS_PUROS.map((i) => i.clave));

  const header = [
    "equipo",
    "equipo_nombre",
    "edad",
    "bloque_alcanzado",
    "estado",
    ...ALL_ITEMS.filter((it) => it.tipo !== "texto").map((it) => it.clave),
    // El texto libre se exporta solo como categoría, con sufijo explícito.
    ...clavesTexto.map((c) => `${c}__categoria`),
  ];
  const lines = [header.join(",")];

  for (const u of users) {
    const own = responses.filter(
      (r) => r.userId === u.id && r.version === INSTRUMENTO_VERSION,
    );
    const ownTexto = abiertas.filter(
      (r) => r.userId === u.id && r.version === INSTRUMENTO_VERSION,
    );
    const byItem = new Map(own.map((r) => [r.item, r]));
    const categoriaPorClave = new Map(ownTexto.map((r) => [r.clave, r.categoriaCodificada ?? ""]));

    const respondidas =
      own.length + ownTexto.filter((r) => clavesPuras.has(r.clave) && r.texto.trim()).length;
    const bloqueAlcanzado = [...own, ...ownTexto].reduce((max, r) => Math.max(max, r.bloque), 0);
    const estado =
      respondidas >= TOTAL_ITEMS_OBLIGATORIOS
        ? "completado"
        : respondidas === 0
          ? "sin_iniciar"
          : "en_proceso";

    const equipo = equipos.get(u.equipoId);
    const row = [
      // La unidad es el GRUPO. La comuna autodeclarada del participante no se
      // exporta: solo sirve para mostrarle sus puntos de atención.
      equipo?.codigo ?? "",
      equipo?.nombre ?? "",
      String(u.edad),
      String(bloqueAlcanzado),
      estado,
      ...ALL_ITEMS.filter((it) => it.tipo !== "texto").map((it) => {
        const r = byItem.get(it.item);
        return r ? describirValor(it, r.valor) : "";
      }),
      ...clavesTexto.map((c) => categoriaPorClave.get(c) ?? ""),
    ];
    lines.push(row.map((v) => csvEscape(String(v))).join(","));
  }
  return lines.join("\n");
}
