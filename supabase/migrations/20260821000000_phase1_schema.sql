-- ============================================================================
-- Фаза 1: базовая схема данных + Row Level Security
--
-- Это повторно запускаемая миграция. Она НЕ удаляет таблицы и данные:
-- существующие объекты переиспользуются, а политики безопасно обновляются.
-- ============================================================================
-- Таблицы: profiles, markers, marker_zones, reactions, messages,
--          reports, live_locations, admin_actions
--
-- Правила безопасности:
-- - пользователь редактирует/удаляет только СВОИ данные;
-- - метки видны всем авторизованным (иначе карта не работает);
-- - live_locations читаются ТОЛЬКО если: владелец подтвердил 18+
--   И включил показ себя (sharing_enabled = true), а читатель сам 18+.
--   Включить показ себя может только подтверждённый 18+. Opt-in по умолчанию.
-- ============================================================================

-- Вся схема применяется атомарно: если любой шаг упадёт, PostgreSQL
-- откатит весь запуск, и не останется частично созданных таблиц.
begin;

-- Географическое расширение Postgres (для координат и полигонов)
create extension if not exists postgis;

-- ----------------------------------------------------------------------------
-- ПРОФИЛИ
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references auth.users(id) on delete cascade,
  display_name        text not null default 'Без имени',
  avatar_url          text,
  avatar_full_url     text,
  bio                 text,
  city                text,
  city_visible        boolean not null default true,
  date_of_birth       date,
  age_verified_adult  boolean not null default false,
  role                text not null default 'user'
                        check (role in ('user', 'moderator', 'admin')),
  banned              boolean not null default false,
  created_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Помощник: своя строка профиля, читается в обход RLS (чтобы политики
-- этой же таблицы не зацикливались)
create or replace function public.my_profile()
returns public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select * from public.profiles where user_id = auth.uid()
$$;

-- Вспомогательная функция делает политики повторно запускаемыми.
-- Она удаляет только одноимённую RLS-политику (не таблицу и не данные),
-- затем создаёт её с актуальными правилами.
create or replace function public.ensure_policy(
  p_policy_name text,
  p_table_name text,
  p_command text,
  p_using text default null,
  p_check text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = p_table_name
      and policyname = p_policy_name
  ) then
    execute format('drop policy %I on public.%I', p_policy_name, p_table_name);
  end if;

  execute format(
    'create policy %I on public.%I for %s to authenticated%s%s',
    p_policy_name,
    p_table_name,
    p_command,
    case when p_using is null then '' else format(' using (%s)', p_using) end,
    case when p_check is null then '' else format(' with check (%s)', p_check) end
  );
end;
$$;

-- Временная служебная функция не должна быть доступна обычным пользователям.
revoke execute on function public.ensure_policy(text, text, text, text, text) from public;

-- Профиль видит и редактирует только владелец
select public.ensure_policy(
  'profiles_select_own', 'profiles', 'select',
  'user_id = auth.uid()'
);

select public.ensure_policy(
  'profiles_insert_own', 'profiles', 'insert',
  null,
  'user_id = auth.uid()'
);

select public.ensure_policy(
  'profiles_update_own', 'profiles', 'update',
  'user_id = auth.uid()',
  'user_id = auth.uid() and role = (select p.role from public.my_profile() p) and banned = (select p.banned from public.my_profile() p) and age_verified_adult >= (select p.age_verified_adult from public.my_profile() p)'
);

-- ----------------------------------------------------------------------------
-- МЕТКИ НА КАРТЕ
-- ----------------------------------------------------------------------------
create table if not exists public.markers (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references auth.users(id) on delete cascade,
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  category    text not null,
  text        text not null default '',
  expires_at  timestamptz not null,
  deleted     boolean not null default false, -- мягкое удаление (модерация)
  created_at  timestamptz not null default now()
);

create index if not exists markers_geo_idx on public.markers (lat, lng);
create index if not exists markers_expires_idx on public.markers (expires_at);

alter table public.markers enable row level security;

-- Метки видят все авторизованные (это суть карты); не истёкшие и не удалённые
select public.ensure_policy(
  'markers_select_active', 'markers', 'select',
  'deleted = false and expires_at > now()'
);

select public.ensure_policy(
  'markers_insert_own', 'markers', 'insert', null,
  'author_id = auth.uid() and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.banned = false)'
);

select public.ensure_policy(
  'markers_update_own', 'markers', 'update',
  'author_id = auth.uid()', 'author_id = auth.uid()'
);

select public.ensure_policy(
  'markers_delete_own', 'markers', 'delete',
  'author_id = auth.uid()'
);

-- ----------------------------------------------------------------------------
-- ЗОНЫ (ПОЛИГОНЫ) НА КАРТЕ
-- ----------------------------------------------------------------------------
create table if not exists public.marker_zones (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references auth.users(id) on delete cascade,
  polygon     geography(polygon, 4326) not null,
  label       text not null default '',
  expires_at  timestamptz,
  deleted     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists marker_zones_poly_idx on public.marker_zones using gist (polygon);

alter table public.marker_zones enable row level security;

select public.ensure_policy(
  'marker_zones_select_active', 'marker_zones', 'select',
  'deleted = false and (expires_at is null or expires_at > now())'
);

select public.ensure_policy(
  'marker_zones_insert_own', 'marker_zones', 'insert', null,
  'author_id = auth.uid()'
);

select public.ensure_policy(
  'marker_zones_update_own', 'marker_zones', 'update',
  'author_id = auth.uid()', 'author_id = auth.uid()'
);

select public.ensure_policy(
  'marker_zones_delete_own', 'marker_zones', 'delete',
  'author_id = auth.uid()'
);

-- ----------------------------------------------------------------------------
-- РЕАКЦИИ
-- ----------------------------------------------------------------------------
create table if not exists public.reactions (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('marker', 'marker_zone')),
  target_id   uuid not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  created_at  timestamptz not null default now(),
  unique (target_type, target_id, user_id, type)
);

alter table public.reactions enable row level security;

select public.ensure_policy(
  'reactions_select_all', 'reactions', 'select', 'true'
);

select public.ensure_policy(
  'reactions_insert_own', 'reactions', 'insert', null,
  'user_id = auth.uid() and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.banned = false)'
);

select public.ensure_policy(
  'reactions_delete_own', 'reactions', 'delete',
  'user_id = auth.uid()'
);

-- ----------------------------------------------------------------------------
-- ЛИЧНЫЕ СООБЩЕНИЯ
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body         text not null check (length(body) <= 4000),
  read_at      timestamptz,
  deleted      boolean not null default false,
  created_at   timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists messages_dialog_idx on public.messages (sender_id, recipient_id, created_at);

alter table public.messages enable row level security;

-- Видит диалог только его участник
-- (у политик SELECT допустим только USING — WITH CHECK тут запрещён Postgres)
select public.ensure_policy(
  'messages_select_participants', 'messages', 'select',
  'sender_id = auth.uid() or recipient_id = auth.uid()'
);

select public.ensure_policy(
  'messages_insert_own', 'messages', 'insert', null,
  'sender_id = auth.uid() and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.banned = false) and not exists (select 1 from public.profiles p where p.user_id = recipient_id and p.banned = true)'
);

-- Отметить «прочитано» может только получатель
select public.ensure_policy(
  'messages_mark_read', 'messages', 'update',
  'recipient_id = auth.uid()', 'recipient_id = auth.uid()'
);

-- ----------------------------------------------------------------------------
-- ЖАЛОБЫ (модерация)
-- ----------------------------------------------------------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('marker', 'marker_zone', 'message', 'profile')),
  target_id   uuid not null,
  reason      text not null check (length(reason) <= 2000),
  status      text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'rejected')),
  created_at  timestamptz not null default now()
);

alter table public.reports enable row level security;

-- Жалобу создал — её видно только автору и админам
select public.ensure_policy(
  'reports_select_own_or_admin', 'reports', 'select',
  'reporter_id = auth.uid() or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in (''moderator'', ''admin''))'
);

select public.ensure_policy(
  'reports_insert_own', 'reports', 'insert', null,
  'reporter_id = auth.uid()'
);

select public.ensure_policy(
  'reports_update_admin', 'reports', 'update',
  'exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in (''moderator'', ''admin''))',
  'exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in (''moderator'', ''admin''))'
);

-- ----------------------------------------------------------------------------
-- ЖИВЫЕ ПОЗИЦИИ (только 18+, строго opt-in!)
-- ----------------------------------------------------------------------------
create table if not exists public.live_locations (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  lat             double precision not null check (lat between -90 and 90),
  lng             double precision not null check (lng between -180 and 180),
  sharing_enabled boolean not null default false, -- по умолчанию ВЫКЛЮЧЕНО
  updated_at      timestamptz not null default now()
);

alter table public.live_locations enable row level security;

-- Помощник: текущий пользователь подтвердил 18+
create or replace function public.current_user_is_adult()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select age_verified_adult from public.my_profile() p
     where p.banned = false),
    false
  );
$$;

-- Запись: только своя строка; включить showing можно только при подтверждённом 18+.
-- Выключить (false) или удалить можно всегда.
select public.ensure_policy(
  'live_locations_write_own_optin', 'live_locations', 'insert', null,
  'user_id = auth.uid() and (sharing_enabled = false or public.current_user_is_adult())'
);

select public.ensure_policy(
  'live_locations_update_own_optin', 'live_locations', 'update',
  'user_id = auth.uid()',
  'user_id = auth.uid() and (sharing_enabled = false or public.current_user_is_adult())'
);

select public.ensure_policy(
  'live_locations_delete_own', 'live_locations', 'delete',
  'user_id = auth.uid()'
);

-- Чтение: свою строку — всегда; чужие — только если читатель 18+
-- и владелец сам включил показ.
select public.ensure_policy(
  'live_locations_select_optin', 'live_locations', 'select',
  'user_id = auth.uid() or (sharing_enabled = true and public.current_user_is_adult())'
);

-- ----------------------------------------------------------------------------
-- ДЕЙСТВИЯ АДМИНИСТРАТОРОВ (журнал)
-- ----------------------------------------------------------------------------
create table if not exists public.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references auth.users(id) on delete cascade,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  details     jsonb,
  created_at  timestamptz not null default now()
);

alter table public.admin_actions enable row level security;

select public.ensure_policy(
  'admin_actions_select_admin', 'admin_actions', 'select',
  'exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in (''moderator'', ''admin''))'
);

-- Создание записей — только через сервисный ключ (сервер), политик insert нет.

-- ----------------------------------------------------------------------------
-- Автообновление updated_at у живых позиций
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'live_locations_touch'
      and tgrelid = 'public.live_locations'::regclass
  ) then
    create trigger live_locations_touch
      before update on public.live_locations
      for each row execute function public.touch_updated_at();
  end if;
end;
$$;

-- Временная служебная функция больше не нужна после создания политик.
drop function public.ensure_policy(text, text, text, text, text);

commit;
