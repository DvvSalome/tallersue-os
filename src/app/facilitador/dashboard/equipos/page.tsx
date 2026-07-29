import { redirect } from "next/navigation";
import { getActor } from "@/lib/actor";
import { createClient } from "@/lib/supabase/server";
import { FacilitadorNav } from "@/components/facilitador-nav";
import { comunaNombre } from "@/lib/comunas";
import { DEMO_MODE } from "@/lib/demo/config";
import { DemoEquipos } from "./demo-equipos";
import { EquiposClient, type EquipoRow } from "./equipos-client";

export default async function EquiposPage() {
  if (DEMO_MODE) return <DemoEquipos />;

  const actor = await getActor();
  if (!actor) redirect("/facilitador/login");
  if (actor.kind !== "facilitador") redirect("/home");

  const supabase = await createClient();
  const [{ data: equipos }, { data: users }] = await Promise.all([
    supabase
      .from("equipos")
      .select("id, codigo, nombre, comuna_id, activo, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("users").select("equipo_id"),
  ]);

  const counts = new Map<string, number>();
  for (const u of users ?? []) {
    counts.set(u.equipo_id, (counts.get(u.equipo_id) ?? 0) + 1);
  }

  const rows: EquipoRow[] = (equipos ?? []).map((e) => ({
    id: e.id,
    codigo: e.codigo,
    nombre: e.nombre,
    comunaId: e.comuna_id,
    comunaNombre: comunaNombre(e.comuna_id),
    activo: e.activo,
    participantes: counts.get(e.id) ?? 0,
    createdAt: e.created_at,
  }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-8">
      <FacilitadorNav codigoGrupo={actor.codigoGrupo} />
      <EquiposClient rows={rows} comunaIdFija={actor.comunaId} />
    </main>
  );
}
