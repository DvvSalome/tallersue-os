// Contrato compartido del análisis grupal.
//
// Estas formas son el resultado de las funciones SQL v_group_analysis_closed /
// v_group_analysis_texto (supabase/schema.sql) y, en modo demo, de su port en
// JS (src/lib/demo/analysis.ts). Viven aquí —y no dentro de `lib/demo`— para
// que las vistas de producción no dependan del módulo de demo.

/** Umbral de k-anonimato. Doc §4: los índices agregados se publican "cuando
 *  exista un mínimo de cinco respuestas para preservar el anonimato". El mismo
 *  número está codificado en las funciones SQL; si cambia, debe cambiar en
 *  ambos lados. */
export const K_ANON_MIN = 5;

/** Distribución de una pregunta cerrada dentro de una comuna. */
export type ClosedRow = {
  bloque: number;
  item: number;
  comuna_id: number;
  comuna_nombre: string;
  tipo: "likert" | "multiple" | "unica";
  opcion: string;
  n: number;
  total_comuna: number;
  porcentaje: number;
  /** Solo para escalas. */
  promedio: number | null;
};

/** Distribución de CATEGORÍAS de texto libre. Nunca contiene texto crudo. */
export type TextoRow = {
  bloque: number;
  item: number;
  /** Clave del campo abierto: un ítem puede traer respuesta cerrada + observación. */
  clave: string;
  comuna_id: number;
  comuna_nombre: string;
  categoria_codificada: string;
  n: number;
  total_comuna: number;
  porcentaje: number;
};
