-- Фаза 10: Stripe подписка (заготовка)
-- Добавляет поля для Stripe в таблицу профилей и создаёт таблицу для подписок

begin;

-- Дополнительные поля в profiles для Stripe
alter table if exists public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists is_pro boolean not null default false;

-- Таблица истории подписок для аудита
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Пользователь видит только свои подписки
create policy "User can view own subscriptions" on public.subscriptions
  for select using (user_id = auth.uid());

-- Service role может управлять подписками (webhook)
create policy "Service role manages subscriptions" on public.subscriptions
  for all using (true);

-- Индексы для быстрого поиска
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);
create index if not exists idx_subscriptions_stripe_subscription on public.subscriptions(stripe_subscription_id);

-- Триггер обновления updated_at
create or replace function public.update_subscriptions_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.update_subscriptions_updated_at();

commit;