begin;

-- Hồ sơ đã gửi duyệt phải giữ nguyên. Chỉ cho phép RPC xét duyệt chuyển
-- pending_approval -> completed hoặc pending_approval -> in_progress.
create or replace function public.protect_locked_work_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'completed' then
    raise exception 'Công việc đã hoàn thành và không thể chỉnh sửa hoặc xóa';
  end if;

  if old.status = 'pending_approval' then
    if tg_op = 'DELETE' then
      raise exception 'Công việc đang chờ duyệt và không thể xóa';
    end if;

    if new.status not in ('completed', 'in_progress')
      or new.project_id is distinct from old.project_id
      or new.parent_id is distinct from old.parent_id
      or new.wbs is distinct from old.wbs
      or new.name is distinct from old.name
      or new.source_responsibility_text is distinct from old.source_responsibility_text
      or new.lead_department_id is distinct from old.lead_department_id
      or new.start_date is distinct from old.start_date
      or new.end_date is distinct from old.end_date
      or new.sort_order is distinct from old.sort_order
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at then
      raise exception 'Công việc đang chờ duyệt; chỉ được duyệt hoặc từ chối yêu cầu';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists work_items_00_protect_locked on public.work_items;
create trigger work_items_00_protect_locked
before update or delete on public.work_items
for each row execute function public.protect_locked_work_item();

-- Khóa các quan hệ cũng là một phần thông tin của công việc.
create or replace function public.protect_locked_work_item_relation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_work_item_id uuid;
begin
  target_work_item_id := case when tg_op = 'DELETE' then old.work_item_id else new.work_item_id end;

  if exists (
    select 1
    from public.work_items item
    where item.id = target_work_item_id
      and item.status in ('pending_approval', 'completed')
  ) then
    raise exception 'Công việc đang chờ duyệt hoặc đã hoàn thành; dữ liệu đã được khóa';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists participants_00_protect_locked on public.work_item_participants;
create trigger participants_00_protect_locked
before insert or update or delete on public.work_item_participants
for each row execute function public.protect_locked_work_item_relation();

drop trigger if exists coordinating_departments_00_protect_locked on public.work_item_coordinating_departments;
create trigger coordinating_departments_00_protect_locked
before insert or update or delete on public.work_item_coordinating_departments
for each row execute function public.protect_locked_work_item_relation();

drop trigger if exists attachments_00_protect_locked on public.attachments;
create trigger attachments_00_protect_locked
before insert or update or delete on public.attachments
for each row execute function public.protect_locked_work_item_relation();

-- RLS kiểm tra trạng thái trước khi ghi metadata bằng chứng.
drop policy if exists attachments_add_participant on public.attachments;
create policy attachments_add_participant on public.attachments
for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and (public.is_manager() or public.is_work_item_participant(work_item_id))
  and exists (
    select 1 from public.work_items item
    where item.id = work_item_id
      and item.status not in ('pending_approval', 'completed')
      and not exists (select 1 from public.work_items child where child.parent_id = item.id)
  )
);

drop policy if exists attachments_delete_participant on public.attachments;
create policy attachments_delete_participant on public.attachments
for delete to authenticated
using (
  (public.is_manager() or public.is_work_item_participant(work_item_id))
  and exists (
    select 1 from public.work_items item
    where item.id = work_item_id
      and item.status not in ('pending_approval', 'completed')
  )
);

-- Storage cũng phải khóa; nếu chỉ khóa bảng attachments thì vẫn có thể xóa file vật lý.
drop policy if exists evidence_upload_participant on storage.objects;
create policy evidence_upload_participant on storage.objects
for insert to authenticated
with check (
  bucket_id = 'evidence'
  and exists (
    select 1 from public.work_items item
    where item.id = ((storage.foldername(name))[1])::uuid
      and item.status not in ('pending_approval', 'completed')
      and not exists (select 1 from public.work_items child where child.parent_id = item.id)
      and (public.is_manager() or public.is_work_item_participant(item.id))
  )
);

drop policy if exists evidence_delete_participant on storage.objects;
create policy evidence_delete_participant on storage.objects
for delete to authenticated
using (
  bucket_id = 'evidence'
  and exists (
    select 1 from public.work_items item
    where item.id = ((storage.foldername(name))[1])::uuid
      and item.status not in ('pending_approval', 'completed')
      and (public.is_manager() or public.is_work_item_participant(item.id))
  )
);

commit;
