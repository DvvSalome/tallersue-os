-- ============================================================================
-- El Taller de los Sueños — Supabase schema
-- ============================================================================
-- Run this whole file once in the Supabase SQL Editor (or `supabase db push`).
-- It is idempotent-ish (uses IF NOT EXISTS / OR REPLACE) so re-running after
-- a partial failure is safe, EXCEPT for the RLS policies section, which drops
-- and recreates policies by name.
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
-- 2. USERS — participantes (no email; auth via synthetic email under the hood)
-- ============================================================================
-- Participants authenticate through Supabase Auth using a synthesized email
-- of the form  <slug(apodo)>.<comuna_id>@participantes.tallerdelossuenos.local
-- so we get password hashing, sessions and JWTs for free, and RLS can use
-- auth.uid(). The nickname is unique per comuna (two people in different
-- comunas may share an apodo), enforced by the unique index below.
--
-- public.users.id == auth.users.id (1:1), created by the app right after
-- supabase.auth.signUp().

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  apodo text not null,
  edad smallint not null check (edad between 9 and 35),
  pais text not null default 'Colombia',
  ciudad text not null default 'Medellín',
  comuna_id smallint not null references public.comunas (id),
  created_at timestamptz not null default now()
);

create unique index if not exists users_apodo_comuna_unique
  on public.users (comuna_id, lower(apodo));

-- ============================================================================
-- 3. FACILITADORES — separate login, código de grupo + shared password
-- ============================================================================
-- Same trick as participants: a synthetic email per grupo
-- (<codigo_grupo>@facilitadores.tallerdelossuenos.local), password shared by
-- the whole group. comuna_id = NULL means the facilitador can see ALL
-- comunas (e.g. a coordinador general); otherwise scoped to one comuna.

create table if not exists public.facilitadores (
  id uuid primary key references auth.users (id) on delete cascade,
  codigo_grupo text not null unique,
  comuna_id smallint references public.comunas (id),
  nombre text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 4. RESPONSES — one row per item answered
-- ============================================================================
-- bloque: 1..4 , item: 1..14 (global item number, see item_catalog below)
-- tipo: 'likert' | 'multiple' | 'unica' | 'texto' | 'adjunto'
-- valor: jsonb so every item type fits the same column
--   likert  -> {"valor": 1..5}
--   multiple-> {"opciones": ["a","b"]}
--   unica   -> {"opcion": "a"}
--   texto   -> {"texto": "..."}
--   adjunto -> {"url": "...", "mime": "image/jpeg"}  (file stored in Storage)

create table if not exists public.item_catalog (
  bloque smallint not null,
  item smallint not null,
  clave text not null,
  tipo text not null check (tipo in ('likert', 'multiple', 'unica', 'texto', 'adjunto')),
  etiqueta text not null,
  primary key (bloque, item)
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  bloque smallint not null,
  item smallint not null,
  tipo text not null check (tipo in ('likert', 'multiple', 'unica', 'texto', 'adjunto')),
  valor jsonb not null,
  -- coded category for free-text items, filled by a lightweight classifier
  -- server-side (never exposes raw text to aggregate views)
  categoria_codificada text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, bloque, item)
);

create index if not exists responses_user_idx on public.responses (user_id);
create index if not exists responses_bloque_idx on public.responses (bloque);

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

-- ============================================================================
-- 5. LINEAS_ATENCION — support/hotline points shown on the participant home
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
-- 6. Helper views for the facilitador dashboard
-- ============================================================================

-- Progress per participant: how many of the 14 items they've answered and
-- the highest bloque reached.
create or replace view public.v_participant_progress as
select
  u.id as user_id,
  u.apodo,
  u.edad,
  u.comuna_id,
  c.nombre as comuna_nombre,
  count(r.id) as items_respondidos,
  coalesce(max(r.bloque), 0) as bloque_alcanzado,
  case
    when count(r.id) = 14 then 'completado'
    when count(r.id) = 0 then 'sin_iniciar'
    else 'en_proceso'
  end as estado,
  u.created_at as registrado_en,
  max(r.updated_at) as ultima_actividad
from public.users u
join public.comunas c on c.id = u.comuna_id
left join public.responses r on r.user_id = u.id
group by u.id, u.apodo, u.edad, u.comuna_id, c.nombre, u.created_at;

-- Group analysis for closed-ended items (likert/multiple/unica), with
-- k-anonymity enforced (comuna must have >= 5 distinct respondents for that
-- item to be included). This view intentionally excludes 'texto' raw values.
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
      r.bloque, r.item, r.tipo, u.comuna_id, c.nombre as comuna_nombre,
      r.valor, r.user_id
    from public.responses r
    join public.users u on u.id = r.user_id
    join public.comunas c on c.id = u.comuna_id
    where r.tipo in ('likert', 'multiple', 'unica')
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

-- ============================================================================
-- 7. Row Level Security
-- ============================================================================

alter table public.comunas enable row level security;
alter table public.users enable row level security;
alter table public.facilitadores enable row level security;
alter table public.responses enable row level security;
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

-- facilitadores read the participant rows within their assigned comuna
-- (comuna_id NULL on the facilitador row = access to all comunas).
drop policy if exists users_select_facilitador on public.users;
create policy users_select_facilitador on public.users
  for select to authenticated using (
    exists (
      select 1 from public.facilitadores f
      where f.id = auth.uid()
        and (f.comuna_id is null or f.comuna_id = users.comuna_id)
    )
  );

-- facilitadores: a facilitador can read only their own row (no cross-group
-- visibility of credentials/metadata).
drop policy if exists facilitadores_select_own on public.facilitadores;
create policy facilitadores_select_own on public.facilitadores
  for select to authenticated using (id = auth.uid());

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

-- responses: facilitador reads answers of participants in their comuna.
drop policy if exists responses_select_facilitador on public.responses;
create policy responses_select_facilitador on public.responses
  for select to authenticated using (
    exists (
      select 1 from public.users u
      join public.facilitadores f on f.id = auth.uid()
      where u.id = responses.user_id
        and (f.comuna_id is null or f.comuna_id = u.comuna_id)
    )
  );

-- Note: v_participant_progress and v_group_analysis_closed run with the
-- caller's privileges (views are not security-definer), so the RLS policies
-- above are enforced transparently when a facilitador queries them.
