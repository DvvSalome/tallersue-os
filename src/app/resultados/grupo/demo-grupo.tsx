"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemoActor } from "@/lib/demo/use-demo-actor";
import {
  listEquipos,
  listRespuestasAbiertas,
  listResponses,
  listUsers,
} from "@/lib/demo/store";
import { computeGroupAnalysis } from "@/lib/demo/analysis";
import { INSTRUMENTO_VERSION } from "@/lib/items";
import { calcularDistribucionPerfiles, type ParticipanteParaPerfil } from "@/lib/perfiles-grupales";
import type { RespuestasCerradas } from "@/lib/respuestas";
import { GrupoParticipanteView } from "./grupo-participante-view";

export function DemoGrupo() {
  const router = useRouter();
  const actor = useDemoActor();

  useEffect(() => {
    if (actor === null) router.replace("/participar");
    if (actor && actor.kind !== "participante") router.replace("/facilitador/dashboard/analisis");
  }, [actor, router]);

  if (!actor || actor.kind !== "participante") return null;

  const { closed, texto } = computeGroupAnalysis(
    listResponses(),
    listRespuestasAbiertas(),
    listUsers(),
    listEquipos(),
  );

  const equipos = new Map(listEquipos().map((e) => [e.id, e]));
  const cerradasPorUsuario = new Map<string, RespuestasCerradas>();
  for (const r of listResponses()) {
    if (r.version !== INSTRUMENTO_VERSION) continue;
    const mapa = cerradasPorUsuario.get(r.userId) ?? {};
    mapa[r.item] = r.valor;
    cerradasPorUsuario.set(r.userId, mapa);
  }
  const participantes: ParticipanteParaPerfil[] = listUsers().map((u) => ({
    userId: u.id,
    equipoId: u.equipoId,
    equipoCodigo: equipos.get(u.equipoId)?.codigo ?? "—",
    equipoNombre: equipos.get(u.equipoId)?.nombre ?? null,
    cerradas: cerradasPorUsuario.get(u.id) ?? {},
  }));
  const perfilRows = calcularDistribucionPerfiles(participantes);

  // Igual que en producción: el recorte al propio equipo pasa aquí, antes de
  // llegar a la vista, para que el componente compartido no tenga que saber si
  // quien lo ve es participante o facilitador.
  const soloMiEquipo = <T extends { equipo_id: string }>(filas: T[]) =>
    filas.filter((f) => f.equipo_id === actor.equipoId);

  return (
    <GrupoParticipanteView
      apodo={actor.apodo}
      closedRows={soloMiEquipo(closed)}
      textoRows={soloMiEquipo(texto)}
      perfilRows={soloMiEquipo(perfilRows)}
    />
  );
}
