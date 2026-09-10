begin;

create or replace function public.can_view_project(target_project_id uuid)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_department_id uuid;
begin
  if not public.is_active_user() then return false; end if;
  if public.is_project_admin(target_project_id) then return true; end if;
  select department_id into current_department_id from public.profiles where id = current_user_id;

  return exists (
    select 1 from public.work_items item
    where item.project_id = target_project_id
      and (
        item.lead_department_id = current_department_id
        or exists (
          select 1 from public.work_item_coordinating_departments coordinator
          where coordinator.work_item_id = item.id and coordinator.department_id = current_department_id
        )
        or exists (
          select 1 from public.work_item_participants participant
          where participant.work_item_id = item.id and participant.user_id = current_user_id
        )
      )
  );
end;
$$;

create or replace function public.can_view_work_item(target_work_item_id uuid)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_department_id uuid;
  target_project_id uuid;
begin
  if not public.is_active_user() then return false; end if;
  select project_id into target_project_id from public.work_items where id = target_work_item_id;
  if target_project_id is null then return false; end if;
  if public.is_project_admin(target_project_id) then return true; end if;
  select department_id into current_department_id from public.profiles where id = current_user_id;

  return exists (
    with recursive branch as (
      select child.id, child.lead_department_id
      from public.work_items child where child.id = target_work_item_id
      union all
      select child.id, child.lead_department_id
      from public.work_items child join branch parent on child.parent_id = parent.id
    )
    select 1 from branch item
    where item.lead_department_id = current_department_id
      or exists (
        select 1 from public.work_item_coordinating_departments coordinator
        where coordinator.work_item_id = item.id and coordinator.department_id = current_department_id
      )
      or exists (
        select 1 from public.work_item_participants participant
        where participant.work_item_id = item.id and participant.user_id = current_user_id
      )
  );
end;
$$;

drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated using (
  (deleted_at is null or public.is_manager()) and public.can_view_project(id)
);

grant execute on function public.can_view_project(uuid), public.can_view_work_item(uuid) to authenticated;

commit;
