import { redirect } from "next/navigation";
import { getActor } from "@/lib/actor";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE } from "@/lib/demo/config";
import type { ClosedRow, TextoRow } from "@/lib/analisis-grupal";
import { INSTRUMENTO_VERSION } from "@/lib/items";
import { calcularDistribucionPerfiles, type ParticipanteParaPerfil } from "@/lib/perfiles-grupales";
import type { RespuestasCerradas, StoredValor } from "@/lib/respuestas";
import { FacilitadorNav } from "@/components/facilitador-nav";
import { DemoAnalisis } from "./demo-analisis";
import { AnalisisView } from "./analisis-view";
import { ExportCsvButton } from "./export-csv-button";

export default async function AnalisisGrupalPage() {
  if (DEMO_MODE) return <DemoAnalisis />;

  const actor = await getActor();
  if (!actor) redirect("/facilitador/login");
  if (actor.kind !== "facilitador") redirect("/home");

  const supabase = await createClient();
  // El perfil de liderazgo es derivado: se calcula desde las respuestas, así que
  // hay que traerlas. La RLS ya limita todo a lo que este facilitador puede ver.
  const [{ data: closed }, { data: texto }, { data: usuarios }, { data: respuestas }] =
    await Promise.all([
      supabase.rpc("v_group_analysis_closed"),
      supabase.rpc("v_group_analysis_texto"),
      supabase.from("users").select("id, equipo_id, equipos(codigo, nombre)"),
      supabase
        .from("responses")
        .select("user_id, item, valor")
        .eq("version", INSTRUMENTO_VERSION),
    ]);

  const cerradasPorUsuario = new Map<string, RespuestasCerradas>();
  for (const r of respuestas ?? []) {
    const mapa = cerradasPorUsuario.get(r.user_id) ?? {};
    mapa[r.item] = r.valor as StoredValor;
    cerradasPorUsuario.set(r.user_id, mapa);
  }

  const participantes: ParticipanteParaPerfil[] = (usuarios ?? [])
    .map((u) => {
      const equipo = Array.isArray(u.equipos) ? u.equipos[0] : u.equipos;
      return {
        userId: u.id,
        equipoId: u.equipo_id as string,
        equipoCodigo: equipo?.codigo ?? "—",
        equipoNombre: equipo?.nombre ?? null,
        cerradas: cerradasPorUsuario.get(u.id) ?? {},
      };
    })
    .filter((p) => !!p.equipoId);

  const perfilRows = calcularDistribucionPerfiles(participantes);

  return (
    <AnalisisView
      nav={<FacilitadorNav codigoGrupo={actor.codigoGrupo} />}
      closedRows={(closed ?? []) as ClosedRow[]}
      textoRows={(texto ?? []) as TextoRow[]}
      perfilRows={perfilRows}
      exportSlot={<ExportCsvButton />}
    />
  );
}
