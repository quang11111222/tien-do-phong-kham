begin;

create table public.notification_policies (
  kind text primary key check (kind in ('assigned','progress','submitted','approved','rejected','due_soon','overdue')),
  enabled boolean not null default true,
  recipients text[] not null,
  days integer,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  check (recipients <@ array['participants','lead_department_admins','project_managers','system_managers']::text[]),
  check (array_position(recipients, null) is null),
  check (not enabled or cardinality(recipients) > 0),
  check (kind <> 'assigned' or recipients <@ array['participants']::text[]),
  check (case when kind in ('due_soon','overdue') then days is not null and days between 1 and 30 else days is null end)
);
alter table public.notification_policies enable row level security;
revoke all on public.notification_policies from anon, authenticated;
grant select on public.notification_policies to authenticated;
create policy notification_policies_read on public.notification_policies
  for select to authenticated using (public.is_active_user() and public.is_manager());

insert into public.notification_policies(kind, recipients, days) values
  ('assigned', array['participants'], null),
  ('progress', array['participants','lead_department_admins','project_managers','system_managers'], null),
  ('submitted', array['lead_department_admins','project_managers','system_managers'], null),
  ('approved', array['participants','lead_department_admins','project_managers','system_managers'], null),
  ('rejected', array['participants','lead_department_admins','project_managers','system_managers'], null),
  ('due_soon', array['participants','lead_department_admins','project_managers'], 3),
  ('overdue', array['participants','lead_department_admins','project_managers'], 1);

-- Only this atomic, version-checked entry point can change configuration.
create function public.save_notification_policies(policies jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  incoming record;
  old_version integer;
begin
  if not public.is_active_user() or not public.is_manager() then
    raise exception 'Chỉ Quản trị hệ thống được cấu hình thông báo.';
  end if;
  if jsonb_typeof(policies) is distinct from 'array' then raise exception 'Cấu hình phải là danh sách.'; end if;
  if jsonb_array_length(policies) <> 7 or
    (select count(distinct entry->>'kind') from jsonb_array_elements(policies) entry) <> 7 then
    raise exception 'Cần đủ bảy loại thông báo, không được trùng loại.';
  end if;
  -- Lock in a deterministic order; a second administrator must reload after a concurrent save.
  perform 1 from public.notification_policies order by kind for update;
  for incoming in select * from jsonb_to_recordset(policies)
    as x(kind text, enabled boolean, recipients text[], days integer, version integer)
  loop
    select version into old_version from public.notification_policies where kind = incoming.kind;
    if not found then raise exception 'Loại thông báo không hợp lệ.'; end if;
    if incoming.version is distinct from old_version then
      raise exception 'Cấu hình đã được người khác thay đổi. Hãy bỏ bản nháp và tải lại trước khi lưu.';
    end if;
    if incoming.recipients is null or incoming.enabled is null or
      cardinality(incoming.recipients) <> (select count(distinct value) from unnest(incoming.recipients) value) then
      raise exception 'Nhóm nhận hoặc trạng thái thông báo không hợp lệ.';
    end if;
    update public.notification_policies set enabled = incoming.enabled,
      recipients = incoming.recipients, days = incoming.days, version = version + 1,
      updated_at = now(), updated_by = auth.uid() where kind = incoming.kind;
  end loop;
end;
$$;
revoke all on function public.save_notification_policies(jsonb) from public, anon;
grant execute on function public.save_notification_policies(jsonb) to authenticated;

-- No caller-supplied identity. Return only current, detail-authorized scopes and live reminders.
-- Explicit project assignments are used instead of can_manage_project(), which also includes
-- every system administrator. Otherwise system administrators would receive ALL deadlines.
create function public.get_notification_scope()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  if not public.is_active_user() then raise exception 'Tài khoản không có quyền truy cập.'; end if;
  with current_profile as materialized (
    select * from public.profiles where id = auth.uid() and active
  ), scoped_work as materialized (
    select item.*, project.code as project_code, project.name as project_name,
      array_remove(array[
        case when exists (select 1 from public.work_item_participants participant where participant.work_item_id = item.id and participant.user_id = auth.uid()) then 'participants' end,
        case when profile.is_department_admin and profile.department_id = item.lead_department_id then 'lead_department_admins' end,
        case when exists (select 1 from public.project_administrators administrator where administrator.project_id = item.project_id and administrator.user_id = auth.uid()) then 'project_managers' end,
        case when profile.role = 'manager' then 'system_managers' end
      ], null)::text[] as recipient_groups,
      not exists (select 1 from public.work_items child where child.parent_id = item.id) as is_leaf,
      item.end_date - (now() at time zone 'Asia/Ho_Chi_Minh')::date as days_remaining
    from public.work_items item join public.projects project on project.id = item.project_id
    cross join current_profile profile
    where project.deleted_at is null and public.can_view_work_item_detail(item.id)
  ), eligible as materialized (
    select work.*, policy.kind, policy.days from scoped_work work
    join public.notification_policies policy on policy.enabled and policy.recipients && work.recipient_groups
  ), allowed as (
    select kind, jsonb_agg(id) as ids from eligible
    where kind not in ('due_soon','overdue') group by kind
  ), attention as (
    select * from eligible where is_leaf and status not in ('pending_approval','completed')
      and end_date is not null and
      ((kind = 'due_soon' and days_remaining between 0 and days) or
       (kind = 'overdue' and days_remaining <= -days))
  )
  select jsonb_build_object(
    'allowed', coalesce((select jsonb_object_agg(kind, ids) from allowed), '{}'::jsonb),
    'attention', coalesce((select jsonb_agg(jsonb_build_object(
      'id', 'deadline-' || id, 'work_item_id', id, 'work_item_wbs', wbs,
      'work_item_name', name, 'project_id', project_id, 'project_code', project_code,
      'project_name', project_name, 'kind', kind, 'category', 'attention', 'isUnread', false,
      'actor_name', 'Nhắc hạn', 'created_at', now(),
      'content', case when kind = 'overdue' then 'Đã quá hạn ' || (-days_remaining)::text || ' ngày'
        when days_remaining = 0 then 'Đến hạn hôm nay'
        else 'Còn ' || days_remaining::text || ' ngày đến hạn' end || ' · Kết thúc: ' || to_char(end_date, 'DD/MM/YYYY')
    ) order by days_remaining, wbs, id) from attention), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_notification_scope() from public, anon;
grant execute on function public.get_notification_scope() to authenticated;

create index if not exists work_items_parent_notification_idx on public.work_items(parent_id);
commit;
