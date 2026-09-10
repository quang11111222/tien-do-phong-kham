begin;

-- Dữ liệu Storage cũ có thể dùng tên công việc làm thư mục đầu tiên.
-- Không ép phần này sang uuid vì PostgreSQL có thể đánh giá policy trên cả
-- các object cũ và làm lỗi thao tác hợp lệ với đường dẫn UUID mới.
drop policy if exists evidence_upload_participant on storage.objects;
create policy evidence_upload_participant on storage.objects
for insert to authenticated
with check (
  bucket_id = 'evidence'
  and exists (
    select 1 from public.work_items item
    where item.id::text = split_part(storage.objects.name, '/', 1)
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
    where item.id::text = split_part(storage.objects.name, '/', 1)
      and item.status not in ('pending_approval', 'completed')
      and (public.is_manager() or public.is_work_item_participant(item.id))
  )
);

commit;
