-- ============================================================================
-- ARREGLO URGENTE — pegar en el SQL Editor de Supabase y ejecutar
-- ============================================================================
-- Qué arregla: el análisis grupal abortaba con
--     invalid input syntax for type numeric: "busco_informacion"
-- y el mapa colectivo quedaba vacío pese a haber respuestas.
--
-- Causa: en `v_group_analysis_closed` el promedio de las escalas estaba escrito
-- como  case when tipo='likert' then avg(opcion::numeric) end.  Postgres evalúa
-- el argumento del agregado en TODAS las filas del grupo antes de resolver el
-- CASE externo, así que intentaba convertir a número las opciones de texto de
-- las preguntas de selección.
--
-- Por qué no se había visto: la consulta solo llega a evaluar el promedio en
-- grupos que superan el umbral de k-anonimato. Con menos de 5 respondientes
-- nunca se ejecutaba. Es decir, habría fallado el día que un grupo real llegara
-- a 5 respuestas.
--
-- El arreglo mueve el CASE DENTRO del avg(), donde el cast solo se evalúa en las
-- filas de tipo likert.
--
-- Es idempotente y no toca datos: solo reemplaza la definición de la función.
-- ============================================================================

drop function if exists public.v_group_analysis_closed();

create or replace function public.v_group_analysis_closed()
returns table (
  bloque smallint,
  item smallint,
  equipo_id uuid,
  equipo_codigo text,
  equipo_nombre text,
  tipo text,
  opcion text,
  n integer,
  total_grupo integer,
  porcentaje numeric,
  promedio numeric
)
language sql stable as $$
  with base as (
    select
      r.bloque, r.item, r.tipo, e.id as equipo_id, e.codigo as equipo_codigo,
      e.nombre as equipo_nombre, r.valor, r.user_id
    from public.responses r
    join public.users u on u.id = r.user_id
    join public.equipos e on e.id = u.equipo_id
    where r.tipo in ('likert', 'multiple', 'unica')
      and r.version = public.instrumento_version_actual()
  ),
  grupo_counts as (
    select bloque, item, equipo_id, count(distinct user_id) as total_grupo
    from base
    group by bloque, item, equipo_id
  ),
  eligible as (
    select * from grupo_counts where total_grupo >= 5
  ),
  exploded as (
    select b.bloque, b.item, b.tipo, b.equipo_id, b.equipo_codigo, b.equipo_nombre, b.user_id,
      case
        when b.tipo = 'unica' then b.valor->>'opcion'
        when b.tipo = 'likert' then b.valor->>'valor'
        else opt.value
      end as opcion
    from base b
    left join lateral jsonb_array_elements_text(
      case when b.tipo = 'multiple' then b.valor->'opciones' else '[]'::jsonb end
    ) as opt(value) on b.tipo = 'multiple'
  )
  select
    e.bloque, e.item, e.equipo_id, e.equipo_codigo, e.equipo_nombre, e.tipo, e.opcion,
    count(*)::int as n,
    el.total_grupo::int,
    round(100.0 * count(*) / nullif(el.total_grupo, 0), 1) as porcentaje,
    -- El CASE va DENTRO del avg(): así el cast a numeric solo se evalúa en las
    -- filas de escala y nunca sobre una opción de texto.
    round(avg(case when e.tipo = 'likert' then e.opcion::numeric end), 2) as promedio
  from exploded e
  join eligible el on el.bloque = e.bloque and el.item = e.item and el.equipo_id = e.equipo_id
  where e.opcion is not null
  group by e.bloque, e.item, e.equipo_id, e.equipo_codigo, e.equipo_nombre,
           e.tipo, e.opcion, el.total_grupo;
$$;

revoke execute on function public.v_group_analysis_closed() from public, anon;
grant execute on function public.v_group_analysis_closed() to authenticated;

-- Comprobación: debe devolver 0 filas (ninguna opción de texto se cuela como
-- promedio) y no lanzar error.
select count(*) as filas_del_analisis from public.v_group_analysis_closed();
