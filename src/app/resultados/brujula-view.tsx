"use client";

import Link from "next/link";
import {
  MAX_RECOMENDACIONES,
  nombreNivel,
  type Brujula,
  type Indice,
  type NivelIndice,
} from "@/lib/brujula";
import { BLOQUES } from "@/lib/items";
import { describirValor, type RespuestasAbiertas, type RespuestasCerradas } from "@/lib/respuestas";
import { LogoutButton } from "@/components/logout-button";
import { DownloadCsvButton } from "@/components/download-csv-button";

// "Mi Brújula de los Sueños" — dashboard personal y privado (doc §3).
// Estructura A–G del documento. Todo el texto que se muestra viene del motor
// de reglas (src/lib/brujula.ts), que garantiza el registro no diagnóstico:
// reconocer, orientar, movilizar y devolver agencia.

const COLOR_NIVEL: Record<NivelIndice, string> = {
  fortalecer: "#f2734a",
  desarrollo: "#a78bfa",
  presente: "#4ade80",
};

export function BrujulaView({
  brujula,
  cerradas,
  abiertas,
  downloadHref,
  downloadGenerate,
}: {
  brujula: Brujula;
  cerradas: RespuestasCerradas;
  abiertas: RespuestasAbiertas;
  downloadHref?: string;
  downloadGenerate?: () => string;
}) {
  const { indices, foda, perfilLiderazgo, recomendaciones, ciudadania, loQueImporta } = brujula;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-7 px-5 py-8">
      <header className="flex animate-fade-in-up items-start justify-between gap-4">
        <div>
          <h1
            className="font-display bg-clip-text text-2xl font-bold text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #ffb494 100%)",
            }}
          >
            Mi Brújula de los Sueños
          </h1>
          <p className="text-sm text-muted">
            {brujula.respondidas}/{brujula.total} respondidas · solo tú puedes ver esto
          </p>
        </div>
        <LogoutButton />
      </header>

      {!brujula.completo && (
        <Link
          href="/formulario"
          className="animate-fade-in-up rounded-xl bg-brand px-6 py-4 text-center font-semibold text-white shadow-[var(--shadow-md)] transition-transform duration-150 active:scale-[0.98]"
        >
          Continuar el formulario
        </Link>
      )}

      {/* ---------------------------------------------- A. Así estoy hoy */}
      <Seccion letra="A" titulo="Así estoy hoy">
        <div className="grid gap-3 sm:grid-cols-2">
          {indices.map((ind) => (
            <IndiceCard key={ind.clave} indice={ind} />
          ))}
        </div>
        <p className="mt-1 text-xs text-muted/80">
          Estos indicadores son una lectura de tus respuestas de hoy, no una medida de quién eres.
          Pueden cambiar cuando cambien tus circunstancias.
        </p>
      </Seccion>

      {/* ------------------------------------------- B / C / D. FODA */}
      <Seccion letra="B" titulo="Lo que ya tengo">
        <Lista items={foda.fortalezas} vacio="Todavía no hay respuestas suficientes para esta sección." />
      </Seccion>

      <Seccion letra="C" titulo="Lo que puede estar frenándome">
        <Lista
          items={foda.debilidades}
          vacio="No identificas barreras personales en tus respuestas."
          tono="alerta"
        />
      </Seccion>

      <Seccion letra="D" titulo="Lo que existe a mi alrededor">
        <Lista items={foda.oportunidades} vacio="Aún no identificas apoyos u oportunidades." />
        {foda.amenazas.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              Condiciones del entorno
            </p>
            <Lista items={foda.amenazas} vacio="" tono="alerta" />
          </div>
        )}
      </Seccion>

      {/* ------------------------------------------ E. Lo que me importa */}
      <Seccion letra="E" titulo="Lo que me importa">
        <div className="flex flex-col gap-2.5 text-sm">
          {loQueImporta.suenos.length > 0 && (
            <Dato etiqueta="Mi sueño hoy" valor={loQueImporta.suenos.join(", ")} />
          )}
          {loQueImporta.prioridadPublica && (
            <Dato etiqueta="Lo que resolvería primero" valor={loQueImporta.prioridadPublica} />
          )}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Orientación que más aparece
            </p>
            <p className="mt-1 font-medium text-foreground">{perfilLiderazgo.nombre}</p>
            <p className="mt-1 text-sm text-muted">{perfilLiderazgo.lectura}</p>
          </div>
        </div>
      </Seccion>

      {/* --------------------------------------------- F. Mi ciudadanía */}
      <Seccion letra="F" titulo="Mi ciudadanía">
        <div className="flex flex-col gap-2.5 text-sm">
          <Dato
            etiqueta="Experiencia participativa"
            valor={
              ciudadania.experiencia.length > 0
                ? ciudadania.experiencia.join(", ")
                : "Sin experiencia registrada todavía"
            }
          />
          {ciudadania.derechoPrioritario && (
            <Dato etiqueta="Derecho que priorizas" valor={ciudadania.derechoPrioritario} />
          )}
          {ciudadania.intereses.length > 0 && (
            <Dato etiqueta="Te interesa participar en" valor={ciudadania.intereses.join(", ")} />
          )}
          {ciudadania.confianzaInstitucional !== null && (
            <Dato
              etiqueta="Confianza en las instituciones públicas"
              valor={`${ciudadania.confianzaInstitucional} de 5`}
            />
          )}
        </div>
      </Seccion>

      {/* ------------------------------------------ G. Mi siguiente paso */}
      <Seccion letra="G" titulo="Tu próximo movimiento">
        <p className="mb-3 text-sm text-muted">
          {recomendaciones.length === MAX_RECOMENDACIONES
            ? "Tres pasos posibles, en orden de prioridad. No son obligaciones: tú decides."
            : "Pasos posibles a partir de tus respuestas. Tú decides."}
        </p>
        <ol className="flex flex-col gap-2.5">
          {recomendaciones.map((rec, i) => (
            <li
              key={`${rec.hallazgo}-${i}`}
              className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5"
            >
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}
              >
                {i + 1}
              </span>
              <div>
                <p className="font-medium text-foreground">{rec.accion}</p>
                <p className="mt-0.5 text-sm text-muted">{rec.invitacion}</p>
                <p className="mt-1.5 text-[11px] uppercase tracking-wide text-muted/70">
                  {rec.necesidad} · {rec.recurso}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Seccion>

      {loQueImporta.mensajeDecisores && (
        <Seccion letra="" titulo="Tu mensaje a quienes deciden">
          <blockquote className="border-l-2 border-brand/60 pl-3 text-sm italic text-foreground/90">
            {loQueImporta.mensajeDecisores}
          </blockquote>
          <p className="mt-2 text-xs text-muted/80">
            Este mensaje se suma a los de otras personas de forma anónima. En el mapa colectivo se
            muestran los temas, nunca tu texto.
          </p>
        </Seccion>
      )}

      {/* ------------------------------------- Detalle de mis respuestas */}
      <details className="animate-fade-in-up rounded-2xl glass p-4">
        <summary className="cursor-pointer font-display font-semibold text-brand-dark">
          Ver todas mis respuestas
        </summary>
        <div className="mt-4 flex flex-col gap-5">
          {BLOQUES.map((bloque) => (
            <section key={bloque.bloque} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-muted">
                Bloque {bloque.bloque} · {bloque.titulo}
              </h3>
              {bloque.items.map((it) => {
                const cerrada = cerradas[it.item];
                const textoClave = it.abierta?.clave ?? it.clave;
                const observacion = (abiertas[textoClave] ?? "").trim();
                const principal =
                  it.tipo === "texto" ? observacion : describirValor(it, cerrada);
                return (
                  <div key={it.item} className="rounded-xl border border-white/10 p-3">
                    <p className="text-sm font-medium">
                      <span className="mr-1.5 text-xs text-brand-dark/70">{it.codigo}</span>
                      {it.etiqueta}
                    </p>
                    <p className="mt-1 text-sm text-brand-dark">
                      {principal || <span className="text-muted/70">Sin responder.</span>}
                    </p>
                    {it.tipo !== "texto" && observacion && (
                      <p className="mt-1.5 border-l-2 border-white/15 pl-2.5 text-sm text-muted">
                        {observacion}
                      </p>
                    )}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </details>

      {brujula.completo && (
        <DownloadCsvButton
          href={downloadHref}
          generate={downloadGenerate}
          filename="mi-brujula.csv"
          className="animate-fade-in-up rounded-xl border-2 border-brand/30 px-6 py-4 text-center font-semibold text-brand-dark transition-colors duration-150 hover:border-brand hover:bg-brand-light disabled:opacity-50"
        >
          Descargar mis resultados (CSV)
        </DownloadCsvButton>
      )}
    </main>
  );
}

function Seccion({
  letra,
  titulo,
  children,
}: {
  letra: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-fade-in-up flex flex-col gap-3">
      <h2 className="font-display flex items-center gap-2 font-semibold">
        {letra && (
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand/20 text-xs font-bold text-brand-dark">
            {letra}
          </span>
        )}
        {titulo}
      </h2>
      <div className="rounded-2xl glass p-4 shadow-[var(--shadow-sm)]">{children}</div>
    </section>
  );
}

function IndiceCard({ indice }: { indice: Indice }) {
  const pct = indice.valor ?? 0;
  const color = indice.nivel ? COLOR_NIVEL[indice.nivel] : "#6b7280";
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{indice.nombre}</p>
        <span className="shrink-0 text-sm font-bold tabular-nums" style={{ color }}>
          {indice.valor === null ? "—" : indice.valor}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>
        {indice.nivel ? nombreNivel(indice.nivel) : "Sin datos suficientes"}
      </p>
      <p className="text-xs text-muted">{indice.lectura}</p>
    </div>
  );
}

function Lista({
  items,
  vacio,
  tono = "normal",
}: {
  items: string[];
  vacio: string;
  tono?: "normal" | "alerta";
}) {
  if (items.length === 0) {
    return vacio ? <p className="text-sm text-muted/70">{vacio}</p> : null;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((t) => (
        <li key={t} className="flex gap-2.5 text-sm">
          <span
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: tono === "alerta" ? "#f2734a" : "#4ade80" }}
          />
          <span className="text-foreground/90">{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{etiqueta}</p>
      <p className="mt-0.5 text-foreground">{valor}</p>
    </div>
  );
}
