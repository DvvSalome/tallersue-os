"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemoActor } from "@/lib/demo/use-demo-actor";
import { respuestasAbiertasForUser, responsesForUser } from "@/lib/demo/store";
import { INSTRUMENTO_VERSION } from "@/lib/items";
import type { RespuestasAbiertas, RespuestasCerradas } from "@/lib/respuestas";
import { FormularioClient } from "./formulario-client";

export function DemoFormulario() {
  const router = useRouter();
  const actor = useDemoActor();

  useEffect(() => {
    if (actor === null) router.replace("/participar");
    if (actor && actor.kind !== "participante") router.replace("/facilitador/dashboard");
  }, [actor, router]);

  if (!actor || actor.kind !== "participante") return null;

  const initialCerradas: RespuestasCerradas = {};
  for (const r of responsesForUser(actor.id)) {
    if (r.version !== INSTRUMENTO_VERSION) continue;
    initialCerradas[r.item] = r.valor;
  }

  const initialAbiertas: RespuestasAbiertas = {};
  for (const t of respuestasAbiertasForUser(actor.id)) {
    if (t.version !== INSTRUMENTO_VERSION) continue;
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
