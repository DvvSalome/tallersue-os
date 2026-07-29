import { redirect } from "next/navigation";
import { getActor } from "@/lib/actor";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE } from "@/lib/demo/config";
import { DemoDashboard } from "./demo-dashboard";
import { FacilitadorNav } from "@/components/facilitador-nav";
import { KpiRow } from "./kpi-row";
import { DashboardClient, type ParticipantRow } from "./dashboard-client";

export default async function DashboardPage() {
  if (DEMO_MODE) return <DemoDashboard />;

  const actor = await getActor();
  if (!actor) redirect("/facilitador/login");
  if (actor.kind !== "facilitador") redirect("/home");

  const supabase = await createClient();
  const { data } = await supabase
    .from("v_participant_progress")
    .select(
      "user_id, apodo, edad, comuna_id, comuna_nombre, equipo_codigo, equipo_nombre, items_respondidos, bloque_alcanzado, estado, ultima_actividad",
    )
    .order("comuna_nombre")
    .order("apodo");

  const rows: ParticipantRow[] = data ?? [];
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
