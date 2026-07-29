-- ============================================================================
-- El Taller de los Sueños — datos maestros
-- Run AFTER schema.sql. Safe to re-run (upserts on natural keys).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Las 16 comunas de Medellín
-- ----------------------------------------------------------------------------
insert into public.comunas (id, nombre) values
  (1,  'Popular'),
  (2,  'Santa Cruz'),
  (3,  'Manrique'),
  (4,  'Aranjuez'),
  (5,  'Castilla'),
  (6,  'Doce de Octubre'),
  (7,  'Robledo'),
  (8,  'Villa Hermosa'),
  (9,  'Buenos Aires'),
  (10, 'La Candelaria'),
  (11, 'Laureles-Estadio'),
  (12, 'La América'),
  (13, 'San Javier'),
  (14, 'El Poblado'),
  (15, 'Guayabal'),
  (16, 'Belén')
on conflict (id) do update set nombre = excluded.nombre;

-- ----------------------------------------------------------------------------
-- 2. Catálogo del instrumento — VERSIÓN 2 (20 preguntas, 5 bloques)
-- ----------------------------------------------------------------------------
-- Refleja src/lib/items.ts. Las 14 filas de la v1 NO se tocan: quedan como
-- histórico para que las respuestas ya escritas conserven su significado
-- (doc §5). Publicar un instrumento nuevo = insertar una versión nueva aquí.
--
-- `tipo = 'texto'` marca las preguntas ABIERTAS PURAS (solo P20): su contenido
-- vive en `respuestas_abiertas`, no en `responses`. Los campos de
-- observaciones de las preguntas cerradas no son filas del catálogo: son
-- parte de la definición del ítem en items.ts y se guardan por `clave`.

insert into public.item_catalog (version, bloque, item, clave, tipo, etiqueta, dimension) values
  -- Bloque 1 — Identidad, Autoeficacia y Potencial
  (2, 1, 1,  'afrontamiento',            'unica',   'Cuando aparece una dificultad importante, ¿qué sueles hacer primero?',                                                              'agencia_personal'),
  (2, 1, 2,  'autoeficacia',             'likert',  '¿Qué tan capaz te sientes actualmente de hacer cosas concretas que te acerquen a tus metas?',                                       'agencia_personal'),
  (2, 1, 3,  'emocion_futuro',           'unica',   '¿Qué emoción predomina cuando piensas en tu futuro?',                                                                               'bienestar_prospectivo'),
  (2, 1, 4,  'mayor_fortaleza',          'unica',   '¿Cuál consideras que es hoy tu mayor fortaleza?',                                                                                   'agencia_personal'),
  -- Bloque 2 — Sueños, Derechos y Oportunidades
  (2, 2, 5,  'sueno_principal',          'multiple','¿Cuál es tu principal sueño actualmente?',                                                                                          'proyecto_vida'),
  (2, 2, 6,  'posibilidad_sueno',        'likert',  '¿Qué tan posible crees que es avanzar hacia ese sueño?',                                                                            'proyecto_vida'),
  (2, 2, 7,  'quien_ayuda',              'unica',   '¿Quién crees que más puede ayudarte a cumplir ese sueño?',                                                                          'capital_social'),
  (2, 2, 8,  'instituciones_conocidas',  'multiple','¿Conoces instituciones que apoyen a los jóvenes?',                                                                                  'capital_social'),
  -- Bloque 3 — Radar: Cartografía Personal y Territorial
  (2, 3, 9,  'habito_barrera',           'multiple','¿Qué hábito consideras que más te dificulta alcanzar tus metas?',                                                                    'contexto_transformacion'),
  (2, 3, 10, 'barreras_familiares',      'multiple','¿Qué situaciones familiares dificultan más tus proyectos?',                                                                          'contexto_transformacion'),
  (2, 3, 11, 'problemas_comunidad',      'multiple','¿Cuáles son los principales problemas de tu comunidad?',                                                                            'contexto_transformacion'),
  (2, 3, 12, 'institucion_exigida',      'multiple','¿Qué institución debería hacer más por los jóvenes?',                                                                               'ciudadania_activa'),
  -- Bloque 4 — Ciudadanía y Democracia
  (2, 4, 13, 'espacios_participacion',   'multiple','¿Has participado alguna vez en alguno de estos espacios?',                                                                          'ciudadania_activa'),
  (2, 4, 14, 'derecho_prioritario',      'unica',   '¿Qué derecho consideras que necesita mayor protección para los jóvenes?',                                                           'ciudadania_activa'),
  (2, 4, 15, 'confianza_institucional',  'likert',  '¿Qué tanto confías en que las instituciones públicas pueden responder de manera efectiva a las necesidades de la ciudadanía?',      'ciudadania_activa'),
  (2, 4, 16, 'prioridad_alcaldia',       'unica',   '¿Qué problema resolverías primero si fueras alcalde o alcaldesa?',                                                                   'ciudadania_activa'),
  -- Bloque 5 — Del Sueño a la Acción
  (2, 5, 17, 'primer_paso',              'unica',   '¿Cuál será el primer paso para acercarte a tu meta?',                                                                               'agencia_personal'),
  (2, 5, 18, 'necesidades_logro',        'multiple','¿Qué necesitas para lograrlo?',                                                                                                     'capital_social'),
  (2, 5, 19, 'intereses_iniciativas',    'multiple','¿En qué tipo de iniciativas te gustaría participar?',                                                                               'ciudadania_activa'),
  (2, 5, 20, 'mensaje_decisores',        'texto',   'Si pudieras enviar un mensaje a quienes toman decisiones sobre las juventudes, ¿qué les dirías?',                                    'ciudadania_activa')
on conflict (version, bloque, item) do update set
  clave = excluded.clave,
  tipo = excluded.tipo,
  etiqueta = excluded.etiqueta,
  dimension = excluded.dimension;

-- ----------------------------------------------------------------------------
-- 3. Líneas de atención — ejemplo de datos maestros
-- ----------------------------------------------------------------------------
-- comuna_id = NULL significa "disponible en todas las comunas" (líneas
-- nacionales/distritales). Ajusta/agrega filas específicas por comuna según
-- la información real que tenga el equipo del Taller.

insert into public.lineas_atencion (tipo, nombre, direccion, horario, telefono, comuna_id, color) values
  ('Salud mental',      'Línea Amiga 123 Social',            'Atención telefónica, cobertura Medellín', '24 horas, todos los días', '123',                 null, '#7c3aed'),
  ('Salud mental',      'Línea de la Vida',                  'Atención telefónica nacional',             '24 horas, todos los días', '106',                 null, '#7c3aed'),
  ('Violencia',         'Línea de Emergencias',              'Atención telefónica nacional',             '24 horas, todos los días', '123',                 null, '#dc2626'),
  ('Salud sexual',      'Secretaría de Salud - Salud Sexual','Atención telefónica y presencial',         'Lunes a viernes, 7am-4pm', '(604) 385 6000',      null, '#db2777'),
  ('Orientación general','Casa de Justicia',                 'Consulta la sede de tu comuna',            'Lunes a viernes, 8am-4pm', '(604) 385 8000',      null, '#2563eb'),
  ('Salud mental',      'Punto de Escucha Comuna 1 - Popular','Centro de Desarrollo Cultural Popular',   'Lunes a viernes, 8am-5pm', '(604) 385 1001',      1,    '#7c3aed'),
  ('Orientación general','Casa de la Juventud Santa Cruz',   'Cra 45 # 92-24, Santa Cruz',                'Lunes a sábado, 8am-6pm',  '(604) 385 1002',      2,    '#2563eb'),
  ('Salud mental',      'Punto de Escucha Manrique',         'Biblioteca Pública León de Greiff',         'Lunes a viernes, 8am-5pm', '(604) 385 1003',      3,    '#7c3aed'),
  ('Orientación general','Casa de la Cultura Aranjuez',      'Cra 45 # 94-15, Aranjuez',                  'Lunes a viernes, 8am-5pm', '(604) 385 1004',      4,    '#2563eb'),
  ('Salud sexual',      'IPS Comuna 5 - Castilla',           'Cl 92 # 65-30, Castilla',                   'Lunes a viernes, 7am-3pm', '(604) 385 1005',      5,    '#db2777'),
  ('Orientación general','Casa de la Juventud Doce de Octubre','Cl 106 # 60-10, Doce de Octubre',        'Lunes a sábado, 8am-6pm',  '(604) 385 1006',      6,    '#2563eb'),
  ('Salud mental',      'Punto de Escucha Robledo',           'Biblioteca Pública Tomás Carrasquilla',   'Lunes a viernes, 8am-5pm', '(604) 385 1007',      7,    '#7c3aed'),
  ('Violencia',         'Comisaría de Familia Villa Hermosa', 'Cl 51 # 30-30, Villa Hermosa',             'Lunes a viernes, 8am-4pm', '(604) 385 1008',      8,    '#dc2626'),
  ('Orientación general','Casa de la Cultura Buenos Aires',  'Cra 25 # 35-30, Buenos Aires',              'Lunes a viernes, 8am-5pm', '(604) 385 1009',      9,    '#2563eb'),
  ('Salud mental',      'Punto de Escucha La Candelaria',    'Parque de Bolívar, Centro',                 'Lunes a viernes, 8am-5pm', '(604) 385 1010',      10,   '#7c3aed'),
  ('Orientación general','Casa de la Juventud Laureles',     'Cra 70 # 44-30, Laureles',                  'Lunes a sábado, 8am-6pm',  '(604) 385 1011',      11,   '#2563eb'),
  ('Salud sexual',      'IPS Comuna 12 - La América',        'Cl 44 # 87-20, La América',                 'Lunes a viernes, 7am-3pm', '(604) 385 1012',      12,   '#db2777'),
  ('Violencia',         'Comisaría de Familia San Javier',    'Cra 98 # 34-40, San Javier',                'Lunes a viernes, 8am-4pm', '(604) 385 1013',      13,   '#dc2626'),
  ('Orientación general','Casa de la Cultura El Poblado',    'Cra 43A # 14-45, El Poblado',               'Lunes a viernes, 8am-5pm', '(604) 385 1014',      14,   '#2563eb'),
  ('Salud mental',      'Punto de Escucha Guayabal',          'Biblioteca Pública Guayabal',              'Lunes a viernes, 8am-5pm', '(604) 385 1015',      15,   '#7c3aed'),
  ('Orientación general','Casa de la Juventud Belén',         'Cl 30A # 82-40, Belén',                    'Lunes a sábado, 8am-6pm',  '(604) 385 1016',      16,   '#2563eb')
on conflict do nothing;
