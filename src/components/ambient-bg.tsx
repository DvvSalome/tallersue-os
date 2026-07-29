"use client";

import { useEffect, useState } from "react";
import { STARS_1, STARS_2, STARS_3 } from "./stars-shadow";

export function AmbientBackground() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setTilt({
          x: (e.clientX / window.innerWidth - 0.5) * 2,
          y: (e.clientY / window.innerHeight - 0.5) * 2,
        });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-40 overflow-hidden">
      {/* Deep space gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at bottom, #321b35 0%, #1a0f24 45%, #090a0f 100%)",
        }}
      />

      {/* Nebula blobs */}
      <div
        className="animate-blob absolute h-[520px] w-[520px] rounded-full opacity-35 blur-3xl mix-blend-screen"
        style={{
          top: "-14%",
          left: "-14%",
          background:
            "radial-gradient(circle at 30% 30%, #a78bfa 0%, #7c3aed 45%, transparent 70%)",
          transform: `translate3d(${tilt.x * -20}px, ${tilt.y * -20}px, 0)`,
        }}
      />
      <div
        className="animate-blob-slow absolute h-[460px] w-[460px] rounded-full opacity-30 blur-3xl mix-blend-screen"
        style={{
          top: "45%",
          right: "-16%",
          background:
            "radial-gradient(circle at 60% 40%, #ff9066 0%, #f2734a 40%, transparent 70%)",
          transform: `translate3d(${tilt.x * 24}px, ${tilt.y * 24}px, 0)`,
        }}
      />
      <div
        className="animate-blob absolute h-[380px] w-[380px] rounded-full opacity-25 blur-3xl mix-blend-screen"
        style={{
          bottom: "-15%",
          left: "25%",
          background:
            "radial-gradient(circle at 50% 50%, #7dd3fc 0%, #38bdf8 40%, transparent 70%)",
          animationDelay: "-8s",
          transform: `translate3d(${tilt.x * 14}px, ${tilt.y * 14}px, 0)`,
        }}
      />

      {/* Star layers — 3 parallax speeds */}
      <div
        className="stars-layer stars-1"
        style={{ boxShadow: STARS_1 }}
      />
      <div
        className="stars-layer stars-2"
        style={{ boxShadow: STARS_2 }}
      />
      <div
        className="stars-layer stars-3"
        style={{ boxShadow: STARS_3 }}
      />

      {/* Shooting stars */}
      <span className="shooting-star" style={{ top: "12%", right: "-10%", animationDelay: "1s" }} />
      <span className="shooting-star" style={{ top: "40%", right: "-10%", animationDelay: "6s", animationDuration: "7s" }} />
      <span className="shooting-star" style={{ top: "70%", right: "-10%", animationDelay: "11s" }} />

      {/* Aurora at the bottom */}
      <div className="absolute inset-x-0 bottom-0 h-[45vh] overflow-hidden mix-blend-screen">
        <div
          className="absolute inset-x-[-20%] bottom-[-20%] h-full opacity-40 blur-3xl"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(167,139,250,0.6) 40%, rgba(56,189,248,0.4) 70%, rgba(255,144,102,0.35) 100%)",
            animation: "aurora-wave 14s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-x-[-20%] bottom-[-30%] h-full opacity-30 blur-3xl"
          style={{
            background:
              "linear-gradient(180deg, transparent 20%, rgba(255,144,102,0.5) 60%, rgba(167,139,250,0.55) 100%)",
            animation: "aurora-wave 20s ease-in-out infinite reverse",
            animationDelay: "-5s",
          }}
        />
      </div>

      {/* Occasional flying rocket / meteor */}
      <span
        className="absolute h-1 w-24 rounded-full"
        style={{
          top: "20vh",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 50%, rgba(167,139,250,0.9) 90%, transparent 100%)",
          filter: "drop-shadow(0 0 8px rgba(167,139,250,0.9))",
          animation: "rocket-fly 22s ease-in-out infinite",
          animationDelay: "6s",
        }}
      />

      {/* Subtle grid overlay */}
      <div className="grid-bg absolute inset-0 opacity-60" />
      <div className="noise-overlay absolute inset-0" />
    </div>
  );
}
