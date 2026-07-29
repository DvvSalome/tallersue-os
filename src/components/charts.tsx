"use client";

// Gráficos del mapa colectivo.
//
// Dos reglas que estos componentes hacen cumplir, del brief de Ágora:
//
// 1. NUNCA DEPENDER DEL COLOR (§22, §26). Cada porción del anillo aparece
//    también en la leyenda con su etiqueta, su n y su porcentaje en texto, y el
//    gráfico entero lleva un `aria-label` que lo describe. Se puede leer en
//    escala de grises, con daltonismo o con lector de pantalla.
//
// 2. NUNCA UN NÚMERO SIN DENOMINADOR (§29, §30). Siempre se muestra "n de N".
//
// La paleta varía tono Y luminosidad a la vez, para que las porciones sigan
// distinguiéndose sin color.

export type Porcion = { etiqueta: string; n: number; pct: number };

const PALETA = [
  "#7c3aed", // violeta
  "#f2734a", // coral
  "#5ddba4", // verde
  "#f2c14e", // ámbar
  "#5b8def", // azul
  "#c084fc", // lila claro
  "#2d9e8f", // teal oscuro
  "#e8748f", // rosa
  "#a3a3a3", // gris
];

export function colorPorcion(i: number) {
  return PALETA[i % PALETA.length];
}

/** Anillo. Solo conviene con pocas categorías: con muchas, las porciones se
 *  vuelven hilos y se pierde la comparación (por eso el brief prefiere barras
 *  en esos casos). */
export function Dona({
  porciones,
  total,
  etiquetaCentro,
}: {
  porciones: Porcion[];
  total: number;
  etiquetaCentro?: string;
}) {
  const radio = 60;
  const grosor = 22;
  const circunferencia = 2 * Math.PI * radio;
  const suma = porciones.reduce((s, p) => s + p.n, 0) || 1;

  // Los offsets se derivan de la suma de las porciones anteriores en lugar de
  // acumular en una variable mutable: el lint de React lo señala con razón,
  // porque mutar durante el render es una fuente clásica de inconsistencias.
  const arcos = porciones.map((p, i) => {
    const anteriores = porciones.slice(0, i).reduce((acc, x) => acc + x.n, 0);
    const fraccion = p.n / suma;
    return {
      ...p,
      color: colorPorcion(i),
      largo: fraccion * circunferencia,
      offset: (anteriores / suma) * circunferencia,
    };
  });

  const descripcion = porciones
    .map((p) => `${p.etiqueta}: ${p.n} de ${total}, ${p.pct} por ciento`)
    .join(". ");

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
      <svg
        viewBox="0 0 160 160"
        className="h-[136px] w-[136px] shrink-0 -rotate-90"
        role="img"
        aria-label={descripcion}
      >
        <circle cx="80" cy="80" r={radio} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={grosor} />
        {arcos.map((a) => (
          <circle
            key={a.etiqueta}
            cx="80"
            cy="80"
            r={radio}
            fill="none"
            stroke={a.color}
            strokeWidth={grosor}
            strokeDasharray={`${a.largo} ${circunferencia - a.largo}`}
            strokeDashoffset={-a.offset}
            className="transition-[stroke-dasharray] duration-700"
          />
        ))}
        {etiquetaCentro && (
          <text
            x="80"
            y="80"
            textAnchor="middle"
            dominantBaseline="central"
            className="rotate-90 fill-current text-[15px] font-semibold"
            style={{ transformOrigin: "80px 80px" }}
          >
            {etiquetaCentro}
          </text>
        )}
      </svg>

      {/* La leyenda es la lectura real: lleva etiqueta, n y porcentaje. */}
      <ul className="flex w-full min-w-0 flex-col gap-1.5">
        {arcos.map((a) => (
          <li key={a.etiqueta} className="flex items-baseline gap-2 text-sm">
            <span
              aria-hidden
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: a.color }}
            />
            <span className="min-w-0 flex-1 text-foreground/90">{a.etiqueta}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {a.n} de {total} · {a.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Medidor semicircular para una escala 1–5. Muestra el promedio con su
 *  denominador; nunca un porcentaje suelto. */
export function Medidor({
  promedio,
  max,
  n,
  etiquetaMin,
  etiquetaMax,
}: {
  promedio: number | null;
  max: number;
  n: number;
  etiquetaMin?: string;
  etiquetaMax?: string;
}) {
  const radio = 68;
  const largoArco = Math.PI * radio;
  const fraccion = promedio === null ? 0 : Math.max(0, Math.min(1, (promedio - 1) / (max - 1)));

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 160 92"
        className="h-[92px] w-[160px]"
        role="img"
        aria-label={
          promedio === null
            ? "Sin datos suficientes"
            : `Promedio ${promedio} de ${max}, sobre ${n} respuestas`
        }
      >
        <path
          d={`M 12 80 A ${radio} ${radio} 0 0 1 148 80`}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d={`M 12 80 A ${radio} ${radio} 0 0 1 148 80`}
          fill="none"
          stroke="url(#gradMedidor)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${fraccion * largoArco} ${largoArco}`}
          className="transition-[stroke-dasharray] duration-700"
        />
        <defs>
          <linearGradient id="gradMedidor" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f2a35c" />
            <stop offset="55%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#5ddba4" />
          </linearGradient>
        </defs>
        <text
          x="80"
          y="72"
          textAnchor="middle"
          className="fill-current font-display text-[26px] font-bold"
        >
          {promedio ?? "—"}
        </text>
      </svg>
      <p className="-mt-1 text-xs text-muted">
        de {max} en promedio · n = {n}
      </p>
      {(etiquetaMin || etiquetaMax) && (
        <p className="mt-1 flex w-full max-w-[160px] justify-between text-[10px] leading-tight text-muted/70">
          <span>{etiquetaMin}</span>
          <span className="text-right">{etiquetaMax}</span>
        </p>
      )}
    </div>
  );
}
