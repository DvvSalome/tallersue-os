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
import { buildFacilitadorCsv } from "@/lib/demo/csv";
import { DownloadCsvButton } from "@/components/download-csv-button";
import { AnalisisView } from "./analisis-view";

export function DemoAnalisis() {
  const router = useRouter();
  const actor = useDemoActor();

  useEffect(() => {
    if (actor === null) router.replace("/facilitador/login");
    if (actor && actor.kind !== "facilitador") router.replace("/home");
  }, [actor, router]);

  if (!actor || actor.kind !== "facilitador") return null;

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

  return (
    <AnalisisView
      codigoGrupo={actor.codigoGrupo}
      closedRows={closed}
      textoRows={texto}
      perfilRows={perfilRows}
      exportSlot={
        <DownloadCsvButton
          generate={() =>
            buildFacilitadorCsv(listUsers(), listResponses(), listRespuestasAbiertas())
          }
          filename="taller-de-los-suenos-anonimizado.csv"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-all duration-150 enabled:hover:brightness-110 enabled:active:scale-[0.97] disabled:opacity-50"
        >
          Exportar CSV anonimizado
        </DownloadCsvButton>
      }
    />
  );
}
