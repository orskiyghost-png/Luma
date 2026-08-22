-- Фаза 7: панель модерации/администрирования.
-- Идемпотентно. Все действия выполняются security-definer функциями, которые
-- сами проверяют роль вызывающего (moderator/admin) и пишут запись в
-- admin_actions. Прямого доступа к чужим данным у клиента нет.

begin;

-- Быстрая проверка роли текущего пользователя.
create or replace function public.current_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role in ('moderator', 'admin')
  );
$$;

create or replace function public.current_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  );
$$;

-- Очередь жалоб для модератора: жалоба + краткое описание объекта.
create or replace function public.admin_list_reports(p_status text default 'open')
returns table (
  id uuid,
  reporter_id uuid,
  target_type text,
  target_id uuid,
  reason text,
  status text,
  created_at timestamptz,
  target_summary text,
  target_author uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.current_is_staff() then
    raise exception 'forbidden';
  end if;

  return query
  select r.id, r.reporter_id, r.target_type, r.target_id, r.reason, r.status, r.created_at,
    case r.target_type
      when 'marker' then (select left(m.text, 140) from public.markers m where m.id = r.target_id)
      when 'message' then (select left(msg.body, 140) from public.messages msg where msg.id = r.target_id)
      when 'profile' then (select p.display_name from public.profiles p where p.user_id = r.target_id)
      else null
    end as target_summary,
    case r.target_type
      when 'marker' then (select m.author_id from public.markers m where m.id = r.target_id)
      when 'message' then (select msg.sender_id from public.messages msg where msg.id = r.target_id)
      when 'profile' then r.target_id
      else null
    end as target_author
  from public.reports r
  where (p_status = 'all' or r.status = p_status)
  order by r.created_at desc
  limit 200;
end;
$$;

-- Изменить статус жалобы (reviewing/resolved/rejected).
create or replace function public.admin_set_report_status(p_report_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_is_staff() then
    raise exception 'forbidden';
  end if;
  if p_status not in ('open', 'reviewing', 'resolved', 'rejected') then
    return 'bad_status';
  end if;

  update public.reports set status = p_status where id = p_report_id;
  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'report_status', 'report', p_report_id, jsonb_build_object('status', p_status));
  return 'ok';
end;
$$;

-- Удалить метку (модерация контента).
create or replace function public.admin_delete_marker(p_marker_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_is_staff() then
    raise exception 'forbidden';
  end if;
  delete from public.markers where id = p_marker_id;
  insert into public.admin_actions (admin_id, action, target_type, target_id)
  values (auth.uid(), 'delete_marker', 'marker', p_marker_id);
  return 'ok';
end;
$$;

-- Забанить / разбанить пользователя.
create or replace function public.admin_set_ban(p_user_id uuid, p_banned boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_is_staff() then
    raise exception 'forbidden';
  end if;
  -- Нельзя банить администратора.
  if exists (select 1 from public.profiles p where p.user_id = p_user_id and p.role = 'admin') then
    return 'cannot_ban_admin';
  end if;
  update public.profiles set banned = p_banned where user_id = p_user_id;
  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), case when p_banned then 'ban_user' else 'unban_user' end, 'profile', p_user_id, jsonb_build_object('banned', p_banned));
  return 'ok';
end;
$$;

-- Назначить роль пользователю — только администратор.
create or replace function public.admin_set_role(p_user_id uuid, p_role text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_is_admin() then
    raise exception 'forbidden';
  end if;
  if p_role not in ('user', 'moderator', 'admin') then
    return 'bad_role';
  end if;
  update public.profiles set role = p_role where user_id = p_user_id;
  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'set_role', 'profile', p_user_id, jsonb_build_object('role', p_role));
  return 'ok';
end;
$$;

revoke all on function public.current_is_staff() from public;
revoke all on function public.current_is_admin() from public;
revoke all on function public.admin_list_reports(text) from public;
revoke all on function public.admin_set_report_status(uuid, text) from public;
revoke all on function public.admin_delete_marker(uuid) from public;
revoke all on function public.admin_set_ban(uuid, boolean) from public;
revoke all on function public.admin_set_role(uuid, text) from public;

grant execute on function public.current_is_staff() to authenticated;
grant execute on function public.current_is_admin() to authenticated;
grant execute on function public.admin_list_reports(text) to authenticated;
grant execute on function public.admin_set_report_status(uuid, text) to authenticated;
grant execute on function public.admin_delete_marker(uuid) to authenticated;
grant execute on function public.admin_set_ban(uuid, boolean) to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

commit;
