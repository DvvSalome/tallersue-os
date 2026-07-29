import { redirect } from "next/navigation";
import { getActor } from "@/lib/actor";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE } from "@/lib/demo/config";
import { INSTRUMENTO_VERSION } from "@/lib/items";
import { calcularBrujula } from "@/lib/brujula";
import type { RespuestasAbiertas, RespuestasCerradas, StoredValor } from "@/lib/respuestas";
import { DemoResultados } from "./demo-resultados";
import { BrujulaView } from "./brujula-view";

export default async function ResultadosPage() {
  if (DEMO_MODE) return <DemoResultados />;

  const actor = await getActor();
  if (!actor) redirect("/participar");
  if (actor.kind !== "participante") redirect("/facilitador/dashboard");

  const supabase = await createClient();
  const [{ data: responses }, { data: textos }] = await Promise.all([
    supabase
      .from("responses")
      .select("item, valor")
      .eq("user_id", actor.id)
      .eq("version", INSTRUMENTO_VERSION),
    supabase
      .from("respuestas_abiertas")
      .select("clave, texto")
      .eq("user_id", actor.id)
      .eq("version", INSTRUMENTO_VERSION),
  ]);

  const { data: perfil } = await supabase
    .from("users")
    .select("apodo")
    .eq("id", actor.id)
    .maybeSingle();

  const cerradas: RespuestasCerradas = {};
  for (const r of responses ?? []) cerradas[r.item] = r.valor as StoredValor;

  const abiertas: RespuestasAbiertas = {};
  for (const t of textos ?? []) abiertas[t.clave] = t.texto;

  return (
    <BrujulaView
      brujula={calcularBrujula(cerradas, abiertas)}
      cerradas={cerradas}
      abiertas={abiertas}
      apodo={perfil?.apodo}
      downloadHref="/api/participante/export"
    />
  );
}
