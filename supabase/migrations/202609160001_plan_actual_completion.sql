begin;

alter table public.work_items
  add column if not exists actual_completed_at timestamptz;

alter table public.completion_requests
  add column if not exists late_reason text;

drop function if exists public.submit_work_item_completion(uuid, text);

create or replace function public.submit_work_item_completion(
  target_work_item_id uuid,
  submission_note text default null,
  late_reason text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  request_id uuid;
  next_attempt integer;
  target_project_id uuid;
  target_end_date date;
  direct_completion boolean;
  submitted_at_value timestamptz := now();
  normalized_late_reason text := nullif(trim(late_reason), '');
begin
  select project_id, end_date into target_project_id, target_end_date
  from public.work_items
  where id = target_work_item_id;
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
  if target_end_date is not null
    and (submitted_at_value at time zone 'Asia/Ho_Chi_Minh')::date > target_end_date
    and normalized_late_reason is null then
    raise exception 'Công việc đã quá hạn; cần nhập lý do trễ';
  end if;

  direct_completion := public.can_manage_project(target_project_id) or exists (
    select 1
    from public.work_items item
    join public.profiles profile on profile.id = auth.uid() and profile.active
    where item.id = target_work_item_id
      and profile.is_department_admin
      and profile.department_id = item.lead_department_id
  );

  select coalesce(max(attempt_no), 0) + 1 into next_attempt
  from public.completion_requests
  where work_item_id = target_work_item_id;

  insert into public.completion_requests (
    work_item_id, attempt_no, note, late_reason, status, submitted_by, submitted_at,
    reviewed_by, reviewed_at, review_note
  ) values (
    target_work_item_id, next_attempt, nullif(trim(submission_note), ''), normalized_late_reason,
    case when direct_completion then 'approved'::public.completion_request_status else 'pending'::public.completion_request_status end,
    auth.uid(), submitted_at_value,
    case when direct_completion then auth.uid() else null end,
    case when direct_completion then submitted_at_value else null end,
    case when direct_completion and public.can_manage_project(target_project_id)
      then 'Tự xác nhận theo quyền quản trị dự án sau khi nộp bằng chứng'
      when direct_completion then 'Tự xác nhận theo quyền Quản trị phòng/ban chủ trì sau khi nộp bằng chứng'
      else null end
  ) returning id into request_id;

  update public.work_items
  set status = case when direct_completion then 'completed'::public.work_item_status else 'pending_approval'::public.work_item_status end,
      actual_completed_at = case when direct_completion then submitted_at_value else null end,
      updated_by = auth.uid(), version = version + 1
  where id = target_work_item_id and status <> 'completed';
  if not found then raise exception 'Không thể gửi công việc đã hoàn thành'; end if;
  return request_id;
end;
$$;

create or replace function public.review_completion_request(
  target_request_id uuid,
  decision public.completion_request_status,
  manager_note text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_work_item_id uuid;
  request_submitter uuid;
  request_submitted_at timestamptz;
begin
  if decision not in ('approved', 'rejected') then raise exception 'Kết quả duyệt không hợp lệ'; end if;
  if decision = 'rejected' and nullif(trim(manager_note), '') is null then raise exception 'Từ chối phải nhập lý do'; end if;

  select work_item_id, submitted_by, submitted_at
  into target_work_item_id, request_submitter, request_submitted_at
  from public.completion_requests
  where id = target_request_id and status = 'pending';
  if target_work_item_id is null then raise exception 'Yêu cầu không còn ở trạng thái chờ duyệt'; end if;
  if request_submitter = auth.uid() then raise exception 'Người gửi không được tự duyệt yêu cầu của mình'; end if;
  if not public.can_review_work_item(target_work_item_id) then raise exception 'Bạn không có quyền duyệt công việc này'; end if;

  update public.completion_requests
  set status = decision, reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(manager_note), '')
  where id = target_request_id and status = 'pending';
  if not found then raise exception 'Yêu cầu vừa được người khác xử lý'; end if;

  update public.work_items
  set status = case when decision = 'approved' then 'completed'::public.work_item_status else 'in_progress'::public.work_item_status end,
      actual_completed_at = case when decision = 'approved' then request_submitted_at else null end,
      updated_by = auth.uid(), version = version + 1
  where id = target_work_item_id;
end;
$$;

grant execute on function public.submit_work_item_completion(uuid, text, text), public.review_completion_request(uuid, public.completion_request_status, text) to authenticated;
revoke execute on function public.submit_work_item_completion(uuid, text, text), public.review_completion_request(uuid, public.completion_request_status, text) from public, anon;

commit;