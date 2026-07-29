// Forma de almacenamiento de una respuesta CERRADA y accesores seguros.
//
// Una sola definición compartida por el formulario, la API, el motor de
// puntuación, los CSV y el modo demo — antes cada capa la redeclaraba y era
// fácil que se desincronizaran.
//
// Las respuestas ABIERTAS no viven aquí: se guardan aparte (tabla
// `respuestas_abiertas`), por la regla del documento §2/§5.

import type { Item } from "./items";

export type StoredValor =
  | { valor: string } // likert (escala 1..5)
  | { opcion: string } // unica
  | { opciones: string[] } // multiple
  | { texto: string } // texto (pregunta abierta pura)
  | { path: string; mime: string; name: string }; // adjunto (solo histórico v1)

export type RespuestasCerradas = Record<number, StoredValor>;
/** Texto libre indexado por la clave del campo abierto. */
export type RespuestasAbiertas = Record<string, string>;

export function getLikert(valor: StoredValor | undefined): number | null {
  if (!valor || !("valor" in valor)) return null;
  const n = Number(valor.valor);
  return Number.isFinite(n) ? n : null;
}

export function getOpcion(valor: StoredValor | undefined): string | null {
  if (!valor || !("opcion" in valor)) return null;
  return valor.opcion || null;
}

export function getOpciones(valor: StoredValor | undefined): string[] {
  if (!valor || !("opciones" in valor)) return [];
  return valor.opciones;
}

export function getTexto(valor: StoredValor | undefined): string {
  if (!valor || !("texto" in valor)) return "";
  return valor.texto;
}

/** ¿La respuesta cerrada de este ítem está contestada? */
export function estaRespondido(item: Item, valor: StoredValor | undefined): boolean {
  if (!valor) return false;
  switch (item.tipo) {
    case "likert":
      return getLikert(valor) !== null;
    case "unica":
      return !!getOpcion(valor);
    case "multiple":
      return getOpciones(valor).length > 0;
    case "texto":
      return getTexto(valor).trim().length > 0;
    case "adjunto":
      return true;
  }
}

/** Valida y normaliza un `valor` recibido del cliente contra el catálogo.
 *  Devuelve el valor saneado, o null si no corresponde al tipo del ítem.
 *  Se usa en la API (frontera de confianza) y en modo demo. */
export function validarValor(item: Item, entrada: unknown): StoredValor | null {
  if (entrada === null || typeof entrada !== "object") return null;
  const v = entrada as Record<string, unknown>;
  const valoresValidos = new Set(item.opciones?.map((o) => o.value) ?? []);

  switch (item.tipo) {
    case "likert": {
      if (typeof v.valor !== "string") return null;
      const n = Number(v.valor);
      const min = item.escala?.min ?? 1;
      const max = item.escala?.max ?? 5;
      if (!Number.isInteger(n) || n < min || n > max) return null;
      return { valor: String(n) };
    }
    case "unica": {
      if (typeof v.opcion !== "string" || !valoresValidos.has(v.opcion)) return null;
      return { opcion: v.opcion };
    }
    case "multiple": {
      if (!Array.isArray(v.opciones)) return null;
      const limpias = Array.from(
        new Set(v.opciones.filter((o): o is string => typeof o === "string" && valoresValidos.has(o))),
      );
      if (limpias.length === 0) return null;
      return { opciones: limpias };
    }
    case "texto": {
      // Las preguntas abiertas puras no se guardan en `responses`.
      return null;
    }
    case "adjunto": {
      // Solo existe en el histórico v1; la v2 no acepta escrituras de este tipo.
      return null;
    }
  }
}

/** Etiquetas legibles de una respuesta, para fichas y CSV. */
export function describirValor(item: Item, valor: StoredValor | undefined): string {
  if (!valor) return "";
  const label = (v: string) => item.opciones?.find((o) => o.value === v)?.label ?? v;
  if ("texto" in valor) return valor.texto;
  if ("opcion" in valor) return label(valor.opcion);
  if ("opciones" in valor) return valor.opciones.map(label).join(", ");
  if ("valor" in valor) {
    const n = getLikert(valor);
    if (n === null || !item.escala) return valor.valor;
    return `${n} de ${item.escala.max}`;
  }
  if ("name" in valor) return valor.name;
  return "";
}
