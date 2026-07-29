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

/** Umbral de k-anonimato: respondientes distintos que un grupo necesita en una
 *  pregunta para que su agregado se publique.
 *
 *  Debe coincidir con public.k_anonimato_minimo() en supabase/schema.sql. Si los
 *  dos no dicen lo mismo, la interfaz anuncia un umbral distinto al que la base
 *  aplica y el facilitador no entiende por qué falta un panel.
 *
 *  Bajado a 3 por decisión del equipo. Queda dicho que el Documento Técnico (§4)
 *  y el brief (§17) piden 5, y que con 3 la reidentificación es más fácil:
 *  conociendo a dos integrantes de un grupo de tres se deducen las respuestas
 *  del tercero. */
export const K_ANON_MIN = 3;

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
