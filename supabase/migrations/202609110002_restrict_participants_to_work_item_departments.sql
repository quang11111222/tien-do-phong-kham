begin;

create or replace function public.validate_work_item_participant_department()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles profile
    join public.work_items item on item.id = new.work_item_id
    where profile.id = new.user_id
      and profile.active
      and profile.department_id is not null
      and (
        profile.department_id = item.lead_department_id
        or exists (
          select 1
          from public.work_item_coordinating_departments coordinator
          where coordinator.work_item_id = item.id
            and coordinator.department_id = profile.department_id
        )
      )
  ) then
    raise exception 'Người tham gia phải thuộc đơn vị chủ trì hoặc đơn vị phối hợp của công việc';
  end if;

  return new;
end;
$$;

drop trigger if exists participants_10_validate_department on public.work_item_participants;
create trigger participants_10_validate_department
before insert or update on public.work_item_participants
for each row execute function public.validate_work_item_participant_department();

revoke execute on function public.validate_work_item_participant_department() from public, anon, authenticated;

commit;
