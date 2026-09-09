create or replace function public.create_work_item(
  target_project_id uuid,
  target_parent_id uuid,
  target_wbs text,
  target_name text,
  target_responsibility text default null,
  target_start_date date default null,
  target_end_date date default null,
  target_status public.work_item_status default 'not_started',
  participant_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  next_sort integer;
begin
  if not public.is_manager() then
    raise exception 'Chỉ sếp được thêm hạng mục hoặc công việc';
  end if;
  if nullif(trim(target_name), '') is null then
    raise exception 'Tên hạng mục/công việc không được để trống';
  end if;
  if target_start_date is not null and target_end_date is not null and target_end_date < target_start_date then
    raise exception 'Ngày kết thúc phải từ ngày bắt đầu trở đi';
  end if;
  if target_parent_id is not null and not exists (
    select 1 from public.work_items where id = target_parent_id and project_id = target_project_id
  ) then
    raise exception 'Hạng mục cha không thuộc dự án này';
  end if;

  perform pg_advisory_xact_lock(hashtext(target_project_id::text));
  select coalesce(max(sort_order), -1) + 1 into next_sort
  from public.work_items where project_id = target_project_id;

  insert into public.work_items (
    project_id, parent_id, wbs, name, source_responsibility_text,
    start_date, end_date, status, sort_order
  ) values (
    target_project_id, target_parent_id, trim(target_wbs), trim(target_name),
    nullif(trim(target_responsibility), ''), target_start_date, target_end_date,
    target_status, next_sort
  ) returning id into new_id;

  insert into public.work_item_participants (work_item_id, user_id)
  select new_id, participant_id
  from unnest(coalesce(participant_ids, '{}'::uuid[])) as participant_id;

  return new_id;
end;
$$;

grant execute on function public.create_work_item(uuid, uuid, text, text, text, date, date, public.work_item_status, uuid[]) to authenticated;
revoke execute on function public.create_work_item(uuid, uuid, text, text, text, date, date, public.work_item_status, uuid[]) from public, anon;
