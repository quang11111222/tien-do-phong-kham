begin;

-- Detailed business data remains scoped to the user's project, department or assignment.
create or replace function public.can_view_work_item_detail(target_work_item_id uuid)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_department_id uuid;
  current_is_department_admin boolean := false;
  target_project_id uuid;
begin
  if not public.is_active_user() then return false; end if;

  select project_id into target_project_id
  from public.work_items
  where id = target_work_item_id;
  if target_project_id is null then return false; end if;
  if public.is_project_admin(target_project_id) then return true; end if;

  select department_id, is_department_admin
  into current_department_id, current_is_department_admin
  from public.profiles
  where id = current_user_id and active;

  if current_is_department_admin
    and public.department_admin_owns_work_branch(target_work_item_id)
  then return true;
  end if;

  return exists (
    with recursive branch as (
      select child.id, child.lead_department_id
      from public.work_items child
      where child.id = target_work_item_id
      union all
      select child.id, child.lead_department_id
      from public.work_items child
      join branch parent on child.parent_id = parent.id
    )
    select 1
    from branch item
    where item.lead_department_id = current_department_id
      or exists (
        select 1
        from public.work_item_coordinating_departments coordinator
        where coordinator.work_item_id = item.id
          and coordinator.department_id = current_department_id
      )
      or exists (
        select 1
        from public.work_item_participants participant
        where participant.work_item_id = item.id
          and participant.user_id = current_user_id
      )
  );
end;
$$;

-- Department administrators may see every row needed to render progress/Gantt.
-- Employees keep the existing scoped visibility.
create or replace function public.can_view_work_item(target_work_item_id uuid)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  target_project_id uuid;
  project_is_active boolean;
  current_is_department_admin boolean := false;
begin
  if not public.is_active_user() then return false; end if;

  select item.project_id, project.deleted_at is null
  into target_project_id, project_is_active
  from public.work_items item
  join public.projects project on project.id = item.project_id
  where item.id = target_work_item_id;
  if target_project_id is null then return false; end if;
  if not project_is_active and not public.is_manager() then return false; end if;
  if public.is_project_admin(target_project_id) then return true; end if;

  select is_department_admin into current_is_department_admin
  from public.profiles
  where id = auth.uid() and active;

  return current_is_department_admin or public.can_view_work_item_detail(target_work_item_id);
end;
$$;

create or replace function public.can_view_project(target_project_id uuid)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  current_is_department_admin boolean := false;
begin
  if not public.is_active_user() then return false; end if;
  if public.is_project_admin(target_project_id) then return true; end if;

  select is_department_admin into current_is_department_admin
  from public.profiles
  where id = auth.uid() and active;
  if current_is_department_admin then return true; end if;

  return exists (
    select 1
    from public.work_items item
    where item.project_id = target_project_id
      and public.can_view_work_item_detail(item.id)
  );
end;
$$;

drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated using (
  (deleted_at is null or public.is_manager()) and public.can_view_project(id)
);

drop policy if exists work_items_read on public.work_items;
create policy work_items_read on public.work_items for select to authenticated
using (public.is_manager() or public.can_view_work_item(id));

drop policy if exists participants_read on public.work_item_participants;
create policy participants_read on public.work_item_participants for select to authenticated
using (public.is_manager() or public.can_view_work_item_detail(work_item_id));

drop policy if exists coordinating_departments_read on public.work_item_coordinating_departments;
create policy coordinating_departments_read on public.work_item_coordinating_departments for select to authenticated
using (public.is_manager() or public.can_view_work_item_detail(work_item_id));

drop policy if exists progress_updates_read on public.progress_updates;
create policy progress_updates_read on public.progress_updates for select to authenticated
using (public.is_manager() or public.can_view_work_item_detail(work_item_id));

drop policy if exists attachments_read on public.attachments;
create policy attachments_read on public.attachments for select to authenticated
using (public.is_manager() or public.can_view_work_item_detail(work_item_id));

drop policy if exists evidence_read_authenticated on storage.objects;
drop policy if exists evidence_read_scoped on storage.objects;
create policy evidence_read_scoped on storage.objects
for select to authenticated using (
  bucket_id = 'evidence'
  and split_part(storage.objects.name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.can_view_work_item_detail(split_part(storage.objects.name, '/', 1)::uuid)
);

grant execute on function public.can_view_project(uuid), public.can_view_work_item(uuid), public.can_view_work_item_detail(uuid) to authenticated;

commit;
