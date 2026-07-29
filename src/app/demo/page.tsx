"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_MODE } from "@/lib/demo/config";
import { generarDatosFicticios, resumirDatos, type DatosDemo } from "@/lib/demo/seed";
import { replaceDemoData, resetDemoData, setSession } from "@/lib/demo/store";
import { comunaNombre } from "@/lib/comunas";
import { K_ANON_MIN } from "@/lib/analisis-grupal";
import { TOTAL_ITEMS_OBLIGATORIOS } from "@/lib/items";

// Página de previsualización: siembra un grupo ficticio en localStorage y abre
// cualquiera de los dos dashboards con datos dentro. Solo existe en modo demo;
// con NEXT_PUBLIC_DEMO_MODE apagado no hace nada.

export default function DemoPage() {
  const router = useRouter();
  // Generar es puro y determinista, así que se hace en el render: el servidor y
  // el cliente producen exactamente lo mismo y no hay desajuste de hidratación.
  const [datos] = useState<DatosDemo | null>(() =>
    DEMO_MODE ? generarDatosFicticios() : null,
  );
  const [borrado, setBorrado] = useState(false);

  const sembrar = useCallback(() => {
    if (!datos) return;
    replaceDemoData({
      equipos: datos.equipos,
      users: datos.users,
      responses: datos.responses,
      abiertas: datos.abiertas,
    });
  }, [datos]);

  // El efecto solo sincroniza el sistema externo (localStorage). Los botones
  // vuelven a sembrar antes de navegar, así que no hay ventana en la que se
  // pueda entrar a un dashboard vacío.
  useEffect(() => {
    if (!borrado) sembrar();
  }, [sembrar, borrado]);

  if (!DEMO_MODE) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-5 py-16">
        <h1 className="font-display text-xl font-semibold text-brand-dark">
          Previsualización no disponible
        </h1>
        <p className="text-sm text-muted">
          Esta página solo funciona con <code>NEXT_PUBLIC_DEMO_MODE=true</code>, porque los datos
          ficticios viven en el navegador y no en la base de datos.
        </p>
      </main>
    );
  }

  const resumen = datos && !borrado ? resumirDatos(datos) : null;

  function verBrujula() {
    if (!datos) return;
    sembrar();
    setSession({ kind: "participante", userId: datos.protagonistaId });
    router.push("/resultados");
  }

  function verComoFacilitador(ruta: string) {
    sembrar();
    setSession({ kind: "facilitador", codigoGrupo: "DEMO", comunaId: null });
    router.push(ruta);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-10">
      <header className="animate-fade-in-up">
        <h1
          className="font-display bg-clip-text text-2xl font-bold text-transparent"
          style={{ backgroundImage: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #ffb494 100%)" }}
        >
          Previsualización con datos ficticios
        </h1>
        <p className="mt-1 text-sm text-muted">
          Grupo de muestra generado en tu navegador. Es determinista: siempre sale el mismo grupo.
          No toca la base de datos.
        </p>
      </header>

      {resumen && (
        <section className="animate-fade-in-up rounded-2xl glass p-4 shadow-[var(--shadow-sm)]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Cifra valor={resumen.participantes} etiqueta="Participantes" />
            <Cifra valor={resumen.comunas} etiqueta="Comunas" />
            <Cifra valor={resumen.completos} etiqueta="Completaron" />
            <Cifra valor={resumen.textosLibres} etiqueta="Textos libres" />
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Reparto por comuna
            </p>
            {[...resumen.porComuna.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([comunaId, n]) => (
                <div key={comunaId} className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{comunaNombre(comunaId)}</span>
                  <span className="tabular-nums text-muted">
                    {n}{" "}
                    {n < K_ANON_MIN && (
                      <span className="text-coral-dark">· bajo el umbral, se oculta</span>
                    )}
                  </span>
                </div>
              ))}
          </div>

          <p className="mt-3 text-xs text-muted/80">
            El Poblado tiene {resumen.porComuna.get(14) ?? 0} respuestas a propósito: sirve para ver
            que ningún agregado se publica por debajo de {K_ANON_MIN}. El instrumento son{" "}
            {TOTAL_ITEMS_OBLIGATORIOS} preguntas y un 15 % del grupo lo dejó a medias, como pasa en
            la vida real.
          </p>
        </section>
      )}

      <section className="flex animate-fade-in-up flex-col gap-3">
        <button
          onClick={verBrujula}
          disabled={!datos}
          className="shine rounded-2xl px-6 py-4 text-left font-semibold text-white shadow-[0_12px_32px_-10px_rgba(124,58,237,0.6)] transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:active:scale-[0.98] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)" }}
        >
          Mi Brújula de los Sueños
          <span className="mt-0.5 block text-sm font-normal opacity-80">
            Dashboard personal: índices, fortalezas, barreras y 3 recomendaciones.
          </span>
        </button>

        <button
          onClick={() => verComoFacilitador("/facilitador/dashboard/analisis")}
          disabled={!datos}
          className="glass rounded-2xl px-6 py-4 text-left font-semibold text-brand-dark transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:active:scale-[0.98] disabled:opacity-50"
        >
          Nuestro Mapa de los Sueños
          <span className="mt-0.5 block text-sm font-normal text-muted">
            Dashboard colectivo y anónimo, agregado por comuna.
          </span>
        </button>

        <button
          onClick={() => verComoFacilitador("/facilitador/dashboard")}
          disabled={!datos}
          className="glass rounded-2xl px-6 py-4 text-left font-semibold text-brand-dark transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:active:scale-[0.98] disabled:opacity-50"
        >
          Panel de participantes
          <span className="mt-0.5 block text-sm font-normal text-muted">
            Progreso individual y estado de cada quien.
          </span>
        </button>
      </section>

      {borrado ? (
        <button
          onClick={() => {
            setBorrado(false);
            sembrar();
          }}
          className="self-start text-sm text-brand underline underline-offset-4"
        >
          Volver a generar el grupo de muestra
        </button>
      ) : (
        <button
          onClick={() => {
            resetDemoData();
            setBorrado(true);
          }}
          className="self-start text-sm text-muted underline underline-offset-4 transition-colors hover:text-coral-dark"
        >
          Borrar los datos de demo del navegador
        </button>
      )}
    </main>
  );
}

function Cifra({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <p className="font-display text-xl font-bold text-brand-dark tabular-nums">{valor}</p>
      <p className="text-xs text-muted">{etiqueta}</p>
    </div>
  );
}
