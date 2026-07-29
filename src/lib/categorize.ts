// Clasificador ligero por palabras clave: convierte una respuesta ABIERTA en
// una categoría codificada, para que el análisis grupal muestre temas y nunca
// el texto crudo de una persona (doc, §4: "La IA sintetiza los mensajes
// abiertos en temas colectivos, no expone respuestas personales").
//
// Decisiones deliberadas:
//
// - Devuelve `null` cuando la clave no tiene reglas definidas. Ese texto se
//   guarda igual en `respuestas_abiertas` (queda disponible para el análisis
//   posterior con IA que pide el documento, §5) pero NO entra en los
//   agregados: es mejor no agregar que agregar mal. Las vistas de análisis
//   filtran por `categoria_codificada is not null`.
//
// - Es determinista y transparente a propósito, no un modelo. El documento
//   plantea la IA para análisis POSTERIORES sobre el repositorio de texto; el
//   dashboard en vivo no depende de ningún proveedor externo.
//
// - Solo se definen reglas para los campos que el "Mapa Colectivo" necesita
//   agregar. Agregar una clave nueva es agregar una entrada a esta tabla.

type Rule = { categoria: string; keywords: string[] };

const RULES_BY_CLAVE: Record<string, Rule[]> = {
  // P5 — "Describe tu sueño"  →  ¿Qué soñamos?
  sueno_descripcion: [
    { categoria: "Educación y formación", keywords: ["estudi", "universidad", "carrera", "beca", "colegio", "aprender", "profesional"] },
    { categoria: "Trabajo y empleo", keywords: ["empleo", "trabaj", "salario", "contrat"] },
    { categoria: "Emprendimiento y negocio propio", keywords: ["emprend", "negocio", "empresa", "marca", "vender", "local"] },
    { categoria: "Vivienda y estabilidad", keywords: ["casa", "vivienda", "apartament", "arriendo", "estabilidad"] },
    { categoria: "Familia y cuidado", keywords: ["familia", "mam", "pap", "herman", "hij", "cuidar", "ayudar a mi"] },
    { categoria: "Arte, cultura y deporte", keywords: ["arte", "music", "baile", "danza", "cantar", "dibuj", "deport", "futbol", "fútbol"] },
    { categoria: "Viajar y conocer", keywords: ["viaj", "conocer el mundo", "salir del pais", "salir del país", "extranjero"] },
    { categoria: "Servicio a la comunidad", keywords: ["comunidad", "barrio", "servir", "ayudar a los", "social"] },
  ],

  // P11 — "Describe el principal problema"  →  ¿Qué nos preocupa?
  problema_principal_descripcion: [
    { categoria: "Inseguridad y violencia", keywords: ["insegur", "violenc", "robo", "atrac", "balacer", "pandill", "matan", "sicari"] },
    { categoria: "Consumo de sustancias", keywords: ["droga", "consumo", "vicio", "microtrafic", "expendio"] },
    { categoria: "Desempleo y economía", keywords: ["desemple", "trabaj", "empleo", "pobreza", "plata", "economic", "económic"] },
    { categoria: "Falta de oportunidades educativas", keywords: ["educa", "estudi", "colegio", "cupos", "universidad"] },
    { categoria: "Falta de espacios y escenarios", keywords: ["cancha", "parque", "espacio", "escenario", "polideportivo", "sede"] },
    { categoria: "Ambiente y basuras", keywords: ["basura", "ambient", "contamina", "arbol", "árbol", "quebrada", "reciclaj"] },
    { categoria: "Abandono institucional", keywords: ["abandono", "alcald", "gobierno", "corrupc", "nadie hace", "no hacen nada"] },
    { categoria: "Discriminación y convivencia", keywords: ["discrimin", "racis", "exclu", "convivenc", "intoleranc"] },
  ],

  // P20 — Mensaje a quienes deciden  →  ¿Qué queremos decir?
  mensaje_decisores: [
    { categoria: "Piden ser escuchados", keywords: ["escuch", "nos oigan", "nos pregunt", "opinion", "opinión", "voz", "en cuenta"] },
    { categoria: "Piden oportunidades y empleo", keywords: ["oportunidad", "empleo", "trabaj", "beca", "apoyo economic", "apoyo económic"] },
    { categoria: "Piden educación", keywords: ["educa", "estudi", "universidad", "colegio", "formaci"] },
    { categoria: "Piden inversión en el territorio", keywords: ["invers", "invertir", "barrio", "comuna", "espacio", "cancha", "parque"] },
    { categoria: "Piden seguridad", keywords: ["segur", "violenc", "paz", "tranquil"] },
    { categoria: "Exigen cumplimiento y transparencia", keywords: ["cumpl", "prometen", "promesa", "corrupc", "roben", "transparen", "mentir"] },
    { categoria: "Piden salud mental y bienestar", keywords: ["salud mental", "psicolog", "bienestar", "ansiedad", "acompañamiento"] },
  ],

  // P17 — "Describe la acción"  →  ¿Con qué contamos? (compromisos)
  primer_paso_accion: [
    { categoria: "Formarse o estudiar", keywords: ["estudi", "curso", "capacit", "aprender", "inscrib", "universidad", "sena"] },
    { categoria: "Buscar trabajo o ingresos", keywords: ["empleo", "trabaj", "hoja de vida", "entrevista", "ahorr"] },
    { categoria: "Organizarse y planear", keywords: ["organiz", "horario", "planear", "plan", "rutina", "tiempo"] },
    { categoria: "Buscar apoyo o acompañamiento", keywords: ["apoyo", "ayuda", "hablar con", "mentor", "asesor", "acompañ"] },
    { categoria: "Iniciar un emprendimiento", keywords: ["emprend", "negocio", "vender", "producto", "empresa"] },
  ],

  // P13 — Experiencia participativa  →  ¿En qué creemos que podemos participar?
  espacios_participacion_experiencia: [
    { categoria: "Experiencia positiva y de aprendizaje", keywords: ["aprend", "bueno", "buena", "me gust", "chévere", "chevere", "creci", "sirvi"] },
    { categoria: "Experiencia de liderazgo", keywords: ["lider", "líder", "represent", "organic", "organiz", "coordin"] },
    { categoria: "Experiencia frustrante o sin resultados", keywords: ["nada cambi", "no sirvi", "perdi el tiempo", "pérdida", "frustr", "decepcion"] },
    { categoria: "Participación puntual o esporádica", keywords: ["una vez", "solo fui", "poco", "esporadic", "esporádic"] },
  ],
};

export function categorize(clave: string, texto: string): string | null {
  const rules = RULES_BY_CLAVE[clave];
  if (!rules) return null;

  const normalized = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (normalized.trim().length === 0) return null;

  for (const rule of rules) {
    if (rule.keywords.some((kw) => normalized.includes(normalizeKeyword(kw)))) {
      return rule.categoria;
    }
  }
  return "Otro / sin clasificar";
}

/** Las keywords se escriben con o sin tildes indistintamente; se normalizan
 *  igual que el texto para que ambas formas coincidan. */
function normalizeKeyword(kw: string) {
  return kw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Claves con reglas definidas (las que el análisis grupal puede agregar). */
export function clavesClasificables(): string[] {
  return Object.keys(RULES_BY_CLAVE);
}
