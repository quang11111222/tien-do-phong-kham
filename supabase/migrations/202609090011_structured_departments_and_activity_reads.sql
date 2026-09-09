begin;

alter table public.work_items
  add column if not exists lead_department_id uuid references public.departments(id);

create index if not exists work_items_lead_department_idx
  on public.work_items(lead_department_id);

create table if not exists public.work_item_coordinating_departments (
  work_item_id uuid not null references public.work_items(id) on delete cascade,
  department_id uuid not null references public.departments(id),
  created_at timestamptz not null default now(),
  primary key (work_item_id, department_id)
);

create index if not exists work_item_coordinating_departments_department_idx
  on public.work_item_coordinating_departments(department_id);

create table if not exists public.work_item_activity_reads (
  work_item_id uuid not null references public.work_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (work_item_id, user_id)
);

create index if not exists work_item_activity_reads_user_idx
  on public.work_item_activity_reads(user_id);

create or replace function public.resolve_department_reference(reference_text text)
returns uuid
language sql
stable
set search_path = public
as $$
  select candidate.id
  from (
    select department.id, 0 as priority
    from public.departments department
    where upper(trim(reference_text)) in (upper(department.code), upper(department.name))
    union all
    select alias.department_id, 1 as priority
    from public.department_aliases alias
    where upper(trim(reference_text)) = upper(alias.alias)
  ) candidate
  order by candidate.priority
  limit 1;
$$;

-- Tách dữ liệu Excel cũ: phần đầu là chủ trì, các phần sau dấu / hoặc dấu phẩy là phối hợp.
update public.work_items item
set lead_department_id = public.resolve_department_reference(
  trim(split_part(split_part(item.source_responsibility_text, '/', 1), ',', 1))
)
where item.lead_department_id is null
  and nullif(trim(item.source_responsibility_text), '') is not null;

insert into public.work_item_coordinating_departments(work_item_id, department_id)
select item.id, public.resolve_department_reference(token.value)
from public.work_items item
cross join lateral regexp_split_to_table(item.source_responsibility_text, '\s*[/,]\s*') with ordinality token(value, position)
where token.position > 1
  and public.resolve_department_reference(token.value) is not null
  and public.resolve_department_reference(token.value) is distinct from item.lead_department_id
on conflict do nothing;

alter table public.work_item_coordinating_departments enable row level security;
alter table public.work_item_activity_reads enable row level security;

grant select on public.work_item_coordinating_departments to authenticated;
grant all on public.work_item_coordinating_departments to authenticated;
grant select, insert, update on public.work_item_activity_reads to authenticated;

create policy coordinating_departments_read on public.work_item_coordinating_departments
for select to authenticated using (true);

create policy coordinating_departments_manage_manager on public.work_item_coordinating_departments
for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy activity_reads_read_own on public.work_item_activity_reads
for select to authenticated using (user_id = auth.uid());

create policy activity_reads_insert_own on public.work_item_activity_reads
for insert to authenticated with check (user_id = auth.uid());

create policy activity_reads_update_own on public.work_item_activity_reads
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop function if exists public.create_work_item(uuid, uuid, text, text, text, date, date, public.work_item_status, uuid[]);

create function public.create_work_item(
  target_project_id uuid,
  target_parent_id uuid,
  target_wbs text,
  target_name text,
  target_lead_department_id uuid default null,
  coordinating_department_ids uuid[] default '{}',
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
  responsibility_text text;
begin
  if not public.is_manager() then raise exception 'Chỉ sếp được thêm hạng mục hoặc công việc'; end if;
  if nullif(trim(target_name), '') is null then raise exception 'Tên hạng mục/công việc không được để trống'; end if;
  if target_start_date is not null and target_end_date is not null and target_end_date < target_start_date then raise exception 'Ngày kết thúc phải từ ngày bắt đầu trở đi'; end if;
  if target_parent_id is not null and not exists (select 1 from public.work_items where id = target_parent_id and project_id = target_project_id) then raise exception 'Hạng mục cha không thuộc dự án này'; end if;
  if target_lead_department_id is not null and not exists (select 1 from public.departments where id = target_lead_department_id and active) then raise exception 'Đơn vị chủ trì không hợp lệ'; end if;

  perform pg_advisory_xact_lock(hashtext(target_project_id::text));
  select coalesce(max(sort_order), -1) + 1 into next_sort from public.work_items where project_id = target_project_id;
  select concat_ws(' / ', lead.code, nullif(coordinators.codes, '')) into responsibility_text
  from (select code from public.departments where id = target_lead_department_id) lead
  full join (select string_agg(department.code, ', ' order by department.sort_order) as codes from public.departments department where department.id = any(coalesce(coordinating_department_ids, '{}'::uuid[])) and department.id is distinct from target_lead_department_id) coordinators on true;

  insert into public.work_items(project_id, parent_id, wbs, name, source_responsibility_text, lead_department_id, start_date, end_date, status, sort_order)
  values (target_project_id, target_parent_id, trim(target_wbs), trim(target_name), nullif(responsibility_text, ''), target_lead_department_id, target_start_date, target_end_date, target_status, next_sort)
  returning id into new_id;

  insert into public.work_item_coordinating_departments(work_item_id, department_id)
  select new_id, department_id from unnest(coalesce(coordinating_department_ids, '{}'::uuid[])) department_id
  where department_id is distinct from target_lead_department_id;

  insert into public.work_item_participants(work_item_id, user_id)
  select new_id, participant_id from unnest(coalesce(participant_ids, '{}'::uuid[])) participant_id;
  return new_id;
end;
$$;

grant execute on function public.create_work_item(uuid, uuid, text, text, uuid, uuid[], date, date, public.work_item_status, uuid[]) to authenticated;
revoke execute on function public.create_work_item(uuid, uuid, text, text, uuid, uuid[], date, date, public.work_item_status, uuid[]) from public, anon;

drop function if exists public.update_work_item_details(uuid, integer, text, text, date, date, public.work_item_status, uuid[]);

create function public.update_work_item_details(
  target_work_item_id uuid,
  expected_version integer,
  target_name text,
  target_lead_department_id uuid,
  coordinating_department_ids uuid[],
  target_start_date date,
  target_end_date date,
  target_status public.work_item_status,
  participant_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version integer;
  responsibility_text text;
begin
  if not public.is_manager() then raise exception 'Chỉ sếp được sửa thông tin và phân công công việc'; end if;
  if nullif(trim(target_name), '') is null then raise exception 'Tên hạng mục/công việc không được để trống'; end if;
  if target_start_date is not null and target_end_date is not null and target_end_date < target_start_date then raise exception 'Ngày kết thúc phải từ ngày bắt đầu trở đi'; end if;
  if target_lead_department_id is not null and not exists (select 1 from public.departments where id = target_lead_department_id and active) then raise exception 'Đơn vị chủ trì không hợp lệ'; end if;

  select concat_ws(' / ', lead.code, nullif(coordinators.codes, '')) into responsibility_text
  from (select code from public.departments where id = target_lead_department_id) lead
  full join (select string_agg(department.code, ', ' order by department.sort_order) as codes from public.departments department where department.id = any(coalesce(coordinating_department_ids, '{}'::uuid[])) and department.id is distinct from target_lead_department_id) coordinators on true;

  update public.work_items
  set name = trim(target_name), source_responsibility_text = nullif(responsibility_text, ''), lead_department_id = target_lead_department_id,
      start_date = target_start_date, end_date = target_end_date, status = target_status, version = version + 1
  where id = target_work_item_id and version = expected_version
  returning version into next_version;
  if next_version is null then raise exception 'Công việc vừa được người khác cập nhật. Hãy tải lại rồi thử lại.'; end if;

  delete from public.work_item_coordinating_departments where work_item_id = target_work_item_id;
  insert into public.work_item_coordinating_departments(work_item_id, department_id)
  select target_work_item_id, department_id from unnest(coalesce(coordinating_department_ids, '{}'::uuid[])) department_id
  where department_id is distinct from target_lead_department_id;

  delete from public.work_item_participants where work_item_id = target_work_item_id;
  insert into public.work_item_participants(work_item_id, user_id)
  select target_work_item_id, participant_id from unnest(coalesce(participant_ids, '{}'::uuid[])) participant_id;
  return next_version;
end;
$$;

grant execute on function public.update_work_item_details(uuid, integer, text, uuid, uuid[], date, date, public.work_item_status, uuid[]) to authenticated;
revoke execute on function public.update_work_item_details(uuid, integer, text, uuid, uuid[], date, date, public.work_item_status, uuid[]) from public, anon;

create or replace function public.import_project_plan(target_project_id uuid, plan_items jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  item jsonb;
  new_id uuid;
  parent_uuid uuid;
  id_map jsonb := '{}'::jsonb;
  inserted_count integer := 0;
  responsibility text;
  lead_id uuid;
begin
  if not public.is_manager() then raise exception 'Chỉ sếp được nạp tiến độ'; end if;
  if jsonb_typeof(plan_items) <> 'array' or jsonb_array_length(plan_items) = 0 then raise exception 'Không có dữ liệu hợp lệ để nạp'; end if;
  delete from public.work_items where project_id = target_project_id;

  for item in select value from jsonb_array_elements(plan_items) loop
    if nullif(trim(item->>'name'), '') is null then raise exception 'Tên hạng mục/công việc không được để trống'; end if;
    parent_uuid := null;
    if nullif(item->>'parent_client_id', '') is not null then
      parent_uuid := nullif(id_map->>(item->>'parent_client_id'), '')::uuid;
      if parent_uuid is null then raise exception 'Cấu trúc hạng mục không hợp lệ'; end if;
    end if;
    responsibility := nullif(trim(item->>'responsibility'), '');
    lead_id := public.resolve_department_reference(trim(split_part(split_part(responsibility, '/', 1), ',', 1)));

    insert into public.work_items(project_id, parent_id, wbs, name, source_responsibility_text, lead_department_id, start_date, end_date, status, sort_order)
    values (target_project_id, parent_uuid, item->>'wbs', trim(item->>'name'), responsibility, lead_id, nullif(item->>'start_date', '')::date, nullif(item->>'end_date', '')::date, 'not_started', (item->>'sort_order')::integer)
    returning id into new_id;

    insert into public.work_item_coordinating_departments(work_item_id, department_id)
    select new_id, public.resolve_department_reference(token.value)
    from regexp_split_to_table(responsibility, '\s*[/,]\s*') with ordinality token(value, position)
    where token.position > 1 and public.resolve_department_reference(token.value) is not null and public.resolve_department_reference(token.value) is distinct from lead_id
    on conflict do nothing;

    id_map := id_map || jsonb_build_object(item->>'client_id', new_id::text);
    inserted_count := inserted_count + 1;
  end loop;
  return inserted_count;
end;
$$;

grant execute on function public.import_project_plan(uuid, jsonb) to authenticated;
revoke execute on function public.resolve_department_reference(text) from public, anon;
grant execute on function public.resolve_department_reference(text) to authenticated;

commit;
