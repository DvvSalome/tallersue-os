"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

type Linea = {
  id: string;
  tipo: string;
  nombre: string;
  direccion: string | null;
  horario: string | null;
  telefono: string | null;
  color: string;
};

export function HomeClient({
  apodo,
  comunaNombre,
  cta,
  ctaHref,
  lineas,
}: {
  apodo: string;
  comunaNombre: string;
  cta: string;
  ctaHref: string;
  lineas: Linea[];
}) {
  return (
    <div className="relative flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-8">
        <header className="animate-fade-in-up flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Hola,</p>
            <h1
              className="font-display bg-clip-text text-2xl font-bold text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #ffb494 100%)",
              }}
            >
              {apodo}
            </h1>
          </div>
          <LogoutButton />
        </header>

        <div
          className="animate-fade-in-up"
          style={{ animationDelay: "80ms" }}
        >
          <Link
            href={ctaHref}
            className="shine group relative block overflow-hidden rounded-2xl px-6 py-5 text-center text-lg font-semibold text-white shadow-[0_14px_40px_-10px_rgba(167,139,250,0.6),0_0_50px_-10px_rgba(167,139,250,0.5)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-10px_rgba(167,139,250,0.8),0_0_70px_-10px_rgba(167,139,250,0.7)] active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)",
            }}
          >
            <span className="relative z-10 inline-flex items-center gap-2">
              {cta}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        </div>

        <section className="flex flex-col gap-3">
          <div className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
            <h2 className="font-display text-lg font-semibold text-brand-dark">
              Líneas de atención en {comunaNombre}
            </h2>
            <p className="-mt-1 text-sm text-muted">
              Si necesitas hablar con alguien o buscar apoyo, aquí tienes puntos de atención.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {lineas.map((l, i) => (
              <div
                key={l.id}
                className="animate-fade-in-up glass group relative overflow-hidden rounded-2xl p-4 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
                style={{
                  borderLeft: `4px solid ${l.color}`,
                  animationDelay: `${160 + i * 50}ms`,
                }}
              >
                <span
                  aria-hidden
                  className="animate-glow-breath pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-xl transition-opacity duration-300 group-hover:opacity-70"
                  style={{ background: l.color, animationDelay: `${i * 0.4}s` }}
                />
                <p
                  className="relative text-xs font-semibold uppercase tracking-wide"
                  style={{ color: l.color }}
                >
                  {l.tipo}
                </p>
                <p className="relative mt-1 font-semibold">{l.nombre}</p>
                {l.direccion && (
                  <p className="relative mt-1 text-sm text-muted">{l.direccion}</p>
                )}
                {l.horario && (
                  <p className="relative text-sm text-muted">{l.horario}</p>
                )}
                {l.telefono && (
                  <a
                    href={`tel:${l.telefono}`}
                    className="relative mt-1 block text-sm font-medium text-brand"
                  >
                    📞 {l.telefono}
                  </a>
                )}
              </div>
            ))}
            {lineas.length === 0 && (
              <p className="text-sm text-muted">
                Aún no hay líneas de atención cargadas para tu comuna.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
