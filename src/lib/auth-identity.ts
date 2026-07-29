// Facilitadores authenticate without a real email address. We synthesize a
// stable, unique email under the hood so Supabase Auth still handles
// password hashing, sessions and JWTs (and RLS can key off auth.uid()) — the
// UI never shows these addresses to anyone.
//
// Participants work the same way. Originally they used Supabase Anonymous
// Sign-in, but that provider has to be switched on by hand in the Supabase
// dashboard, which made the app impossible to deploy without a manual step
// (and silently broke joining when it was off). Now the server mints a
// synthetic email + a random password with the admin client and signs the
// participant in immediately: same result, nothing to enable, and no
// credential ever reaches the browser.

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

/** Email interno de un participante. Lleva un sufijo aleatorio porque el apodo
 *  puede quedar vacío al normalizarse (p. ej. si son solo emojis) y para que
 *  reusar un apodo liberado no choque con un email ya existente. La unicidad
 *  real del apodo dentro del equipo la impone el índice de la base. */
export function participanteEmail(codigoEquipo: string, apodo: string, sufijo: string) {
  const equipo = slugify(codigoEquipo) || "equipo";
  const nombre = slugify(apodo) || "participante";
  return `${equipo}-${nombre}-${sufijo}@participantes.tallerdelossuenos.local`;
}
