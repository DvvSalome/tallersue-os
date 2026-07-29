import { redirect } from "next/navigation";
import { getActor } from "@/lib/actor";
import { createClient } from "@/lib/supabase/server";
import { comunaNombre } from "@/lib/comunas";
import { TOTAL_ITEMS_OBLIGATORIOS } from "@/lib/items";
import { DEMO_MODE } from "@/lib/demo/config";
import { DemoHome } from "./demo-home";
import { HomeClient } from "./home-client";

export default async function HomePage() {
  if (DEMO_MODE) return <DemoHome />;

  const actor = await getActor();
  if (!actor) redirect("/participar");
  if (actor.kind !== "participante") redirect("/facilitador/dashboard");

  const supabase = await createClient();

  const [{ data: lineas }, { data: progreso }] = await Promise.all([
    supabase
      .from("lineas_atencion")
      .select("id, tipo, nombre, direccion, horario, telefono, color, comuna_id")
      .or(`comuna_id.eq.${actor.comunaId},comuna_id.is.null`)
      .order("tipo"),
    supabase
      .from("v_participant_progress")
      .select("items_respondidos, bloque_alcanzado, estado")
      .eq("user_id", actor.id)
      .maybeSingle(),
  ]);

  const respondidos = progreso?.items_respondidos ?? 0;
  const cta =
    respondidos === 0
      ? "Iniciar el formulario"
      : respondidos >= TOTAL_ITEMS_OBLIGATORIOS
        ? "Revisar mis respuestas"
        : `Continuar (${respondidos}/${TOTAL_ITEMS_OBLIGATORIOS})`;
  const ctaHref = respondidos >= TOTAL_ITEMS_OBLIGATORIOS ? "/resultados" : "/formulario";

  return (
    <HomeClient
      apodo={actor.apodo}
      comunaNombre={comunaNombre(actor.comunaId)}
      cta={cta}
      ctaHref={ctaHref}
      lineas={lineas ?? []}
    />
  );
}
