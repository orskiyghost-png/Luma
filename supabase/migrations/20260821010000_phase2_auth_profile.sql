-- Фаза 2: автоматически создаём профиль для каждого нового пользователя.
-- Не меняет существующие профили и безопасно запускается повторно.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parsed_date date;
begin
  begin
    parsed_date := nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date;
  exception when others then
    parsed_date := null;
  end;

  insert into public.profiles (user_id, display_name, date_of_birth)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Без имени'),
    parsed_date
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

 do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end;
$$;

commit;
