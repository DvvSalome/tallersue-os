import { notFound, redirect } from "next/navigation";
import { getActor } from "@/lib/actor";
import { createClient } from "@/lib/supabase/server";
import { comunaNombre } from "@/lib/comunas";
import { DEMO_MODE } from "@/lib/demo/config";
import { INSTRUMENTO_VERSION } from "@/lib/items";
import type { RespuestasAbiertas, RespuestasCerradas, StoredValor } from "@/lib/respuestas";
import { DemoFicha } from "./demo-ficha";
import { FichaView } from "./ficha-view";

export default async function FichaParticipantePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  if (DEMO_MODE) return <DemoFicha userId={userId} />;

  const actor = await getActor();
  if (!actor) redirect("/facilitador/login");
  if (actor.kind !== "facilitador") redirect("/home");

  const supabase = await createClient();

  // RLS (users_select_facilitador / responses_select_facilitador) already
  // scopes this to participants within the facilitador's comuna — a 0-row
  // result here means "not found or not authorized", both correctly a 404.
  const { data: participante } = await supabase
    .from("users")
    .select("id, apodo, edad, pais, ciudad, comuna_id, created_at, equipos(codigo, nombre)")
    .eq("id", userId)
    .maybeSingle();

  if (!participante) notFound();

  const equipo = Array.isArray(participante.equipos) ? participante.equipos[0] : participante.equipos;

  const [{ data: responses }, { data: textos }] = await Promise.all([
    supabase
      .from("responses")
      .select("item, valor")
      .eq("user_id", userId)
      .eq("version", INSTRUMENTO_VERSION),
    supabase
      .from("respuestas_abiertas")
      .select("clave, texto")
      .eq("user_id", userId)
      .eq("version", INSTRUMENTO_VERSION),
  ]);

  const cerradas: RespuestasCerradas = {};
  for (const r of responses ?? []) cerradas[r.item] = r.valor as StoredValor;

  const abiertas: RespuestasAbiertas = {};
  for (const t of textos ?? []) abiertas[t.clave] = t.texto;

  return (
    <FichaView
      codigoGrupo={actor.codigoGrupo}
      apodo={participante.apodo}
      edad={participante.edad}
      comunaNombre={comunaNombre(participante.comuna_id)}
      ciudad={participante.ciudad}
      pais={participante.pais}
      equipoCodigo={equipo?.codigo ?? "—"}
      equipoNombre={equipo?.nombre ?? null}
      registradoEn={new Date(participante.created_at).toLocaleDateString("es-CO")}
      cerradas={cerradas}
      abiertas={abiertas}
    />
  );
}
