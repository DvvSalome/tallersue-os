"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/demo/store";

// Demo-mode equivalent of the server-side getActor() redirect in page.tsx —
// runs client-side since the "session" lives in localStorage, not a cookie.
export function DemoRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (session?.kind === "participante") router.replace("/home");
    if (session?.kind === "facilitador") router.replace("/facilitador/dashboard");
  }, [router]);

  return null;
}
