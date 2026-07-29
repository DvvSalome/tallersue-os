// Creates a facilitador account: a Supabase Auth user (synthetic email under
// the hood, same trick as participants) + a row in public.facilitadores.
//
// Usage:
//   node scripts/create-facilitador.mjs <codigo_grupo> <password> [comuna_id] [nombre]
//
// comuna_id: 1-16 to scope this facilitador to one comuna, or omit/"all" for
// access to every comuna (e.g. a coordinador general).
//
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY (created automatically by `vercel env pull`).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    let value = trimmed.slice(idx + 1);
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

function slugify(input) {
  const combiningMarks = /[̀-ͯ]/g;
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(combiningMarks, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const [codigoGrupo, password, comunaIdArg, ...nombreParts] = process.argv.slice(2);

if (!codigoGrupo || !password) {
  console.error("Usage: node scripts/create-facilitador.mjs <codigo_grupo> <password> [comuna_id|all] [nombre]");
  process.exit(1);
}
if (password.length < 6) {
  console.error("La contraseña debe tener al menos 6 caracteres.");
  process.exit(1);
}

const comunaId =
  !comunaIdArg || comunaIdArg === "all" ? null : Number(comunaIdArg);
if (comunaId !== null && (!Number.isInteger(comunaId) || comunaId < 1 || comunaId > 16)) {
  console.error("comuna_id debe ser un número entre 1 y 16, o 'all'.");
  process.exit(1);
}

const nombre = nombreParts.join(" ") || null;
const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = `${slugify(codigoGrupo)}@facilitadores.tallerdelossuenos.local`;

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { role: "facilitador", codigo_grupo: codigoGrupo },
});

if (createError || !created?.user) {
  console.error("No se pudo crear el usuario de auth:", createError?.message);
  process.exit(1);
}

const { error: insertError } = await admin.from("facilitadores").insert({
  id: created.user.id,
  codigo_grupo: codigoGrupo,
  comuna_id: comunaId,
  nombre,
});

if (insertError) {
  console.error("No se pudo crear el registro en facilitadores:", insertError.message);
  await admin.auth.admin.deleteUser(created.user.id);
  process.exit(1);
}

console.log(`Facilitador creado: código de grupo "${codigoGrupo}", comuna ${comunaId ?? "todas"}.`);
