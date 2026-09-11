begin;

create or replace function public.submit_work_item_completion(target_work_item_id uuid, submission_note text default null)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  request_id uuid;
  next_attempt integer;
  target_project_id uuid;
  direct_completion boolean;
  direct_completion_reason text;
begin
  select project_id into target_project_id from public.work_items where id = target_work_item_id;
  if target_project_id is null then raise exception 'Không tìm thấy công việc'; end if;
  if exists (select 1 from public.work_items where parent_id = target_work_item_id) then raise exception 'Chỉ công việc cuối nhánh mới được gửi hoàn thành'; end if;
  if not public.is_work_item_participant(target_work_item_id) and not public.can_manage_project(target_project_id) then
    raise exception 'Bạn không được phân công công việc này';
  end if;
  if (select count(*) from public.attachments where work_item_id = target_work_item_id) <> 1 then
    raise exception 'Cần đúng 1 tài liệu bằng chứng trước khi gửi hoàn thành';
  end if;
  if exists (select 1 from public.completion_requests where work_item_id = target_work_item_id and status = 'pending') then
    raise exception 'Công việc đã có yêu cầu chờ duyệt';
  end if;

  direct_completion := public.can_manage_project(target_project_id) or exists (
    select 1
    from public.work_items item
    join public.profiles profile on profile.id = auth.uid() and profile.active
    where item.id = target_work_item_id
      and profile.is_department_admin
      and profile.department_id = item.lead_department_id
  );
  direct_completion_reason := case
    when public.can_manage_project(target_project_id) then 'Tự xác nhận theo quyền quản trị dự án sau khi nộp bằng chứng'
    when direct_completion then 'Tự xác nhận theo quyền Quản trị phòng/ban chủ trì sau khi nộp bằng chứng'
    else null
  end;

  select coalesce(max(attempt_no), 0) + 1 into next_attempt from public.completion_requests where work_item_id = target_work_item_id;
  insert into public.completion_requests (
    work_item_id, attempt_no, note, status, submitted_by, reviewed_by, reviewed_at, review_note
  ) values (
    target_work_item_id, next_attempt, nullif(trim(submission_note), ''),
    case when direct_completion then 'approved'::public.completion_request_status else 'pending'::public.completion_request_status end,
    auth.uid(), case when direct_completion then auth.uid() else null end,
    case when direct_completion then now() else null end,
    direct_completion_reason
  ) returning id into request_id;

  update public.work_items
  set status = case when direct_completion then 'completed'::public.work_item_status else 'pending_approval'::public.work_item_status end,
      updated_by = auth.uid(), version = version + 1
  where id = target_work_item_id and status <> 'completed';
  if not found then raise exception 'Không thể gửi công việc đã hoàn thành'; end if;
  return request_id;
end;
$$;

grant execute on function public.submit_work_item_completion(uuid, text) to authenticated;

commit;
