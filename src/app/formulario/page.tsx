import { redirect } from "next/navigation";
import { getActor } from "@/lib/actor";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE } from "@/lib/demo/config";
import { INSTRUMENTO_VERSION } from "@/lib/items";
import type { RespuestasAbiertas, RespuestasCerradas, StoredValor } from "@/lib/respuestas";
import { DemoFormulario } from "./demo-formulario";
import { FormularioClient } from "./formulario-client";

export default async function FormularioPage() {
  if (DEMO_MODE) return <DemoFormulario />;

  const actor = await getActor();
  if (!actor) redirect("/participar");
  if (actor.kind !== "participante") redirect("/facilitador/dashboard");

  const supabase = await createClient();

  // Cerradas y abiertas se leen por separado porque se almacenan por separado.
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

  const initialCerradas: RespuestasCerradas = {};
  for (const r of responses ?? []) {
    initialCerradas[r.item] = r.valor as StoredValor;
  }

  const initialAbiertas: RespuestasAbiertas = {};
  for (const t of textos ?? []) {
    initialAbiertas[t.clave] = t.texto;
  }

  return (
    <FormularioClient
      userId={actor.id}
      initialCerradas={initialCerradas}
      initialAbiertas={initialAbiertas}
    />
  );
}
