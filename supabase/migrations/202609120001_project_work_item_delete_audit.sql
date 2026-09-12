begin;

-- Quản trị dự án chỉ được đọc log xóa đầu mục trong đúng dự án mình quản lý.
-- Quản trị hệ thống tiếp tục đọc được toàn bộ audit log.
drop policy if exists audit_logs_read_manager on public.audit_logs;
drop policy if exists audit_logs_read_project_admin on public.audit_logs;
create policy audit_logs_read_project_admin on public.audit_logs
for select to authenticated
using (
  public.is_manager()
  or (
    entity_type = 'work_items'
    and action = 'delete'
    and before_data ? 'project_id'
    and public.can_manage_project((before_data ->> 'project_id')::uuid)
  )
);

create index if not exists audit_logs_work_item_delete_project_idx
  on public.audit_logs ((before_data ->> 'project_id'), created_at desc)
  where entity_type = 'work_items' and action = 'delete';

commit;
