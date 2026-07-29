import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { facilitadorEmail } from "@/lib/auth-identity";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const codigoGrupo = typeof body?.codigoGrupo === "string" ? body.codigoGrupo.trim() : "";
  // Se recortan los espacios de los extremos. Es una credencial compartida que
  // se dicta en un taller y se copia y pega: un espacio invisible al final
  // producía "Código de grupo o contraseña incorrectos" sin ninguna pista de por
  // qué. El código ya se recortaba; la contraseña no, y ahí estaba la trampa.
  const password = typeof body?.password === "string" ? body.password.trim() : "";

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
