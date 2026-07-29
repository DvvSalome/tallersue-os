"use client";

import { useState } from "react";

export function ExportCsvButton() {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/facilitador/export");
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "taller-de-los-suenos-anonimizado.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-all duration-150 enabled:hover:brightness-110 enabled:active:scale-[0.97] disabled:opacity-50"
    >
      {loading ? "Generando..." : "Exportar CSV anonimizado"}
    </button>
  );
}
