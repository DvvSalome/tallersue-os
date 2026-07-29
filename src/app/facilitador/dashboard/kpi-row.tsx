"use client";

import { CountUp } from "@/components/count-up";

export function KpiRow({
  items,
}: {
  items: { label: string; value: number; tone?: "brand" | "success" | "warning" | "muted" }[];
}) {
  const toneStyles: Record<
    string,
    { text: string; glow: string; accent: string }
  > = {
    brand: {
      text: "text-brand-dark",
      glow: "0 12px 32px -12px rgba(124,58,237,0.35)",
      accent: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
    },
    success: {
      text: "text-success",
      glow: "0 12px 32px -12px rgba(5,150,105,0.35)",
      accent: "linear-gradient(135deg, #10b981 0%, #6ee7b7 100%)",
    },
    warning: {
      text: "text-warning",
      glow: "0 12px 32px -12px rgba(180,83,9,0.35)",
      accent: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
    },
    muted: {
      text: "text-muted",
      glow: "0 12px 32px -12px rgba(110,101,121,0.25)",
      accent: "linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%)",
    },
  };

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item, i) => {
        const t = toneStyles[item.tone ?? "brand"];
        return (
          <div
            key={item.label}
            className="animate-fade-in-up glass group relative overflow-hidden rounded-2xl p-4 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1"
            style={{
              animationDelay: `${i * 60}ms`,
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = t.glow;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
            }}
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: t.accent }}
            />
            <span
              aria-hidden
              className="animate-glow-breath pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-xl transition-opacity duration-300 group-hover:opacity-70"
              style={{ background: t.accent, animationDelay: `${i * 0.35}s` }}
            />
            <p className="relative text-xs font-medium uppercase tracking-wide text-muted">
              {item.label}
            </p>
            <p
              className={`relative mt-1 font-display text-2xl font-bold tabular-nums ${t.text}`}
            >
              <CountUp value={item.value} />
            </p>
          </div>
        );
      })}
    </section>
  );
}
