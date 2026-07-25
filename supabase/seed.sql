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
-- 2. Catálogo de los 14 ítems (4 bloques)
-- ----------------------------------------------------------------------------
insert into public.item_catalog (bloque, item, clave, tipo, etiqueta) values
  -- Bloque 1 — Autoevaluación emocional
  (1, 1,  'estado_animo',        'likert',  '¿Cómo te sientes hoy? (1 = muy mal, 5 = muy bien)'),
  (1, 2,  'fortalezas',          'multiple','¿Cuáles son tus fortalezas?'),
  (1, 3,  'palabra_representa',  'texto',   'Una palabra que te representa'),
  (1, 4,  'sabor',               'multiple','Si tu momento actual fuera un sabor, ¿cuál sería?'),
  -- Bloque 2 — Diagnóstico territorial
  (2, 5,  'necesidades_barrio',  'multiple','¿Qué necesita tu barrio?'),
  (2, 6,  'necesidad_principal', 'unica',   'De todo lo anterior, ¿cuál es la necesidad principal?'),
  (2, 7,  'evidencia',           'adjunto', 'Sube una evidencia (foto) de esa necesidad'),
  -- Bloque 3 — Visión temporal
  (3, 8,  'cuando_cambio',       'multiple','¿Cuándo te gustaría ver ese cambio?'),
  (3, 9,  'recursos_necesarios', 'multiple','¿Qué recursos se necesitan para lograrlo?'),
  (3, 10, 'quien_apoyaria',      'multiple','¿Quién podría apoyar este cambio?'),
  (3, 11, 'sintesis_personal',   'texto',   'Resume tu visión en una frase (máx. 200 caracteres)'),
  -- Bloque 4 — Propuestas colectivas
  (4, 12, 'idea_cambio',         'texto',   '¿Cuál es tu idea de cambio para el barrio?'),
  (4, 13, 'donde_implementar',   'multiple','¿Dónde se podría implementar esta idea?'),
  (4, 14, 'pacto_compromiso',    'texto',   'Tu pacto o compromiso personal')
on conflict (bloque, item) do update set
  clave = excluded.clave, tipo = excluded.tipo, etiqueta = excluded.etiqueta;

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
