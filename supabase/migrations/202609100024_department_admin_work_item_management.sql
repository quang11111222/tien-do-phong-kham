begin;

-- Quản trị phòng/ban sở hữu một nhánh khi chính công việc hoặc một mục cha
-- trong nhánh có đơn vị chủ trì trùng với phòng/ban của họ.
create or replace function public.department_admin_owns_work_branch(target_work_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive lineage as (
    select item.id, item.parent_id, item.lead_department_id
    from public.work_items item
    where item.id = target_work_item_id
    union all
    select parent.id, parent.parent_id, parent.lead_department_id
    from public.work_items parent
    join lineage child on child.parent_id = parent.id
  )
  select exists (
    select 1
    from public.profiles profile
    join lineage item on item.lead_department_id = profile.department_id
    where profile.id = auth.uid()
      and profile.active
      and profile.is_department_admin
      and profile.department_id is not null
  );
$$;

create or replace function public.can_manage_work_item_structure(target_work_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.work_items item
    where item.id = target_work_item_id
      and (
        public.can_manage_project(item.project_id)
        or (
          item.parent_id is not null
          and public.department_admin_owns_work_branch(item.id)
        )
      )
  );
$$;

create or replace function public.can_create_child_work_item(target_project_id uuid, target_parent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_project(target_project_id)
    or (
      target_parent_id is not null
      and exists (
        select 1
        from public.work_items parent
        where parent.id = target_parent_id
          and parent.project_id = target_project_id
          and public.department_admin_owns_work_branch(parent.id)
      )
    );
$$;

-- Xóa đi qua RLS vì frontend xóa trực tiếp trên bảng work_items.
drop policy if exists work_items_delete_department_admin on public.work_items;
create policy work_items_delete_department_admin on public.work_items
for delete to authenticated
using (public.can_manage_work_item_structure(id));

-- Hai RPC này là SECURITY DEFINER, do đó phải kiểm tra quyền ngay trong hàm.
do $$
declare
  definition text;
  updated_definition text;
begin
  select pg_get_functiondef('public.create_work_item(uuid,uuid,text,text,uuid,uuid[],date,date,public.work_item_status,uuid[])'::regprocedure)
  into definition;
  updated_definition := replace(
    definition,
    'if not public.can_manage_project(target_project_id) then',
    'if not public.can_create_child_work_item(target_project_id, target_parent_id) then'
  );
  if updated_definition = definition then
    raise exception 'Không tìm thấy điều kiện quyền trong create_work_item';
  end if;
  execute updated_definition;

  select pg_get_functiondef('public.update_work_item_details(uuid,integer,text,uuid,uuid[],date,date,public.work_item_status,uuid[])'::regprocedure)
  into definition;
  updated_definition := replace(
    definition,
    'if not exists (select 1 from public.work_items scoped_item where scoped_item.id = target_work_item_id and public.can_manage_project(scoped_item.project_id)) then',
    'if not public.can_manage_work_item_structure(target_work_item_id) then'
  );
  if updated_definition = definition then
    raise exception 'Không tìm thấy điều kiện quyền trong update_work_item_details';
  end if;
  execute updated_definition;
end;
$$;

grant execute on function public.department_admin_owns_work_branch(uuid) to authenticated;
grant execute on function public.can_manage_work_item_structure(uuid) to authenticated;
grant execute on function public.can_create_child_work_item(uuid, uuid) to authenticated;

commit;
