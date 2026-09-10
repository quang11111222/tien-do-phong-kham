-- Bản 015 đã được áp dụng trước khi phát hiện nhánh DELETE cần trả OLD.
-- Giữ bản vá riêng để database đang chạy và lần dựng mới đều có cùng hành vi.
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
