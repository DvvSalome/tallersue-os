// Astronauta flotando con lluvia de estrellas, para el fondo de la portada.
// Adaptado de Uiverse.io (JkHuger, licencia MIT).
//
// Tres cambios respecto al original, por accesibilidad y rendimiento:
//
// 1. `aria-hidden` y `pointer-events-none`: es decoración. Un lector de pantalla
//    no debe anunciar treinta divs vacíos, y el astronauta no debe robar clics
//    a los botones de la portada.
// 2. Respeta `prefers-reduced-motion`: quien pidió menos movimiento en su
//    sistema ve la escena quieta. El original gira sin parar, y una rotación
//    permanente puede marear o disparar migraña.
// 3. Se oculta en pantallas chicas: el original posiciona estrellas con
//    coordenadas fijas hasta 1480px, que en un teléfono quedan fuera de vista o
//    apiladas. En móvil el fondo se queda con el degradado.

const POSICIONES = [
  { top: 30, left: 20 },
  { top: 110, left: 250 },
  { top: 60, left: 570 },
  { top: 120, left: 900 },
  { top: 20, left: 1120 },
  { top: 90, left: 1280 },
  { top: 30, left: 1480 },
];

/** Cada capa repite el mismo patrón de estrellas con un desfase distinto, así
 *  la lluvia no se percibe como un ciclo. */
const CAPAS = [
  { animationDelay: "0s" },
  { animationDelay: "-1.64s" },
  { animationDelay: "-2.30s" },
  { animationDelay: "-3.30s" },
];

export function Astronauta() {
  return (
    <div
      aria-hidden
      className="astronauta-escena pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden md:block"
    >
      {CAPAS.map((capa, i) => (
        <div key={i} className="caja-estrellas" style={capa}>
          {POSICIONES.map((p, j) => (
            <span key={j} className="estrella" style={{ top: p.top, left: p.left }} />
          ))}
        </div>
      ))}

      <div className="astronauta">
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
  );
}
