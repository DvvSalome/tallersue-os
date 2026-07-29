// Generador de datos FICTICIOS para previsualizar los dos dashboards.
//
// Es puro: construye los arreglos y no toca localStorage (eso lo hace
// replaceDemoData). Y es determinista: usa un PRNG con semilla fija, así que
// dos corridas producen exactamente el mismo grupo y se puede razonar sobre lo
// que aparece en pantalla.
//
// El diseño de la muestra es intencional para que los dashboards se vean como
// se verían de verdad:
//   - varias comunas por encima del umbral de k-anonimato (para que el mapa
//     colectivo muestre barras),
//   - una comuna por debajo (para ver el mensaje de supresión funcionando),
//   - un participante "protagonista" elegido por tener el perfil más variado,
//     para que la Brújula de ejemplo no se vea sintética (cuatro índices en 100
//     no le enseñan nada a nadie).

import {
  INSTRUMENTO_VERSION,
  ITEMS_CERRADOS,
  TOTAL_ITEMS_OBLIGATORIOS,
  camposAbiertos,
  type Item,
} from "@/lib/items";
import { categorize } from "@/lib/categorize";
import { calcularBrujula } from "@/lib/brujula";
import type { StoredValor } from "@/lib/respuestas";
import type {
  DemoEquipo,
  DemoRespuestaAbierta,
  DemoResponse,
  DemoUser,
} from "./types";

// ---------------------------------------------------------------- PRNG
// mulberry32: pequeño, determinista y suficiente para datos de muestra.
function crearRandom(semilla: number) {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = () => number;

function elegir<T>(rnd: Random, xs: readonly T[]): T {
  return xs[Math.floor(rnd() * xs.length)];
}

/** Elige con pesos: [valor, peso][]. */
function elegirPesado<T>(rnd: Random, opciones: readonly [T, number][]): T {
  const total = opciones.reduce((s, [, p]) => s + p, 0);
  let r = rnd() * total;
  for (const [valor, peso] of opciones) {
    r -= peso;
    if (r <= 0) return valor;
  }
  return opciones[opciones.length - 1][0];
}

function enteroEntre(rnd: Random, min: number, max: number) {
  return min + Math.floor(rnd() * (max - min + 1));
}

// ---------------------------------------------------------------- Muestra
const COMUNAS_MUESTRA: { id: number; participantes: number }[] = [
  { id: 1, participantes: 9 }, // Popular
  { id: 3, participantes: 8 }, // Manrique
  { id: 6, participantes: 7 }, // Doce de Octubre
  { id: 13, participantes: 6 }, // San Javier
  { id: 14, participantes: 3 }, // El Poblado — a propósito bajo el umbral (k=5)
];

const APODOS = [
  "Lucero", "Tato", "Manu", "Kiara", "Samu", "Vale", "Nico", "Dani", "Sofi",
  "Brayan", "Yuli", "Cami", "Maicol", "Estefa", "Juanjo", "Naty", "Sebas",
  "Melo", "Tefa", "Andres", "Kelly", "Duvan", "Marce", "Cris", "Yeimy",
  "Jhon", "Laura", "Edwin", "Paola", "Santi", "Mile", "Fredy", "Katy",
];

// Bancos de frases para los campos abiertos que el clasificador sabe agrupar.
// Cada frase está escrita para caer en una categoría distinta, de modo que el
// mapa colectivo muestre variedad real de temas.
const FRASES: Record<string, string[]> = {
  sueno_descripcion: [
    "Quiero estudiar enfermería en la universidad y ser la primera profesional de mi casa.",
    "Sueño con conseguir un trabajo estable que me permita ayudar en la casa.",
    "Quiero montar mi propio negocio de comidas rápidas en el barrio.",
    "Mi sueño es tener casa propia y dejar de pagar arriendo.",
    "Quiero ayudar a mi mamá y que mis hermanos puedan estudiar.",
    "Sueño con vivir de la música: canto y produzco desde el celular.",
    "Quiero viajar y conocer el mundo fuera del país.",
    "Me gustaría servir a mi comunidad y trabajar con los pelados del barrio.",
    "Quiero terminar el colegio y entrar al SENA a estudiar sistemas.",
  ],
  problema_principal_descripcion: [
    "La inseguridad: uno no puede salir de noche por los robos.",
    "El consumo de drogas en el parque, los niños ven eso desde chiquitos.",
    "No hay canchas ni espacios para hacer deporte.",
    "Falta de cupos en el colegio y de oportunidades para estudiar.",
    "Las basuras y la contaminación de la quebrada.",
    "El desempleo: los jóvenes no encuentran trabajo.",
    "La alcaldía nos tiene en abandono, prometen y no hacen nada.",
    "La discriminación por vivir en esta comuna.",
    "La violencia entre pandillas por las fronteras invisibles.",
  ],
  mensaje_decisores: [
    "Que nos escuchen antes de decidir por nosotros.",
    "Necesitamos oportunidades reales de empleo, no solo discursos.",
    "Inviertan en educación y en becas para los jóvenes.",
    "Inviertan en el barrio: en los parques y en las canchas.",
    "Queremos seguridad para poder salir tranquilos.",
    "Cumplan lo que prometen en campaña y no roben.",
    "Necesitamos apoyo en salud mental, hay mucha ansiedad.",
    "Que nos pregunten a nosotros, somos los que vivimos acá.",
  ],
  primer_paso_accion: [
    "Inscribirme a un curso del SENA este semestre.",
    "Arreglar mi hoja de vida y empezar a buscar empleo.",
    "Organizar mi horario para estudiar en las tardes.",
    "Hablar con alguien que me pueda asesorar y acompañar.",
    "Empezar a vender mis productos por redes.",
    "Ahorrar un poco cada semana para el semestre.",
  ],
  espacios_participacion_experiencia: [
    "Aprendí mucho y me gustó, conocí gente nueva.",
    "Fui representante del gobierno escolar y organicé actividades.",
    "Sentí que nada cambió, se perdió el tiempo.",
    "Solo fui una vez, no volví.",
    "Estuve en un voluntariado y fue muy chévere.",
  ],
};

/** Frases cortas para los campos abiertos sin reglas de clasificación: se
 *  guardan igual (quedan en el repositorio de texto) pero no se agregan. */
const FRASES_GENERICAS = [
  "Es lo que siento ahora mismo.",
  "Depende mucho del día y de cómo esté en la casa.",
  "Ya lo he intentado antes y esta vez quiero lograrlo.",
  "Me cuesta explicarlo pero es así.",
  "Creo que con apoyo sería más fácil.",
];

function valorParaItem(rnd: Random, item: Item, sesgo: "bajo" | "medio" | "alto"): StoredValor {
  if (item.tipo === "likert") {
    const pesos: Record<typeof sesgo, [string, number][]> = {
      bajo: [["1", 4], ["2", 5], ["3", 3], ["4", 1], ["5", 1]],
      medio: [["1", 1], ["2", 3], ["3", 5], ["4", 3], ["5", 1]],
      alto: [["1", 1], ["2", 1], ["3", 3], ["4", 5], ["5", 4]],
    };
    return { valor: elegirPesado(rnd, pesos[sesgo]) };
  }

  const opciones = item.opciones ?? [];
  // "Prefiero no responder" existe y debe aparecer, pero poco.
  const utilizables = opciones.filter((o) => !o.sinDato || rnd() < 0.04);

  if (item.tipo === "unica") {
    return { opcion: elegir(rnd, utilizables).value };
  }

  // multiple: "Ninguno/Ninguna" es excluyente, igual que en el formulario.
  const ninguno = utilizables.find((o) => o.ninguno);
  if (ninguno && rnd() < 0.15) {
    return { opciones: [ninguno.value] };
  }
  const normales = utilizables.filter((o) => !o.ninguno && !o.sinDato);
  const cuantas = Math.min(normales.length, enteroEntre(rnd, 1, 3));
  const mezcladas = [...normales].sort(() => rnd() - 0.5);
  return { opciones: mezcladas.slice(0, cuantas).map((o) => o.value) };
}

export type DatosDemo = {
  equipos: DemoEquipo[];
  users: DemoUser[];
  responses: DemoResponse[];
  abiertas: DemoRespuestaAbierta[];
  /** Participante cuya Brújula se abre al terminar de sembrar. */
  protagonistaId: string;
};

export function generarDatosFicticios(semilla = 20260728): DatosDemo {
  const rnd = crearRandom(semilla);
  const equipos: DemoEquipo[] = [];
  const users: DemoUser[] = [];
  const responses: DemoResponse[] = [];
  const abiertas: DemoRespuestaAbierta[] = [];

  const camposDeTexto = camposAbiertos();
  const ahora = Date.UTC(2026, 6, 28, 14, 0, 0);
  let apodoIdx = 0;

  COMUNAS_MUESTRA.forEach((comuna) => {
    const equipo: DemoEquipo = {
      id: `demo-equipo-${comuna.id}`,
      codigo: `DEMO${comuna.id.toString().padStart(2, "0")}`,
      nombre: `Grupo de muestra ${comuna.id}`,
      comunaId: comuna.id,
      activo: true,
      createdAt: new Date(ahora - 86400000 * 7).toISOString(),
    };
    equipos.push(equipo);

    for (let i = 0; i < comuna.participantes; i++) {
      const userId = `demo-user-${comuna.id}-${i}`;
      users.push({
        id: userId,
        apodo: APODOS[apodoIdx++ % APODOS.length],
        edad: enteroEntre(rnd, 14, 28),
        pais: "Colombia",
        ciudad: "Medellín",
        equipoId: equipo.id,
        // Autodeclarada: la mayoría vive donde ocurre el taller, pero un 25 %
        // viene de otra comuna. Sirve para comprobar que eso NO mueve los
        // agregados (que van por la comuna del equipo) y solo cambia las
        // líneas de atención que ve esa persona.
        comunaId: rnd() < 0.25 ? enteroEntre(rnd, 1, 16) : comuna.id,
        createdAt: new Date(ahora - 86400000 * enteroEntre(rnd, 1, 6)).toISOString(),
      });

      const sesgo = elegirPesado(rnd, [
        ["bajo", 3],
        ["medio", 5],
        ["alto", 3],
      ] as [("bajo" | "medio" | "alto"), number][]);

      // Un 15 % del grupo deja el instrumento a medias, como pasa en la vida real.
      const incompleto = rnd() < 0.15;
      const corte = incompleto ? enteroEntre(rnd, 5, 15) : Number.MAX_SAFE_INTEGER;

      const actualizado = new Date(ahora - 3600000 * enteroEntre(rnd, 1, 72)).toISOString();

      for (const item of ITEMS_CERRADOS) {
        if (item.item > corte) break;
        responses.push({
          userId,
          version: INSTRUMENTO_VERSION,
          bloque: item.bloque,
          item: item.item,
          tipo: item.tipo,
          valor: valorParaItem(rnd, item, sesgo),
          categoriaCodificada: null,
          updatedAt: actualizado,
        });
      }

      for (const campo of camposDeTexto) {
        if (campo.item.item > corte) continue;
        const banco = FRASES[campo.clave];
        // Los campos de observaciones son opcionales: no todos los llenan.
        const probabilidad = banco ? 0.85 : 0.35;
        if (rnd() > probabilidad) continue;
        const texto = banco ? elegir(rnd, banco) : elegir(rnd, FRASES_GENERICAS);
        abiertas.push({
          userId,
          version: INSTRUMENTO_VERSION,
          bloque: campo.item.bloque,
          item: campo.item.item,
          clave: campo.clave,
          texto,
          categoriaCodificada: categorize(campo.clave, texto),
          updatedAt: actualizado,
        });
      }
    }
  });

  const protagonistaId = elegirProtagonista(users, responses, abiertas);
  return { equipos, users, responses, abiertas, protagonistaId };
}

/** Elige, entre quienes completaron el instrumento, el perfil más ilustrativo:
 *  el que cubre más niveles distintos de índice (y, a igualdad, el que recibe
 *  más recomendaciones). Así la Brújula de ejemplo muestra a la vez recursos
 *  presentes y áreas por fortalecer, en lugar de todo en el mismo extremo. */
function elegirProtagonista(
  users: DemoUser[],
  responses: DemoResponse[],
  abiertas: DemoRespuestaAbierta[],
): string {
  let mejor = { id: users[0]?.id ?? "", niveles: -1, recomendaciones: -1 };

  for (const u of users) {
    const cerradas: Record<number, StoredValor> = {};
    for (const r of responses) if (r.userId === u.id) cerradas[r.item] = r.valor;
    const textos: Record<string, string> = {};
    for (const t of abiertas) if (t.userId === u.id) textos[t.clave] = t.texto;

    const brujula = calcularBrujula(cerradas, textos);
    if (!brujula.completo) continue;

    const niveles = new Set(brujula.indices.map((i) => i.nivel)).size;
    const recomendaciones = brujula.recomendaciones.length;
    if (
      niveles > mejor.niveles ||
      (niveles === mejor.niveles && recomendaciones > mejor.recomendaciones)
    ) {
      mejor = { id: u.id, niveles, recomendaciones };
    }
  }
  return mejor.id;
}

/** Resumen para mostrar en la página de siembra. */
export function resumirDatos(datos: DatosDemo) {
  const porComuna = new Map<number, number>();
  for (const u of datos.users) {
    porComuna.set(u.comunaId, (porComuna.get(u.comunaId) ?? 0) + 1);
  }
  const completos = datos.users.filter((u) => {
    const cerradas = datos.responses.filter((r) => r.userId === u.id).length;
    const puras = datos.abiertas.filter(
      (r) => r.userId === u.id && r.clave === "mensaje_decisores",
    ).length;
    return cerradas + puras === TOTAL_ITEMS_OBLIGATORIOS;
  }).length;

  return {
    participantes: datos.users.length,
    comunas: porComuna.size,
    porComuna,
    completos,
    respuestasCerradas: datos.responses.length,
    textosLibres: datos.abiertas.length,
  };
}
