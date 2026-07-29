-- ============================================================================
-- El Taller de los Sueños — Supabase schema
-- ============================================================================
-- Run this whole file once in the Supabase SQL Editor (or `supabase db push`).
-- It is idempotent-ish (uses IF NOT EXISTS / OR REPLACE) so re-running after
-- a partial failure is safe, EXCEPT for the RLS policies section, which drops
-- and recreates policies by name.
--
-- Participants join with a TEAM CODE (no personal password) — see `equipos`
-- below. Auth is Supabase Anonymous Sign-in (Authentication → Providers →
-- "Allow anonymous sign-ins" must be enabled in the dashboard; this cannot be
-- toggled from SQL). Facilitadores keep password-based login (synthetic
-- email + shared password per group), unaffected by this.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. COMUNAS (lookup) — the 16 comunas of Medellín
-- ============================================================================

create table if not exists public.comunas (
  id smallint primary key,
  nombre text not null unique
);

-- ============================================================================
-- 2. FACILITADORES — separate login, código de grupo + shared password
-- ============================================================================
-- A synthetic email per grupo (<codigo_grupo>@facilitadores.tallerdelossuenos.local),
-- password shared by the whole group. comuna_id = NULL means the facilitador
-- can see ALL comunas (e.g. a coordinador general); otherwise scoped to one
-- comuna. Facilitadores also act as "organizadores": they create/manage the
-- team codes (`equipos`) participants join with.

create table if not exists public.facilitadores (
  id uuid primary key references auth.users (id) on delete cascade,
  codigo_grupo text not null unique,
  comuna_id smallint references public.comunas (id),
  nombre text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 3. EQUIPOS — team codes participants join with (no personal password)
-- ============================================================================

create table if not exists public.equipos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text,
  comuna_id smallint not null references public.comunas (id),
  activo boolean not null default true,
  created_by uuid references public.facilitadores (id),
  created_at timestamptz not null default now()
);

create index if not exists equipos_comuna_idx on public.equipos (comuna_id);

-- ============================================================================
-- 4. USERS — participantes (anonymous auth; identity = equipo + apodo)
-- ============================================================================
-- Participants authenticate via Supabase Anonymous Sign-in
-- (supabase.auth.signInAnonymously()) — no email, no personal password. The
-- app links the resulting anonymous auth.users row to a public.users row
-- right after sign-in. apodo is unique per equipo (two different teams may
-- reuse the same nickname; within one team it must be unique).
--
-- comuna_id is SELF-DECLARED by the participant when they join, and it has ONE
-- purpose: filtering `lineas_atencion` so they see support points near where
-- they live. It deliberately drives NOTHING about the workshop — not what their
-- facilitador can see, not how the group analysis is grouped. The territorial
-- unit of the workshop is the `equipo` (and the comuna the facilitador assigned
-- to it when creating the code), so a participant who lives somewhere else is
-- still part of the group they actually attended.

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  apodo text not null,
  edad smallint not null check (edad between 9 and 35),
  pais text not null default 'Colombia',
  ciudad text not null default 'Medellín',
  equipo_id uuid references public.equipos (id),
  comuna_id smallint not null references public.comunas (id),
  created_at timestamptz not null default now()
);

-- Migration path for installs created before `equipos` existed: add the
-- column (no-op on a fresh install, since it's already in the CREATE TABLE
-- above), drop the old comuna-scoped uniqueness rule, and require
-- equipo_id going forward. Safe to assume no pre-existing NULL rows here —
-- participants previously used a password login that has been removed
-- entirely in favor of team codes, so any prior participant rows are stale
-- test data, not real submissions to preserve.
alter table public.users add column if not exists equipo_id uuid references public.equipos (id);
drop index if exists users_apodo_comuna_unique;
delete from public.users where equipo_id is null;
alter table public.users alter column equipo_id set not null;

create unique index if not exists users_apodo_equipo_unique
  on public.users (equipo_id, lower(apodo));

-- ============================================================================
-- 5. RESPONSES — one row per item answered
-- ============================================================================
-- bloque: 1..4 , item: 1..14 (global item number, see item_catalog below)
-- tipo: 'likert' | 'multiple' | 'unica' | 'texto' | 'adjunto'
-- valor: jsonb so every item type fits the same column
--   likert  -> {"valor": 1..5}
--   multiple-> {"opciones": ["a","b"]}
--   unica   -> {"opcion": "a"}
--   texto   -> {"texto": "..."}
--   adjunto -> {"url": "...", "mime": "image/jpeg"}  (file stored in Storage)

-- The instrument is VERSIONED (doc §5: "La arquitectura deberá permitir
-- incorporar nuevos bloques, preguntas o escalas psicométricas sin afectar la
-- información histórica"). Publishing a new questionnaire means inserting a
-- new `version` in item_catalog — never rewriting the meaning of rows that
-- were already answered. v1 = the original 14-item instrument; v2 = the
-- 20-question / 5-block instrument of the Documento Técnico.

create table if not exists public.item_catalog (
  version smallint not null default 1,
  bloque smallint not null,
  item smallint not null,
  clave text not null,
  tipo text not null check (tipo in ('likert', 'multiple', 'unica', 'texto', 'adjunto')),
  etiqueta text not null,
  -- one of the six dimensions of the "Arquitectura de variables"
  dimension text,
  primary key (version, bloque, item)
);

-- Migration path for installs created before versioning existed.
alter table public.item_catalog add column if not exists version smallint not null default 1;
alter table public.item_catalog add column if not exists dimension text;
alter table public.item_catalog drop constraint if exists item_catalog_pkey;
alter table public.item_catalog add primary key (version, bloque, item);

-- Answered CLOSED questions only (likert / multiple / unica). Free text lives
-- in `respuestas_abiertas` — see section 5b. 'texto' and 'adjunto' stay in the
-- CHECK so v1 rows remain valid and readable.
create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  version smallint not null default 1,
  bloque smallint not null,
  item smallint not null,
  tipo text not null check (tipo in ('likert', 'multiple', 'unica', 'texto', 'adjunto')),
  valor jsonb not null,
  -- v1 only: coded category of a free-text answer stored in this table.
  -- From v2 on, text and its category live in `respuestas_abiertas`.
  categoria_codificada text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, bloque, item)
);

alter table public.responses add column if not exists version smallint not null default 1;
-- Existing rows keep version 1 (they answered the v1 instrument); new writes
-- default to the current version.
alter table public.responses alter column version set default 2;
-- La unicidad pasa de (user_id, bloque, item) a (user_id, version, bloque,
-- item). Si la restricción vieja sobreviviera, un participante que ya
-- respondió el ítem 1 de la v1 NO podría responder el ítem 1 de la v2. Se
-- elimina por definición (columnas exactas) y no por nombre, porque el nombre
-- autogenerado puede variar entre instalaciones.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'responses'
      and con.contype = 'u'
      and (
        select array_agg(att.attname::text order by att.attname)
        from unnest(con.conkey) as k(attnum)
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
      ) = array['bloque', 'item', 'user_id']
  loop
    execute format('alter table public.responses drop constraint %I', c.conname);
  end loop;
end $$;

create unique index if not exists responses_user_version_item_unique
  on public.responses (user_id, version, bloque, item);

create index if not exists responses_user_idx on public.responses (user_id);
create index if not exists responses_bloque_idx on public.responses (bloque);
create index if not exists responses_version_idx on public.responses (version);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists responses_touch_updated_at on public.responses;
create trigger responses_touch_updated_at
  before update on public.responses
  for each row execute function public.touch_updated_at();

-- Which instrument version the app should read/aggregate. Derived from the
-- catalog so the views never hardcode a number.
create or replace function public.instrumento_version_actual()
returns smallint language sql stable as $$
  select coalesce(max(version), 1)::smallint from public.item_catalog;
$$;

-- ============================================================================
-- 5b. RESPUESTAS_ABIERTAS — repositorio independiente de texto libre
-- ============================================================================
-- Doc §2: "Todas las preguntas abiertas deberán almacenarse independientemente
-- de las respuestas cerradas para permitir análisis posteriores mediante IA."
-- Doc §5: "Las respuestas abiertas deberán almacenarse en un repositorio
-- independiente para facilitar análisis posteriores con IA y procesamiento de
-- lenguaje natural."
--
-- Contiene DOS cosas, ambas opcionales salvo P20:
--   - el campo de observaciones de una pregunta cerrada (clave propia, p. ej.
--     'afrontamiento_motivo'),
--   - las preguntas abiertas puras (P20 'mensaje_decisores'), que NO se
--     duplican en `responses`.
-- `categoria_codificada` la calcula el servidor (src/lib/categorize.ts); el
-- análisis grupal expone SOLO esa categoría, nunca el texto.

create table if not exists public.respuestas_abiertas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  version smallint not null default 2,
  bloque smallint not null,
  item smallint not null,
  clave text not null,
  texto text not null,
  categoria_codificada text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, version, clave)
);

create index if not exists respuestas_abiertas_user_idx on public.respuestas_abiertas (user_id);
create index if not exists respuestas_abiertas_clave_idx on public.respuestas_abiertas (clave);
create index if not exists respuestas_abiertas_categoria_idx
  on public.respuestas_abiertas (categoria_codificada);

drop trigger if exists respuestas_abiertas_touch_updated_at on public.respuestas_abiertas;
create trigger respuestas_abiertas_touch_updated_at
  before update on public.respuestas_abiertas
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 6. LINEAS_ATENCION — support/hotline points shown on the participant home
-- ============================================================================

create table if not exists public.lineas_atencion (
  id uuid primary key default gen_random_uuid(),
  tipo text not null, -- e.g. 'Salud mental', 'Salud sexual', 'Violencia', 'Orientación general'
  nombre text not null,
  direccion text,
  horario text,
  telefono text,
  comuna_id smallint references public.comunas (id), -- NULL = disponible en todas las comunas
  color text not null default '#2563eb', -- hex, used for the card accent
  created_at timestamptz not null default now()
);

create index if not exists lineas_atencion_comuna_idx on public.lineas_atencion (comuna_id);

-- ============================================================================
-- 7. Helper views for the facilitador dashboard
-- ============================================================================

-- Progress per participant, for the CURRENT instrument version. Answered
-- questions come from two tables because closed and open answers are stored
-- separately: `responses` (closed) plus the pure-open questions of
-- `respuestas_abiertas` (tipo = 'texto' in the catalog, e.g. P20). The
-- observation fields attached to a closed question are optional and do NOT
-- count toward completion.
drop view if exists public.v_participant_progress;
create view public.v_participant_progress as
with v as (
  select public.instrumento_version_actual() as version
),
total_items as (
  select count(*)::int as n
  from public.item_catalog ic, v
  where ic.version = v.version
),
cerradas as (
  select r.user_id,
         count(*)::int as n,
         max(r.bloque) as bloque_max,
         max(r.updated_at) as ultima
  from public.responses r, v
  where r.version = v.version
  group by r.user_id
),
abiertas_puras as (
  select ra.user_id,
         count(*)::int as n,
         max(ra.bloque) as bloque_max,
         max(ra.updated_at) as ultima
  from public.respuestas_abiertas ra
  join v on ra.version = v.version
  join public.item_catalog ic
    on ic.version = ra.version
   and ic.bloque = ra.bloque
   and ic.item = ra.item
   and ic.clave = ra.clave
   and ic.tipo = 'texto'
  where length(btrim(ra.texto)) > 0
  group by ra.user_id
)
select
  u.id as user_id,
  u.apodo,
  u.edad,
  -- Comuna del EQUIPO (unidad territorial del taller), no la autodeclarada por
  -- el participante: esa última es solo para sus líneas de atención.
  e.comuna_id,
  c.nombre as comuna_nombre,
  (coalesce(cer.n, 0) + coalesce(abi.n, 0)) as items_respondidos,
  greatest(coalesce(cer.bloque_max, 0), coalesce(abi.bloque_max, 0)) as bloque_alcanzado,
  case
    when (coalesce(cer.n, 0) + coalesce(abi.n, 0)) >= t.n then 'completado'
    when (coalesce(cer.n, 0) + coalesce(abi.n, 0)) = 0 then 'sin_iniciar'
    else 'en_proceso'
  end as estado,
  u.created_at as registrado_en,
  greatest(cer.ultima, abi.ultima) as ultima_actividad,
  u.equipo_id,
  e.codigo as equipo_codigo,
  e.nombre as equipo_nombre
from public.users u
join public.equipos e on e.id = u.equipo_id
join public.comunas c on c.id = e.comuna_id
cross join total_items t
left join cerradas cer on cer.user_id = u.id
left join abiertas_puras abi on abi.user_id = u.id;

-- Group analysis for closed-ended items (likert/multiple/unica), with
-- k-anonymity enforced (comuna must have >= 5 distinct respondents for that
-- item to be included). This view intentionally excludes 'texto' raw values.
-- "comuna" here means the EQUIPO's comuna — the territorial unit of the
-- workshop. The participant's self-declared comuna is never an analysis axis.
create or replace function public.v_group_analysis_closed()
returns table (
  bloque smallint,
  item smallint,
  comuna_id smallint,
  comuna_nombre text,
  tipo text,
  opcion text,
  n integer,
  total_comuna integer,
  porcentaje numeric,
  promedio numeric
)
language sql stable as $$
  with base as (
    select
      r.bloque, r.item, r.tipo, e.comuna_id, c.nombre as comuna_nombre,
      r.valor, r.user_id
    from public.responses r
    join public.users u on u.id = r.user_id
    join public.equipos e on e.id = u.equipo_id
    join public.comunas c on c.id = e.comuna_id
    where r.tipo in ('likert', 'multiple', 'unica')
      and r.version = public.instrumento_version_actual()
  ),
  comuna_counts as (
    select bloque, item, comuna_id, count(distinct user_id) as total_comuna
    from base
    group by bloque, item, comuna_id
  ),
  eligible as (
    select * from comuna_counts where total_comuna >= 5
  ),
  exploded as (
    -- unica / likert: single value per row; multiple: one row per selected option
    select b.bloque, b.item, b.tipo, b.comuna_id, b.comuna_nombre, b.user_id,
      case
        when b.tipo = 'unica' then b.valor->>'opcion'
        when b.tipo = 'likert' then b.valor->>'valor'
        else opt.value
      end as opcion
    from base b
    left join lateral jsonb_array_elements_text(
      case when b.tipo = 'multiple' then b.valor->'opciones' else '[]'::jsonb end
    ) as opt(value) on b.tipo = 'multiple'
    where b.tipo <> 'multiple' or true
  )
  select
    e.bloque, e.item, e.comuna_id, e.comuna_nombre, e.tipo, e.opcion,
    count(*)::int as n,
    el.total_comuna::int,
    round(100.0 * count(*) / nullif(el.total_comuna, 0), 1) as porcentaje,
    case when e.tipo = 'likert'
      then round(avg(e.opcion::numeric), 2)
      else null
    end as promedio
  from exploded e
  join eligible el on el.bloque = e.bloque and el.item = e.item and el.comuna_id = e.comuna_id
  where e.opcion is not null
  group by e.bloque, e.item, e.comuna_id, e.comuna_nombre, e.tipo, e.opcion, el.total_comuna;
$$;

-- Group analysis for free-text answers: only the coded category is exposed,
-- never the raw text (categoria_codificada is computed at write time by the
-- app, see src/lib/categorize.ts). Same k-anonymity rule (>= 5 per comuna).
-- Reads the independent text repository, and returns `clave` because a single
-- question can carry both a closed answer and an observation field.
-- The OUT columns changed in v2 (added `clave`), and Postgres cannot REPLACE a
-- function whose result type differs — it must be dropped first.
drop function if exists public.v_group_analysis_texto();
create or replace function public.v_group_analysis_texto()
returns table (
  bloque smallint,
  item smallint,
  clave text,
  comuna_id smallint,
  comuna_nombre text,
  categoria_codificada text,
  n integer,
  total_comuna integer,
  porcentaje numeric
)
language sql stable as $$
  with base as (
    select ra.bloque, ra.item, ra.clave, e.comuna_id, c.nombre as comuna_nombre,
      ra.categoria_codificada, ra.user_id
    from public.respuestas_abiertas ra
    join public.users u on u.id = ra.user_id
    join public.equipos e on e.id = u.equipo_id
    join public.comunas c on c.id = e.comuna_id
    where ra.categoria_codificada is not null
      and ra.version = public.instrumento_version_actual()
  ),
  comuna_counts as (
    select bloque, item, clave, comuna_id, count(distinct user_id) as total_comuna
    from base
    group by bloque, item, clave, comuna_id
  ),
  eligible as (
    select * from comuna_counts where total_comuna >= 5
  )
  select
    b.bloque, b.item, b.clave, b.comuna_id, b.comuna_nombre, b.categoria_codificada,
    count(*)::int as n,
    e.total_comuna::int,
    round(100.0 * count(*) / nullif(e.total_comuna, 0), 1) as porcentaje
  from base b
  join eligible e
    on e.bloque = b.bloque and e.item = b.item and e.clave = b.clave
   and e.comuna_id = b.comuna_id
  group by b.bloque, b.item, b.clave, b.comuna_id, b.comuna_nombre,
           b.categoria_codificada, e.total_comuna;
$$;

-- ============================================================================
-- 8. Row Level Security
-- ============================================================================

alter table public.comunas enable row level security;
alter table public.users enable row level security;
alter table public.facilitadores enable row level security;
alter table public.equipos enable row level security;
alter table public.responses enable row level security;
alter table public.respuestas_abiertas enable row level security;
alter table public.lineas_atencion enable row level security;
alter table public.item_catalog enable row level security;

-- comunas / lineas_atencion / item_catalog: public reference data, readable
-- by any authenticated user (participant or facilitador).
drop policy if exists comunas_read_all on public.comunas;
create policy comunas_read_all on public.comunas
  for select to authenticated using (true);

drop policy if exists lineas_read_all on public.lineas_atencion;
create policy lineas_read_all on public.lineas_atencion
  for select to authenticated using (true);

drop policy if exists item_catalog_read_all on public.item_catalog;
create policy item_catalog_read_all on public.item_catalog
  for select to authenticated using (true);

-- users: a participant reads/updates only their own row.
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated using (id = auth.uid());

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
  for insert to authenticated with check (id = auth.uid());

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated using (id = auth.uid());

-- facilitadores read the participants of the equipos within their scope
-- (comuna_id NULL on the facilitador row = access to all comunas). Scoping by
-- the EQUIPO's comuna and not by users.comuna_id is deliberate: the latter is
-- self-declared for support lines, so a participant who lives in another comuna
-- must still be visible to the facilitador running their workshop.
drop policy if exists users_select_facilitador on public.users;
create policy users_select_facilitador on public.users
  for select to authenticated using (
    exists (
      select 1 from public.facilitadores f
      join public.equipos e on e.id = users.equipo_id
      where f.id = auth.uid()
        and (f.comuna_id is null or f.comuna_id = e.comuna_id)
    )
  );

-- facilitadores: a facilitador can read only their own row (no cross-group
-- visibility of credentials/metadata).
drop policy if exists facilitadores_select_own on public.facilitadores;
create policy facilitadores_select_own on public.facilitadores
  for select to authenticated using (id = auth.uid());

-- equipos: any authenticated user (participant validating a code, or
-- facilitador browsing) can read equipos within a facilitador's normal scope;
-- participants only ever need to read their OWN equipo (join already scopes
-- this at the app layer via admin client during join, so this policy mainly
-- serves the facilitador dashboard).
drop policy if exists equipos_select_facilitador on public.equipos;
create policy equipos_select_facilitador on public.equipos
  for select to authenticated using (
    exists (
      select 1 from public.facilitadores f
      where f.id = auth.uid()
        and (f.comuna_id is null or f.comuna_id = equipos.comuna_id)
    )
    or exists (
      select 1 from public.users u where u.id = auth.uid() and u.equipo_id = equipos.id
    )
  );

drop policy if exists equipos_insert_facilitador on public.equipos;
create policy equipos_insert_facilitador on public.equipos
  for insert to authenticated with check (
    exists (
      select 1 from public.facilitadores f
      where f.id = auth.uid()
        and (f.comuna_id is null or f.comuna_id = equipos.comuna_id)
    )
  );

drop policy if exists equipos_update_facilitador on public.equipos;
create policy equipos_update_facilitador on public.equipos
  for update to authenticated using (
    exists (
      select 1 from public.facilitadores f
      where f.id = auth.uid()
        and (f.comuna_id is null or f.comuna_id = equipos.comuna_id)
    )
  );

-- responses: participant reads/writes only their own answers.
drop policy if exists responses_select_own on public.responses;
create policy responses_select_own on public.responses
  for select to authenticated using (user_id = auth.uid());

drop policy if exists responses_insert_own on public.responses;
create policy responses_insert_own on public.responses
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists responses_update_own on public.responses;
create policy responses_update_own on public.responses
  for update to authenticated using (user_id = auth.uid());

-- responses: facilitador reads answers of participants in their equipos.
drop policy if exists responses_select_facilitador on public.responses;
create policy responses_select_facilitador on public.responses
  for select to authenticated using (
    exists (
      select 1 from public.users u
      join public.equipos e on e.id = u.equipo_id
      join public.facilitadores f on f.id = auth.uid()
      where u.id = responses.user_id
        and (f.comuna_id is null or f.comuna_id = e.comuna_id)
    )
  );

-- respuestas_abiertas: mismas reglas que `responses`. El participante
-- lee/escribe solo su propio texto; el facilitador lee el de su comuna.
drop policy if exists respuestas_abiertas_select_own on public.respuestas_abiertas;
create policy respuestas_abiertas_select_own on public.respuestas_abiertas
  for select to authenticated using (user_id = auth.uid());

drop policy if exists respuestas_abiertas_insert_own on public.respuestas_abiertas;
create policy respuestas_abiertas_insert_own on public.respuestas_abiertas
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists respuestas_abiertas_update_own on public.respuestas_abiertas;
create policy respuestas_abiertas_update_own on public.respuestas_abiertas
  for update to authenticated using (user_id = auth.uid());

drop policy if exists respuestas_abiertas_select_facilitador on public.respuestas_abiertas;
create policy respuestas_abiertas_select_facilitador on public.respuestas_abiertas
  for select to authenticated using (
    exists (
      select 1 from public.users u
      join public.equipos e on e.id = u.equipo_id
      join public.facilitadores f on f.id = auth.uid()
      where u.id = respuestas_abiertas.user_id
        and (f.comuna_id is null or f.comuna_id = e.comuna_id)
    )
  );

-- Note: v_participant_progress and v_group_analysis_closed/_texto run with
-- the caller's privileges (not security-definer), so the RLS policies above
-- are enforced transparently when a facilitador queries them. Restrict the
-- RPC-callable functions to authenticated users only.
revoke execute on function public.v_group_analysis_closed() from public, anon;
grant execute on function public.v_group_analysis_closed() to authenticated;
revoke execute on function public.v_group_analysis_texto() from public, anon;
grant execute on function public.v_group_analysis_texto() to authenticated;
revoke execute on function public.instrumento_version_actual() from public, anon;
grant execute on function public.instrumento_version_actual() to authenticated;

-- ============================================================================
-- 9. Storage bucket for "evidencia" photo uploads (item 7, bloque 2)
-- ============================================================================
-- Private bucket. Objects are uploaded to `<user_id>/<filename>` so RLS can
-- scope access the same way as the `responses` table: a participant can only
-- read/write inside their own folder; a facilitador can read any object
-- whose folder (user_id) belongs to a participant in their comuna.

insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', false)
on conflict (id) do nothing;

drop policy if exists evidencias_insert_own on storage.objects;
create policy evidencias_insert_own on storage.objects
  for insert to authenticated with check (
    bucket_id = 'evidencias'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists evidencias_select_own on storage.objects;
create policy evidencias_select_own on storage.objects
  for select to authenticated using (
    bucket_id = 'evidencias'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists evidencias_select_facilitador on storage.objects;
create policy evidencias_select_facilitador on storage.objects
  for select to authenticated using (
    bucket_id = 'evidencias'
    and exists (
      select 1 from public.users u
      join public.equipos e on e.id = u.equipo_id
      join public.facilitadores f on f.id = auth.uid()
      where u.id::text = (storage.foldername(objects.name))[1]
        and (f.comuna_id is null or f.comuna_id = e.comuna_id)
    )
  );
