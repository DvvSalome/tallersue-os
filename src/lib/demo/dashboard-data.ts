import {
  INSTRUMENTO_VERSION,
  ITEMS_ABIERTOS_PUROS,
  TOTAL_ITEMS_OBLIGATORIOS,
} from "@/lib/items";
import { listEquipos, listRespuestasAbiertas, listResponses, listUsers } from "./store";
import type { ParticipantRow } from "@/app/facilitador/dashboard/dashboard-client";

export function computeParticipantRows(): ParticipantRow[] {
  const equipos = new Map(listEquipos().map((e) => [e.id, e]));
  const responses = listResponses().filter((r) => r.version === INSTRUMENTO_VERSION);
  const abiertas = listRespuestasAbiertas().filter((r) => r.version === INSTRUMENTO_VERSION);
  // Solo las preguntas abiertas PURAS cuentan para la completitud; los campos
  // de observaciones son opcionales.
  const clavesPuras = new Set(ITEMS_ABIERTOS_PUROS.map((i) => i.clave));

  return listUsers()
    .map((u) => {
      const equipo = equipos.get(u.equipoId);
      const own = responses.filter((r) => r.userId === u.id);
      const ownPuras = abiertas.filter(
        (r) => r.userId === u.id && clavesPuras.has(r.clave) && r.texto.trim().length > 0,
      );
      const respondidas = own.length + ownPuras.length;
      const bloqueAlcanzado = [...own, ...ownPuras].reduce((max, r) => Math.max(max, r.bloque), 0);
      const estado: ParticipantRow["estado"] =
        respondidas >= TOTAL_ITEMS_OBLIGATORIOS
          ? "completado"
          : respondidas === 0
            ? "sin_iniciar"
            : "en_proceso";
      const ultimaActividad = [...own, ...ownPuras].reduce<string | null>(
        (latest, r) => (!latest || r.updatedAt > latest ? r.updatedAt : latest),
        null,
      );
      return {
        user_id: u.id,
        apodo: u.apodo,
        edad: u.edad,
        equipo_codigo: equipo?.codigo ?? "—",
        equipo_nombre: equipo?.nombre ?? null,
        items_respondidos: respondidas,
        bloque_alcanzado: bloqueAlcanzado,
        estado,
        ultima_actividad: ultimaActividad,
      };
    })
    .sort((a, b) => a.equipo_codigo.localeCompare(b.equipo_codigo) || a.apodo.localeCompare(b.apodo));
}
