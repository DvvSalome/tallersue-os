"use client";

import { useState } from "react";
import Link from "next/link";
import {
  NOMBRE_TIPO_BARRERA,
  NOMBRE_TIPO_RECURSO,
  nombreNivel,
  type Aguja,
  type Brujula,
  type Indice,
  type NivelIndice,
} from "@/lib/brujula";
import { BLOQUES } from "@/lib/items";
import { describirValor, type RespuestasAbiertas, type RespuestasCerradas } from "@/lib/respuestas";
import { LogoutButton } from "@/components/logout-button";
import { DownloadCsvButton } from "@/components/download-csv-button";

// "Mi Brújula de los Sueños" — dashboard personal y privado.
//
// La pantalla cuenta una historia, no lista preguntas:
//   Este es tu punto de partida → Mi brújula → Lo que ya tienes →
//   Lo que puede estar frenándote → Lo que tienes alrededor →
//   Lo que le da sentido → Mi lugar en lo colectivo → Mi siguiente movimiento.
//
// Tres reglas que la vista hace cumplir:
// 1. DATO, INTERPRETACIÓN y RECOMENDACIÓN se muestran separados y rotulados,
//    para que se distinga lo que la persona respondió de lo que el sistema lee.
// 2. Los valores se muestran en la escala 1–5 que ella usó, nunca como
//    porcentaje suelto ni como calificación global.
// 3. Sin datos suficientes se dice "—" y se explica, jamás se pinta un cero.

const COLOR_NIVEL: Record<NivelIndice, string> = {
  fortalecer: "#f2a35c",
  desarrollo: "#a78bfa",
  presente: "#5ddba4",
};

export function BrujulaView({
  brujula,
  cerradas,
  abiertas,
  apodo,
  downloadHref,
  downloadGenerate,
}: {
  brujula: Brujula;
  cerradas: RespuestasCerradas;
  abiertas: RespuestasAbiertas;
  apodo?: string;
  downloadHref?: string;
  downloadGenerate?: () => string;
}) {
  const { indices, agujas, barreras, recursos, proposito, foda, perfilLiderazgo, recomendaciones, ciudadania, loQueImporta } =
    brujula;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-5 pb-24 pt-8">
      {/* ---------------------------------------------- Bienvenida */}
      <header className="animate-fade-in-up flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/80">
            Mi Brújula de los Sueños
          </p>
          <LogoutButton />
        </div>
        <h1
          className="font-display bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl"
          style={{ backgroundImage: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 55%, #ffb494 100%)" }}
        >
          {apodo ? `${apodo}, este es tu punto de partida.` : "Este es tu punto de partida."}
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-muted">
          Tus respuestas no definen quién eres. Nos ayudan a reconocer dónde estás hoy para pensar
          hacia dónde quieres avanzar.
        </p>
        <p className="text-xs text-muted/70">
          {brujula.respondidas} de {brujula.total} respuestas · solo tú puedes ver esto
        </p>
      </header>

      {!brujula.completo && (
        <Link
          href="/formulario"
          className="animate-fade-in-up rounded-2xl px-6 py-4 text-center font-semibold text-white shadow-[0_12px_32px_-10px_rgba(124,58,237,0.6)]"
          style={{ background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)" }}
        >
          Continuar el formulario
          <span className="mt-0.5 block text-sm font-normal opacity-80">
            Faltan {brujula.total - brujula.respondidas} respuestas para completar tu brújula.
          </span>
        </Link>
      )}

      {/* ---------------------------------------------- Mi brújula */}
      <Seccion
        titulo="Mi brújula"
        contexto="Siete direcciones desde las cuales puedes orientar tu siguiente etapa. Toca cada una para ver qué dice."
      >
        <Agujas agujas={agujas} />
      </Seccion>

      {/* ---------------------------------------------- Mi panorama */}
      <Seccion
        titulo="Mi panorama"
        contexto="Cómo se ven hoy cinco aspectos de tu proyecto, en la misma escala de 1 a 5 que usaste al responder."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {indices.map((ind) => (
            <IndiceCard key={ind.clave} indice={ind} />
          ))}
        </div>
        <NotaIA />
      </Seccion>

      {/* ---------------------------------------------- Lo que ya tienes */}
      <Seccion
        titulo="Lo que ya tienes"
        contexto="Tus respuestas muestran recursos que pueden ayudarte a avanzar."
      >
        {foda.fortalezas.length === 0 ? (
          <Vacio>Cuando completes el formulario aparecerán aquí tus recursos.</Vacio>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {foda.fortalezas.map((f) => (
              <div
                key={f}
                className="rounded-xl border border-[#5ddba4]/25 bg-[#5ddba4]/[0.07] p-3.5 text-sm leading-relaxed text-foreground/90"
              >
                {f}
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {/* ---------------------------------------------- Barreras */}
      <Seccion
        titulo="Lo que hoy puede estar frenando tu camino"
        contexto="Son condiciones del momento, no defectos. Nombrarlas es lo que permite trabajarlas."
      >
        {barreras.length === 0 ? (
          <Vacio>No identificas barreras en tus respuestas.</Vacio>
        ) : (
          <div className="flex flex-col gap-3">
            {barreras.map((b) => (
              <div key={b.tipo} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs sm:text-[11px] font-semibold uppercase tracking-wider text-[#f2a35c]">
                  {NOMBRE_TIPO_BARRERA[b.tipo]}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {b.etiquetas.map((e) => (
                    <span
                      key={e}
                      className="rounded-lg bg-[#f2a35c]/12 px-2.5 py-1 text-[13px] text-foreground/90"
                    >
                      {e}
                    </span>
                  ))}
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-muted">{b.lectura}</p>
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {/* ---------------------------------------------- Recursos alrededor */}
      <Seccion
        titulo="Lo que tienes a tu alrededor"
        contexto="Personas, instituciones y espacios que ya reconoces. Este es tu mapa de recursos."
      >
        {recursos.length === 0 ? (
          <Vacio>Aún no identificas apoyos u oportunidades a tu alrededor.</Vacio>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recursos.map((r) => (
              <div key={r.tipo} className="rounded-xl border border-brand/20 bg-brand/[0.06] p-3.5">
                <p className="text-xs sm:text-[11px] font-semibold uppercase tracking-wider text-brand-dark">
                  {NOMBRE_TIPO_RECURSO[r.tipo]}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                  {r.etiquetas.join(" · ")}
                </p>
              </div>
            ))}
          </div>
        )}
        {foda.oportunidades.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {foda.oportunidades.map((t) => (
              <li key={t} className="text-[13px] leading-relaxed text-muted">
                {t}
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      {/* ---------------------------------------------- Propósito */}
      <Seccion
        titulo="Lo que le da sentido a tu sueño"
        contexto="Temas que aparecen en lo que elegiste. Son pistas para explorar, no conclusiones sobre ti."
      >
        {proposito.temas.length === 0 ? (
          <Vacio>Cuando completes el formulario aparecerán aquí los temas que se repiten.</Vacio>
        ) : (
          <>
            <p className="text-sm text-muted">
              {proposito.enriquecidoConTexto
                ? "En lo que elegiste y escribiste aparece con frecuencia:"
                : "En lo que elegiste aparece con frecuencia:"}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {proposito.temas.map((t) => (
                <span
                  key={t.nombre}
                  className="rounded-full border border-coral/30 bg-coral/10 px-3.5 py-1.5 text-sm font-medium text-foreground/90"
                >
                  {t.nombre}
                  <span className="ml-1.5 text-xs text-muted">
                    {t.apoyos} {t.apoyos === 1 ? "señal" : "señales"}
                  </span>
                </span>
              ))}
            </div>
            {!proposito.enriquecidoConTexto && (
              <p className="mt-3 text-[13px] leading-relaxed text-muted/80">
                Esto sale de tus respuestas de selección. Si vuelves al formulario y cuentas algo
                sobre tu sueño en los comentarios, esta lectura se afina — pero no hace falta.
              </p>
            )}
            <NotaIA />
          </>
        )}
        {loQueImporta.suenos.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            <span className="text-foreground/90">Tu sueño hoy:</span>{" "}
            {loQueImporta.suenos.join(", ")}.
          </p>
        )}
      </Seccion>

      {/* ---------------------------------------------- Ciudadanía */}
      <Seccion
        titulo="Mi lugar en lo colectivo"
        contexto="Tu proyecto también se conecta con tu comunidad."
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Dato
            etiqueta="Ya participaste en"
            valor={
              ciudadania.experiencia.length > 0
                ? ciudadania.experiencia.join(", ")
                : "Ningún espacio todavía"
            }
          />
          {ciudadania.derechoPrioritario && (
            <Dato etiqueta="El derecho que priorizas" valor={ciudadania.derechoPrioritario} />
          )}
          {ciudadania.intereses.length > 0 && (
            <Dato etiqueta="Te interesa participar en" valor={ciudadania.intereses.join(", ")} />
          )}
          {ciudadania.confianzaInstitucional !== null && (
            <Dato
              etiqueta="Confianza en las instituciones"
              valor={`${ciudadania.confianzaInstitucional} de 5`}
            />
          )}
          {loQueImporta.prioridadPublica && (
            <Dato etiqueta="Lo que resolverías primero" valor={loQueImporta.prioridadPublica} />
          )}
          <Dato etiqueta="Orientación que más aparece" valor={perfilLiderazgo.nombre} />
        </div>
        <p className="mt-2.5 text-[13px] leading-relaxed text-muted">{perfilLiderazgo.lectura}</p>

        {loQueImporta.mensajeDecisores && (
          <div className="mt-4 rounded-xl border-l-2 border-brand/60 bg-white/[0.04] p-3.5">
            <p className="text-xs sm:text-[11px] font-semibold uppercase tracking-wider text-muted">
              Tu mensaje a quienes deciden
            </p>
            <p className="mt-1.5 text-sm italic leading-relaxed text-foreground/90">
              {loQueImporta.mensajeDecisores}
            </p>
            <p className="mt-2 text-xs text-muted/80">
              En el mapa colectivo se muestran los temas de todos los mensajes, nunca tu texto.
            </p>
          </div>
        )}
      </Seccion>

      {/* ---------------------------------------------- Siguiente movimiento */}
      <Seccion
        titulo="Mi siguiente movimiento"
        contexto="Máximo tres pasos, en orden de prioridad. No son obligaciones: tú decides."
      >
        <ol className="flex flex-col gap-3">
          {recomendaciones.map((rec, i) => (
            <li
              key={rec.titulo}
              className="rounded-2xl border border-white/12 bg-white/[0.05] p-4 transition-colors hover:border-brand/40"
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-foreground">{rec.titulo}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                    <span className="font-semibold text-foreground/80">¿Por qué aparece? </span>
                    {rec.porque}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{rec.accion}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs sm:text-[11px]">
                    <span className="rounded-md bg-brand/15 px-2 py-0.5 font-semibold uppercase tracking-wide text-brand-dark">
                      {rec.horizonte}
                    </span>
                    <span className="rounded-md bg-white/8 px-2 py-0.5 text-muted">
                      {rec.recurso}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <NotaIA />
      </Seccion>

      {/* ---------------------------------------------- Cierre */}
      <section className="animate-fade-in-up rounded-2xl border border-brand/25 bg-brand/[0.07] p-5 text-center">
        <p className="font-display text-lg font-semibold text-foreground">
          Tu punto de partida no determina tu destino.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          Ahora tienes una lectura más clara de lo que sueñas, de lo que tienes y de lo que puedes
          empezar a hacer. Esto se puede actualizar: cuando cambien tus respuestas, cambiará tu
          brújula.
        </p>
        {brujula.completo && (
          <DownloadCsvButton
            href={downloadHref}
            generate={downloadGenerate}
            filename="mi-brujula.csv"
            className="mt-4 inline-block rounded-xl border-2 border-brand/40 px-5 py-3 text-sm font-semibold text-brand-dark transition-colors hover:border-brand hover:bg-brand-light disabled:opacity-50"
          >
            Descargar mis resultados
          </DownloadCsvButton>
        )}
      </section>

      {/* ---------------------------------------------- Detalle */}
      <details className="animate-fade-in-up rounded-2xl glass p-4">
        <summary className="cursor-pointer text-sm font-semibold text-brand-dark">
          Ver todas mis respuestas, una por una
        </summary>
        <div className="mt-4 flex flex-col gap-5">
          {BLOQUES.map((bloque) => (
            <section key={bloque.bloque} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Bloque {bloque.bloque} · {bloque.titulo}
              </h3>
              {bloque.items.map((it) => {
                const textoClave = it.abierta?.clave ?? it.clave;
                const observacion = (abiertas[textoClave] ?? "").trim();
                const principal =
                  it.tipo === "texto" ? observacion : describirValor(it, cerradas[it.item]);
                return (
                  <div key={it.item} className="rounded-xl border border-white/10 p-3">
                    <p className="text-[13px] font-medium">{it.etiqueta}</p>
                    <p className="mt-1 text-sm text-brand-dark">
                      {principal || <span className="text-muted/70">Sin responder.</span>}
                    </p>
                    {it.tipo !== "texto" && observacion && (
                      <p className="mt-1.5 border-l-2 border-white/15 pl-2.5 text-[13px] text-muted">
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
    </main>
  );
}

/* ------------------------------------------------------------------ piezas */

function Seccion({
  titulo,
  contexto,
  children,
}: {
  titulo: string;
  contexto: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-fade-in-up flex flex-col gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">{titulo}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-muted">{contexto}</p>
      </div>
      {children}
    </section>
  );
}

function Vacio({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm leading-relaxed text-muted/80">
      {children}
    </p>
  );
}

/** Marca lo que es lectura del sistema y no respuesta de la persona. */
function NotaIA() {
  return (
    <p className="mt-3 flex items-start gap-1.5 text-xs sm:text-[11px] leading-relaxed text-muted/70">
      <span aria-hidden>✦</span>
      Interpretación orientativa generada a partir de tus respuestas. No es un diagnóstico.
    </p>
  );
}

/** La visualización central: 7 agujas, cada una desplegable. */
function Agujas({ agujas }: { agujas: Aguja[] }) {
  const [abierta, setAbierta] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {agujas.map((a) => {
        const activa = abierta === a.clave;
        const color = a.nivel ? COLOR_NIVEL[a.nivel] : "#6b7280";
        const pct = a.valor ?? 0;
        return (
          <div key={a.clave} className="rounded-xl border border-white/10 bg-white/[0.04]">
            <button
              type="button"
              aria-expanded={activa}
              onClick={() => setAbierta(activa ? null : a.clave)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{a.nombre}</span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </span>
              </span>
              <span
                className="shrink-0 text-xs font-semibold uppercase tracking-wide"
                style={{ color }}
              >
                {a.nivel ? nombreNivel(a.nivel) : "Sin datos"}
              </span>
              <span aria-hidden className="shrink-0 text-muted">
                {activa ? "−" : "+"}
              </span>
            </button>
            {activa && (
              <div className="border-t border-white/10 px-4 py-3">
                <Rotulo>Qué significa</Rotulo>
                <p className="text-sm leading-relaxed text-foreground/90">{a.significado}</p>
                <Rotulo>Lo que muestran tus respuestas</Rotulo>
                <p className="text-sm leading-relaxed text-muted">{a.interpretacion}</p>
                <Rotulo>Un paso posible</Rotulo>
                <p className="text-sm leading-relaxed text-foreground/90">{a.recomendacion}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 mt-3 text-[11px] sm:text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/70 first:mt-0">
      {children}
    </p>
  );
}

/** Un índice, con dato / interpretación / acción explícitamente separados. */
function IndiceCard({ indice }: { indice: Indice }) {
  const color = indice.nivel ? COLOR_NIVEL[indice.nivel] : "#6b7280";
  const pct = indice.valor ?? 0;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm font-medium text-foreground">{indice.nombre}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-2xl font-bold tabular-nums" style={{ color }}>
          {indice.valorEscala ?? "—"}
        </span>
        {indice.valorEscala !== null && <span className="text-xs text-muted">de 5</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="presentation">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="text-xs sm:text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>
        {indice.nivel ? nombreNivel(indice.nivel) : "Sin datos suficientes"}
      </p>
      <p className="text-[13px] leading-relaxed text-muted">{indice.lectura}</p>
      <div className="mt-1 border-t border-white/8 pt-2">
        <p className="text-[11px] sm:text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/70">
          ¿Qué puedes hacer?
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-foreground/90">{indice.accion}</p>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
      <p className="text-xs sm:text-[11px] font-semibold uppercase tracking-wider text-muted">{etiqueta}</p>
      <p className="mt-0.5 text-sm text-foreground/90">{valor}</p>
    </div>
  );
}
