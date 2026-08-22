-- Фаза 6: антиспам и модерация.
-- Идемпотентно: безопасно запускать повторно.
--
-- Добавляет:
--  1. Таблицу rate_limits + функцию check_rate_limit — серверное ограничение
--     частоты действий (метки, сообщения, жалобы, беседы) на пользователя.
--     Работает и на бессерверном хостинге (Vercel), где память не сохраняется
--     между запросами, — счётчик живёт в базе.
--  2. Функцию submit_report — создать жалобу с базовой валидацией (жалоба
--     на самого себя запрещена, есть анти-дубликаты в пределах суток).

begin;

-- ---------------------------------------------------------------------------
-- 1. ОГРАНИЧЕНИЕ ЧАСТОТЫ ДЕЙСТВИЙ
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  user_id     uuid not null references auth.users(id) on delete cascade,
  action      text not null,
  window_start timestamptz not null default now(),
  count       integer not null default 0,
  primary key (user_id, action)
);

alter table public.rate_limits enable row level security;
-- Доступ к таблице — только через security-definer функцию ниже.
-- Обычным ролям прямой доступ не нужен: политик нет → всё запрещено.

-- Проверяет и увеличивает счётчик действия. Возвращает true, если действие
-- разрешено (не превышен лимит p_max за окно p_window_seconds), и false, если
-- лимит исчерпан. Окно скользит: по истечении сбрасывается.
create or replace function public.check_rate_limit(
  p_action text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur record;
begin
  if uid is null then
    return false;
  end if;

  select * into cur from public.rate_limits
  where user_id = uid and action = p_action
  for update;

  if not found then
    insert into public.rate_limits (user_id, action, window_start, count)
    values (uid, p_action, now(), 1);
    return true;
  end if;

  -- Окно истекло — начинаем заново.
  if cur.window_start < now() - make_interval(secs => p_window_seconds) then
    update public.rate_limits
    set window_start = now(), count = 1
    where user_id = uid and action = p_action;
    return true;
  end if;

  if cur.count >= p_max then
    return false;
  end if;

  update public.rate_limits
  set count = count + 1
  where user_id = uid and action = p_action;
  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. ОТПРАВКА ЖАЛОБЫ С ВАЛИДАЦИЕЙ И АНТИ-ДУБЛЯМИ
-- ---------------------------------------------------------------------------
create or replace function public.submit_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return 'unauthorized';
  end if;
  if p_target_type not in ('marker', 'marker_zone', 'message', 'profile') then
    return 'bad_type';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    return 'empty_reason';
  end if;
  -- Нельзя жаловаться на свой собственный профиль.
  if p_target_type = 'profile' and p_target_id = uid then
    return 'self';
  end if;
  -- Анти-дубликат: одна жалоба на объект от пользователя за сутки.
  if exists (
    select 1 from public.reports
    where reporter_id = uid
      and target_type = p_target_type
      and target_id = p_target_id
      and created_at > now() - interval '24 hours'
  ) then
    return 'duplicate';
  end if;

  insert into public.reports (reporter_id, target_type, target_id, reason)
  values (uid, p_target_type, p_target_id, left(trim(p_reason), 2000));
  return 'ok';
end;
$$;

revoke all on function public.submit_report(text, uuid, text) from public;
grant execute on function public.submit_report(text, uuid, text) to authenticated;

commit;
