// Instrumento "Taller de los Sueños" — versión 2 (20 preguntas, 5 bloques).
//
// Fuente: Documento Técnico de Implementación, sección 2 "Reglas generales
// para el desarrollo". Cada pregunta contiene:
//   - código único (`codigo` P1..P20 y `clave` estable para la BD),
//   - tipo de respuesta,
//   - opciones parametrizadas,
//   - campo opcional de observaciones (`abierta`),
//   - posibilidad de actualización futura mediante catálogo
//     (public.item_catalog, ver supabase/schema.sql).
//
// Este archivo es la única fuente de verdad de la ESTRUCTURA del instrumento.
// La BD replica (version, bloque, item, clave, tipo, etiqueta, dimension) para
// que las consultas de análisis no dependan del código; las opciones viven
// solo aquí porque únicamente se usan para renderizar y etiquetar.
//
// Regla de negocio (doc, §5): "La arquitectura deberá permitir incorporar
// nuevos bloques, preguntas o escalas psicométricas sin afectar la información
// histórica." Por eso el instrumento está VERSIONADO: las respuestas guardan
// `version`, y cambiar preguntas significa publicar una versión nueva, nunca
// reinterpretar filas ya escritas. La v1 (14 ítems) queda intacta en la BD.

export const INSTRUMENTO_VERSION = 2;

/** Tipos de respuesta. Los valores coinciden con el CHECK de la BD.
 *  `likert` = escala 1..5 del documento. `adjunto` existe solo para respetar
 *  las filas históricas de la v1; la v2 no lo usa. */
export type ItemTipo = "likert" | "multiple" | "unica" | "texto" | "adjunto";

/** Las seis dimensiones de la "Arquitectura de variables" (doc, §2). */
export type Dimension =
  | "agencia_personal"
  | "proyecto_vida"
  | "bienestar_prospectivo"
  | "capital_social"
  | "ciudadania_activa"
  | "contexto_transformacion";

export const DIMENSIONES: Record<Dimension, { nombre: string; indicadores: string }> = {
  agencia_personal: {
    nombre: "Agencia personal",
    indicadores: "Autoeficacia, afrontamiento, capacidad de acción",
  },
  proyecto_vida: {
    nombre: "Proyecto de vida",
    indicadores: "Claridad, aspiración, sentido, posibilidad percibida",
  },
  bienestar_prospectivo: {
    nombre: "Bienestar prospectivo",
    indicadores: "Emoción frente al futuro, esperanza",
  },
  capital_social: {
    nombre: "Capital social y redes",
    indicadores: "Personas, instituciones y recursos disponibles",
  },
  ciudadania_activa: {
    nombre: "Ciudadanía activa",
    indicadores: "Participación, derechos, autoeficacia cívica",
  },
  contexto_transformacion: {
    nombre: "Contexto y transformación",
    indicadores: "Barreras, oportunidades, problemas, capacidades territoriales",
  },
};

export type Option = {
  value: string;
  label: string;
  /** "Otro / Otra": habilita el campo de observaciones para especificar. */
  otro?: boolean;
  /** "Prefiero no responder": se excluye de todo cálculo de índices. */
  sinDato?: boolean;
  /** "Ninguno / Ninguna": dato válido (ausencia de barrera), no dato faltante. */
  ninguno?: boolean;
};

/** Campo opcional de observaciones asociado a una pregunta cerrada.
 *  Se almacena en `respuestas_abiertas`, separado de la respuesta cerrada
 *  (doc, §2: "Todas las preguntas abiertas deberán almacenarse
 *  independientemente de las respuestas cerradas"). */
export type CampoAbierto = {
  clave: string;
  etiqueta: string;
  maxLength: number;
};

export type Escala = {
  min: 1;
  max: 5;
  etiquetaMin: string;
  etiquetaMax: string;
};

export type Item = {
  bloque: 1 | 2 | 3 | 4 | 5;
  /** Número global 1..20, estable dentro de una versión del instrumento. */
  item: number;
  /** Código del documento (P1..P20). */
  codigo: string;
  /** Clave estable para BD y analítica. */
  clave: string;
  tipo: ItemTipo;
  etiqueta: string;
  ayuda?: string;
  dimension: Dimension;
  opciones?: Option[];
  escala?: Escala;
  abierta?: CampoAbierto;
  /** Solo para tipo "texto" (pregunta abierta pura). */
  maxLength?: number;
};

export type Bloque = {
  bloque: 1 | 2 | 3 | 4 | 5;
  titulo: string;
  objetivo: string;
  items: Item[];
};

// ---------------------------------------------------------------------------
// Opciones reutilizadas entre preguntas
// ---------------------------------------------------------------------------

const OTRO: Option = { value: "otro", label: "Otro", otro: true };
const OTRA: Option = { value: "otro", label: "Otra", otro: true };
const PREFIERO_NO_RESPONDER: Option = {
  value: "prefiero_no_responder",
  label: "Prefiero no responder",
  sinDato: true,
};

const ESCALA_CAPACIDAD: Escala = {
  min: 1,
  max: 5,
  etiquetaMin: "Muy poco capaz",
  etiquetaMax: "Muy capaz",
};
const ESCALA_POSIBILIDAD: Escala = {
  min: 1,
  max: 5,
  etiquetaMin: "Muy poco posible",
  etiquetaMax: "Muy posible",
};
const ESCALA_CONFIANZA: Escala = {
  min: 1,
  max: 5,
  etiquetaMin: "Ninguna confianza",
  etiquetaMax: "Mucha confianza",
};

/** Instituciones que aparecen tanto en P8 (reconocimiento) como en P12
 *  (exigencia). Se mantienen listas separadas porque el documento las define
 *  con opciones distintas; no se fusionan para no alterar el instrumento. */
const INSTITUCIONES_CONOCIDAS: Option[] = [
  { value: "alcaldia", label: "Alcaldía" },
  { value: "sena", label: "SENA" },
  { value: "icbf", label: "ICBF" },
  { value: "casas_juventud", label: "Casas de Juventud" },
  { value: "personeria", label: "Personería" },
  { value: "universidades", label: "Universidades" },
  { value: "ongs", label: "ONGs" },
  { value: "iglesias", label: "Iglesias" },
  { value: "ninguna", label: "Ninguna", ninguno: true },
  OTRA,
];

// ---------------------------------------------------------------------------
// BLOQUE 1 — Identidad, Autoeficacia y Potencial
// ---------------------------------------------------------------------------

const BLOQUE_1: Bloque = {
  bloque: 1,
  titulo: "Identidad, Autoeficacia y Potencial",
  objetivo:
    "Identificar recursos personales, percepción de capacidad, regulación emocional y sentido de identidad.",
  items: [
    {
      bloque: 1,
      item: 1,
      codigo: "P1",
      clave: "afrontamiento",
      tipo: "unica",
      dimension: "agencia_personal",
      etiqueta: "Cuando aparece una dificultad importante, ¿qué sueles hacer primero?",
      opciones: [
        { value: "busco_solucion", label: "Busco una solución" },
        { value: "organizo_alternativas", label: "Intento organizarme y pensar alternativas" },
        { value: "pido_ayuda", label: "Pido ayuda" },
        { value: "busco_informacion", label: "Busco información o consejo" },
        { value: "espero_entender", label: "Espero antes de actuar para entender mejor" },
        { value: "me_cuesta", label: "Me cuesta saber qué hacer" },
        { value: "evito", label: "Suelo evitar la situación" },
        { value: "depende", label: "Depende de la situación" },
        OTRO,
        PREFIERO_NO_RESPONDER,
      ],
      abierta: {
        clave: "afrontamiento_motivo",
        etiqueta: "¿Por qué elegiste esta respuesta?",
        maxLength: 500,
      },
    },
    {
      bloque: 1,
      item: 2,
      codigo: "P2",
      clave: "autoeficacia",
      tipo: "likert",
      dimension: "agencia_personal",
      etiqueta:
        "¿Qué tan capaz te sientes actualmente de hacer cosas concretas que te acerquen a tus metas?",
      escala: ESCALA_CAPACIDAD,
    },
    {
      bloque: 1,
      item: 3,
      codigo: "P3",
      clave: "emocion_futuro",
      tipo: "unica",
      dimension: "bienestar_prospectivo",
      etiqueta: "¿Qué emoción predomina cuando piensas en tu futuro?",
      opciones: [
        { value: "esperanza", label: "Esperanza" },
        { value: "alegria", label: "Alegría" },
        { value: "motivacion", label: "Motivación" },
        { value: "incertidumbre", label: "Incertidumbre" },
        { value: "miedo", label: "Miedo" },
        { value: "tristeza", label: "Tristeza" },
        { value: "ansiedad", label: "Ansiedad" },
      ],
      abierta: {
        clave: "emocion_futuro_motivo",
        etiqueta: "Describe brevemente por qué.",
        maxLength: 500,
      },
    },
    {
      bloque: 1,
      item: 4,
      codigo: "P4",
      clave: "mayor_fortaleza",
      tipo: "unica",
      dimension: "agencia_personal",
      etiqueta: "¿Cuál consideras que es hoy tu mayor fortaleza?",
      opciones: [
        { value: "creatividad", label: "Creatividad" },
        { value: "disciplina", label: "Disciplina" },
        { value: "liderazgo", label: "Liderazgo" },
        { value: "empatia", label: "Empatía" },
        { value: "responsabilidad", label: "Responsabilidad" },
        { value: "comunicacion", label: "Comunicación" },
        { value: "perseverancia", label: "Perseverancia" },
        { value: "prudencia", label: "Prudencia" },
        { value: "resolucion_problemas", label: "Resolución de problemas" },
        OTRA,
      ],
      abierta: {
        clave: "mayor_fortaleza_ejemplo",
        etiqueta: "Cuéntanos un ejemplo.",
        maxLength: 500,
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// BLOQUE 2 — Sueños, Derechos y Oportunidades
// ---------------------------------------------------------------------------

const BLOQUE_2: Bloque = {
  bloque: 2,
  titulo: "Sueños, Derechos y Oportunidades",
  objetivo: "Identificar aspiraciones, oportunidades percibidas y acceso institucional.",
  items: [
    {
      bloque: 2,
      item: 5,
      codigo: "P5",
      clave: "sueno_principal",
      tipo: "multiple",
      dimension: "proyecto_vida",
      etiqueta: "¿Cuál es tu principal sueño actualmente?",
      ayuda: "Puedes elegir más de uno.",
      opciones: [
        { value: "estudiar", label: "Estudiar" },
        { value: "conseguir_empleo", label: "Conseguir empleo" },
        { value: "emprender", label: "Emprender" },
        { value: "crear_empresa", label: "Crear una empresa" },
        { value: "viajar", label: "Viajar" },
        { value: "comprar_vivienda", label: "Comprar vivienda" },
        { value: "apoyar_familia", label: "Apoyar a mi familia" },
        { value: "talento_artistico", label: "Desarrollar un talento artístico" },
        { value: "servir_comunidad", label: "Servir a mi comunidad" },
        OTRO,
      ],
      abierta: {
        clave: "sueno_descripcion",
        etiqueta: "Describe tu sueño.",
        maxLength: 800,
      },
    },
    {
      bloque: 2,
      item: 6,
      codigo: "P6",
      clave: "posibilidad_sueno",
      tipo: "likert",
      dimension: "proyecto_vida",
      etiqueta: "¿Qué tan posible crees que es avanzar hacia ese sueño?",
      escala: ESCALA_POSIBILIDAD,
    },
    {
      bloque: 2,
      item: 7,
      codigo: "P7",
      clave: "quien_ayuda",
      tipo: "unica",
      dimension: "capital_social",
      etiqueta: "¿Quién crees que más puede ayudarte a cumplir ese sueño?",
      opciones: [
        { value: "familia", label: "Mi familia" },
        { value: "pareja", label: "Mi pareja" },
        { value: "amigos", label: "Mis amigos" },
        { value: "colegio", label: "Mi colegio" },
        { value: "universidad", label: "Mi universidad" },
        { value: "estado", label: "El Estado" },
        { value: "organizaciones_sociales", label: "Organizaciones sociales" },
        { value: "organizaciones_religiosas", label: "Organizaciones religiosas" },
        { value: "empresas", label: "Empresas" },
        { value: "yo_mismo", label: "Yo mismo" },
        { value: "no_lo_se", label: "No lo sé" },
      ],
      abierta: {
        clave: "quien_ayuda_motivo",
        etiqueta: "Explica tu respuesta.",
        maxLength: 500,
      },
    },
    {
      bloque: 2,
      item: 8,
      codigo: "P8",
      clave: "instituciones_conocidas",
      tipo: "multiple",
      dimension: "capital_social",
      etiqueta: "¿Conoces instituciones que apoyen a los jóvenes?",
      ayuda: "Puedes elegir varias.",
      opciones: INSTITUCIONES_CONOCIDAS,
      abierta: {
        clave: "instituciones_cuales",
        etiqueta: "¿Cuáles conoces?",
        maxLength: 500,
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// BLOQUE 3 — Radar: Cartografía Personal y Territorial
// ---------------------------------------------------------------------------

const BLOQUE_3: Bloque = {
  bloque: 3,
  titulo: "Radar: Cartografía Personal y Territorial",
  objetivo: "Identificar barreras personales, familiares, sociales e institucionales.",
  items: [
    {
      bloque: 3,
      item: 9,
      codigo: "P9",
      clave: "habito_barrera",
      tipo: "multiple",
      dimension: "contexto_transformacion",
      etiqueta: "¿Qué hábito consideras que más te dificulta alcanzar tus metas?",
      ayuda: "Puedes elegir más de uno.",
      opciones: [
        { value: "procrastinacion", label: "Procrastinación" },
        { value: "baja_disciplina", label: "Baja disciplina" },
        { value: "consumo_sustancias", label: "Consumo problemático de sustancias" },
        { value: "distracciones_digitales", label: "Distracciones digitales" },
        { value: "miedo_fracaso", label: "Miedo al fracaso" },
        { value: "falta_organizacion", label: "Falta de organización" },
        { value: "baja_autoestima", label: "Baja autoestima" },
        { value: "ninguno", label: "Ninguno", ninguno: true },
        OTRO,
      ],
      abierta: {
        clave: "habito_barrera_detalle",
        etiqueta: "Explícalo.",
        maxLength: 500,
      },
    },
    {
      bloque: 3,
      item: 10,
      codigo: "P10",
      clave: "barreras_familiares",
      tipo: "multiple",
      dimension: "contexto_transformacion",
      etiqueta: "¿Qué situaciones familiares dificultan más tus proyectos?",
      ayuda: "Puedes elegir varias.",
      opciones: [
        { value: "dificultades_economicas", label: "Dificultades económicas" },
        { value: "conflictos_familiares", label: "Conflictos familiares" },
        { value: "ausencia_parental", label: "Ausencia o separación parental" },
        { value: "falta_apoyo", label: "Falta de apoyo" },
        { value: "responsabilidades_cuidado", label: "Responsabilidades de cuidado" },
        { value: "violencia", label: "Violencia" },
        { value: "ninguna", label: "Ninguna", ninguno: true },
        OTRA,
      ],
      abierta: {
        clave: "barreras_familiares_comentarios",
        etiqueta: "Comentarios.",
        maxLength: 500,
      },
    },
    {
      bloque: 3,
      item: 11,
      codigo: "P11",
      clave: "problemas_comunidad",
      tipo: "multiple",
      dimension: "contexto_transformacion",
      etiqueta: "¿Cuáles son los principales problemas de tu comunidad?",
      ayuda: "Puedes elegir varios.",
      opciones: [
        { value: "inseguridad", label: "Inseguridad" },
        { value: "desempleo", label: "Desempleo" },
        { value: "consumo_drogas", label: "Consumo de drogas" },
        { value: "violencia", label: "Violencia" },
        { value: "falta_espacios_deportivos", label: "Falta de espacios deportivos" },
        { value: "falta_oportunidades_educativas", label: "Falta de oportunidades educativas" },
        { value: "problemas_ambientales", label: "Problemas ambientales" },
        { value: "discriminacion", label: "Discriminación" },
        { value: "corrupcion", label: "Corrupción" },
        OTRO,
      ],
      abierta: {
        clave: "problema_principal_descripcion",
        etiqueta: "Describe el principal problema.",
        maxLength: 800,
      },
    },
    {
      bloque: 3,
      item: 12,
      codigo: "P12",
      clave: "institucion_exigida",
      tipo: "multiple",
      dimension: "ciudadania_activa",
      etiqueta: "¿Qué institución debería hacer más por los jóvenes?",
      ayuda: "Puedes elegir varias.",
      opciones: [
        { value: "alcaldia", label: "Alcaldía" },
        { value: "gobernacion", label: "Gobernación" },
        { value: "gobierno_nacional", label: "Gobierno Nacional" },
        { value: "instituciones_educativas", label: "Instituciones educativas" },
        { value: "empresas", label: "Empresas" },
        { value: "organizaciones_sociales", label: "Organizaciones sociales" },
        { value: "comunidad", label: "Comunidad" },
        { value: "familia", label: "Familia" },
        { value: "todas", label: "Todas" },
        OTRA,
      ],
      abierta: {
        clave: "institucion_exigida_motivo",
        etiqueta: "¿Por qué?",
        maxLength: 500,
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// BLOQUE 4 — Ciudadanía y Democracia
// ---------------------------------------------------------------------------

const BLOQUE_4: Bloque = {
  bloque: 4,
  titulo: "Ciudadanía y Democracia",
  objetivo:
    "Comprender la relación del joven con la participación ciudadana y la incidencia pública.",
  items: [
    {
      bloque: 4,
      item: 13,
      codigo: "P13",
      clave: "espacios_participacion",
      tipo: "multiple",
      dimension: "ciudadania_activa",
      etiqueta: "¿Has participado alguna vez en alguno de estos espacios?",
      ayuda: "Puedes elegir varios.",
      opciones: [
        { value: "gobierno_escolar", label: "Gobierno escolar" },
        { value: "subsistema_juvenil", label: "Subsistema de participación juvenil" },
        { value: "cabildo", label: "Cabildo" },
        { value: "voluntariado", label: "Voluntariado" },
        { value: "organizacion_comunitaria", label: "Organización comunitaria" },
        { value: "actividades_culturales", label: "Actividades culturales" },
        { value: "actividades_religiosas", label: "Actividades religiosas" },
        { value: "ninguno", label: "Ninguno", ninguno: true },
      ],
      abierta: {
        clave: "espacios_participacion_experiencia",
        etiqueta: "Cuéntanos tu experiencia.",
        maxLength: 800,
      },
    },
    {
      bloque: 4,
      item: 14,
      codigo: "P14",
      clave: "derecho_prioritario",
      tipo: "unica",
      dimension: "ciudadania_activa",
      etiqueta: "¿Qué derecho consideras que necesita mayor protección para los jóvenes?",
      opciones: [
        { value: "educacion", label: "Educación" },
        { value: "seguridad", label: "Seguridad" },
        { value: "salud_integral", label: "Salud integral (mental y física)" },
        { value: "trabajo", label: "Trabajo" },
        { value: "igualdad", label: "Igualdad" },
        { value: "participacion", label: "Participación" },
        { value: "libertad_expresion", label: "Libertad de expresión" },
        { value: "entorno_sano", label: "Entorno sano" },
        { value: "medio_ambiente", label: "Medio ambiente sostenible" },
        { value: "cultura", label: "Cultura" },
        { value: "recreacion_deporte", label: "Recreación y deporte" },
      ],
      abierta: {
        clave: "derecho_prioritario_motivo",
        etiqueta: "¿Por qué?",
        maxLength: 500,
      },
    },
    {
      bloque: 4,
      item: 15,
      codigo: "P15",
      clave: "confianza_institucional",
      tipo: "likert",
      dimension: "ciudadania_activa",
      etiqueta:
        "¿Qué tanto confías en que las instituciones públicas pueden responder de manera efectiva a las necesidades de la ciudadanía?",
      escala: ESCALA_CONFIANZA,
    },
    {
      bloque: 4,
      item: 16,
      codigo: "P16",
      clave: "prioridad_alcaldia",
      tipo: "unica",
      dimension: "ciudadania_activa",
      etiqueta: "¿Qué problema resolverías primero si fueras alcalde o alcaldesa?",
      opciones: [
        { value: "educacion", label: "Educación" },
        { value: "seguridad", label: "Seguridad" },
        { value: "empleo", label: "Empleo" },
        { value: "salud", label: "Salud" },
        { value: "cultura", label: "Cultura" },
        { value: "medio_ambiente", label: "Medio ambiente" },
        { value: "movilidad", label: "Movilidad" },
        { value: "participacion_juvenil", label: "Participación juvenil" },
        { value: "instituciones_fuertes", label: "Instituciones fuertes" },
        { value: "igualdad_oportunidades", label: "Igualdad de oportunidades" },
        OTRO,
      ],
      abierta: {
        clave: "prioridad_alcaldia_como",
        etiqueta: "¿Cómo lo harías?",
        maxLength: 800,
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// BLOQUE 5 — Del Sueño a la Acción
// ---------------------------------------------------------------------------

const BLOQUE_5: Bloque = {
  bloque: 5,
  titulo: "Del Sueño a la Acción",
  objetivo: "Traducir el diagnóstico en compromiso y acciones concretas.",
  items: [
    {
      bloque: 5,
      item: 17,
      codigo: "P17",
      clave: "primer_paso",
      tipo: "unica",
      dimension: "agencia_personal",
      etiqueta: "¿Cuál será el primer paso para acercarte a tu meta?",
      opciones: [
        { value: "estudiar", label: "Estudiar" },
        { value: "buscar_apoyo", label: "Buscar apoyo" },
        { value: "ahorrar", label: "Ahorrar dinero" },
        { value: "organizar_tiempo", label: "Organizar mi tiempo" },
        { value: "capacitarme", label: "Capacitarme" },
        { value: "buscar_empleo", label: "Buscar empleo" },
        { value: "emprender", label: "Emprender" },
        OTRO,
      ],
      abierta: {
        clave: "primer_paso_accion",
        etiqueta: "Describe la acción.",
        maxLength: 500,
      },
    },
    {
      bloque: 5,
      item: 18,
      codigo: "P18",
      clave: "necesidades_logro",
      tipo: "multiple",
      dimension: "capital_social",
      etiqueta: "¿Qué necesitas para lograrlo?",
      ayuda: "Puedes elegir varias.",
      opciones: [
        { value: "recursos_economicos", label: "Recursos económicos" },
        { value: "formacion", label: "Formación" },
        { value: "mentoria", label: "Mentoría" },
        { value: "acompanamiento_emocional", label: "Acompañamiento emocional" },
        { value: "contactos", label: "Contactos" },
        { value: "tiempo", label: "Tiempo" },
        { value: "confianza_en_mi", label: "Confianza en mí mismo" },
        OTRO,
      ],
      abierta: {
        clave: "necesidades_logro_motivo",
        etiqueta: "Explica por qué.",
        maxLength: 500,
      },
    },
    {
      bloque: 5,
      item: 19,
      codigo: "P19",
      clave: "intereses_iniciativas",
      tipo: "multiple",
      dimension: "ciudadania_activa",
      etiqueta: "¿En qué tipo de iniciativas te gustaría participar?",
      ayuda: "Puedes elegir varias.",
      opciones: [
        { value: "liderazgo", label: "Liderazgo" },
        { value: "emprendimiento", label: "Emprendimiento" },
        { value: "medio_ambiente", label: "Medio ambiente" },
        { value: "tecnologia", label: "Tecnología" },
        { value: "cultura", label: "Cultura" },
        { value: "deporte", label: "Deporte" },
        { value: "participacion_politica", label: "Participación política" },
        { value: "procesos_comunitarios", label: "Procesos comunitarios" },
        { value: "derechos_humanos", label: "Derechos Humanos" },
        { value: "innovacion_social", label: "Innovación social" },
        OTRA,
      ],
      abierta: {
        clave: "intereses_iniciativas_aporte",
        etiqueta: "Cómo aportarías a este o estos procesos.",
        maxLength: 800,
      },
    },
    {
      bloque: 5,
      item: 20,
      codigo: "P20",
      clave: "mensaje_decisores",
      tipo: "texto",
      dimension: "ciudadania_activa",
      etiqueta:
        "Si pudieras enviar un mensaje a quienes toman decisiones sobre las juventudes, ¿qué les dirías?",
      maxLength: 1000,
    },
  ],
};

export const BLOQUES: Bloque[] = [BLOQUE_1, BLOQUE_2, BLOQUE_3, BLOQUE_4, BLOQUE_5];

export const ALL_ITEMS: Item[] = BLOQUES.flatMap((b) => b.items);
export const TOTAL_ITEMS = ALL_ITEMS.length;

/** Preguntas CERRADAS: se guardan en `responses`. */
export const ITEMS_CERRADOS: Item[] = ALL_ITEMS.filter((i) => i.tipo !== "texto");

/** Preguntas ABIERTAS puras (P20): NO se guardan en `responses`, viven solo en
 *  el repositorio de texto `respuestas_abiertas`, igual que los campos de
 *  observaciones (doc, §2: las abiertas se almacenan independientemente de las
 *  cerradas). Por eso el conteo de completitud suma ambos orígenes. */
export const ITEMS_ABIERTOS_PUROS: Item[] = ALL_ITEMS.filter((i) => i.tipo === "texto");

/** Preguntas obligatorias para considerar el instrumento completo: todas las
 *  cerradas más las abiertas puras. Los campos de observaciones asociados a
 *  una pregunta cerrada son siempre opcionales (doc, §2). */
export const TOTAL_ITEMS_OBLIGATORIOS = ITEMS_CERRADOS.length + ITEMS_ABIERTOS_PUROS.length;

export function itemByNumber(item: number): Item | undefined {
  return ALL_ITEMS.find((i) => i.item === item);
}

export function itemByClave(clave: string): Item | undefined {
  return ALL_ITEMS.find((i) => i.clave === clave);
}

/** Todos los campos de observaciones del instrumento, incluida la pregunta
 *  abierta pura (P20), que se almacena en el mismo repositorio de texto. */
export function camposAbiertos(): { item: Item; clave: string; etiqueta: string; maxLength: number }[] {
  return ALL_ITEMS.flatMap((item) => {
    if (item.abierta) {
      return [
        {
          item,
          clave: item.abierta.clave,
          etiqueta: item.abierta.etiqueta,
          maxLength: item.abierta.maxLength,
        },
      ];
    }
    if (item.tipo === "texto") {
      return [
        {
          item,
          clave: item.clave,
          etiqueta: item.etiqueta,
          maxLength: item.maxLength ?? 1000,
        },
      ];
    }
    return [];
  });
}

export function optionLabel(item: Item, value: string): string {
  return item.opciones?.find((o) => o.value === value)?.label ?? value;
}

/** Valores que representan "sin dato" y deben excluirse de los índices. */
export function esSinDato(item: Item, value: string): boolean {
  return item.opciones?.find((o) => o.value === value)?.sinDato === true;
}
