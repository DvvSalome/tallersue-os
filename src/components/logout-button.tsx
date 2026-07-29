"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_MODE } from "@/lib/demo/config";
import { clearSession } from "@/lib/demo/store";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    if (DEMO_MODE) {
      clearSession();
      router.push("/");
      router.refresh();
      return;
    }
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex min-h-11 items-center px-2 text-sm font-medium text-muted underline underline-offset-4 transition-colors hover:text-brand-dark sm:min-h-0 sm:px-0 ${className}`}
    >
      {loading ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
