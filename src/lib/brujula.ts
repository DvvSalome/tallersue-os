// "Mi Brújula de los Sueños" — cálculo del dashboard personal.
//
// Implementa las secciones 3 y 5 del Documento Técnico de Implementación:
//   - 5 índices (autoeficacia, claridad del proyecto, esperanza,
//     participación ciudadana, redes de apoyo),
//   - fortalezas / oportunidades / debilidades / amenazas,
//   - perfil predominante de liderazgo,
//   - máximo 3 recomendaciones priorizadas
//     (matriz Variable detectada → necesidad → recurso → acción).
//
// REGLAS DE NEGOCIO QUE ESTE MÓDULO HACE CUMPLIR (doc, §5):
//
// 1. Todo se calcula con REGLAS PARAMETRIZADAS y deterministas: los pesos y
//    los puntajes por opción están declarados como datos al inicio de cada
//    bloque, no escondidos en condicionales. Cambiar la métrica es editar una
//    tabla, no reescribir lógica.
//
// 2. NADA se presenta como un hecho sobre la persona. El vocabulario está
//    acotado a "Identificas…", "Tus respuestas muestran…", "Podría ser
//    útil…", "Un siguiente paso posible…". No se etiqueta ("eres un líder"),
//    no se predice ("vas a fracasar") y no se patologiza ("tienes ansiedad").
//    Los niveles de un índice se nombran como área de trabajo, nunca como
//    déficit de la persona.
//
// 3. Un índice sin datos suficientes devuelve `null`, no 0. Una pregunta sin
//    responder o un "Prefiero no responder" NUNCA se cuenta como puntaje bajo.
//
// 4. Este módulo es puro: no lee la red ni la BD. Recibe las respuestas ya
//    cargadas, así el mismo cálculo sirve en el servidor, en el cliente y en
//    modo demo.

import {
  ITEMS_ABIERTOS_PUROS,
  ITEMS_CERRADOS,
  TOTAL_ITEMS_OBLIGATORIOS,
  itemByClave,
  optionLabel,
  type Dimension,
  type Item,
} from "./items";
import {
  getLikert,
  getOpcion,
  getOpciones,
  type RespuestasAbiertas,
  type RespuestasCerradas,
} from "./respuestas";

// ---------------------------------------------------------------------------
// Utilidades de puntaje
// ---------------------------------------------------------------------------

/** Escala 1..5 → 0..100. */
function escalaA100(n: number | null): number | null {
  if (n === null) return null;
  return ((n - 1) / 4) * 100;
}

/** Puntaje por tramos según cuántas opciones se marcaron. */
function porConteo(n: number, tramos: [minimo: number, puntaje: number][]): number {
  let resultado = tramos[0]?.[1] ?? 0;
  for (const [minimo, puntaje] of tramos) {
    if (n >= minimo) resultado = puntaje;
  }
  return resultado;
}

function promedioPonderado(
  componentes: { peso: number; valor: number | null }[],
): number | null {
  const validos = componentes.filter((c) => c.valor !== null);
  if (validos.length === 0) return null;
  const pesoTotal = validos.reduce((s, c) => s + c.peso, 0);
  if (pesoTotal === 0) return null;
  const suma = validos.reduce((s, c) => s + c.peso * (c.valor as number), 0);
  return Math.round(suma / pesoTotal);
}

function clave(cerradas: RespuestasCerradas, claveItem: string) {
  const item = itemByClave(claveItem);
  return item ? cerradas[item.item] : undefined;
}

function itemRequerido(claveItem: string): Item {
  const item = itemByClave(claveItem);
  if (!item) throw new Error(`Ítem desconocido en el catálogo: ${claveItem}`);
  return item;
}

/** Opciones marcadas, excluyendo "Ninguno/Ninguna" y "Prefiero no responder". */
function opcionesReales(item: Item, valores: string[]): string[] {
  return valores.filter((v) => {
    const op = item.opciones?.find((o) => o.value === v);
    return !op?.ninguno && !op?.sinDato;
  });
}

function marcoNinguno(item: Item, valores: string[]): boolean {
  return valores.some((v) => item.opciones?.find((o) => o.value === v)?.ninguno);
}

function etiquetas(item: Item, valores: string[]): string[] {
  return valores.map((v) => optionLabel(item, v));
}

function listar(valores: string[]): string {
  if (valores.length === 0) return "";
  if (valores.length === 1) return valores[0];
  return `${valores.slice(0, -1).join(", ")} y ${valores[valores.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Tablas de puntaje (parametrizadas — doc §5)
// ---------------------------------------------------------------------------

/** P1: estilo de afrontamiento. `null` = no interpretable, se excluye. */
const PUNTAJE_AFRONTAMIENTO: Record<string, number | null> = {
  busco_solucion: 100,
  organizo_alternativas: 100,
  busco_informacion: 90,
  pido_ayuda: 85,
  espero_entender: 65,
  depende: 65,
  me_cuesta: 25,
  evito: 20,
  otro: null,
  prefiero_no_responder: null,
};

/** P3: emoción predominante frente al futuro. */
const PUNTAJE_EMOCION: Record<string, number> = {
  esperanza: 100,
  alegria: 100,
  motivacion: 95,
  incertidumbre: 45,
  miedo: 20,
  tristeza: 20,
  ansiedad: 25,
};

/** P7: quién puede ayudar. Distingue red cercana de red institucional. */
const PUNTAJE_APOYO: Record<string, number> = {
  no_lo_se: 15,
  yo_mismo: 45,
  amigos: 70,
  pareja: 75,
  organizaciones_religiosas: 75,
  familia: 80,
  estado: 80,
  empresas: 80,
  colegio: 85,
  universidad: 85,
  organizaciones_sociales: 85,
};

/** Estilos de afrontamiento considerados activos al redactar fortalezas. */
const AFRONTAMIENTO_ACTIVO = new Set([
  "busco_solucion",
  "organizo_alternativas",
  "busco_informacion",
  "pido_ayuda",
]);

// ---------------------------------------------------------------------------
// Índices
// ---------------------------------------------------------------------------

export type IndiceClave =
  | "autoeficacia"
  | "claridad_proyecto"
  | "esperanza"
  | "participacion_ciudadana"
  | "redes_apoyo";

export type NivelIndice = "fortalecer" | "desarrollo" | "presente";

export type Indice = {
  clave: IndiceClave;
  nombre: string;
  /** Qué mide, en una línea. */
  descripcion: string;
  dimension: Dimension;
  /** 0..100, o null si no hay datos suficientes. */
  valor: number | null;
  /** El mismo valor en la escala 1–5 que vio el participante. */
  valorEscala: number | null;
  nivel: NivelIndice | null;
  /** DATO → INTERPRETACIÓN: lectura en primera persona, sin diagnóstico. */
  lectura: string;
  /** INTERPRETACIÓN → RECOMENDACIÓN: un paso posible, concreto. */
  accion: string;
};

const NOMBRES_NIVEL: Record<NivelIndice, string> = {
  fortalecer: "Área que podrías fortalecer",
  desarrollo: "En desarrollo",
  presente: "Recurso presente",
};

export function nombreNivel(nivel: NivelIndice): string {
  return NOMBRES_NIVEL[nivel];
}

function nivelDe(valor: number | null): NivelIndice | null {
  if (valor === null) return null;
  if (valor < 40) return "fortalecer";
  if (valor < 70) return "desarrollo";
  return "presente";
}

/** Redacción por índice y nivel. Nunca afirma un rasgo de la persona. */
const LECTURAS: Record<IndiceClave, Record<NivelIndice, string>> = {
  autoeficacia: {
    fortalecer:
      "Tus respuestas muestran que la confianza en tus propias capacidades podría ser un área que quieras fortalecer.",
    desarrollo:
      "Tus respuestas muestran que ya te reconoces capaz de avanzar en algunas cosas concretas.",
    presente:
      "Tus respuestas muestran que hoy te reconoces capaz de dar pasos concretos hacia tus metas.",
  },
  claridad_proyecto: {
    fortalecer:
      "Tu proyecto todavía se está definiendo: darle un foco podría ayudarte a decidir por dónde empezar.",
    desarrollo: "Ya tienes una dirección: precisarla un poco más puede facilitarte el siguiente paso.",
    presente: "Identificas con claridad hacia dónde quieres ir y cuál sería tu primer paso.",
  },
  esperanza: {
    fortalecer:
      "Al pensar en el futuro aparecen emociones difíciles. Poder hablarlo con alguien de confianza puede ser útil.",
    desarrollo: "Frente al futuro convive la expectativa con la incertidumbre.",
    presente: "Frente al futuro predominan emociones que te movilizan.",
  },
  participacion_ciudadana: {
    fortalecer:
      "Todavía no registras experiencias de participación: un primer espacio acompañado puede ser una buena entrada.",
    desarrollo: "Ya tuviste algún acercamiento a espacios de participación.",
    presente: "Registras experiencia participando y te interesa seguir incidiendo.",
  },
  redes_apoyo: {
    fortalecer:
      "Identificas pocas personas o instituciones a las que acudir. Ampliar esa red podría abrirte opciones.",
    desarrollo: "Cuentas con algunos apoyos identificados a tu alrededor.",
    presente: "Identificas varias personas e instituciones que pueden acompañarte.",
  },
};

const META_INDICES: Record<IndiceClave, { nombre: string; descripcion: string; dimension: Dimension }> = {
  autoeficacia: {
    nombre: "Autoeficacia percibida",
    descripcion: "Qué tan capaz te sientes de hacer cosas concretas hacia tus metas.",
    dimension: "agencia_personal",
  },
  claridad_proyecto: {
    nombre: "Claridad del proyecto",
    descripcion: "Qué tan definido está tu sueño y su primer paso.",
    dimension: "proyecto_vida",
  },
  esperanza: {
    nombre: "Esperanza / posibilidad percibida",
    descripcion: "Cómo te sientes frente al futuro y qué tan posible lo ves.",
    dimension: "bienestar_prospectivo",
  },
  participacion_ciudadana: {
    nombre: "Autoeficacia cívica",
    descripcion: "Tu experiencia participando y tu interés en incidir.",
    dimension: "ciudadania_activa",
  },
  redes_apoyo: {
    nombre: "Redes de apoyo",
    descripcion: "Personas e instituciones con las que cuentas.",
    dimension: "capital_social",
  },
};

/** "¿Qué puedes hacer?" por índice y nivel. Concreta, realista, no paternalista. */
const ACCIONES: Record<IndiceClave, Record<NivelIndice, string>> = {
  autoeficacia: {
    fortalecer: "Empieza con una acción pequeña que puedas terminar esta semana: notar que la completaste cambia la lectura.",
    desarrollo: "Elige una meta de las tuyas y divídela en dos pasos que puedas verificar.",
    presente: "Aprovecha ese impulso para comprometerte con algo un poco más grande que lo que ya hiciste.",
  },
  claridad_proyecto: {
    fortalecer: "Escribe tu sueño en una frase, sin pensar si es posible todavía. Tener el foco es el primer paso.",
    desarrollo: "Precisa qué versión concreta de ese sueño quieres primero: estudiar qué, trabajar en qué.",
    presente: "Con el foco claro, define la fecha del primer paso.",
  },
  esperanza: {
    fortalecer: "Hablarlo con alguien de confianza puede aligerarlo. Si aparece angustia sostenida, en tu inicio están las líneas de atención.",
    desarrollo: "Anota una cosa que sí dependa de ti esta semana: la incertidumbre baja cuando algo se vuelve concreto.",
    presente: "Usa ese ánimo para invitar a alguien más a algo que quieras hacer.",
  },
  participacion_ciudadana: {
    fortalecer: "Asistir una vez, acompañado, a un espacio juvenil de tu barrio alcanza para empezar.",
    desarrollo: "Vuelve a un espacio donde ya estuviste, esta vez con una idea propia.",
    presente: "Podrías proponer o liderar algo en la iniciativa que más te interesa.",
  },
  redes_apoyo: {
    fortalecer: "Identifica una sola persona o institución con la que puedas hablar de esto en las próximas semanas.",
    desarrollo: "Cuéntale tu siguiente paso a una de las personas que ya identificaste.",
    presente: "Tienes con quién contar: pedir ayuda concreta ahora es más fácil de lo que parece.",
  },
};

function calcularIndices(
  cerradas: RespuestasCerradas,
  abiertas: RespuestasAbiertas,
): Record<IndiceClave, Indice> {
  const p5 = itemRequerido("sueno_principal");
  const p8 = itemRequerido("instituciones_conocidas");
  const p10 = itemRequerido("barreras_familiares");
  const p13 = itemRequerido("espacios_participacion");
  const p19 = itemRequerido("intereses_iniciativas");

  // --- Autoeficacia: P2 (escala) + P1 (estilo) + P17 (primer paso definido)
  const opcionP1 = getOpcion(clave(cerradas, "afrontamiento"));
  const primerPaso = getOpcion(clave(cerradas, "primer_paso"));
  const autoeficacia = promedioPonderado([
    { peso: 0.6, valor: escalaA100(getLikert(clave(cerradas, "autoeficacia"))) },
    { peso: 0.25, valor: opcionP1 ? (PUNTAJE_AFRONTAMIENTO[opcionP1] ?? null) : null },
    { peso: 0.15, valor: primerPaso ? 100 : null },
  ]);

  // --- Claridad del proyecto: foco del sueño + descripción + primer paso
  const suenos = opcionesReales(p5, getOpciones(clave(cerradas, "sueno_principal")));
  const descripcionSueno = (abiertas["sueno_descripcion"] ?? "").trim();
  const claridad = promedioPonderado([
    {
      peso: 0.5,
      valor:
        suenos.length === 0
          ? null
          : porConteo(suenos.length, [
              [1, 100],
              [2, 85],
              [3, 65],
            ]),
    },
    { peso: 0.2, valor: descripcionSueno.length === 0 ? null : descripcionSueno.length >= 20 ? 100 : 55 },
    { peso: 0.3, valor: primerPaso ? 100 : null },
  ]);

  // --- Esperanza: P3 (emoción) + P6 (posibilidad percibida)
  const emocion = getOpcion(clave(cerradas, "emocion_futuro"));
  const esperanza = promedioPonderado([
    { peso: 0.5, valor: emocion ? (PUNTAJE_EMOCION[emocion] ?? null) : null },
    { peso: 0.5, valor: escalaA100(getLikert(clave(cerradas, "posibilidad_sueno"))) },
  ]);

  // --- Participación ciudadana: P13 (experiencia) + P19 (interés)
  const espaciosCrudos = getOpciones(clave(cerradas, "espacios_participacion"));
  const espacios = opcionesReales(p13, espaciosCrudos);
  const intereses = opcionesReales(p19, getOpciones(clave(cerradas, "intereses_iniciativas")));
  const participacion = promedioPonderado([
    {
      peso: 0.6,
      valor:
        espaciosCrudos.length === 0
          ? null
          : porConteo(espacios.length, [
              [0, 0],
              [1, 45],
              [2, 70],
              [3, 100],
            ]),
    },
    {
      peso: 0.4,
      valor:
        intereses.length === 0
          ? null
          : porConteo(intereses.length, [
              [1, 60],
              [3, 100],
            ]),
    },
  ]);

  // --- Redes de apoyo: P7 (quién) + P8 (instituciones) + P10 (falta de apoyo)
  const apoyo = getOpcion(clave(cerradas, "quien_ayuda"));
  const institucionesCrudas = getOpciones(clave(cerradas, "instituciones_conocidas"));
  const instituciones = opcionesReales(p8, institucionesCrudas);
  const barrerasFam = getOpciones(clave(cerradas, "barreras_familiares"));
  const redes = promedioPonderado([
    { peso: 0.4, valor: apoyo ? (PUNTAJE_APOYO[apoyo] ?? null) : null },
    {
      peso: 0.4,
      valor:
        institucionesCrudas.length === 0
          ? null
          : porConteo(instituciones.length, [
              [0, 0],
              [1, 40],
              [2, 70],
              [4, 100],
            ]),
    },
    {
      peso: 0.2,
      valor:
        barrerasFam.length === 0
          ? null
          : barrerasFam.includes("falta_apoyo")
            ? 30
            : marcoNinguno(p10, barrerasFam)
              ? 100
              : 65,
    },
  ]);

  const valores: Record<IndiceClave, number | null> = {
    autoeficacia,
    claridad_proyecto: claridad,
    esperanza,
    participacion_ciudadana: participacion,
    redes_apoyo: redes,
  };

  const salida = {} as Record<IndiceClave, Indice>;
  for (const c of Object.keys(valores) as IndiceClave[]) {
    const valor = valores[c];
    const nivel = nivelDe(valor);
    salida[c] = {
      clave: c,
      ...META_INDICES[c],
      valor,
      // Se muestra en la misma escala 1–5 que respondió la persona: un 0–100
      // sin denominador se lee como una calificación, y no lo es.
      valorEscala: valor === null ? null : Math.round(((valor / 100) * 4 + 1) * 10) / 10,
      nivel,
      lectura: nivel
        ? LECTURAS[c][nivel]
        : "Aún no hay respuestas suficientes para mostrar esta lectura.",
      accion: nivel
        ? ACCIONES[c][nivel]
        : "Cuando termines el formulario podremos sugerirte un paso concreto.",
    };
  }
  return salida;
}

// ---------------------------------------------------------------------------
// Fortalezas / oportunidades / debilidades / amenazas
// ---------------------------------------------------------------------------

export type Foda = {
  fortalezas: string[];
  oportunidades: string[];
  debilidades: string[];
  amenazas: string[];
};

function calcularFoda(cerradas: RespuestasCerradas): Foda {
  const p4 = itemRequerido("mayor_fortaleza");
  const p1 = itemRequerido("afrontamiento");
  const p7 = itemRequerido("quien_ayuda");
  const p8 = itemRequerido("instituciones_conocidas");
  const p9 = itemRequerido("habito_barrera");
  const p10 = itemRequerido("barreras_familiares");
  const p11 = itemRequerido("problemas_comunidad");
  const p13 = itemRequerido("espacios_participacion");
  const p19 = itemRequerido("intereses_iniciativas");

  const fortalezas: string[] = [];
  const oportunidades: string[] = [];
  const debilidades: string[] = [];
  const amenazas: string[] = [];

  const fortalezaP4 = getOpcion(clave(cerradas, "mayor_fortaleza"));
  if (fortalezaP4 && fortalezaP4 !== "otro") {
    fortalezas.push(`Reconoces la ${optionLabel(p4, fortalezaP4).toLowerCase()} como tu mayor fortaleza hoy.`);
  }

  const afront = getOpcion(clave(cerradas, "afrontamiento"));
  if (afront && AFRONTAMIENTO_ACTIVO.has(afront)) {
    fortalezas.push(
      `Ante una dificultad, tu primera reacción es "${optionLabel(p1, afront).toLowerCase()}".`,
    );
  }

  const espacios = opcionesReales(p13, getOpciones(clave(cerradas, "espacios_participacion")));
  if (espacios.length > 0) {
    fortalezas.push(
      `Ya tienes experiencia participando en ${listar(etiquetas(p13, espacios)).toLowerCase()}.`,
    );
  }

  const habitos = getOpciones(clave(cerradas, "habito_barrera"));
  if (habitos.length > 0 && marcoNinguno(p9, habitos)) {
    fortalezas.push("No identificas hábitos que hoy te dificulten avanzar hacia tus metas.");
  }

  const instituciones = opcionesReales(p8, getOpciones(clave(cerradas, "instituciones_conocidas")));
  if (instituciones.length > 0) {
    oportunidades.push(
      `Identificas instituciones que podrían acompañarte: ${listar(etiquetas(p8, instituciones))}.`,
    );
  }

  const apoyo = getOpcion(clave(cerradas, "quien_ayuda"));
  if (apoyo && apoyo !== "no_lo_se") {
    oportunidades.push(`Señalas a ${optionLabel(p7, apoyo).toLowerCase()} como tu principal apoyo para este sueño.`);
  }

  const intereses = opcionesReales(p19, getOpciones(clave(cerradas, "intereses_iniciativas")));
  if (intereses.length > 0) {
    oportunidades.push(`Te interesa participar en ${listar(etiquetas(p19, intereses)).toLowerCase()}.`);
  }

  const habitosReales = opcionesReales(p9, habitos);
  if (habitosReales.length > 0) {
    debilidades.push(
      `Identificas ${listar(etiquetas(p9, habitosReales)).toLowerCase()} como algo que hoy te dificulta avanzar.`,
    );
  }

  const barrerasFam = opcionesReales(p10, getOpciones(clave(cerradas, "barreras_familiares")));
  if (barrerasFam.length > 0) {
    amenazas.push(
      `Identificas condiciones familiares o de cuidado que actualmente pueden dificultar tu proyecto: ${listar(
        etiquetas(p10, barrerasFam),
      ).toLowerCase()}.`,
    );
  }

  const problemas = opcionesReales(p11, getOpciones(clave(cerradas, "problemas_comunidad")));
  if (problemas.length > 0) {
    amenazas.push(`En tu comunidad identificas ${listar(etiquetas(p11, problemas)).toLowerCase()}.`);
  }

  return { fortalezas, oportunidades, debilidades, amenazas };
}

// ---------------------------------------------------------------------------
// Perfil de liderazgo — se presenta como orientación, nunca como etiqueta
// ---------------------------------------------------------------------------

export type PerfilLiderazgo = {
  clave: string;
  nombre: string;
  /** Redacción no-etiquetadora para mostrar al participante. */
  lectura: string;
};

const PERFILES: {
  clave: string;
  nombre: string;
  fortalezas: string[];
  intereses: string[];
}[] = [
  {
    clave: "social_comunitario",
    nombre: "Orientación social y comunitaria",
    fortalezas: ["liderazgo", "empatia", "comunicacion"],
    intereses: ["procesos_comunitarios", "participacion_politica", "derechos_humanos", "liderazgo"],
  },
  {
    clave: "creativo_cultural",
    nombre: "Orientación creativa y cultural",
    fortalezas: ["creatividad"],
    intereses: ["cultura", "deporte"],
  },
  {
    clave: "emprendedor_innovador",
    nombre: "Orientación emprendedora e innovadora",
    fortalezas: ["resolucion_problemas", "perseverancia"],
    intereses: ["emprendimiento", "tecnologia", "innovacion_social"],
  },
  {
    clave: "organizativo",
    nombre: "Orientación organizativa y de gestión",
    fortalezas: ["disciplina", "responsabilidad", "prudencia"],
    intereses: ["medio_ambiente"],
  },
];

export function calcularPerfilLiderazgo(cerradas: RespuestasCerradas): PerfilLiderazgo {
  const p19 = itemRequerido("intereses_iniciativas");
  const fortaleza = getOpcion(clave(cerradas, "mayor_fortaleza"));
  const intereses = opcionesReales(p19, getOpciones(clave(cerradas, "intereses_iniciativas")));

  let mejor: { perfil: (typeof PERFILES)[number]; puntos: number } | null = null;
  for (const perfil of PERFILES) {
    let puntos = 0;
    if (fortaleza && perfil.fortalezas.includes(fortaleza)) puntos += 2;
    puntos += intereses.filter((i) => perfil.intereses.includes(i)).length;
    if (puntos > 0 && (!mejor || puntos > mejor.puntos)) mejor = { perfil, puntos };
  }

  if (!mejor) {
    return {
      clave: "en_exploracion",
      nombre: "Orientación en exploración",
      lectura:
        "Tus respuestas todavía no apuntan a una orientación predominante, y eso también es información útil: hay espacio para probar.",
    };
  }

  return {
    clave: mejor.perfil.clave,
    nombre: mejor.perfil.nombre,
    lectura: `Por lo que eliges y lo que te interesa, tus respuestas se acercan hoy a una ${mejor.perfil.nombre.toLowerCase()}. Es una lectura de este momento, no una definición de quién eres.`,
  };
}

// ---------------------------------------------------------------------------
// Recomendaciones — matriz hallazgo → necesidad → recurso → acción (doc, §5)
// ---------------------------------------------------------------------------

export type Recomendacion = {
  /** Título en imperativo suave, para escanear de un vistazo. */
  titulo: string;
  /** "¿Por qué aparece?" — se apoya en lo que la persona respondió. */
  porque: string;
  /** Acción concreta y verificable. */
  accion: string;
  /** Horizonte temporal realista. */
  horizonte: string;
  /** Recurso sugerido. */
  recurso: string;
  hallazgo: string;
  necesidad: string;
};

type ReglaRecomendacion = Recomendacion & {
  /** Menor número = mayor prioridad. */
  prioridad: number;
  aplica: (ctx: ContextoRecomendacion) => boolean;
};

type ContextoRecomendacion = {
  indices: Record<IndiceClave, Indice>;
  cerradas: RespuestasCerradas;
};

const REGLAS: ReglaRecomendacion[] = [
  {
    prioridad: 1,
    titulo: "Empieza con una meta de 7 días",
    porque:
      "En tus respuestas la confianza en tu propia capacidad aparece como un área por fortalecer, y completar algo pequeño es lo que más rápido la mueve.",
    accion: "Elige una sola cosa que puedas terminar en una semana y anótala.",
    horizonte: "Esta semana",
    recurso: "Microacciones: una tarea que dependa solo de ti.",
    hallazgo: "Autoeficacia baja",
    necesidad: "Experiencias de logro",
    aplica: ({ indices }) =>
      indices.autoeficacia.valor !== null && indices.autoeficacia.valor < 40,
  },
  {
    prioridad: 2,
    titulo: "Busca tres rutas hacia tu sueño",
    porque:
      "Tienes claro qué quieres, pero lo ves poco posible. A veces el camino parece cerrado porque solo se ve uno.",
    accion: "Averigua tres formas distintas de llegar y compara requisitos.",
    horizonte: "Próximas dos semanas",
    recurso: "Orientación: alguien que ya lo haya hecho, o la oferta institucional.",
    hallazgo: "Sueño claro con baja posibilidad percibida",
    necesidad: "Información",
    aplica: ({ indices, cerradas }) => {
      const posibilidad = getLikert(clave(cerradas, "posibilidad_sueno"));
      const claro = indices.claridad_proyecto.valor !== null && indices.claridad_proyecto.valor >= 60;
      return claro && posibilidad !== null && posibilidad <= 2;
    },
  },
  {
    prioridad: 3,
    titulo: "Busca un aliado",
    porque: "Identificas pocas personas o instituciones a las que acudir hoy.",
    accion: "Elige una sola persona o entidad y cuéntale qué quieres hacer.",
    horizonte: "Próximas dos semanas",
    recurso: "Mentoría o acompañamiento: alguien que ya recorrió algo parecido.",
    hallazgo: "Poca red de apoyo",
    necesidad: "Conexión",
    aplica: ({ indices }) => indices.redes_apoyo.valor !== null && indices.redes_apoyo.valor < 40,
  },
  {
    prioridad: 4,
    titulo: "Revisa tres programas abiertos",
    porque: "Señalas los recursos económicos como una condición que hoy pesa en tu proyecto.",
    accion: "Busca tres convocatorias —becas, formación, apoyo al emprendimiento— y anota sus requisitos.",
    horizonte: "Este mes",
    recurso: "Oferta institucional: alcaldía, SENA, universidades, cajas de compensación.",
    hallazgo: "Barrera económica",
    necesidad: "Oportunidades",
    aplica: ({ cerradas }) =>
      getOpciones(clave(cerradas, "barreras_familiares")).includes("dificultades_economicas") ||
      getOpciones(clave(cerradas, "necesidades_logro")).includes("recursos_economicos"),
  },
  {
    prioridad: 5,
    titulo: "Asiste una vez, sin compromiso",
    porque: "Todavía no registras experiencias de participación, y la primera suele ser la más difícil.",
    accion: "Ve una sola vez, acompañado, a un espacio juvenil de tu barrio.",
    horizonte: "Este mes",
    recurso: "Espacio ciudadano: casa de la juventud, cabildo, colectivo cultural.",
    hallazgo: "Baja participación",
    necesidad: "Experiencia",
    aplica: ({ indices }) =>
      indices.participacion_ciudadana.valor !== null &&
      indices.participacion_ciudadana.valor < 40,
  },
  {
    prioridad: 6,
    titulo: "Vincúlate a una iniciativa",
    porque: "Ya tienes experiencia participando y te interesa incidir: hay espacio para un paso más.",
    accion: "Elige una iniciativa de las que te interesan y ofrece algo concreto que sepas hacer.",
    horizonte: "Próximos dos meses",
    recurso: "Participación: colectivos, mesas juveniles, organizaciones del territorio.",
    hallazgo: "Alta autoeficacia cívica",
    necesidad: "Incidencia",
    aplica: ({ indices }) =>
      indices.participacion_ciudadana.valor !== null &&
      indices.participacion_ciudadana.valor >= 70,
  },
];

/** Fallback cuando ninguna regla aplica: los tres pasos del propio documento. */
const RECOMENDACIONES_BASE: Recomendacion[] = [
  {
    titulo: "Define una meta de 30 días",
    porque: "Tu sueño está claro; convertirlo en algo con fecha lo vuelve más fácil de empezar.",
    accion: "Escribe una meta concreta para los próximos 30 días.",
    horizonte: "Este mes",
    recurso: "Planeación breve: una hoja, una fecha.",
    hallazgo: "Sin señales de alerta",
    necesidad: "Concreción",
  },
  {
    titulo: "Busca un aliado",
    porque: "Avanzar acompañado suele sostener mejor los compromisos que avanzar solo.",
    accion: "Identifica una persona o institución que pueda acompañarte en ese paso.",
    horizonte: "Próximas dos semanas",
    recurso: "Tu red cercana o la oferta institucional que ya reconoces.",
    hallazgo: "Sin señales de alerta",
    necesidad: "Acompañamiento",
  },
  {
    titulo: "Haz una primera acción esta semana",
    porque: "Una acción pequeña convierte la intención en experiencia.",
    accion: "Realiza algo verificable, por chico que sea, antes del domingo.",
    horizonte: "Esta semana",
    recurso: "Microacción.",
    hallazgo: "Sin señales de alerta",
    necesidad: "Acción",
  },
];

export const MAX_RECOMENDACIONES = 3;

function calcularRecomendaciones(ctx: ContextoRecomendacion): Recomendacion[] {
  const activas = REGLAS.filter((r) => r.aplica(ctx))
    .sort((a, b) => a.prioridad - b.prioridad)
    .slice(0, MAX_RECOMENDACIONES)
    .map((r) => ({
      titulo: r.titulo,
      porque: r.porque,
      accion: r.accion,
      horizonte: r.horizonte,
      recurso: r.recurso,
      hallazgo: r.hallazgo,
      necesidad: r.necesidad,
    }));

  if (activas.length > 0) return activas;
  return RECOMENDACIONES_BASE.slice(0, MAX_RECOMENDACIONES);
}


// ---------------------------------------------------------------------------
// La Brújula: 7 dimensiones desde las cuales orientar la siguiente etapa
// ---------------------------------------------------------------------------
// No es un ranking ni una nota. Cada aguja dice desde dónde puede empujar esta
// persona hoy. Una dimensión "baja" no es un defecto: es dónde hay margen.

export type ClaveAguja =
  | "me_conozco"
  | "tengo_sueno"
  | "puedo_avanzar"
  | "tengo_redes"
  | "veo_oportunidades"
  | "participo"
  | "puedo_actuar";

export type Aguja = {
  clave: ClaveAguja;
  nombre: string;
  /** Qué significa esta dimensión, en lenguaje de la persona. */
  significado: string;
  valor: number | null;
  nivel: NivelIndice | null;
  /** Lectura de lo que respondió, sin diagnóstico. */
  interpretacion: string;
  /** Un paso posible desde aquí. */
  recomendacion: string;
};

const META_AGUJAS: Record<ClaveAguja, { nombre: string; significado: string }> = {
  me_conozco: {
    nombre: "Me conozco",
    significado: "Reconozco mis fortalezas y cómo reacciono cuando algo se pone difícil.",
  },
  tengo_sueno: {
    nombre: "Tengo un sueño",
    significado: "Tengo algo concreto hacia dónde ir, no solo una idea vaga.",
  },
  puedo_avanzar: {
    nombre: "Creo que puedo avanzar",
    significado: "Siento que lo que quiero está a mi alcance y que puedo mover algo.",
  },
  tengo_redes: {
    nombre: "Tengo redes",
    significado: "Hay personas e instituciones a las que puedo acudir.",
  },
  veo_oportunidades: {
    nombre: "Reconozco oportunidades",
    significado: "Sé qué existe a mi alrededor que podría servirme.",
  },
  participo: {
    nombre: "Participo",
    significado: "He estado en espacios colectivos y me interesa incidir.",
  },
  puedo_actuar: {
    nombre: "Puedo actuar",
    significado: "Tengo un primer paso definido y sé qué necesito para darlo.",
  },
};

function calcularAgujas(
  cerradas: RespuestasCerradas,
  indices: Record<IndiceClave, Indice>,
): Aguja[] {
  const p8 = itemRequerido("instituciones_conocidas");
  const p18 = itemRequerido("necesidades_logro");
  const p19 = itemRequerido("intereses_iniciativas");

  const fortaleza = getOpcion(clave(cerradas, "mayor_fortaleza"));
  const afront = getOpcion(clave(cerradas, "afrontamiento"));
  const primerPaso = getOpcion(clave(cerradas, "primer_paso"));
  const instituciones = opcionesReales(p8, getOpciones(clave(cerradas, "instituciones_conocidas")));
  const necesidades = opcionesReales(p18, getOpciones(clave(cerradas, "necesidades_logro")));
  const intereses = opcionesReales(p19, getOpciones(clave(cerradas, "intereses_iniciativas")));

  const valores: Record<ClaveAguja, number | null> = {
    me_conozco: promedioPonderado([
      { peso: 0.6, valor: fortaleza && fortaleza !== "otro" ? 100 : fortaleza ? 60 : null },
      { peso: 0.4, valor: afront ? (PUNTAJE_AFRONTAMIENTO[afront] ?? null) : null },
    ]),
    tengo_sueno: indices.claridad_proyecto.valor,
    puedo_avanzar: promedioPonderado([
      { peso: 0.5, valor: indices.esperanza.valor },
      { peso: 0.5, valor: indices.autoeficacia.valor },
    ]),
    tengo_redes: indices.redes_apoyo.valor,
    veo_oportunidades: promedioPonderado([
      {
        peso: 0.7,
        valor: porConteo(instituciones.length, [
          [0, 0],
          [1, 45],
          [2, 70],
          [4, 100],
        ]),
      },
      { peso: 0.3, valor: intereses.length > 0 ? 100 : 0 },
    ]),
    participo: indices.participacion_ciudadana.valor,
    puedo_actuar: promedioPonderado([
      { peso: 0.6, valor: primerPaso ? 100 : null },
      { peso: 0.4, valor: necesidades.length > 0 ? 100 : null },
    ]),
  };

  const LECTURA_AGUJA: Record<ClaveAguja, Record<NivelIndice, string>> = {
    me_conozco: {
      fortalecer: "Todavía te estás reconociendo, y eso también es un punto de partida válido.",
      desarrollo: "Ya identificas algunas cosas tuyas en las que puedes apoyarte.",
      presente: "Tienes claro con qué cuentas y cómo respondes cuando algo se complica.",
    },
    tengo_sueno: {
      fortalecer: "Tu sueño todavía se está formando.",
      desarrollo: "Tienes una dirección; falta afinarla un poco.",
      presente: "Sabes hacia dónde quieres ir.",
    },
    puedo_avanzar: {
      fortalecer: "Hoy el camino se ve cuesta arriba. Eso puede cambiar con información y compañía.",
      desarrollo: "Ves posible avanzar, aunque con dudas.",
      presente: "Sientes que lo que quieres está a tu alcance.",
    },
    tengo_redes: {
      fortalecer: "Identificas pocos apoyos por ahora.",
      desarrollo: "Cuentas con algunos apoyos.",
      presente: "Tienes a quién acudir.",
    },
    veo_oportunidades: {
      fortalecer: "Aún no reconoces mucho de lo que existe a tu alrededor: se puede explorar.",
      desarrollo: "Reconoces algunas oportunidades cerca.",
      presente: "Ubicas bien lo que hay disponible a tu alrededor.",
    },
    participo: {
      fortalecer: "Todavía no has estado en espacios colectivos.",
      desarrollo: "Ya te has acercado a algún espacio.",
      presente: "Tienes recorrido participando y ganas de seguir.",
    },
    puedo_actuar: {
      fortalecer: "Falta definir por dónde empezar.",
      desarrollo: "Tienes una idea del primer paso.",
      presente: "Sabes cuál es tu primer paso y qué necesitas.",
    },
  };

  const RECOMENDACION_AGUJA: Record<ClaveAguja, string> = {
    me_conozco: "Pídele a alguien que te conozca que te diga una fortaleza que ve en ti.",
    tengo_sueno: "Escribe tu sueño en una frase, aunque todavía no sepas cómo llegar.",
    puedo_avanzar: "Busca a alguien que ya haya recorrido algo parecido y pregúntale cómo lo hizo.",
    tengo_redes: "Anota una persona y una institución a las que podrías acudir esta semana.",
    veo_oportunidades: "Revisa qué ofrece hoy la casa de la juventud o la biblioteca de tu barrio.",
    participo: "Asiste una vez a un espacio juvenil, sin compromiso de quedarte.",
    puedo_actuar: "Define el primer paso con día y hora.",
  };

  return (Object.keys(META_AGUJAS) as ClaveAguja[]).map((c) => {
    const valor = valores[c];
    const nivel = nivelDe(valor);
    return {
      clave: c,
      ...META_AGUJAS[c],
      valor,
      nivel,
      interpretacion: nivel
        ? LECTURA_AGUJA[c][nivel]
        : "Aún no hay respuestas suficientes en esta dimensión.",
      recomendacion: RECOMENDACION_AGUJA[c],
      };
  });
}

// ---------------------------------------------------------------------------
// Barreras clasificadas y mapa de recursos
// ---------------------------------------------------------------------------

export type TipoBarrera = "personal" | "familiar" | "territorial" | "institucional";

export type Barrera = { tipo: TipoBarrera; etiquetas: string[]; lectura: string };

export const NOMBRE_TIPO_BARRERA: Record<TipoBarrera, string> = {
  personal: "Personales",
  familiar: "Familiares o de cuidado",
  territorial: "Territoriales",
  institucional: "Institucionales",
};

function calcularBarreras(cerradas: RespuestasCerradas): Barrera[] {
  const p9 = itemRequerido("habito_barrera");
  const p10 = itemRequerido("barreras_familiares");
  const p11 = itemRequerido("problemas_comunidad");
  const salida: Barrera[] = [];

  const habitos = opcionesReales(p9, getOpciones(clave(cerradas, "habito_barrera")));
  if (habitos.length > 0) {
    salida.push({
      tipo: "personal",
      etiquetas: etiquetas(p9, habitos),
      lectura: "Identificas estos hábitos como algo que hoy te dificulta avanzar. Son condiciones del momento, no rasgos tuyos.",
    });
  }

  const familiares = opcionesReales(p10, getOpciones(clave(cerradas, "barreras_familiares")));
  if (familiares.length > 0) {
    salida.push({
      tipo: "familiar",
      etiquetas: etiquetas(p10, familiares),
      lectura: "Identificas condiciones familiares o de cuidado que actualmente pueden dificultar tu proyecto.",
    });
  }

  const territoriales = opcionesReales(p11, getOpciones(clave(cerradas, "problemas_comunidad")));
  if (territoriales.length > 0) {
    salida.push({
      tipo: "territorial",
      etiquetas: etiquetas(p11, territoriales),
      lectura: "Esto es lo que ves en tu comunidad. No depende de ti, y nombrarlo es parte de poder incidir.",
    });
  }

  const confianza = getLikert(clave(cerradas, "confianza_institucional"));
  if (confianza !== null && confianza <= 2) {
    salida.push({
      tipo: "institucional",
      etiquetas: ["Baja confianza en que las instituciones respondan"],
      lectura: "Hoy confías poco en que las instituciones públicas respondan. Es una percepción legítima y también un punto de partida para exigir.",
    });
  }

  return salida;
}

export type TipoRecurso = "personas" | "instituciones" | "capacidades" | "participacion";

export type Recurso = { tipo: TipoRecurso; etiquetas: string[] };

export const NOMBRE_TIPO_RECURSO: Record<TipoRecurso, string> = {
  personas: "Personas",
  instituciones: "Instituciones",
  capacidades: "Lo que sabes hacer",
  participacion: "Espacios donde ya estuviste",
};

function calcularRecursos(cerradas: RespuestasCerradas): Recurso[] {
  const p4 = itemRequerido("mayor_fortaleza");
  const p7 = itemRequerido("quien_ayuda");
  const p8 = itemRequerido("instituciones_conocidas");
  const p13 = itemRequerido("espacios_participacion");
  const salida: Recurso[] = [];

  const apoyo = getOpcion(clave(cerradas, "quien_ayuda"));
  if (apoyo && apoyo !== "no_lo_se") {
    salida.push({ tipo: "personas", etiquetas: [optionLabel(p7, apoyo)] });
  }
  const instituciones = opcionesReales(p8, getOpciones(clave(cerradas, "instituciones_conocidas")));
  if (instituciones.length > 0) {
    salida.push({ tipo: "instituciones", etiquetas: etiquetas(p8, instituciones) });
  }
  const fortaleza = getOpcion(clave(cerradas, "mayor_fortaleza"));
  if (fortaleza && fortaleza !== "otro") {
    salida.push({ tipo: "capacidades", etiquetas: [optionLabel(p4, fortaleza)] });
  }
  const espacios = opcionesReales(p13, getOpciones(clave(cerradas, "espacios_participacion")));
  if (espacios.length > 0) {
    salida.push({ tipo: "participacion", etiquetas: etiquetas(p13, espacios) });
  }
  return salida;
}

// ---------------------------------------------------------------------------
// Propósito: qué le da sentido al sueño (desde el texto abierto)
// ---------------------------------------------------------------------------
// Se detectan TEMAS por palabras clave. Nunca se afirma haber descubierto el
// "propósito verdadero": el encabezado es siempre "en tus respuestas aparece".

const TEMAS_PROPOSITO: { tema: string; claves: string[] }[] = [
  { tema: "Autonomía", claves: ["independi", "propio", "mio", "por mi cuenta", "libertad", "libre"] },
  { tema: "Familia", claves: ["familia", "mam", "pap", "herman", "hij", "abuel", "casa"] },
  { tema: "Aprendizaje", claves: ["aprend", "estudi", "conocer", "saber", "universidad", "carrera"] },
  { tema: "Servicio a otros", claves: ["ayudar", "servir", "comunidad", "barrio", "gente", "otros"] },
  { tema: "Creatividad", claves: ["crear", "arte", "music", "dibuj", "baile", "escribir", "cantar"] },
  { tema: "Estabilidad", claves: ["estabilidad", "seguro", "tranquil", "casa propia", "ahorr"] },
  { tema: "Reconocimiento", claves: ["orgullo", "demostrar", "lograr", "primera", "primer"] },
  { tema: "Impacto social", claves: ["cambiar", "transformar", "mejorar", "justicia", "derechos"] },
];

export type Proposito = { temas: string[]; textoFuente: boolean };

function calcularProposito(abiertas: RespuestasAbiertas): Proposito {
  // Se leen los campos donde la persona explica el sentido de lo que quiere.
  const fuentes = [
    abiertas["sueno_descripcion"],
    abiertas["quien_ayuda_motivo"],
    abiertas["primer_paso_accion"],
    abiertas["mayor_fortaleza_ejemplo"],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (fuentes.trim().length === 0) return { temas: [], textoFuente: false };

  const norm = (k: string) => k.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const temas = TEMAS_PROPOSITO.filter((t) => t.claves.some((k) => fuentes.includes(norm(k)))).map(
    (t) => t.tema,
  );
  return { temas, textoFuente: true };
}

// ---------------------------------------------------------------------------
// Brújula completa
// ---------------------------------------------------------------------------

export type Brujula = {
  /** Respuestas contestadas sobre el total obligatorio del instrumento. */
  respondidas: number;
  total: number;
  completo: boolean;
  indices: Indice[];
  /** Las 7 dimensiones de la visualización central. */
  agujas: Aguja[];
  barreras: Barrera[];
  recursos: Recurso[];
  proposito: Proposito;
  foda: Foda;
  perfilLiderazgo: PerfilLiderazgo;
  recomendaciones: Recomendacion[];
  /** Sección F del documento: "Mi ciudadanía". */
  ciudadania: {
    experiencia: string[];
    derechoPrioritario: string | null;
    intereses: string[];
    confianzaInstitucional: number | null;
  };
  /** Sección E: "Lo que me importa". */
  loQueImporta: {
    suenos: string[];
    prioridadPublica: string | null;
    mensajeDecisores: string;
  };
};

export function calcularBrujula(
  cerradas: RespuestasCerradas,
  abiertas: RespuestasAbiertas,
): Brujula {
  const indices = calcularIndices(cerradas, abiertas);
  // Completitud = cerradas contestadas + abiertas puras (P20) con texto. Las
  // dos fuentes se cuentan aparte porque se almacenan aparte.
  const cerradasRespondidas = ITEMS_CERRADOS.filter((it) => cerradas[it.item] !== undefined).length;
  const abiertasPurasRespondidas = ITEMS_ABIERTOS_PUROS.filter(
    (it) => (abiertas[it.clave] ?? "").trim().length > 0,
  ).length;
  const respondidas = cerradasRespondidas + abiertasPurasRespondidas;

  const p5 = itemRequerido("sueno_principal");
  const p13 = itemRequerido("espacios_participacion");
  const p14 = itemRequerido("derecho_prioritario");
  const p16 = itemRequerido("prioridad_alcaldia");
  const p19 = itemRequerido("intereses_iniciativas");

  const derecho = getOpcion(clave(cerradas, "derecho_prioritario"));
  const prioridad = getOpcion(clave(cerradas, "prioridad_alcaldia"));

  return {
    respondidas,
    total: TOTAL_ITEMS_OBLIGATORIOS,
    completo: respondidas === TOTAL_ITEMS_OBLIGATORIOS,
    indices: Object.values(indices),
    agujas: calcularAgujas(cerradas, indices),
    barreras: calcularBarreras(cerradas),
    recursos: calcularRecursos(cerradas),
    proposito: calcularProposito(abiertas),
    foda: calcularFoda(cerradas),
    perfilLiderazgo: calcularPerfilLiderazgo(cerradas),
    recomendaciones: calcularRecomendaciones({ indices, cerradas }),
    ciudadania: {
      experiencia: etiquetas(
        p13,
        opcionesReales(p13, getOpciones(clave(cerradas, "espacios_participacion"))),
      ),
      derechoPrioritario: derecho ? optionLabel(p14, derecho) : null,
      intereses: etiquetas(
        p19,
        opcionesReales(p19, getOpciones(clave(cerradas, "intereses_iniciativas"))),
      ),
      confianzaInstitucional: getLikert(clave(cerradas, "confianza_institucional")),
    },
    loQueImporta: {
      suenos: etiquetas(p5, opcionesReales(p5, getOpciones(clave(cerradas, "sueno_principal")))),
      prioridadPublica: prioridad ? optionLabel(p16, prioridad) : null,
      mensajeDecisores: (abiertas["mensaje_decisores"] ?? "").trim(),
    },
  };
}
