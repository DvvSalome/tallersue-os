"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemoActor } from "@/lib/demo/use-demo-actor";
import { computeParticipantRows } from "@/lib/demo/dashboard-data";
import { FacilitadorNav } from "@/components/facilitador-nav";
import { KpiRow } from "./kpi-row";
import { DashboardClient } from "./dashboard-client";

export function DemoDashboard() {
  const router = useRouter();
  const actor = useDemoActor();

  useEffect(() => {
    if (actor === null) router.replace("/facilitador/login");
    if (actor && actor.kind !== "facilitador") router.replace("/home");
  }, [actor, router]);

  if (!actor || actor.kind !== "facilitador") return null;

  const rows = computeParticipantRows(actor.comunaId);
  const total = rows.length;
  const completados = rows.filter((r) => r.estado === "completado").length;
  const enProceso = rows.filter((r) => r.estado === "en_proceso").length;
  const sinIniciar = rows.filter((r) => r.estado === "sin_iniciar").length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 py-8">
      <FacilitadorNav codigoGrupo={actor.codigoGrupo} />

      <KpiRow
        items={[
          { label: "Total participantes", value: total, tone: "brand" },
          { label: "Completados", value: completados, tone: "success" },
          { label: "En proceso", value: enProceso, tone: "warning" },
          { label: "Sin iniciar", value: sinIniciar, tone: "muted" },
        ]}
      />

      <DashboardClient rows={rows} scopedToOneComuna={actor.comunaId !== null} />
    </main>
  );
}
