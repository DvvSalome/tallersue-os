import { redirect } from "next/navigation";
import { getActor } from "@/lib/actor";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE } from "@/lib/demo/config";
import type { ClosedRow, TextoRow } from "@/lib/analisis-grupal";
import { DemoAnalisis } from "./demo-analisis";
import { AnalisisView } from "./analisis-view";
import { ExportCsvButton } from "./export-csv-button";

export default async function AnalisisGrupalPage() {
  if (DEMO_MODE) return <DemoAnalisis />;

  const actor = await getActor();
  if (!actor) redirect("/facilitador/login");
  if (actor.kind !== "facilitador") redirect("/home");

  const supabase = await createClient();
  const [{ data: closed }, { data: texto }] = await Promise.all([
    supabase.rpc("v_group_analysis_closed"),
    supabase.rpc("v_group_analysis_texto"),
  ]);

  return (
    <AnalisisView
      codigoGrupo={actor.codigoGrupo}
      closedRows={(closed ?? []) as ClosedRow[]}
      textoRows={(texto ?? []) as TextoRow[]}
      exportSlot={<ExportCsvButton />}
    />
  );
}
