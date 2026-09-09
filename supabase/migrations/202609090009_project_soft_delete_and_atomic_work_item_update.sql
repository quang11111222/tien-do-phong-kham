alter table public.projects
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id);

comment on column public.projects.deleted_at is 'Thời điểm dự án bị xóa mềm; null nghĩa là đang sử dụng.';
comment on column public.projects.deleted_by is 'Người thực hiện xóa mềm dự án.';

-- Chuyển dữ liệu từng dùng trạng thái archived sang cơ chế xóa mềm mới.
update public.projects
set deleted_at = coalesce(deleted_at, updated_at),
    deleted_by = coalesce(deleted_by, created_by),
    status = 'active'
where status = 'archived';

create or replace function public.set_project_deleted(
  target_project_id uuid,
  deleted boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_manager() then
    raise exception 'Chỉ sếp được xóa hoặc khôi phục dự án';
  end if;

  update public.projects
  set deleted_at = case when deleted then now() else null end,
      deleted_by = case when deleted then auth.uid() else null end
  where id = target_project_id;

  if not found then
    raise exception 'Không tìm thấy dự án';
  end if;
end;
$$;

create or replace function public.update_work_item_details(
  target_work_item_id uuid,
  expected_version integer,
  target_name text,
  target_responsibility text,
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
begin
  if not public.is_manager() then
    raise exception 'Chỉ sếp được sửa thông tin và phân công công việc';
  end if;
  if nullif(trim(target_name), '') is null then
    raise exception 'Tên hạng mục/công việc không được để trống';
  end if;
  if target_start_date is not null and target_end_date is not null and target_end_date < target_start_date then
    raise exception 'Ngày kết thúc phải từ ngày bắt đầu trở đi';
  end if;

  update public.work_items
  set name = trim(target_name),
      source_responsibility_text = nullif(trim(target_responsibility), ''),
      start_date = target_start_date,
      end_date = target_end_date,
      status = target_status,
      version = version + 1
  where id = target_work_item_id and version = expected_version
  returning version into next_version;

  if next_version is null then
    raise exception 'Công việc vừa được người khác cập nhật. Hãy tải lại rồi thử lại.';
  end if;

  delete from public.work_item_participants where work_item_id = target_work_item_id;
  insert into public.work_item_participants (work_item_id, user_id)
  select target_work_item_id, participant_id
  from unnest(coalesce(participant_ids, '{}'::uuid[])) as participant_id;

  return next_version;
end;
$$;

grant execute on function public.set_project_deleted(uuid, boolean) to authenticated;
revoke execute on function public.set_project_deleted(uuid, boolean) from public, anon;
grant execute on function public.update_work_item_details(uuid, integer, text, text, date, date, public.work_item_status, uuid[]) to authenticated;
revoke execute on function public.update_work_item_details(uuid, integer, text, text, date, date, public.work_item_status, uuid[]) from public, anon;

-- Xóa mềm phải được thực thi ở database, không chỉ ẩn bằng giao diện.
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated
using (deleted_at is null or public.is_manager());

drop policy if exists work_items_read on public.work_items;
create policy work_items_read on public.work_items for select to authenticated
using (public.is_manager() or exists (
  select 1 from public.projects project
  where project.id = work_items.project_id and project.deleted_at is null
));

drop policy if exists participants_read on public.work_item_participants;
create policy participants_read on public.work_item_participants for select to authenticated
using (public.is_manager() or exists (
  select 1 from public.work_items item join public.projects project on project.id = item.project_id
  where item.id = work_item_participants.work_item_id and project.deleted_at is null
));

drop policy if exists progress_updates_read on public.progress_updates;
create policy progress_updates_read on public.progress_updates for select to authenticated
using (public.is_manager() or exists (
  select 1 from public.work_items item join public.projects project on project.id = item.project_id
  where item.id = progress_updates.work_item_id and project.deleted_at is null
));

drop policy if exists completion_requests_read on public.completion_requests;
create policy completion_requests_read on public.completion_requests for select to authenticated
using (public.is_manager() or exists (
  select 1 from public.work_items item join public.projects project on project.id = item.project_id
  where item.id = completion_requests.work_item_id and project.deleted_at is null
));

drop policy if exists milestones_read on public.milestones;
create policy milestones_read on public.milestones for select to authenticated
using (public.is_manager() or exists (
  select 1 from public.projects project
  where project.id = milestones.project_id and project.deleted_at is null
));

drop policy if exists attachments_read on public.attachments;
create policy attachments_read on public.attachments for select to authenticated
using (public.is_manager() or exists (
  select 1 from public.work_items item join public.projects project on project.id = item.project_id
  where item.id = attachments.work_item_id and project.deleted_at is null
));
