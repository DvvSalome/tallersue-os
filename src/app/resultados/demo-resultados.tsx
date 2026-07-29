"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemoActor } from "@/lib/demo/use-demo-actor";
import { getUser, respuestasAbiertasForUser, responsesForUser } from "@/lib/demo/store";
import { buildParticipantCsv } from "@/lib/demo/csv";
import { INSTRUMENTO_VERSION } from "@/lib/items";
import { calcularBrujula } from "@/lib/brujula";
import type { RespuestasAbiertas, RespuestasCerradas } from "@/lib/respuestas";
import { BrujulaView } from "./brujula-view";

export function DemoResultados() {
  const router = useRouter();
  const actor = useDemoActor();

  useEffect(() => {
    if (actor === null) router.replace("/participar");
    if (actor && actor.kind !== "participante") router.replace("/facilitador/dashboard");
  }, [actor, router]);

  if (!actor || actor.kind !== "participante") return null;

  const responses = responsesForUser(actor.id).filter((r) => r.version === INSTRUMENTO_VERSION);
  const textos = respuestasAbiertasForUser(actor.id).filter(
    (r) => r.version === INSTRUMENTO_VERSION,
  );

  const cerradas: RespuestasCerradas = {};
  for (const r of responses) cerradas[r.item] = r.valor;

  const abiertas: RespuestasAbiertas = {};
  for (const t of textos) abiertas[t.clave] = t.texto;

  return (
    <BrujulaView
      brujula={calcularBrujula(cerradas, abiertas)}
      cerradas={cerradas}
      abiertas={abiertas}
      apodo={getUser(actor.id)?.apodo}
      downloadGenerate={() => buildParticipantCsv(responses, textos)}
    />
  );
}
