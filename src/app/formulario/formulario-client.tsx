"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BLOQUES,
  INSTRUMENTO_VERSION,
  TOTAL_ITEMS_OBLIGATORIOS,
  camposAbiertos,
  type Item,
} from "@/lib/items";
import {
  estaRespondido,
  getLikert,
  getOpcion,
  getOpciones,
  type RespuestasAbiertas,
  type RespuestasCerradas,
  type StoredValor,
} from "@/lib/respuestas";
import { ErrorBanner } from "@/components/ui";
import { DEMO_MODE } from "@/lib/demo/config";
import { upsertResponse, upsertRespuestaAbierta, deleteRespuestaAbierta } from "@/lib/demo/store";
import { categorize } from "@/lib/categorize";

type Props = {
  userId: string;
  initialCerradas: RespuestasCerradas;
  initialAbiertas: RespuestasAbiertas;
};

/** Primer bloque con alguna pregunta obligatoria sin responder. */
function primerBloquePendiente(cerradas: RespuestasCerradas, abiertas: RespuestasAbiertas) {
  for (let i = 0; i < BLOQUES.length; i++) {
    const pendiente = BLOQUES[i].items.some((it) => !itemListo(it, cerradas, abiertas));
    if (pendiente) return i;
  }
  return BLOQUES.length - 1;
}

/** Una pregunta está lista si su respuesta OBLIGATORIA está contestada. El
 *  campo de observaciones nunca bloquea el avance (doc §2: es opcional). */
function itemListo(item: Item, cerradas: RespuestasCerradas, abiertas: RespuestasAbiertas) {
  if (item.tipo === "texto") {
    return (abiertas[item.clave] ?? "").trim().length > 0;
  }
  return estaRespondido(item, cerradas[item.item]);
}

export function FormularioClient({ userId, initialCerradas, initialAbiertas }: Props) {
  const router = useRouter();
  const [cerradas, setCerradas] = useState<RespuestasCerradas>(initialCerradas);
  const [abiertas, setAbiertas] = useState<RespuestasAbiertas>(initialAbiertas);
  const [bloqueIndex, setBloqueIndex] = useState(() =>
    primerBloquePendiente(initialCerradas, initialAbiertas),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const bloque = BLOQUES[bloqueIndex];

  const respondidas =
    BLOQUES.flatMap((b) => b.items).filter((it) => itemListo(it, cerradas, abiertas)).length;
  const progresoPct = (respondidas / TOTAL_ITEMS_OBLIGATORIOS) * 100;

  function setCerrada(item: number, valor: StoredValor) {
    setCerradas((prev) => ({ ...prev, [item]: valor }));
  }
  function setAbierta(clave: string, texto: string) {
    setAbiertas((prev) => ({ ...prev, [clave]: texto }));
  }

  const bloqueCompleto = bloque.items.every((it) => itemListo(it, cerradas, abiertas));

  function irABloque(next: number) {
    setBloqueIndex(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarBloque() {
    setError(null);
    if (!bloqueCompleto) {
      setError("Responde todas las preguntas de este bloque antes de continuar.");
      return;
    }
    setSaving(true);
    try {
      // Cerradas del bloque (las abiertas puras como P20 no van aquí).
      const respuestas = bloque.items
        .filter((it) => it.tipo !== "texto")
        .map((it) => ({ item: it.item, valor: cerradas[it.item] }))
        .filter((r): r is { item: number; valor: StoredValor } => r.valor !== undefined);

      // Texto del bloque: observaciones + preguntas abiertas puras.
      const clavesDelBloque = camposAbiertos().filter((c) => c.item.bloque === bloque.bloque);
      const textos = clavesDelBloque.map((c) => ({
        clave: c.clave,
        texto: (abiertas[c.clave] ?? "").trim(),
        campo: c,
      }));

      if (DEMO_MODE) {
        for (const { item, valor } of respuestas) {
          const it = bloque.items.find((b) => b.item === item)!;
          upsertResponse({
            userId,
            version: INSTRUMENTO_VERSION,
            bloque: it.bloque,
            item: it.item,
            tipo: it.tipo,
            valor,
            categoriaCodificada: null,
            updatedAt: new Date().toISOString(),
          });
        }
        for (const { clave, texto, campo } of textos) {
          if (texto.length === 0) {
            deleteRespuestaAbierta(userId, INSTRUMENTO_VERSION, clave);
            continue;
          }
          upsertRespuestaAbierta({
            userId,
            version: INSTRUMENTO_VERSION,
            bloque: campo.item.bloque,
            item: campo.item.item,
            clave,
            texto,
            categoriaCodificada: categorize(clave, texto),
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        const res = await fetch("/api/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            respuestas,
            abiertas: textos.map(({ clave, texto }) => ({ clave, texto })),
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(data?.error ?? "Hubo un problema guardando tus respuestas. Intenta de nuevo.");
          return;
        }
      }

      if (bloqueIndex === BLOQUES.length - 1) {
        router.push("/resultados");
        router.refresh();
      } else {
        irABloque(bloqueIndex + 1);
      }
    } catch {
      setError("No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 pb-32 pt-8">
      <header className="glass sticky top-0 z-10 flex flex-col gap-2 rounded-2xl px-4 py-3 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between text-sm text-muted">
          <span className="flex items-center gap-1.5">
            {BLOQUES.map((b, i) => (
              <span
                key={b.bloque}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i < bloqueIndex ? "w-4 bg-brand" : i === bloqueIndex ? "w-7" : "w-4 bg-border"
                }`}
                style={
                  i === bloqueIndex
                    ? { background: "linear-gradient(90deg, #7c3aed, #f2734a)" }
                    : undefined
                }
              />
            ))}
            <span className="ml-1.5 font-medium text-brand-dark">
              Bloque {bloque.bloque} de {BLOQUES.length}
            </span>
          </span>
          <span className="tabular-nums font-semibold text-brand-dark">
            {respondidas}/{TOTAL_ITEMS_OBLIGATORIOS}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-brand-light/60">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out shadow-[0_0_10px_rgba(124,58,237,0.5)]"
            style={{
              width: `${progresoPct}%`,
              background: "linear-gradient(90deg, #7c3aed 0%, #a78bfa 60%, #f2734a 100%)",
            }}
          />
        </div>
      </header>

      <div key={bloqueIndex} className="flex flex-col gap-4">
        <div className="animate-fade-in-up">
          <h1
            className="font-display bg-clip-text text-2xl font-bold text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #ffb494 100%)",
              backgroundSize: "200% 200%",
              animation: "gradient-shift 6s ease-in-out infinite",
            }}
          >
            {bloque.titulo}
          </h1>
          <p className="text-sm text-muted">{bloque.objetivo}</p>
        </div>
        <div className="flex flex-col gap-4">
          {bloque.items.map((it, i) => (
            <div
              key={it.item}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <ItemField
                item={it}
                valor={cerradas[it.item]}
                textoAbierto={
                  it.abierta ? (abiertas[it.abierta.clave] ?? "") : (abiertas[it.clave] ?? "")
                }
                onChangeValor={setCerrada}
                onChangeTexto={setAbierta}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[rgba(15,10,25,0.7)] px-5 py-4 backdrop-blur-xl [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          <ErrorBanner message={error} />
          <div className="flex gap-3">
            {bloqueIndex > 0 && (
              <button
                onClick={() => irABloque(bloqueIndex - 1)}
                className="glass flex-1 rounded-2xl px-6 py-4 font-semibold text-brand-dark transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] active:scale-[0.97]"
              >
                ← Atrás
              </button>
            )}
            <button
              onClick={guardarBloque}
              disabled={saving}
              className="shine group relative flex-[2] overflow-hidden rounded-2xl px-6 py-4 font-semibold text-white shadow-[0_12px_32px_-10px_rgba(124,58,237,0.6)] transition-all duration-300 enabled:hover:-translate-y-0.5 enabled:active:scale-[0.97] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)" }}
            >
              <span className="relative z-10 inline-flex items-center justify-center gap-2">
                {saving
                  ? "Guardando..."
                  : bloqueIndex === BLOQUES.length - 1
                    ? "Ver mi brújula ✨"
                    : "Siguiente"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function OptionRow({
  selected,
  children,
  onSelect,
  shape = "check",
}: {
  selected: boolean;
  children: React.ReactNode;
  onSelect: () => void;
  shape?: "check" | "radio";
}) {
  return (
    <button
      type="button"
      role={shape === "radio" ? "radio" : "checkbox"}
      aria-checked={selected}
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-all duration-200 active:scale-[0.99] ${
        selected
          ? "border-brand bg-brand-light text-brand-dark shadow-[0_4px_12px_-4px_rgba(124,58,237,0.35)]"
          : "border-white/15 bg-white/5 backdrop-blur-sm hover:border-brand/50 hover:bg-white/10"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors duration-150 ${
          shape === "radio" ? "rounded-full" : "rounded-md"
        } ${selected ? "border-brand bg-brand" : "border-border bg-transparent"}`}
      >
        <svg
          viewBox="0 0 16 16"
          className={`h-3 w-3 text-white transition-all duration-150 ${
            selected ? "scale-100 opacity-100" : "scale-0 opacity-0"
          }`}
        >
          <path
            d="M3 8.5L6.2 11.5L13 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {children}
    </button>
  );
}

function ItemField({
  item,
  valor,
  textoAbierto,
  onChangeValor,
  onChangeTexto,
}: {
  item: Item;
  valor: StoredValor | undefined;
  textoAbierto: string;
  onChangeValor: (item: number, valor: StoredValor) => void;
  onChangeTexto: (clave: string, texto: string) => void;
}) {
  const opcionesMarcadas = getOpciones(valor);
  const opcionUnica = getOpcion(valor);
  const eligioOtro =
    item.opciones?.some(
      (o) => o.otro && (opcionUnica === o.value || opcionesMarcadas.includes(o.value)),
    ) ?? false;

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-4 shadow-[var(--shadow-sm)] transition-all duration-300 hover:shadow-[var(--shadow-md)]">
      <div>
        <p className="font-medium text-foreground">
          <span className="mr-1.5 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            {item.codigo}
          </span>
          {item.etiqueta}
        </p>
        {item.ayuda && <p className="mt-0.5 text-xs text-muted">{item.ayuda}</p>}
      </div>

      {item.tipo === "likert" && item.escala && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-1.5">
            {Array.from({ length: item.escala.max - item.escala.min + 1 }, (_, i) => {
              const n = item.escala!.min + i;
              const selected = getLikert(valor) === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChangeValor(item.item, { valor: String(n) })}
                  aria-label={`${n} de ${item.escala!.max}`}
                  className={`flex flex-1 items-center justify-center rounded-xl border py-3 text-center transition-all duration-200 active:scale-95 ${
                    selected
                      ? "border-brand bg-brand-light text-brand-dark shadow-[0_4px_16px_-4px_rgba(124,58,237,0.4)] scale-105"
                      : "border-white/15 bg-white/5 backdrop-blur-sm hover:border-brand/50 hover:bg-white/10"
                  }`}
                >
                  <span className="font-display text-lg font-semibold">{n}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-[11px] text-muted">
            <span>{item.escala.etiquetaMin}</span>
            <span>{item.escala.etiquetaMax}</span>
          </div>
        </div>
      )}

      {item.tipo === "unica" && item.opciones && (
        <div className="flex flex-col gap-2" role="radiogroup">
          {item.opciones.map((op) => (
            <OptionRow
              key={op.value}
              selected={opcionUnica === op.value}
              shape="radio"
              onSelect={() => onChangeValor(item.item, { opcion: op.value })}
            >
              {op.label}
            </OptionRow>
          ))}
        </div>
      )}

      {item.tipo === "multiple" && item.opciones && (
        <div className="flex flex-col gap-2">
          {item.opciones.map((op) => {
            const selected = opcionesMarcadas.includes(op.value);
            const esExcluyente = op.ninguno || op.sinDato;
            return (
              <OptionRow
                key={op.value}
                selected={selected}
                onSelect={() => {
                  // "Ninguno" y "Prefiero no responder" son mutuamente
                  // excluyentes con el resto: marcarlas limpia las demás.
                  if (esExcluyente) {
                    onChangeValor(item.item, { opciones: selected ? [] : [op.value] });
                    return;
                  }
                  const sinExcluyentes = opcionesMarcadas.filter((v) => {
                    const o = item.opciones!.find((x) => x.value === v);
                    return !o?.ninguno && !o?.sinDato;
                  });
                  const next = selected
                    ? sinExcluyentes.filter((v) => v !== op.value)
                    : [...sinExcluyentes, op.value];
                  onChangeValor(item.item, { opciones: next });
                }}
              >
                {op.label}
              </OptionRow>
            );
          })}
        </div>
      )}

      {/* Pregunta abierta pura (P20): el texto ES la respuesta obligatoria. */}
      {item.tipo === "texto" && (
        <TextArea
          value={textoAbierto}
          maxLength={item.maxLength ?? 1000}
          rows={4}
          onChange={(v) => onChangeTexto(item.clave, v)}
        />
      )}

      {/* Campo opcional de observaciones de una pregunta cerrada (doc §2). */}
      {item.abierta && (
        <div className="flex flex-col gap-1.5 border-t border-white/10 pt-3">
          <label className="text-xs text-muted">
            {item.abierta.etiqueta}{" "}
            <span className="opacity-70">
              {eligioOtro ? "(cuéntanos cuál)" : "(opcional)"}
            </span>
          </label>
          <TextArea
            value={textoAbierto}
            maxLength={item.abierta.maxLength}
            rows={2}
            onChange={(v) => onChangeTexto(item.abierta!.clave, v)}
          />
        </div>
      )}
    </div>
  );
}

function TextArea({
  value,
  maxLength,
  rows,
  onChange,
}: {
  value: string;
  maxLength: number;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <textarea
        value={value}
        maxLength={maxLength}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-base text-foreground outline-none backdrop-blur-md transition-all duration-200 focus:border-brand focus:bg-white/10 focus:shadow-[0_0_0_3px_var(--brand-light)]"
      />
      <p className="self-end text-xs tabular-nums text-muted">
        {value.length}/{maxLength}
      </p>
    </div>
  );
}
