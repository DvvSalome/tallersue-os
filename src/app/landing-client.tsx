"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SolarSystem } from "@/components/solar-system";
import { Astronauta } from "@/components/astronauta";

export function LandingClient() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        setTilt({ x: nx, y: ny });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main
      ref={sceneRef}
      className="perspective-scene relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden px-6 py-12"
    >
      <Astronauta />
      {/* Floating 3D shapes */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden md:block"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className="animate-float-3d absolute"
          style={{
            top: "18%",
            left: "12%",
            transform: `translate3d(${tilt.x * -30}px, ${tilt.y * -30}px, 40px)`,
          }}
        >
          <div
            className="animate-spin-slow h-16 w-16 rounded-2xl shadow-[0_0_40px_-6px_rgba(167,139,250,0.7)]"
            style={{
              background:
                "linear-gradient(135deg, #a78bfa 0%, #7c3aed 60%, #5b21b6 100%)",
            }}
          />
        </div>
        {/* Planet with orbit ring + orbiting moon */}
        <div
          className="absolute"
          style={{
            top: "22%",
            right: "10%",
            transform: `translate3d(${tilt.x * 40}px, ${tilt.y * 40}px, 60px)`,
          }}
        >
          <div className="relative animate-float-3d" style={{ animationDelay: "-2s" }}>
            {/* Orbit ring */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25"
              style={{
                width: 140,
                height: 140,
                transform: "translate(-50%,-50%) rotateX(72deg)",
                boxShadow: "0 0 30px -8px rgba(167,139,250,0.5) inset",
              }}
            />
            {/* Second faint orbit */}
            <div
              className="absolute left-1/2 top-1/2 rounded-full border border-coral/25"
              style={{
                width: 170,
                height: 170,
                transform: "translate(-50%,-50%) rotateX(72deg) rotateZ(35deg)",
              }}
            />
            {/* Planet */}
            <div
              className="animate-glow-breath h-20 w-20 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, #ffb494 0%, #f2734a 55%, #7a2a12 100%)",
                boxShadow:
                  "inset -10px -10px 20px rgba(0,0,0,0.5), 0 0 40px -6px rgba(255,144,102,0.75)",
              }}
            />
            {/* Orbiting moon */}
            <div
              className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full bg-white shadow-[0_0_12px_2px_rgba(255,255,255,0.9)]"
              style={{
                marginLeft: -6,
                marginTop: -6,
                animation: "orbit 8s linear infinite",
                ["--orbit-r" as string]: "70px",
              }}
            />
            {/* Second orbiting particle */}
            <div
              className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-brand shadow-[0_0_10px_2px_rgba(167,139,250,0.9)]"
              style={{
                marginLeft: -4,
                marginTop: -4,
                animation: "orbit 12s linear infinite reverse",
                ["--orbit-r" as string]: "85px",
              }}
            />
          </div>
        </div>
        <div
          className="animate-drift absolute"
          style={{
            bottom: "10%",
            left: "6%",
            transform: `translate3d(${tilt.x * -25}px, ${tilt.y * -25}px, 30px)`,
          }}
        >
          <SolarSystem scale={0.55} />
        </div>
        <div
          className="animate-float-3d absolute"
          style={{
            bottom: "22%",
            right: "14%",
            animationDelay: "-4s",
            transform: `translate3d(${tilt.x * 35}px, ${tilt.y * 35}px, 50px)`,
          }}
        >
          <svg
            width="60"
            height="60"
            viewBox="0 0 60 60"
            className="animate-spin-slow drop-shadow-[0_0_20px_rgba(255,144,102,0.7)]"
            style={{ animationDuration: "18s" }}
          >
            <polygon
              points="30,4 56,52 4,52"
              fill="url(#tri)"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="1"
            />
            <defs>
              <linearGradient id="tri" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fca57e" />
                <stop offset="1" stopColor="#f2734a" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        {/* Sparkles */}
        {[
          { top: "30%", left: "45%", delay: "0s" },
          { top: "60%", left: "80%", delay: "1.5s" },
          { top: "75%", left: "35%", delay: "0.8s" },
          { top: "15%", left: "70%", delay: "2.2s" },
        ].map((s, i) => (
          <span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.9)]"
            style={{
              top: s.top,
              left: s.left,
              animation: `sparkle 3s ease-in-out ${s.delay} infinite`,
            }}
          />
        ))}
      </div>

      {/* Content card */}
      <div
        className="relative flex flex-col items-center gap-8"
        style={{
          transform: `perspective(1000px) rotateY(${tilt.x * 2}deg) rotateX(${tilt.y * -2}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 200ms var(--ease-out)",
        }}
      >
        <div className="animate-fade-in-up text-center" style={{ transform: "translateZ(30px)" }}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 shadow-[var(--shadow-sm)]">
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full bg-coral"
                style={{ animation: "pulse-ring 2s var(--ease-out) infinite" }}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-coral" />
            </span>
            <p className="text-xs sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-coral-dark">
              Medellín · 16 comunas
            </p>
          </div>

          <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-[0_0_30px_rgba(167,139,250,0.55)] sm:text-6xl">
            {(() => {
              const lines = ["El Taller", "de los Sueños"];
              let idx = 0;
              return lines.map((line, li) => (
                <span key={`ln-${li}`} className="block">
                  {line.split("").map((c) => {
                    const i = idx++;
                    const t = i / 22;
                    const hueColor = `hsl(${260 - t * 40}, 90%, ${80 + t * 8}%)`;
                    return (
                      <span
                        key={`c-${i}`}
                        className="letter-rise-char"
                        style={{
                          animationDelay: `${i * 55}ms`,
                          color: hueColor,
                          textShadow:
                            "0 0 24px rgba(167,139,250,0.55), 0 2px 0 rgba(0,0,0,0.35)",
                        }}
                      >
                        {c === " " ? "\u00a0" : c}
                      </span>
                    );
                  })}
                </span>
              ));
            })()}
          </h1>

          <p className="mx-auto mt-4 max-w-md text-balance text-[15px] leading-relaxed text-muted sm:text-base">
            Una encuesta participativa para que los jóvenes cuenten lo que
            sienten, necesitan y sueñan para su barrio.
          </p>
        </div>

        <div
          className="flex w-full max-w-xs flex-col gap-3"
          style={{ transform: "translateZ(50px)" }}
        >
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: "80ms" }}
          >
            <Link
              href="/participar"
              className="shine animate-pulse-glow group relative block overflow-hidden rounded-2xl px-6 py-4 text-center font-semibold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 active:scale-[0.97]"
              style={{
                background:
                  "linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)",
              }}
            >
              <span className="relative z-10 inline-flex items-center gap-2">
                Ya soy participante
                <svg
                  width="16"
                  height="16"
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

          <p
            className="animate-fade-in-up text-center text-xs text-muted"
            style={{ animationDelay: "140ms" }}
          >
            Necesitas el código de equipo que te dio tu facilitador/a.
          </p>

          <div
            className="animate-fade-in-up mt-2"
            style={{ animationDelay: "200ms" }}
          >
            <Link
              href="/facilitador/login"
              className="group relative block rounded-2xl glass px-6 py-3 text-center text-sm font-medium text-brand-dark shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[var(--shadow-md)]"
            >
              <span className="inline-flex items-center gap-2">
                Soy facilitador/a
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-60 transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
