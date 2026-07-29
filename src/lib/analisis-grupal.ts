// Contrato compartido del análisis grupal.
//
// Estas formas son el resultado de las funciones SQL v_group_analysis_closed /
// v_group_analysis_texto (supabase/schema.sql) y, en modo demo, de su port en
// JS (src/lib/demo/analysis.ts). Viven aquí —y no dentro de `lib/demo`— para
// que las vistas de producción no dependan del módulo de demo.
//
// La unidad de agregación es el GRUPO (equipo): el conjunto que convoca quien
// facilita. La comuna NO es un eje de análisis — el participante la declara solo
// para que la app le muestre puntos de atención cerca de donde vive.

/** Umbral de k-anonimato. Doc §4: los agregados se publican "cuando exista un
 *  mínimo de cinco respuestas para preservar el anonimato". El mismo número está
 *  codificado en las funciones SQL; si cambia, debe cambiar en ambos lados. */
export const K_ANON_MIN = 5;

/** Distribución de una pregunta cerrada dentro de un grupo. */
export type ClosedRow = {
  bloque: number;
  item: number;
  equipo_id: string;
  equipo_codigo: string;
  equipo_nombre: string | null;
  tipo: "likert" | "multiple" | "unica";
  opcion: string;
  n: number;
  total_grupo: number;
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
  equipo_id: string;
  equipo_codigo: string;
  equipo_nombre: string | null;
  categoria_codificada: string;
  n: number;
  total_grupo: number;
  porcentaje: number;
};

/** Etiqueta legible de un grupo. */
export function nombreGrupo(codigo: string, nombre: string | null) {
  return nombre ? `${nombre} (${codigo})` : codigo;
}
