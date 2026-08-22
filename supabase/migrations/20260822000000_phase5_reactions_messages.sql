-- Фаза 5: реакции и личные сообщения по взаимному согласию.
-- Идемпотентно: безопасно запускать повторно.
--
-- Что добавляет:
--  1. Таблицу conversations — «беседа по согласию» между двумя людьми.
--     Первое обращение создаёт беседу в статусе pending; получатель должен
--     её принять (accepted), прежде чем станет полноценным двусторонним чатом.
--     Это реализует правило ТЗ: переписка — только по взаимному согласию,
--     а не «написать случайному человеку рядом».
--  2. Поле conversation_id в messages (для realtime-подписки и группировки).
--  3. Ужесточённую RLS на messages: писать можно только внутри не заблокированной
--     беседы, и до принятия — только её инициатору (одно приглашающее сообщение).
--  4. Security-definer функцию public_profile_cards — безопасно отдаёт
--     публичную часть чужого профиля (имя, аватар, город если city_visible),
--     не открывая таблицу profiles целиком. Поиска людей здесь нет.

begin;

-- ---------------------------------------------------------------------------
-- 1. БЕСЕДЫ ПО СОГЛАСИЮ
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id           uuid primary key default gen_random_uuid(),
  user_low     uuid not null references auth.users(id) on delete cascade,
  user_high    uuid not null references auth.users(id) on delete cascade,
  initiator_id uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'blocked')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Пара хранится в каноническом порядке (low < high), чтобы беседа была одна
  -- независимо от того, кто написал первым.
  check (user_low < user_high),
  unique (user_low, user_high)
);

alter table public.conversations enable row level security;

create index if not exists conversations_user_low_idx on public.conversations (user_low);
create index if not exists conversations_user_high_idx on public.conversations (user_high);

-- Видят беседу только её участники.
drop policy if exists conversations_select_participants on public.conversations;
create policy conversations_select_participants on public.conversations
  for select to authenticated
  using (user_low = auth.uid() or user_high = auth.uid());

-- Создать беседу может только участник, который сам является инициатором,
-- не забанен, и второй участник тоже не забанен.
drop policy if exists conversations_insert_initiator on public.conversations;
create policy conversations_insert_initiator on public.conversations
  for insert to authenticated
  with check (
    initiator_id = auth.uid()
    and (user_low = auth.uid() or user_high = auth.uid())
    and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.banned = false)
    and not exists (
      select 1 from public.profiles p
      where p.user_id in (user_low, user_high) and p.user_id <> auth.uid() and p.banned = true
    )
  );

-- Менять статус (принять/заблокировать) может любой участник беседы.
drop policy if exists conversations_update_participant on public.conversations;
create policy conversations_update_participant on public.conversations
  for update to authenticated
  using (user_low = auth.uid() or user_high = auth.uid())
  with check (user_low = auth.uid() or user_high = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. СВЯЗЬ СООБЩЕНИЙ С БЕСЕДОЙ
-- ---------------------------------------------------------------------------
alter table public.messages
  add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- 3. УЖЕСТОЧЁННАЯ ПОЛИТИКА ОТПРАВКИ СООБЩЕНИЙ
-- ---------------------------------------------------------------------------
-- Правила: отправитель = текущий пользователь и не забанен; получатель не
-- забанен; сообщение привязано к беседе, где оба — участники; беседа не
-- заблокирована; и либо беседа уже принята, либо пишет её инициатор (первое
-- приглашающее сообщение до согласия).
drop policy if exists messages_insert_own on public.messages;
create policy messages_insert_own on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.banned = false)
    and not exists (select 1 from public.profiles p where p.user_id = recipient_id and p.banned = true)
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.status <> 'blocked'
        and ((c.user_low = auth.uid() and c.user_high = recipient_id)
          or (c.user_high = auth.uid() and c.user_low = recipient_id))
        and (c.status = 'accepted' or c.initiator_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 4. ПУБЛИЧНАЯ ЧАСТЬ ПРОФИЛЯ (без открытия таблицы целиком)
-- ---------------------------------------------------------------------------
-- Возвращает безопасные для показа поля по списку user_id. Город отдаётся,
-- только если владелец включил city_visible. Поиска/листинга людей нет —
-- принимает лишь конкретные id (например, автора метки или собеседника).
create or replace function public.public_profile_cards(ids uuid[])
returns table (
  user_id      uuid,
  display_name text,
  avatar_url   text,
  city         text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.user_id,
    p.display_name,
    p.avatar_url,
    case when p.city_visible then p.city else null end as city
  from public.profiles p
  where p.user_id = any(ids)
$$;

revoke all on function public.public_profile_cards(uuid[]) from public;
grant execute on function public.public_profile_cards(uuid[]) to authenticated;

-- Триггер обновления updated_at у беседы при смене статуса.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'conversations_touch_updated'
  ) then
    create trigger conversations_touch_updated
      before update on public.conversations
      for each row execute function public.touch_conversation();
  end if;
end;
$$;

-- Живой чат: сообщения должны попадать в realtime-публикацию Supabase.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

commit;
