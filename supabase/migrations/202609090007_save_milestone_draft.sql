-- Lưu toàn bộ bản nháp mốc kiểm soát trong một transaction.
create or replace function public.save_project_milestones(target_project_id uuid, milestone_items jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare item jsonb; saved integer := 0; persisted_id uuid;
begin
  if not public.is_manager() then raise exception 'Chỉ sếp được sửa mốc kiểm soát'; end if;
  if jsonb_typeof(milestone_items) <> 'array' then raise exception 'Dữ liệu mốc không hợp lệ'; end if;

  delete from public.milestones
  where project_id = target_project_id
    and id not in (
      select (value->>'id')::uuid from jsonb_array_elements(milestone_items)
      where nullif(value->>'id', '') is not null
    );

  for item in select value from jsonb_array_elements(milestone_items) loop
    persisted_id := nullif(item->>'id', '')::uuid;
    if persisted_id is null then
      insert into public.milestones(project_id, name, due_date, owner_text, condition_text, achieved, achieved_at, sort_order)
      values (target_project_id, trim(item->>'name'), (item->>'due_date')::date, nullif(trim(item->>'owner_text'), ''), nullif(trim(item->>'condition_text'), ''), coalesce((item->>'achieved')::boolean, false), nullif(item->>'achieved_at', '')::date, (item->>'sort_order')::integer);
    else
      update public.milestones set
        name = trim(item->>'name'), due_date = (item->>'due_date')::date,
        owner_text = nullif(trim(item->>'owner_text'), ''), condition_text = nullif(trim(item->>'condition_text'), ''),
        achieved = coalesce((item->>'achieved')::boolean, false), achieved_at = nullif(item->>'achieved_at', '')::date,
        sort_order = (item->>'sort_order')::integer
      where id = persisted_id and project_id = target_project_id;
    end if;
    saved := saved + 1;
  end loop;
  return saved;
end;
$$;

grant execute on function public.save_project_milestones(uuid, jsonb) to authenticated;
