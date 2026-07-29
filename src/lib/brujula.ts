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
  /** Texto de la sección A del documento ("Así estoy hoy"). */
  descripcion: string;
  dimension: Dimension;
  /** 0..100, o null si no hay datos suficientes. */
  valor: number | null;
  nivel: NivelIndice | null;
  /** Lectura en primera persona, sin diagnóstico. */
  lectura: string;
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
      nivel,
      lectura: nivel
        ? LECTURAS[c][nivel]
        : "Aún no hay respuestas suficientes para mostrar esta lectura.",
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
    fortalezas.push(`Ya tienes experiencia participando en ${listar(etiquetas(p13, espacios)).toLowerCase()}.`);
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

function calcularPerfilLiderazgo(cerradas: RespuestasCerradas): PerfilLiderazgo {
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
  hallazgo: string;
  necesidad: string;
  recurso: string;
  accion: string;
  /** Frase movilizadora que se muestra al participante. */
  invitacion: string;
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
    hallazgo: "Autoeficacia baja",
    necesidad: "Experiencias de logro",
    recurso: "Microacciones",
    accion: "Meta de 7 días",
    invitacion:
      "Un siguiente paso posible sería fijarte una meta pequeña y verificable para los próximos 7 días: algo que puedas terminar y notar.",
    aplica: ({ indices }) =>
      indices.autoeficacia.valor !== null && indices.autoeficacia.valor < 40,
  },
  {
    prioridad: 2,
    hallazgo: "Sueño claro con baja posibilidad percibida",
    necesidad: "Información",
    recurso: "Orientación",
    accion: "Identificar 3 rutas posibles",
    invitacion:
      "Podría ser útil buscar tres rutas distintas para llegar a ese sueño y compararlas: a veces el camino se ve cerrado porque solo se ve uno.",
    aplica: ({ indices, cerradas }) => {
      const posibilidad = getLikert(clave(cerradas, "posibilidad_sueno"));
      const claro = indices.claridad_proyecto.valor !== null && indices.claridad_proyecto.valor >= 60;
      return claro && posibilidad !== null && posibilidad <= 2;
    },
  },
  {
    prioridad: 3,
    hallazgo: "Poca red de apoyo",
    necesidad: "Conexión",
    recurso: "Mentoría",
    accion: "Identificar 1 persona",
    invitacion:
      "Podría ser útil identificar a una sola persona o institución con la que puedas hablar de esto en las próximas semanas.",
    aplica: ({ indices }) => indices.redes_apoyo.valor !== null && indices.redes_apoyo.valor < 40,
  },
  {
    prioridad: 4,
    hallazgo: "Barrera económica",
    necesidad: "Oportunidades",
    recurso: "Oferta institucional",
    accion: "Buscar 3 programas",
    invitacion:
      "Podría ser útil revisar tres programas o convocatorias abiertas —becas, formación, apoyo al emprendimiento— y anotar sus requisitos.",
    aplica: ({ cerradas }) =>
      getOpciones(clave(cerradas, "barreras_familiares")).includes("dificultades_economicas") ||
      getOpciones(clave(cerradas, "necesidades_logro")).includes("recursos_economicos"),
  },
  {
    prioridad: 5,
    hallazgo: "Baja participación",
    necesidad: "Experiencia",
    recurso: "Espacio ciudadano",
    accion: "Primera participación guiada",
    invitacion:
      "Un siguiente paso posible sería asistir una vez, acompañado, a un espacio juvenil de tu comuna, sin compromiso de quedarte.",
    aplica: ({ indices }) =>
      indices.participacion_ciudadana.valor !== null &&
      indices.participacion_ciudadana.valor < 40,
  },
  {
    prioridad: 6,
    hallazgo: "Alta autoeficacia cívica",
    necesidad: "Incidencia",
    recurso: "Participación",
    accion: "Vincularse a iniciativa",
    invitacion:
      "Puedes decidir dar un paso más: vincularte a una iniciativa concreta donde lo que ya sabes hacer le sirva a otras personas.",
    aplica: ({ indices }) =>
      indices.participacion_ciudadana.valor !== null &&
      indices.participacion_ciudadana.valor >= 70,
  },
];

/** Fallback cuando ninguna regla aplica: los tres pasos del propio documento. */
const RECOMENDACIONES_BASE: Recomendacion[] = [
  {
    hallazgo: "Instrumento completo sin señales de alerta",
    necesidad: "Concreción",
    recurso: "Planeación breve",
    accion: "Meta de 30 días",
    invitacion: "Un siguiente paso posible sería definir una meta concreta para los próximos 30 días.",
  },
  {
    hallazgo: "Instrumento completo sin señales de alerta",
    necesidad: "Acompañamiento",
    recurso: "Red cercana",
    accion: "Identificar 1 persona o institución",
    invitacion: "Podría ser útil identificar una persona o institución que pueda acompañarte en ese paso.",
  },
  {
    hallazgo: "Instrumento completo sin señales de alerta",
    necesidad: "Acción",
    recurso: "Microacción",
    accion: "Primera acción verificable",
    invitacion: "Puedes decidir realizar una primera acción verificable esta misma semana.",
  },
];

export const MAX_RECOMENDACIONES = 3;

function calcularRecomendaciones(ctx: ContextoRecomendacion): Recomendacion[] {
  const activas = REGLAS.filter((r) => r.aplica(ctx))
    .sort((a, b) => a.prioridad - b.prioridad)
    .slice(0, MAX_RECOMENDACIONES)
    .map(({ hallazgo, necesidad, recurso, accion, invitacion }) => ({
      hallazgo,
      necesidad,
      recurso,
      accion,
      invitacion,
    }));

  if (activas.length > 0) return activas;
  return RECOMENDACIONES_BASE.slice(0, MAX_RECOMENDACIONES);
}

// ---------------------------------------------------------------------------
// Brújula completa
// ---------------------------------------------------------------------------

export type Brujula = {
  /** Respuestas cerradas contestadas sobre el total del instrumento. */
  respondidas: number;
  total: number;
  completo: boolean;
  indices: Indice[];
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
