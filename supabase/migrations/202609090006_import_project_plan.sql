-- Thay toàn bộ tiến độ một dự án trong một transaction sau bước preview Excel.
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
begin
  if not public.is_manager() then raise exception 'Chỉ sếp được nạp tiến độ Excel'; end if;
  if jsonb_typeof(plan_items) <> 'array' or jsonb_array_length(plan_items) = 0 then raise exception 'File không có dữ liệu tiến độ'; end if;

  delete from public.work_items where project_id = target_project_id;

  for item in select value from jsonb_array_elements(plan_items) loop
    parent_uuid := null;
    if nullif(item->>'parent_client_id', '') is not null then
      parent_uuid := nullif(id_map->>(item->>'parent_client_id'), '')::uuid;
      if parent_uuid is null then raise exception 'Cấu trúc hạng mục không hợp lệ'; end if;
    end if;
    insert into public.work_items(project_id, parent_id, wbs, name, source_responsibility_text, start_date, end_date, status, sort_order)
    values (
      target_project_id, parent_uuid, item->>'wbs', trim(item->>'name'), nullif(trim(item->>'responsibility'), ''),
      nullif(item->>'start_date', '')::date, nullif(item->>'end_date', '')::date, 'not_started', (item->>'sort_order')::integer
    ) returning id into new_id;
    id_map := id_map || jsonb_build_object(item->>'client_id', new_id::text);
    inserted_count := inserted_count + 1;
  end loop;
  return inserted_count;
end;
$$;

grant execute on function public.import_project_plan(uuid, jsonb) to authenticated;
