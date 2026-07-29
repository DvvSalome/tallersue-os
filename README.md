# El Taller de los Sueños

Sistema de orientación personal e inteligencia cívica para jóvenes en
Medellín — instrumento de **5 bloques / 20 preguntas** más dos dashboards:
*Mi Brújula de los Sueños* (personal y privado) y *Nuestro Mapa de los Sueños*
(colectivo y anónimo). Los participantes entran con un
**código de equipo** (sin cuenta personal, vía Supabase Anonymous Auth); los
facilitadores crean esos códigos y ven el dashboard. Next.js (App Router) +
Supabase (Postgres, Auth, Storage), desplegado en Vercel.

## Setup

Sigue **[SUPABASE_SETUP.html](./SUPABASE_SETUP.html)** para crear el proyecto
de Supabase, cargar el schema y los datos maestros, y crear cuentas de
facilitador. Para migrar de demo a Supabase, ver
**[MIGRACION_DEMO_A_SUPABASE.html](./MIGRACION_DEMO_A_SUPABASE.html)**. Resumen rápido si Supabase ya está provisionado y `.env.local`
existe:

```bash
npm install
npm run db:migrate   # aplica supabase/schema.sql + supabase/seed.sql
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura

- `src/app/participar/` — un participante entra con código de equipo + apodo +
  edad + su comuna (sin contraseña visible: el servidor le crea credenciales sintéticas y abre la
  sesión, así no hay nada que habilitar a mano en Supabase).
- `src/app/home/`, `formulario/`, `resultados/` — flujo del participante
  (líneas de atención, las 20 preguntas y su Brújula personal).
- `src/app/facilitador/` — login con contraseña + dashboard (participantes,
  Nuestro Mapa, y `equipos/` para crear/gestionar códigos de equipo).
- `src/lib/items.ts` — fuente única de verdad del instrumento: 5 bloques,
  20 preguntas, opciones parametrizadas, campo opcional de observaciones por
  pregunta y la dimensión a la que aporta cada una.
- `src/lib/brujula.ts` — motor del dashboard personal: los 5 índices, el FODA,
  el perfil de liderazgo y las recomendaciones (máximo 3).
- `src/lib/mapa-colectivo.ts` — qué preguntas alimentan cada pregunta
  colectiva del dashboard grupal.
- `src/lib/analisis-grupal.ts` — contrato compartido de los agregados y el
  umbral de k-anonimato.
- `src/lib/respuestas.ts` — forma de almacenamiento de una respuesta cerrada,
  accesores y validación de entrada.
- `src/lib/categorize.ts` — clasificador por palabras clave para texto libre
  (nunca se expone el texto crudo en los agregados grupales).
- `src/lib/team-code.ts` — generador del código corto que identifica a un
  equipo.
- `supabase/schema.sql` — tablas (incl. `equipos`), RLS, vistas/funciones de
  análisis, bucket de Storage.
- `supabase/seed.sql` — 16 comunas de Medellín, catálogo de ítems, líneas de
  atención de ejemplo.
- `scripts/create-facilitador.mjs` — crea una cuenta de facilitador/organizador
  (código de grupo + contraseña compartida). Los códigos de equipo para
  participantes se crean desde el panel, no por script.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:migrate` | Corre `schema.sql` + `seed.sql` contra Supabase |
| `npm run facilitador:create -- <codigo> <password> [comuna_id\|all] [nombre]` | Crea un facilitador |
| `npm run verify:catalog` | Comprueba que `items.ts` y `seed.sql` describan el mismo instrumento |

## Deploy

El proyecto está enlazado a Vercel con Supabase provisionado vía Marketplace
(variables de entorno ya sincronizadas):

```bash
vercel deploy          # preview
vercel deploy --prod   # producción
```

## Reglas de negocio del instrumento

Vienen del Documento Técnico de Implementación y están codificadas, no solo
documentadas:

1. **Instrumento versionado.** `item_catalog` y `responses` llevan `version`.
   Publicar preguntas nuevas es insertar una versión nueva, nunca reinterpretar
   filas ya escritas: la v1 (14 ítems) queda intacta como histórico. Cambiar el
   cuestionario en sitio está explícitamente descartado.

2. **Las respuestas abiertas se almacenan aparte.** Las cerradas van a
   `responses`; todo el texto libre —los campos de observaciones y la pregunta
   abierta pura P20— va a `respuestas_abiertas`, sin duplicarse. Ese
   repositorio queda disponible para el análisis posterior con IA que plantea
   el documento; el dashboard en vivo no depende de ningún proveedor externo.

3. **Anonimización antes de agregar.** Ningún agregado se muestra para una
   comuna con menos de 5 respuestas (`K_ANON_MIN`, replicado en las funciones
   SQL), y del texto libre solo se publica la categoría codificada, nunca lo
   que escribió una persona. La exportación del facilitador no incluye apodo,
   `user_id` ni texto crudo.

4. **Sin datos ≠ puntaje bajo.** Un índice sin respuestas suficientes devuelve
   `null` y se muestra como "sin datos suficientes". "Prefiero no responder"
   nunca se cuenta como puntaje bajo.

5. **Registro no diagnóstico.** El dashboard personal no etiqueta, no predice y
   no patologiza. Todo el texto que se muestra sale del motor de reglas de
   `brujula.ts`, acotado a reconocer ("Identificas…"), orientar ("Podría ser
   útil…"), movilizar ("Un siguiente paso posible…") y devolver agencia
   ("Puedes decidir…"). El perfil de liderazgo se presenta como orientación de
   este momento, no como definición de la persona.

6. **La comuna no es un concepto del taller.** La declara el participante al
   entrar y su único uso es filtrar `lineas_atencion` para mostrarle puntos de
   apoyo cerca de donde vive. No controla el acceso del facilitador (ninguna
   política de RLS la mira) ni aparece en el instrumento. El eje territorial de
   los agregados es la comuna del `equipo`, que el facilitador asigna al crear
   el código y que es independiente de dónde viva cada joven.

   Cuidado al tocar las políticas de `users`: no deben referenciar `equipos`,
   porque la política de `equipos` referencia `users` y el ciclo hace que
   Postgres falle en tiempo de consulta con *infinite recursion detected in
   policy for relation users*, rompiendo toda escritura del participante.

7. **Reglas parametrizadas.** Pesos de los índices, puntajes por opción y la
   matriz *hallazgo → necesidad → recurso → acción* están declarados como
   tablas de datos al inicio de cada sección de `brujula.ts`. Ajustar la
   métrica es editar una tabla.
