"use client";

import { useState } from "react";

export function DownloadCsvButton({
  href,
  generate,
  filename,
  children,
  className = "",
}: {
  href?: string;
  generate?: () => string;
  filename: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  function download(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onClick() {
    setLoading(true);
    try {
      if (generate) {
        download(new Blob([generate()], { type: "text/csv;charset=utf-8" }));
        return;
      }
      if (!href) return;
      const res = await fetch(href);
      if (!res.ok) return;
      download(await res.blob());
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={onClick} disabled={loading} className={className}>
      {loading ? "Generando..." : children}
    </button>
  );
}
