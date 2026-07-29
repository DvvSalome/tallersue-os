"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDemoActor } from "@/lib/demo/use-demo-actor";
import {
  getUser,
  listEquipos,
  respuestasAbiertasForUser,
  responsesForUser,
} from "@/lib/demo/store";
import { INSTRUMENTO_VERSION } from "@/lib/items";
import type { RespuestasAbiertas, RespuestasCerradas } from "@/lib/respuestas";
import { comunaNombre } from "@/lib/comunas";
import { FichaView } from "./ficha-view";

export function DemoFicha({ userId }: { userId: string }) {
  const router = useRouter();
  const actor = useDemoActor();

  useEffect(() => {
    if (actor === null) router.replace("/facilitador/login");
    if (actor && actor.kind !== "facilitador") router.replace("/home");
  }, [actor, router]);

  if (!actor || actor.kind !== "facilitador") return null;

  const participante = getUser(userId);
  if (!participante) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-5 py-8">
        <p className="text-muted">Participante no encontrado.</p>
        <Link href="/facilitador/dashboard" className="text-sm text-brand underline underline-offset-4">
          ← Volver a participantes
        </Link>
      </main>
    );
  }

  const equipo = listEquipos().find((e) => e.id === participante.equipoId);
  const cerradas: RespuestasCerradas = {};
  for (const r of responsesForUser(userId)) {
    if (r.version === INSTRUMENTO_VERSION) cerradas[r.item] = r.valor;
  }

  const abiertas: RespuestasAbiertas = {};
  for (const t of respuestasAbiertasForUser(userId)) {
    if (t.version === INSTRUMENTO_VERSION) abiertas[t.clave] = t.texto;
  }

  return (
    <FichaView
      codigoGrupo={actor.codigoGrupo}
      apodo={participante.apodo}
      edad={participante.edad}
      comunaNombre={comunaNombre(participante.comunaId)}
      ciudad={participante.ciudad}
      pais={participante.pais}
      equipoCodigo={equipo?.codigo ?? "—"}
      equipoNombre={equipo?.nombre ?? null}
      registradoEn={new Date(participante.createdAt).toLocaleDateString("es-CO")}
      cerradas={cerradas}
      abiertas={abiertas}
    />
  );
}
