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

  return (
    <AnalisisView
      codigoGrupo={actor.codigoGrupo}
      closedRows={closed}
      textoRows={texto}
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
