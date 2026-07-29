// "Mapa Colectivo de los Sueños" — estructura del dashboard grupal (doc §4).
//
// El documento es explícito sobre el encuadre: el grupo NO debería ver "cómo
// son los participantes", sino responder preguntas colectivas. Por eso el
// dashboard se organiza por esas preguntas y no por número de ítem.
//
// Cada sección declara qué claves del instrumento la alimentan. Agregar una
// pregunta al mapa es agregar su clave aquí; no hay lógica que tocar.

import { itemByClave, type Item } from "./items";

export type SeccionMapa = {
  id: string;
  pregunta: string;
  descripcion: string;
  /** Claves de items.ts, en el orden en que deben mostrarse. */
  claves: string[];
};

export const SECCIONES_MAPA: SeccionMapa[] = [
  {
    id: "que_sonamos",
    pregunta: "¿Qué soñamos?",
    descripcion: "Aspiraciones, intereses y propósitos recurrentes.",
    claves: ["sueno_principal", "posibilidad_sueno", "primer_paso"],
  },
  {
    id: "que_sentimos",
    pregunta: "¿Qué sentimos frente al futuro?",
    descripcion: "Esperanza, motivación, incertidumbre, miedo.",
    claves: ["emocion_futuro", "autoeficacia"],
  },
  {
    id: "con_que_contamos",
    pregunta: "¿Con qué contamos?",
    descripcion: "Fortalezas colectivas, capacidades, redes y oportunidades.",
    claves: ["mayor_fortaleza", "afrontamiento", "quien_ayuda", "necesidades_logro"],
  },
  {
    id: "que_nos_frena",
    pregunta: "¿Qué nos está frenando?",
    descripcion: "Barreras personales, familiares y territoriales.",
    claves: ["habito_barrera", "barreras_familiares"],
  },
  {
    id: "que_nos_preocupa",
    pregunta: "¿Qué nos preocupa?",
    descripcion: "Problemas prioritarios y derechos considerados prioritarios.",
    claves: ["problemas_comunidad", "derecho_prioritario", "prioridad_alcaldia"],
  },
  {
    id: "donde_participamos",
    pregunta: "¿En qué creemos que podemos participar?",
    descripcion: "Experiencia participativa e intereses de incidencia.",
    claves: ["espacios_participacion", "intereses_iniciativas"],
  },
  {
    id: "que_instituciones",
    pregunta: "¿Qué instituciones conocemos?",
    descripcion: "Mapa de reconocimiento institucional y de exigencia.",
    claves: ["instituciones_conocidas", "institucion_exigida", "confianza_institucional"],
  },
  {
    id: "que_queremos_decir",
    pregunta: "¿Qué queremos decir?",
    descripcion:
      "Temas de los mensajes dirigidos a quienes toman decisiones. Se muestran los temas, nunca el texto de una persona.",
    claves: ["mensaje_decisores"],
  },
];

export type SeccionResuelta = SeccionMapa & { items: Item[] };

/** Resuelve las claves a ítems del catálogo, ignorando las que no existan en
 *  la versión vigente del instrumento (para que renombrar o retirar una
 *  pregunta no rompa el dashboard). */
export function seccionesResueltas(): SeccionResuelta[] {
  return SECCIONES_MAPA.map((s) => ({
    ...s,
    items: s.claves.map((c) => itemByClave(c)).filter((i): i is Item => i !== undefined),
  })).filter((s) => s.items.length > 0);
}
