begin;

-- Chỉ bằng chứng đã nộp bị khóa. Công việc vẫn được sửa, phân công và thêm
-- công việc con dù đang chờ duyệt hoặc đã hoàn thành.
drop trigger if exists work_items_00_protect_locked on public.work_items;
drop trigger if exists participants_00_protect_locked on public.work_item_participants;
drop trigger if exists coordinating_departments_00_protect_locked on public.work_item_coordinating_departments;
drop function if exists public.protect_locked_work_item();

-- Không cho xóa cả công việc nếu thao tác đó sẽ xóa theo một bằng chứng đã
-- nộp. Đây là bảo vệ bằng chứng, không khóa việc sửa hoặc thêm nhánh con.
create or replace function public.protect_submitted_evidence_on_work_item_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status in ('pending_approval', 'completed')
    and exists (select 1 from public.attachments attachment where attachment.work_item_id = old.id) then
    raise exception 'Không thể xóa công việc vì có bằng chứng đã nộp đang được khóa';
  end if;
  return old;
end;
$$;

drop trigger if exists work_items_00_protect_submitted_evidence on public.work_items;
create trigger work_items_00_protect_submitted_evidence
before delete on public.work_items
for each row execute function public.protect_submitted_evidence_on_work_item_delete();

-- Nhật ký diễn biến là thông tin bổ sung, không phải tệp bằng chứng nên vẫn
-- được cập nhật ở mọi trạng thái nếu người dùng có quyền trên công việc.
drop policy if exists progress_updates_add_participant on public.progress_updates;
create policy progress_updates_add_participant on public.progress_updates
for insert to authenticated
with check (
  created_by = auth.uid()
  and (public.is_manager() or public.is_work_item_participant(work_item_id))
);

commit;
