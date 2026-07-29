import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { facilitadorEmail } from "@/lib/auth-identity";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const codigoGrupo = typeof body?.codigoGrupo === "string" ? body.codigoGrupo.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!codigoGrupo || !password) {
    return NextResponse.json({ error: "Completa el código de grupo y la contraseña." }, { status: 400 });
  }

  const email = facilitadorEmail(codigoGrupo);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json({ error: "Código de grupo o contraseña incorrectos." }, { status: 401 });
  }

  const { data: facilitador } = await supabase
    .from("facilitadores")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!facilitador) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Esta cuenta no tiene permisos de facilitador." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
