begin;

create or replace function public.update_work_item_participants(
  target_work_item_id uuid,
  expected_version integer,
  participant_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_project_id uuid;
  target_lead_department_id uuid;
  current_department_id uuid;
  current_is_department_admin boolean := false;
  current_active boolean := false;
  management_scope text := 'none';
  requested_participant_ids uuid[] := coalesce(participant_ids, '{}'::uuid[]);
  next_version integer;
begin
  select item.project_id, item.lead_department_id
  into target_project_id, target_lead_department_id
  from public.work_items item
  where item.id = target_work_item_id;

  if target_project_id is null then
    raise exception 'Không tìm thấy công việc';
  end if;

  if exists (select 1 from public.work_items child where child.parent_id = target_work_item_id) then
    raise exception 'Chỉ phân công người tham gia cho công việc cuối nhánh';
  end if;

  select profile.department_id, profile.is_department_admin, profile.active
  into current_department_id, current_is_department_admin, current_active
  from public.profiles profile
  where profile.id = auth.uid();

  if public.can_manage_project(target_project_id) then
    management_scope := 'all_related_departments';
  elsif current_active and current_is_department_admin and current_department_id is not null then
    if current_department_id = target_lead_department_id then
      management_scope := 'all_related_departments';
    elsif exists (
      select 1
      from public.work_item_coordinating_departments coordinator
      where coordinator.work_item_id = target_work_item_id
        and coordinator.department_id = current_department_id
    ) then
      management_scope := 'own_department';
    end if;
  end if;

  if management_scope = 'none' then
    raise exception 'Bạn không có quyền phân công người tham gia cho công việc này';
  end if;

  if exists (
    select 1
    from unnest(requested_participant_ids) requested(user_id)
    left join public.profiles profile on profile.id = requested.user_id
    where profile.id is null
      or not profile.active
      or profile.department_id is null
      or not (
        profile.department_id = target_lead_department_id
        or exists (
          select 1
          from public.work_item_coordinating_departments coordinator
          where coordinator.work_item_id = target_work_item_id
            and coordinator.department_id = profile.department_id
        )
      )
  ) then
    raise exception 'Người tham gia phải thuộc đơn vị chủ trì hoặc đơn vị phối hợp của công việc';
  end if;

  if management_scope = 'own_department' and (
    exists (
      select current_participant.user_id
      from public.work_item_participants current_participant
      join public.profiles profile on profile.id = current_participant.user_id
      where current_participant.work_item_id = target_work_item_id
        and profile.department_id is distinct from current_department_id
      except
      select requested.user_id
      from unnest(requested_participant_ids) requested(user_id)
      join public.profiles profile on profile.id = requested.user_id
      where profile.department_id is distinct from current_department_id
    )
    or exists (
      select requested.user_id
      from unnest(requested_participant_ids) requested(user_id)
      join public.profiles profile on profile.id = requested.user_id
      where profile.department_id is distinct from current_department_id
      except
      select current_participant.user_id
      from public.work_item_participants current_participant
      join public.profiles profile on profile.id = current_participant.user_id
      where current_participant.work_item_id = target_work_item_id
        and profile.department_id is distinct from current_department_id
    )
  ) then
    raise exception 'Quản trị đơn vị phối hợp chỉ được thay đổi nhân sự thuộc phòng/ban của mình';
  end if;

  update public.work_items
  set version = version + 1
  where id = target_work_item_id
    and version = expected_version
  returning version into next_version;

  if next_version is null then
    raise exception 'Công việc vừa được người khác cập nhật. Hãy tải lại rồi thử lại.';
  end if;

  delete from public.work_item_participants
  where work_item_id = target_work_item_id;

  insert into public.work_item_participants(work_item_id, user_id)
  select target_work_item_id, requested.user_id
  from unnest(requested_participant_ids) requested(user_id);

  return next_version;
end;
$$;

grant execute on function public.update_work_item_participants(uuid, integer, uuid[]) to authenticated;
revoke execute on function public.update_work_item_participants(uuid, integer, uuid[]) from public, anon;

commit;
