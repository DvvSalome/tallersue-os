"use client";

import { useEffect, useState } from "react";
import type { Actor } from "@/lib/actor";
import { getSession, getUser } from "./store";

// Client-side equivalent of getActor() (src/lib/actor.ts) for demo mode —
// reads the session from localStorage instead of a Supabase cookie. Returns
// `undefined` while the initial read is pending (first paint, before
// localStorage is available) so callers can render a loading state instead
// of flashing a redirect.
export function useDemoActor(): Actor | undefined {
  const [actor, setActor] = useState<Actor | undefined>(undefined);

  // One-time read of an external store (localStorage) on mount, not a
  // derived-state mirror of props/state — the lint rule that discourages
  // setState-in-effect targets the latter, not this.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const session = getSession();
    if (!session) {
      setActor(null);
      return;
    }
    if (session.kind === "facilitador") {
      setActor({
        kind: "facilitador",
        id: "demo-facilitador",
        codigoGrupo: session.codigoGrupo,
        comunaId: session.comunaId,
        nombre: null,
      });
      return;
    }
    const user = getUser(session.userId);
    if (!user) {
      setActor(null);
      return;
    }
    setActor({
      kind: "participante",
      id: user.id,
      apodo: user.apodo,
      edad: user.edad,
      pais: user.pais,
      ciudad: user.ciudad,
      comunaId: user.comunaId,
      equipoId: user.equipoId,
    });
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return actor;
}
