begin;

-- Kế hoạch đã được TGĐ phê duyệt trước khi nạp vào hệ thống. Từ thời điểm
-- nạp, chỉ Quản trị hệ thống hoặc Quản trị dự án được thay đổi cấu trúc.
create or replace function public.can_manage_work_item_structure(target_work_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.work_items item
    where item.id = target_work_item_id
      and public.can_manage_project(item.project_id)
  );
$$;

create or replace function public.can_create_child_work_item(target_project_id uuid, target_parent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_project(target_project_id);
$$;

-- Bỏ quyền xóa theo nhánh của Quản trị phòng/ban. Chính sách quản trị dự án
-- hiện có tiếp tục cho phép Quản trị hệ thống/Quản trị dự án xóa đầu mục.
drop policy if exists work_items_delete_department_admin on public.work_items;

grant execute on function public.can_manage_work_item_structure(uuid) to authenticated;
grant execute on function public.can_create_child_work_item(uuid, uuid) to authenticated;

commit;
