// Verifica que el catálogo de código (src/lib/items.ts) y el seed de la BD
// (supabase/seed.sql) describan EXACTAMENTE el mismo instrumento.
//
// Los dos existen a propósito: items.ts renderiza y puntúa, item_catalog deja
// que las consultas de análisis no dependan del código. Pero dos fuentes que
// describen lo mismo se desincronizan solas, así que esto lo comprueba.
//
//   npm run verify:catalog

import { readFileSync } from "node:fs";
import {
  ALL_ITEMS,
  BLOQUES,
  INSTRUMENTO_VERSION,
  ITEMS_ABIERTOS_PUROS,
  ITEMS_CERRADOS,
  TOTAL_ITEMS,
  camposAbiertos,
} from "../src/lib/items.ts";

const problemas: string[] = [];
const ok: string[] = [];

function check(condicion: boolean, mensaje: string) {
  if (condicion) ok.push(mensaje);
  else problemas.push(mensaje);
}

// ---------------------------------------------------------------- items.ts
check(BLOQUES.length === 5, `5 bloques (hay ${BLOQUES.length})`);
check(TOTAL_ITEMS === 20, `20 preguntas (hay ${TOTAL_ITEMS})`);

const numeros = ALL_ITEMS.map((i) => i.item);
check(
  numeros.join(",") === Array.from({ length: 20 }, (_, i) => i + 1).join(","),
  "los ítems están numerados 1..20 y en orden",
);

const claves = ALL_ITEMS.map((i) => i.clave);
check(new Set(claves).size === claves.length, "todas las claves de pregunta son únicas");

const codigos = ALL_ITEMS.map((i) => i.codigo);
check(new Set(codigos).size === codigos.length, "todos los códigos P1..P20 son únicos");

const clavesTexto = camposAbiertos().map((c) => c.clave);
check(
  new Set(clavesTexto).size === clavesTexto.length,
  "las claves de los campos de texto son únicas",
);
check(
  new Set([...claves, ...clavesTexto]).size === claves.length + clavesTexto.length - ITEMS_ABIERTOS_PUROS.length,
  "las claves de texto no chocan con las de pregunta (salvo las abiertas puras, que comparten clave a propósito)",
);

for (const item of ALL_ITEMS) {
  if (item.tipo === "likert" && !item.escala) {
    problemas.push(`${item.codigo}: es escala pero no declara rango`);
  }
  if ((item.tipo === "unica" || item.tipo === "multiple") && !item.opciones?.length) {
    problemas.push(`${item.codigo}: es de selección pero no declara opciones`);
  }
  if (item.opciones) {
    const valores = item.opciones.map((o) => o.value);
    if (new Set(valores).size !== valores.length) {
      problemas.push(`${item.codigo}: tiene valores de opción repetidos`);
    }
  }
}
check(problemas.length === 0, "cada pregunta declara lo que su tipo exige");

check(
  ITEMS_CERRADOS.length + ITEMS_ABIERTOS_PUROS.length === TOTAL_ITEMS,
  `cerradas (${ITEMS_CERRADOS.length}) + abiertas puras (${ITEMS_ABIERTOS_PUROS.length}) = ${TOTAL_ITEMS}`,
);

// ---------------------------------------------------------------- seed.sql
const seed = readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8");
const filas = [
  ...seed.matchAll(
    /^\s*\((\d+),\s*(\d+),\s*(\d+),\s*'([^']+)',\s*'([^']+)',\s*'((?:[^']|'')*)',\s*'([^']+)'\)/gm,
  ),
].map((m) => ({
  version: Number(m[1]),
  bloque: Number(m[2]),
  item: Number(m[3]),
  clave: m[4],
  tipo: m[5],
  dimension: m[7],
}));

const filasV2 = filas.filter((f) => f.version === INSTRUMENTO_VERSION);
check(
  filasV2.length === TOTAL_ITEMS,
  `seed.sql tiene ${TOTAL_ITEMS} filas para la versión ${INSTRUMENTO_VERSION} (encontradas ${filasV2.length})`,
);

for (const item of ALL_ITEMS) {
  const fila = filasV2.find((f) => f.item === item.item);
  if (!fila) {
    problemas.push(`${item.codigo}: falta en seed.sql`);
    continue;
  }
  if (fila.clave !== item.clave) {
    problemas.push(`${item.codigo}: clave distinta — código "${item.clave}" vs seed "${fila.clave}"`);
  }
  if (fila.tipo !== item.tipo) {
    problemas.push(`${item.codigo}: tipo distinto — código "${item.tipo}" vs seed "${fila.tipo}"`);
  }
  if (fila.bloque !== item.bloque) {
    problemas.push(`${item.codigo}: bloque distinto — código ${item.bloque} vs seed ${fila.bloque}`);
  }
  if (fila.dimension !== item.dimension) {
    problemas.push(
      `${item.codigo}: dimensión distinta — código "${item.dimension}" vs seed "${fila.dimension}"`,
    );
  }
}

// ---------------------------------------------------------------- resultado
for (const o of ok) console.log(`  ok   ${o}`);
if (problemas.length > 0) {
  console.error("\nDesincronización entre items.ts y seed.sql:\n");
  for (const p of problemas) console.error(`  FALLA  ${p}`);
  process.exit(1);
}
console.log(
  `\nCatálogo consistente: ${TOTAL_ITEMS} preguntas, ${BLOQUES.length} bloques, ` +
    `${clavesTexto.length} campos de texto, versión ${INSTRUMENTO_VERSION}.`,
);
