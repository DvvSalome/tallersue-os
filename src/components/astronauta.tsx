// Escena espacial del fondo de la portada: varios astronautas volando por
// distintas zonas, un par de planetas a la deriva y un cielo de estrellas.
// El astronauta base es de Uiverse.io (JkHuger, licencia MIT); el resto —la
// bandada, las trayectorias, los planetas— es propio.
//
// Decisiones de accesibilidad y rendimiento:
//
// 1. `aria-hidden` y `pointer-events-none`: es decoración. Un lector de
//    pantalla no debe anunciar treinta divs vacíos, y nada de esto debe robar
//    clics a los botones reales de la portada.
// 2. Respeta `prefers-reduced-motion`: quien pidió menos movimiento en su
//    sistema ve la escena quieta. Varios elementos moviéndose a distintas
//    velocidades es más intenso que uno solo, así que aquí importa más que
//    antes.
// 3. Posiciones y trayectorias en porcentaje/vw/vh, nunca en píxeles fijos.
//    La versión anterior fijaba estrellas hasta 1480px y por eso se ocultaba
//    en pantallas chicas; con unidades relativas se ve bien en un teléfono de
//    320px y en un monitor ancho con el mismo código.
// 4. Cada astronauta anima `translate` (vuelo) y cada figura interna anima
//    `rotate` (giro) como propiedades CSS independientes de `transform` —así
//    no compiten por la misma propiedad y una no le puede pisar la animación
//    a la otra.

type Vuelo = {
  /** Posición de partida, en % del contenedor. */
  top: number;
  left: number;
  /** Cuánto se desplaza en el punto más lejano de su vuelta, en vw/vh. */
  dx: number;
  dy: number;
  /** Duración del vuelo y del giro sobre sí mismo, para que no coincidan. */
  duracionVuelo: number;
  duracionGiro: number;
  retraso: number;
  escala: number;
  opacidad: number;
  giroInverso?: boolean;
};

const BANDADA: Vuelo[] = [
  { top: 14, left: 8, dx: 20, dy: 12, duracionVuelo: 34, duracionGiro: 30, retraso: 0, escala: 0.55, opacidad: 0.55 },
  { top: 58, left: 82, dx: -16, dy: -18, duracionVuelo: 27, duracionGiro: 19, retraso: -6, escala: 0.36, opacidad: 0.4, giroInverso: true },
  { top: 76, left: 20, dx: 14, dy: -10, duracionVuelo: 41, duracionGiro: 33, retraso: -18, escala: 0.3, opacidad: 0.35 },
  { top: 24, left: 88, dx: -12, dy: 16, duracionVuelo: 23, duracionGiro: 25, retraso: -11, escala: 0.44, opacidad: 0.45, giroInverso: true },
];

/** Planetas de fondo: circulitos que derivan muy despacio, sin girar. */
const PLANETAS = [
  { top: 20, left: 68, tam: 46, color1: "#c4b5fd", color2: "#5b21b6", dx: 4, dy: 3, duracion: 52 },
  { top: 70, left: 12, tam: 30, color1: "#ffd9a8", color2: "#c2703d", dx: -3, dy: -4, duracion: 60 },
];

/** Estrellas fijas (deterministas, para que el servidor y el cliente rendericen
 *  lo mismo): posición en % + un desfase de titileo. */
const ESTRELLAS = [
  { top: 8, left: 12 }, { top: 15, left: 34 }, { top: 6, left: 58 }, { top: 22, left: 76 },
  { top: 12, left: 92 }, { top: 35, left: 6 }, { top: 42, left: 46 }, { top: 30, left: 88 },
  { top: 52, left: 22 }, { top: 60, left: 64 }, { top: 48, left: 96 }, { top: 68, left: 40 },
  { top: 82, left: 8 }, { top: 88, left: 55 }, { top: 78, left: 30 }, { top: 92, left: 78 },
  { top: 5, left: 20 }, { top: 44, left: 12 }, { top: 66, left: 90 }, { top: 90, left: 15 },
];

export function Astronauta() {
  return (
    <div
      aria-hidden
      className="astronauta-escena pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="cielo">
        {ESTRELLAS.map((e, i) => (
          <span
            key={i}
            className="estrellita"
            style={{ top: `${e.top}%`, left: `${e.left}%`, animationDelay: `${(i % 7) * 0.6}s` }}
          />
        ))}
      </div>

      {PLANETAS.map((p, i) => (
        <div
          key={i}
          className="planeta"
          style={
            {
              top: `${p.top}%`,
              left: `${p.left}%`,
              width: p.tam,
              height: p.tam,
              background: `radial-gradient(circle at 32% 30%, ${p.color1}, ${p.color2} 70%)`,
              "--dx": `${p.dx}vw`,
              "--dy": `${p.dy}vh`,
              animationDuration: `${p.duracion}s`,
            } as React.CSSProperties
          }
        />
      ))}

      <div className="bandada">
        {BANDADA.map((v, i) => (
          <div
            key={i}
            className="astronauta-vuelo"
            style={
              {
                top: `${v.top}%`,
                left: `${v.left}%`,
                "--dx": `${v.dx}vw`,
                "--dy": `${v.dy}vh`,
                animationDuration: `${v.duracionVuelo}s`,
                animationDelay: `${v.retraso}s`,
              } as React.CSSProperties
            }
          >
            <div
              className="astronauta"
              style={
                {
                  "--escala": v.escala,
                  "--opacidad": v.opacidad,
                  animationDuration: `${v.duracionGiro}s`,
                  animationDirection: v.giroInverso ? "reverse" : "normal",
                } as React.CSSProperties
              }
            >
              <div className="cabeza" />
              <div className="brazo brazo-izq" />
              <div className="brazo brazo-der" />
              <div className="cuerpo">
                <div className="panel" />
              </div>
              <div className="pierna pierna-izq" />
              <div className="pierna pierna-der" />
              <div className="mochila" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
