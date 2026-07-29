import { createClient } from "@/lib/supabase/server";

export type ParticipantActor = {
  kind: "participante";
  id: string;
  apodo: string;
  edad: number;
  pais: string;
  ciudad: string;
  comunaId: number;
  equipoId: string;
};

export type FacilitadorActor = {
  kind: "facilitador";
  id: string;
  codigoGrupo: string;
  comunaId: number | null;
  nombre: string | null;
};

export type Actor = ParticipantActor | FacilitadorActor | null;

// Resolves the signed-in Supabase Auth user (password-based for
// facilitadores, anonymous sign-in for participants — see
// src/app/api/auth/participant/join/route.ts) to either a participant or a
// facilitador profile.
export async function getActor(): Promise<Actor> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: facilitador } = await supabase
    .from("facilitadores")
    .select("id, codigo_grupo, comuna_id, nombre")
    .eq("id", user.id)
    .maybeSingle();

  if (facilitador) {
    return {
      kind: "facilitador",
      id: facilitador.id,
      codigoGrupo: facilitador.codigo_grupo,
      comunaId: facilitador.comuna_id,
      nombre: facilitador.nombre,
    };
  }

  const { data: participante } = await supabase
    .from("users")
    .select("id, apodo, edad, pais, ciudad, comuna_id, equipo_id")
    .eq("id", user.id)
    .maybeSingle();

  if (participante) {
    return {
      kind: "participante",
      id: participante.id,
      apodo: participante.apodo,
      edad: participante.edad,
      pais: participante.pais,
      ciudad: participante.ciudad,
      comunaId: participante.comuna_id,
      equipoId: participante.equipo_id,
    };
  }

  return null;
}
