import { redirect } from "next/navigation";
import { getActor } from "@/lib/actor";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_MODE } from "@/lib/demo/config";
import { INSTRUMENTO_VERSION } from "@/lib/items";
import { calcularDistribucionPerfiles, type ParticipanteParaPerfil } from "@/lib/perfiles-grupales";
import type { ClosedRow, TextoRow } from "@/lib/analisis-grupal";
import type { RespuestasCerradas, StoredValor } from "@/lib/respuestas";
import { DemoGrupo } from "./demo-grupo";
import { GrupoParticipanteView } from "./grupo-participante-view";

// "Nuestro Mapa de los Sueños" visto por un PARTICIPANTE, no por quien facilita.
//
// El mapa ya es anónimo por diseño (v_group_analysis_closed/_texto y
// calcularDistribucionPerfiles nunca devuelven apodo ni user_id, solo
// agregados con k >= 5), así que no hay nada que ocultarle a un participante
// que no se le oculte ya a cualquiera. Lo que SÍ debe quedar exclusivo del
// facilitador es lo que esta página nunca toca: el panel de participantes
// (con apodos y progreso individual) y la exportación en CSV.
//
// El único obstáculo técnico es de acceso: la sesión de un participante solo
// puede leer sus PROPIAS respuestas (RLS), así que llamar a las funciones de
// análisis con su cliente normal devolvería, como mucho, una fila — la suya —
// y nunca superaría el umbral de k-anonimato. Por eso esta página usa el
// cliente admin para calcular los agregados (igual que ya hace el facilitador,
// cuya política de RLS es efectivamente "ve todo"), y luego los filtra al
// EQUIPO del participante antes de renderizar. El admin client no sale de aquí:
// solo se le entregan al navegador las filas ya agregadas y ya filtradas.
export default async function ResultadosGrupoPage() {
  if (DEMO_MODE) return <DemoGrupo />;

  const actor = await getActor();
  if (!actor) redirect("/participar");
  if (actor.kind !== "participante") redirect("/facilitador/dashboard/analisis");

  const admin = createAdminClient();

  const [{ data: closed }, { data: texto }, { data: usuarios }, { data: respuestas }] =
    await Promise.all([
      admin.rpc("v_group_analysis_closed"),
      admin.rpc("v_group_analysis_texto"),
      admin.from("users").select("id, equipo_id, equipos(codigo, nombre)"),
      admin.from("responses").select("user_id, item, valor").eq("version", INSTRUMENTO_VERSION),
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

  // El filtro al propio equipo pasa aquí, no dentro de AnalisisView: un
  // participante nunca debe recibir del servidor datos de otros grupos, ni
  // siquiera agregados, así que se recortan antes de que salgan de esta página.
  const soloMiEquipo = <T extends { equipo_id: string }>(filas: T[]) =>
    filas.filter((f) => f.equipo_id === actor.equipoId);

  return (
    <GrupoParticipanteView
      apodo={actor.apodo}
      closedRows={soloMiEquipo((closed ?? []) as ClosedRow[])}
      textoRows={soloMiEquipo((texto ?? []) as TextoRow[])}
      perfilRows={soloMiEquipo(perfilRows)}
    />
  );
}
