"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemoActor } from "@/lib/demo/use-demo-actor";
import { responsesForUser } from "@/lib/demo/store";
import { lineasParaComuna } from "@/lib/demo/lineas";
import { comunaNombre } from "@/lib/comunas";
import { TOTAL_ITEMS } from "@/lib/items";
import { HomeClient } from "./home-client";

export function DemoHome() {
  const router = useRouter();
  const actor = useDemoActor();

  useEffect(() => {
    if (actor === null) router.replace("/participar");
    if (actor && actor.kind !== "participante") router.replace("/facilitador/dashboard");
  }, [actor, router]);

  if (!actor || actor.kind !== "participante") return null;

  const respondidos = responsesForUser(actor.id).length;
  const cta =
    respondidos === 0
      ? "Iniciar el formulario"
      : respondidos >= TOTAL_ITEMS
        ? "Revisar mis respuestas"
        : `Continuar (${respondidos}/${TOTAL_ITEMS})`;
  const ctaHref = respondidos >= TOTAL_ITEMS ? "/resultados" : "/formulario";

  return (
    <HomeClient
      apodo={actor.apodo}
      comunaNombre={comunaNombre(actor.comunaId)}
      cta={cta}
      ctaHref={ctaHref}
      lineas={lineasParaComuna(actor.comunaId).map((l) => ({
        id: l.id,
        tipo: l.tipo,
        nombre: l.nombre,
        direccion: l.direccion,
        horario: l.horario,
        telefono: l.telefono,
        color: l.color,
      }))}
    />
  );
}
