// Facilitadores authenticate without a real email address. We synthesize a
// stable, unique email under the hood so Supabase Auth still handles
// password hashing, sessions and JWTs (and RLS can key off auth.uid()) — the
// UI never shows these addresses to anyone. Participants don't use this at
// all — they join via team code + Supabase Anonymous Sign-in (no password),
// see src/app/api/auth/participant/join/route.ts.

const COMBINING_MARKS = /[̀-ͯ]/g;

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function facilitadorEmail(codigoGrupo: string) {
  return `${slugify(codigoGrupo)}@facilitadores.tallerdelossuenos.local`;
}
