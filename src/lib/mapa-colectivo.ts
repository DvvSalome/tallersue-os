// "Nuestro Mapa de los Sueños" — estructura del dashboard colectivo.
//
// El encuadre lo fija el documento: el grupo NO debería ver "cómo son los
// participantes", sino poder responder preguntas colectivas. Por eso la pantalla
// se organiza en diez secciones narrativas y no por número de ítem.
//
// Cada sección declara qué claves del instrumento la alimentan y cómo debe
// leerse cada una. Agregar una pregunta al mapa es agregar su clave aquí.
//
// LÍMITE QUE ESTE MÓDULO DEJA EXPLÍCITO: esto representa a las personas que
// participaron en esta actividad. No es una muestra estadística de la juventud
// ni del territorio, y la interfaz debe decirlo.

import { camposAbiertos, itemByClave, type Item } from "./items";

/** Cómo conviene leer una serie: ordenada por frecuencia o en su orden natural. */
export type FormaLectura =
  | "ranking" // barras horizontales ordenadas por frecuencia
  | "escala" // promedio + distribución 1..5
  | "emociones" // distribución con etiquetas, sin ordenar por valor
  | "mosaico"; // etiquetas de interés, sin jerarquía

export type SerieMapa = {
  /** Clave de un ítem cerrado, o de un campo de texto para mostrar sus temas. */
  clave: string;
  /** Título propio si el del instrumento es muy largo para el mapa. */
  titulo?: string;
  forma: FormaLectura;
  /** Aclaración cuando la lectura puede malinterpretarse. */
  nota?: string;
};

export type SeccionMapa = {
  id: string;
  numero: string;
  pregunta: string;
  descripcion: string;
  series: SerieMapa[];
};

export const SECCIONES_MAPA: SeccionMapa[] = [
  {
    id: "que_sonamos",
    numero: "01",
    pregunta: "Lo que soñamos",
    descripcion: "Las aspiraciones que más aparecen en el grupo.",
    series: [
      { clave: "sueno_principal", titulo: "Nuestros sueños", forma: "ranking" },
      { clave: "sueno_descripcion", titulo: "Temas de los sueños que escribieron", forma: "ranking" },
    ],
  },
  {
    id: "que_sentimos",
    numero: "02",
    pregunta: "Cómo miramos el futuro",
    descripcion: "Las emociones que aparecen al pensar en lo que viene.",
    series: [
      { clave: "emocion_futuro", titulo: "Emoción predominante", forma: "emociones" },
      {
        clave: "posibilidad_sueno",
        titulo: "Qué tan posible vemos avanzar",
        forma: "escala",
        nota: "1 = muy poco posible · 5 = muy posible",
      },
    ],
  },
  {
    id: "con_que_contamos",
    numero: "03",
    pregunta: "Con qué contamos",
    descripcion: "Fortalezas, formas de responder y apoyos que el grupo reconoce.",
    series: [
      { clave: "mayor_fortaleza", titulo: "Nuestras fortalezas", forma: "ranking" },
      { clave: "afrontamiento", titulo: "Cómo respondemos ante una dificultad", forma: "ranking" },
      { clave: "quien_ayuda", titulo: "En quién nos apoyamos", forma: "ranking" },
      {
        clave: "autoeficacia",
        titulo: "Qué tan capaces nos sentimos de avanzar",
        forma: "escala",
        nota: "1 = muy poco capaz · 5 = muy capaz",
      },
    ],
  },
  {
    id: "que_nos_frena",
    numero: "04",
    pregunta: "Lo que nos está frenando",
    descripcion:
      "Separado por origen, porque no todo lo que frena depende de la persona.",
    series: [
      { clave: "habito_barrera", titulo: "Barreras personales", forma: "ranking" },
      { clave: "barreras_familiares", titulo: "Barreras familiares o de cuidado", forma: "ranking" },
    ],
  },
  {
    id: "que_nos_preocupa",
    numero: "05",
    pregunta: "Lo que más nos preocupa",
    descripcion: "Los problemas del territorio, en orden de cuánto se mencionan.",
    series: [
      { clave: "problemas_comunidad", titulo: "Problemas de la comunidad", forma: "ranking" },
      {
        clave: "problema_principal_descripcion",
        titulo: "Temas del problema que describieron",
        forma: "ranking",
      },
    ],
  },
  {
    id: "derechos",
    numero: "06",
    pregunta: "Nuestros derechos prioritarios",
    descripcion: "El derecho que el grupo considera que más necesita protección.",
    series: [{ clave: "derecho_prioritario", titulo: "Derecho prioritario", forma: "ranking" }],
  },
  {
    id: "confianza",
    numero: "07",
    pregunta: "¿En quién confiamos?",
    descripcion: "Percepción sobre las instituciones, y a quién se le exige más.",
    series: [
      {
        clave: "confianza_institucional",
        titulo: "Confianza en que las instituciones respondan",
        forma: "escala",
        nota: "1 = ninguna confianza · 5 = mucha confianza. Es una percepción del grupo, no una evaluación de las entidades.",
      },
      { clave: "instituciones_conocidas", titulo: "Instituciones que conocemos", forma: "ranking" },
      {
        clave: "institucion_exigida",
        titulo: "Quién debería hacer más por los jóvenes",
        forma: "ranking",
      },
    ],
  },
  {
    id: "participacion",
    numero: "08",
    pregunta: "¿Dónde queremos participar?",
    descripcion: "Dónde ya estuvimos y en qué nos gustaría involucrarnos.",
    series: [
      { clave: "espacios_participacion", titulo: "Donde ya participamos", forma: "ranking" },
      { clave: "intereses_iniciativas", titulo: "Donde nos interesa participar", forma: "mosaico" },
    ],
  },
  {
    id: "que_podemos_hacer",
    numero: "09",
    pregunta: "¿Qué podemos hacer?",
    descripcion: "Los primeros pasos que el grupo se plantea y lo que necesita para darlos.",
    series: [
      { clave: "primer_paso", titulo: "Nuestro primer paso", forma: "ranking" },
      { clave: "necesidades_logro", titulo: "Qué necesitamos", forma: "ranking" },
      {
        clave: "prioridad_alcaldia",
        titulo: "Qué resolveríamos primero si decidiéramos",
        forma: "ranking",
      },
    ],
  },
  {
    id: "voz_colectiva",
    numero: "10",
    pregunta: "Nuestra voz",
    descripcion:
      "Los temas de los mensajes dirigidos a quienes toman decisiones. Se muestran los temas, nunca el mensaje de una persona.",
    series: [
      { clave: "mensaje_decisores", titulo: "Lo que queremos decir", forma: "ranking" },
    ],
  },
];

export type SerieResuelta = SerieMapa & {
  item: Item;
  /** true si la serie corresponde a un campo de texto (categorías codificadas). */
  esTexto: boolean;
};

export type SeccionResuelta = Omit<SeccionMapa, "series"> & { series: SerieResuelta[] };

/** Índice clave-de-texto → ítem que la contiene. */
const ABIERTOS_POR_CLAVE = new Map(camposAbiertos().map((c) => [c.clave, c.item]));

/** Resuelve cada clave a su ítem del catálogo. Una clave puede ser la de un ítem
 *  cerrado o la de un campo de texto; se ignoran las que no existan en la
 *  versión vigente, para que renombrar una pregunta no rompa el dashboard. */
export function seccionesResueltas(): SeccionResuelta[] {
  return SECCIONES_MAPA.map((s) => ({
    ...s,
    series: s.series
      .map((serie): SerieResuelta | null => {
        const directo = itemByClave(serie.clave);
        if (directo) return { ...serie, item: directo, esTexto: directo.tipo === "texto" };
        // La clave de un campo de observaciones no es la del ítem que lo contiene,
        // así que se busca en el índice de campos abiertos en lugar de adivinar
        // el nombre recortando sufijos.
        const abierto = ABIERTOS_POR_CLAVE.get(serie.clave);
        if (abierto) return { ...serie, item: abierto, esTexto: true };
        return null;
      })
      .filter((x): x is SerieResuelta => x !== null),
  })).filter((s) => s.series.length > 0);
}
