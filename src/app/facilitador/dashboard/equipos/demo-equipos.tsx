"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDemoActor } from "@/lib/demo/use-demo-actor";
import { comunaNombre } from "@/lib/comunas";
import { createEquipo, listEquipos, listUsers, setEquipoActivo } from "@/lib/demo/store";
import { FacilitadorNav } from "@/components/facilitador-nav";
import { EquiposClient, type EquipoRow } from "./equipos-client";

function computeRows(comunaScope: number | null): EquipoRow[] {
  const users = listUsers();
  const counts = new Map<string, number>();
  for (const u of users) counts.set(u.equipoId, (counts.get(u.equipoId) ?? 0) + 1);

  return listEquipos()
    .filter((e) => comunaScope === null || e.comunaId === comunaScope)
    .map((e) => ({
      id: e.id,
      codigo: e.codigo,
      nombre: e.nombre,
      comunaId: e.comunaId,
      comunaNombre: comunaNombre(e.comunaId),
      activo: e.activo,
      participantes: counts.get(e.id) ?? 0,
      createdAt: e.createdAt,
    }));
}

export function DemoEquipos() {
  const router = useRouter();
  const actor = useDemoActor();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (actor === null) router.replace("/facilitador/login");
    if (actor && actor.kind !== "facilitador") router.replace("/home");
  }, [actor, router]);

  if (!actor || actor.kind !== "facilitador") return null;

  const rows = computeRows(actor.comunaId);
  void refreshKey; // referenced so recompute-on-change reads are obvious at the call site

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-8">
      <FacilitadorNav codigoGrupo={actor.codigoGrupo} />
      <EquiposClient
        rows={rows}
        comunaIdFija={actor.comunaId}
        onCreate={async (input) => {
          createEquipo(input);
          setRefreshKey((k) => k + 1);
          return {};
        }}
        onToggle={async (row) => {
          setEquipoActivo(row.id, !row.activo);
          setRefreshKey((k) => k + 1);
        }}
      />
    </main>
  );
}
