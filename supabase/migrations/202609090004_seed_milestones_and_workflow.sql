-- Mốc kiểm soát từ prototype và quy tắc bằng chứng/duyệt đã chốt.
create unique index if not exists attachments_one_evidence_per_work_item_idx on public.attachments(work_item_id) where completion_request_id is null;

drop policy if exists attachments_add_participant on public.attachments;
create policy attachments_add_participant on public.attachments for insert to authenticated with check (
  uploaded_by = auth.uid() and (public.is_manager() or public.is_work_item_participant(work_item_id))
  and not exists (select 1 from public.work_items child where child.parent_id = work_item_id)
);
drop policy if exists attachments_delete_participant on public.attachments;
create policy attachments_delete_participant on public.attachments for delete to authenticated using (public.is_manager() or public.is_work_item_participant(work_item_id));
drop policy if exists evidence_delete_participant on storage.objects;
create policy evidence_delete_participant on storage.objects for delete to authenticated using (
  bucket_id = 'evidence' and (public.is_manager() or public.is_work_item_participant(((storage.foldername(name))[1])::uuid))
);

create or replace function public.submit_work_item_completion(target_work_item_id uuid, submission_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare request_id uuid; next_attempt integer;
begin
  if not public.is_manager() and not public.is_work_item_participant(target_work_item_id) then raise exception 'Bạn không tham gia công việc này'; end if;
  if exists (select 1 from public.work_items where parent_id = target_work_item_id) then raise exception 'Chỉ công việc cuối nhánh mới được gửi hoàn thành'; end if;
  if (select count(*) from public.attachments where work_item_id = target_work_item_id and completion_request_id is null) <> 1 then raise exception 'Công việc phải có đúng một tệp bằng chứng'; end if;
  if exists (select 1 from public.completion_requests where work_item_id = target_work_item_id and status = 'pending') then raise exception 'Công việc đã có yêu cầu chờ duyệt'; end if;
  select coalesce(max(attempt_no), 0) + 1 into next_attempt from public.completion_requests where work_item_id = target_work_item_id;
  insert into public.completion_requests (work_item_id, attempt_no, note, submitted_by) values (target_work_item_id, next_attempt, nullif(trim(submission_note), ''), auth.uid()) returning id into request_id;
  update public.work_items set status = 'pending_approval', updated_by = auth.uid(), version = version + 1 where id = target_work_item_id and status not in ('pending_approval', 'completed');
  if not found then raise exception 'Công việc không thể gửi duyệt ở trạng thái hiện tại'; end if;
  return request_id;
end;
$$;

do $$
declare actor_id uuid; target_project_id uuid;
begin
  select id into actor_id from public.profiles where username = 'admin' limit 1;
  select id into target_project_id from public.projects where code = 'PK-KHETRE';
  insert into public.milestones (project_id, name, due_date, condition_text, achieved, achieved_at, sort_order, created_by, updated_by)
  select target_project_id, source.name, source.due_date::date, source.condition_text, source.achieved, source.achieved_at::date, source.sort_order, actor_id, actor_id
  from jsonb_to_recordset($m$[{"name":"Hoàn thành thiết kế","due_date":"2026-08-10","condition_text":"Đủ bản vẽ, thuyết minh và hồ sơ thiết kế để lập dự toán","achieved":true,"achieved_at":"2026-08-10","sort_order":0},{"name":"Hoàn thành lập dự toán","due_date":"2026-08-24","condition_text":"BOQ và dự toán được rà soát, phê duyệt","achieved":true,"achieved_at":"2026-08-24","sort_order":1},{"name":"Hoàn thành mời chào và lựa chọn nhà thầu","due_date":"2026-09-03","condition_text":"Chốt nhà thầu, sẵn sàng huy động","achieved":false,"achieved_at":null,"sort_order":2},{"name":"Hoàn thành phá dỡ chính","due_date":"2026-09-15","condition_text":"Mặt bằng sạch, đủ điều kiện triển khai các hạng mục tiếp theo","achieved":false,"achieved_at":null,"sort_order":3},{"name":"Hoàn thành kết cấu bể XLNT","due_date":"2026-10-26","condition_text":"Kết cấu, chống thấm và thử nước đạt","achieved":false,"achieved_at":null,"sort_order":4},{"name":"Hoàn thành phần MEP chính","due_date":"2026-11-28","condition_text":"Điện, nước, điện nhẹ, khí y tế, PCCC, điều hòa thông gió cơ bản hoàn thành","achieved":false,"achieved_at":null,"sort_order":5},{"name":"Hoàn thành máy móc, thiết bị y tế","due_date":"2026-11-08","condition_text":"Lắp đặt, chạy thử, nghiệm thu","achieved":false,"achieved_at":null,"sort_order":6},{"name":"Hoàn thành tuyển dụng bổ sung","due_date":"2026-11-28","condition_text":"Hoàn tất theo kế hoạch 3 tháng 20 ngày","achieved":false,"achieved_at":null,"sort_order":7},{"name":"Hoàn thành Website, mail, HIS","due_date":"2026-11-29","condition_text":"Kiểm thử, đào tạo và vận hành thử","achieved":false,"achieved_at":null,"sort_order":8},{"name":"Hoàn thành thi công TBA 300 kVA","due_date":"2026-11-05","condition_text":"Lắp đặt, thí nghiệm, đóng điện và nghiệm thu đạt yêu cầu","achieved":false,"achieved_at":null,"sort_order":9},{"name":"Hoàn thành hệ thống RO","due_date":"2026-11-15","condition_text":"Lắp đặt, súc rửa/khử trùng, kiểm tra chất lượng nước, chạy thử và nghiệm thu","achieved":false,"achieved_at":null,"sort_order":10},{"name":"Kết thúc tiến độ tổng thể","due_date":"2026-12-10","condition_text":"Các hạng mục trong phạm vi tổng thể sẵn sàng đưa vào giai đoạn thủ tục","achieved":false,"achieved_at":null,"sort_order":11},{"name":"Hoàn thành Giấy phép hoạt động","due_date":"2027-01-10","condition_text":"Thời gian 1 tháng, bắt đầu sau 10/12/2026","achieved":false,"achieved_at":null,"sort_order":12},{"name":"Hoàn thành ký hợp đồng KCB BHYT","due_date":"2027-02-10","condition_text":"Thời gian 2 tháng, bắt đầu sau 10/12/2026","achieved":false,"achieved_at":null,"sort_order":13}]$m$::jsonb) as source(name text, due_date text, condition_text text, achieved boolean, achieved_at text, sort_order integer)
  where not exists (select 1 from public.milestones existing where existing.project_id = target_project_id and existing.name = source.name);
end;
$$;
