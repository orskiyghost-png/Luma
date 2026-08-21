-- ============================================================================
-- Фаза 1: базовая схема данных + Row Level Security
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

-- Географическое расширение Postgres (для координат и полигонов)
create extension if not exists postgis;

-- ----------------------------------------------------------------------------
-- ПРОФИЛИ
-- ----------------------------------------------------------------------------
create table public.profiles (
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

-- Профиль видит и редактирует только владелец
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (user_id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (user_id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    -- роль и банн нельзя менять самому — только через админку/сервисный ключ
    and role = (select p.role from public.profiles p where p.user_id = auth.uid())
    and banned = (select p.banned from public.profiles p where p.user_id = auth.uid())
    and age_verified_adult >= (select p.age_verified_adult from public.profiles p where p.user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- МЕТКИ НА КАРТЕ
-- ----------------------------------------------------------------------------
create table public.markers (
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

create index markers_geo_idx on public.markers (lat, lng);
create index markers_expires_idx on public.markers (expires_at);

alter table public.markers enable row level security;

-- Метки видят все авторизованные (это суть карты); не истёкшие и не удалённые
create policy "markers_select_active"
  on public.markers for select to authenticated
  using (deleted = false and expires_at > now());

create policy "markers_insert_own"
  on public.markers for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.banned = false)
  );

create policy "markers_update_own"
  on public.markers for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "markers_delete_own"
  on public.markers for delete to authenticated
  using (author_id = auth.uid());

-- ----------------------------------------------------------------------------
-- ЗОНЫ (ПОЛИГОНЫ) НА КАРТЕ
-- ----------------------------------------------------------------------------
create table public.marker_zones (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references auth.users(id) on delete cascade,
  polygon     geography(polygon, 4326) not null,
  label       text not null default '',
  expires_at  timestamptz,
  deleted     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index marker_zones_poly_idx on public.marker_zones using gist (polygon);

alter table public.marker_zones enable row level security;

create policy "marker_zones_select_active"
  on public.marker_zones for select to authenticated
  using (deleted = false and (expires_at is null or expires_at > now()));

create policy "marker_zones_insert_own"
  on public.marker_zones for insert to authenticated
  with check (author_id = auth.uid());

create policy "marker_zones_update_own"
  on public.marker_zones for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "marker_zones_delete_own"
  on public.marker_zones for delete to authenticated
  using (author_id = auth.uid());

-- ----------------------------------------------------------------------------
-- РЕАКЦИИ
-- ----------------------------------------------------------------------------
create table public.reactions (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('marker', 'marker_zone')),
  target_id   uuid not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  created_at  timestamptz not null default now(),
  unique (target_type, target_id, user_id, type)
);

alter table public.reactions enable row level security;

create policy "reactions_select_all"
  on public.reactions for select to authenticated
  using (true);

create policy "reactions_insert_own"
  on public.reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.banned = false)
  );

create policy "reactions_delete_own"
  on public.reactions for delete to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- ЛИЧНЫЕ СООБЩЕНИЯ
-- ----------------------------------------------------------------------------
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body         text not null check (length(body) <= 4000),
  read_at      timestamptz,
  deleted      boolean not null default false,
  created_at   timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index messages_dialog_idx on public.messages (sender_id, recipient_id, created_at);

alter table public.messages enable row level security;

-- Видит диалог только его участник
create policy "messages_select_participants"
  on public.messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid())
  with check (true);

create policy "messages_insert_own"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.banned = false)
    and not exists (
      select 1 from public.profiles p
      where p.user_id = recipient_id and p.banned = true
    )
  );

-- Отметить «прочитано» может только получатель
create policy "messages_mark_read"
  on public.messages for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ----------------------------------------------------------------------------
-- ЖАЛОБЫ (модерация)
-- ----------------------------------------------------------------------------
create table public.reports (
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
create policy "reports_select_own_or_admin"
  on public.reports for select to authenticated
  using (
    reporter_id = auth.uid()
    or exists (select 1 from public.profiles p
               where p.user_id = auth.uid() and p.role in ('moderator', 'admin'))
  );

create policy "reports_insert_own"
  on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

create policy "reports_update_admin"
  on public.reports for update to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.user_id = auth.uid() and p.role in ('moderator', 'admin'))
  )
  with check (
    exists (select 1 from public.profiles p
            where p.user_id = auth.uid() and p.role in ('moderator', 'admin'))
  );

-- ----------------------------------------------------------------------------
-- ЖИВЫЕ ПОЗИЦИИ (только 18+, строго opt-in!)
-- ----------------------------------------------------------------------------
create table public.live_locations (
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
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and age_verified_adult = true and banned = false
  );
$$;

-- Запись: только своя строка; включить showing можно только при подтверждённом 18+.
-- Выключить (false) или удалить можно всегда.
create policy "live_locations_write_own_optin"
  on public.live_locations for insert to authenticated
  with check (
    user_id = auth.uid()
    and (sharing_enabled = false or public.current_user_is_adult())
  );

create policy "live_locations_update_own_optin"
  on public.live_locations for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (sharing_enabled = false or public.current_user_is_adult())
  );

create policy "live_locations_delete_own"
  on public.live_locations for delete to authenticated
  using (user_id = auth.uid());

-- Чтение: свою строку — всегда; чужие — только если читатель 18+
-- и владелец сам включил показ.
create policy "live_locations_select_optin"
  on public.live_locations for select to authenticated
  using (
    user_id = auth.uid()
    or (sharing_enabled = true and public.current_user_is_adult())
  );

-- ----------------------------------------------------------------------------
-- ДЕЙСТВИЯ АДМИНИСТРАТОРОВ (журнал)
-- ----------------------------------------------------------------------------
create table public.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references auth.users(id) on delete cascade,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  details     jsonb,
  created_at  timestamptz not null default now()
);

alter table public.admin_actions enable row level security;

create policy "admin_actions_select_admin"
  on public.admin_actions for select to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.user_id = auth.uid() and p.role in ('moderator', 'admin'))
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

create trigger live_locations_touch
  before update on public.live_locations
  for each row execute function public.touch_updated_at();
