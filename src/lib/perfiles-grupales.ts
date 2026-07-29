// Distribución de perfiles de liderazgo en el grupo (doc §4).
//
// Es un indicador DERIVADO: no corresponde a ninguna pregunta, se calcula a
// partir de la fortaleza declarada y los intereses de participación. Por eso se
// agrega en TypeScript reusando `calcularPerfilLiderazgo`, la misma regla que
// alimenta la Brújula personal. Reimplementarla en SQL daría dos definiciones
// del mismo perfil, condenadas a divergir en el primer ajuste.
//
// Se aplica el MISMO umbral de k-anonimato que el resto del mapa: un grupo con
// menos de K_ANON_MIN participantes con perfil calculable no se publica. Y como
// el perfil se deriva de dos respuestas, agregarlo sin ese umbral permitiría
// deducir qué respondió alguien en un grupo pequeño.

import { calcularPerfilLiderazgo } from "./brujula";
import { K_ANON_MIN } from "./analisis-grupal";
import type { RespuestasCerradas } from "./respuestas";

export type ParticipanteParaPerfil = {
  userId: string;
  equipoId: string;
  equipoCodigo: string;
  equipoNombre: string | null;
  cerradas: RespuestasCerradas;
};

export type PerfilRow = {
  equipo_id: string;
  equipo_codigo: string;
  equipo_nombre: string | null;
  /** Clave estable del perfil. */
  perfil: string;
  /** Nombre legible, tal como se le muestra a la persona. */
  nombre: string;
  n: number;
  total_grupo: number;
  porcentaje: number;
};

/** Perfil que el motor devuelve cuando no hay señal suficiente. No se cuenta
 *  como un perfil más: sería leerlo como una categoría real. */
const SIN_SENAL = "en_exploracion";

export function calcularDistribucionPerfiles(
  participantes: ParticipanteParaPerfil[],
): PerfilRow[] {
  // 1. Perfil de cada participante, descartando los que no tienen señal.
  const conPerfil = participantes
    .map((p) => ({ ...p, perfil: calcularPerfilLiderazgo(p.cerradas) }))
    .filter((p) => p.perfil.clave !== SIN_SENAL);

  // 2. Participantes con perfil por grupo: el denominador y el umbral.
  const totalPorGrupo = new Map<string, number>();
  for (const p of conPerfil) {
    totalPorGrupo.set(p.equipoId, (totalPorGrupo.get(p.equipoId) ?? 0) + 1);
  }

  // 3. Conteo por (grupo, perfil), solo en grupos que pasan el umbral.
  const acc = new Map<string, PerfilRow>();
  for (const p of conPerfil) {
    const total = totalPorGrupo.get(p.equipoId) ?? 0;
    if (total < K_ANON_MIN) continue;
    const k = `${p.equipoId}::${p.perfil.clave}`;
    const previo = acc.get(k);
    acc.set(k, {
      equipo_id: p.equipoId,
      equipo_codigo: p.equipoCodigo,
      equipo_nombre: p.equipoNombre,
      perfil: p.perfil.clave,
      nombre: p.perfil.nombre,
      n: (previo?.n ?? 0) + 1,
      total_grupo: total,
      porcentaje: 0,
    });
  }

  return [...acc.values()].map((r) => ({
    ...r,
    porcentaje: Math.round((1000 * r.n) / r.total_grupo) / 10,
  }));
}
