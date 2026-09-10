begin;

-- `work_items` cũng có cột `name`. Luôn định danh `storage.objects.name`
-- để policy lấy đúng thư mục UUID ở đầu đường dẫn tệp bằng chứng.
drop policy if exists evidence_upload_participant on storage.objects;
create policy evidence_upload_participant on storage.objects
for insert to authenticated
with check (
  bucket_id = 'evidence'
  and split_part(storage.objects.name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (
    public.is_work_item_participant(split_part(storage.objects.name, '/', 1)::uuid)
    or exists (
      select 1
      from public.work_items item
      where item.id = split_part(storage.objects.name, '/', 1)::uuid
        and public.can_manage_project(item.project_id)
    )
  )
  and exists (
    select 1
    from public.work_items item
    where item.id = split_part(storage.objects.name, '/', 1)::uuid
      and item.status not in ('pending_approval', 'completed')
      and not exists (
        select 1 from public.work_items child where child.parent_id = item.id
      )
  )
);

drop policy if exists evidence_delete_participant on storage.objects;
create policy evidence_delete_participant on storage.objects
for delete to authenticated
using (
  bucket_id = 'evidence'
  and split_part(storage.objects.name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.work_items item
    where item.id = split_part(storage.objects.name, '/', 1)::uuid
      and item.status not in ('pending_approval', 'completed')
      and (
        public.is_work_item_participant(item.id)
        or public.can_manage_project(item.project_id)
      )
  )
);

commit;
