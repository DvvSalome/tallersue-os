import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export function FacilitadorNav({ codigoGrupo }: { codigoGrupo: string }) {
  return (
    <header className="glass sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-[var(--shadow-sm)]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-coral-dark">
          Facilitador/a
        </p>
        <h1
          className="font-display bg-clip-text text-lg font-bold text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #ffb494 100%)",
          }}
        >
          {codigoGrupo}
        </h1>
      </div>
      <nav className="flex items-center gap-1 text-sm font-medium">
        <NavLink href="/facilitador/dashboard">Participantes</NavLink>
        <NavLink href="/facilitador/dashboard/analisis">Análisis grupal</NavLink>
        <NavLink href="/facilitador/dashboard/equipos">Códigos de equipo</NavLink>
        <div className="ml-2">
          <LogoutButton />
        </div>
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative rounded-lg px-3 py-1.5 text-brand-dark/80 transition-colors hover:text-brand-dark"
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-x-2 bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-brand to-coral transition-transform duration-300 group-hover:scale-x-100" />
    </Link>
  );
}
