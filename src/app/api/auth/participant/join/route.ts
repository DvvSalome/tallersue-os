import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeCodigo } from "@/lib/team-code";
import { COMUNAS } from "@/lib/comunas";
import { participanteEmail } from "@/lib/auth-identity";
import { randomUUID } from "node:crypto";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const codigo = typeof body?.codigo === "string" ? normalizeCodigo(body.codigo) : "";
  const apodo = typeof body?.apodo === "string" ? body.apodo.trim() : "";
  const edad = Number(body?.edad);
  const comunaId = Number(body?.comunaId);

  if (!codigo) {
    return NextResponse.json({ error: "Ingresa el código de equipo." }, { status: 400 });
  }
  if (!apodo || apodo.length < 2) {
    return NextResponse.json({ error: "El apodo debe tener al menos 2 caracteres." }, { status: 400 });
  }
  if (!Number.isInteger(edad) || edad < 9 || edad > 35) {
    return NextResponse.json({ error: "La edad debe estar entre 9 y 35 años." }, { status: 400 });
  }
  // La comuna la elige el participante y sirve solo para mostrarle las líneas y
  // lugares de atención cercanos: no interviene en el taller, ni en lo que ve su
  // facilitador/a, ni en cómo se agrupa el análisis (eso va por equipo).
  if (!COMUNAS.some((c) => c.id === comunaId)) {
    return NextResponse.json({ error: "Selecciona tu comuna." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: equipo } = await admin
    .from("equipos")
    .select("id, activo")
    .eq("codigo", codigo)
    .maybeSingle();

  if (!equipo || !equipo.activo) {
    return NextResponse.json(
      { error: "Ese código de equipo no existe o ya no está activo. Verifícalo con tu facilitador/a." },
      { status: 404 },
    );
  }

  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("equipo_id", equipo.id)
    .ilike("apodo", apodo)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Ese apodo ya está en uso en este equipo. Elige otro." },
      { status: 409 },
    );
  }

  // El participante nunca ve credenciales: el servidor le crea un usuario con
  // email sintético y contraseña aleatoria, y lo deja con la sesión abierta.
  // Antes esto usaba signInAnonymously(), que exige habilitar el proveedor
  // anónimo a mano en el panel de Supabase; con el proveedor apagado, unirse
  // fallaba y no había forma de arreglarlo desde el código.
  const sufijo = randomUUID().slice(0, 8);
  const email = participanteEmail(codigo, apodo, sufijo);
  const password = `${randomUUID()}${randomUUID()}`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "participante", equipo: codigo, apodo },
  });

  if (createError || !created?.user) {
    return NextResponse.json(
      { error: "No se pudo crear tu sesión. Intenta de nuevo." },
      { status: 500 },
    );
  }

  const { error: insertError } = await admin.from("users").insert({
    id: created.user.id,
    apodo,
    edad,
    equipo_id: equipo.id,
    comuna_id: comunaId,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: "Ese apodo ya está en uso en este equipo. Elige otro." },
      { status: 409 },
    );
  }

  // Con el cliente ligado a cookies, esto deja la sesión abierta en el navegador.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    await admin.from("users").delete().eq("id", created.user.id);
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: "No se pudo iniciar tu sesión. Intenta de nuevo." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
