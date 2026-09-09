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
begin
  if not public.is_manager() then
    raise exception 'Chỉ quản trị viên được duyệt công việc';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'Kết quả duyệt không hợp lệ';
  end if;

  if decision = 'rejected' and nullif(trim(manager_note), '') is null then
    raise exception 'Từ chối phải nhập lý do';
  end if;

  update public.completion_requests
  set status = decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = nullif(trim(manager_note), '')
  where id = target_request_id and status = 'pending'
  returning work_item_id into target_work_item_id;

  if target_work_item_id is null then
    raise exception 'Yêu cầu không còn ở trạng thái chờ duyệt';
  end if;

  update public.work_items
  set status = case
        when decision = 'approved' then 'completed'::public.work_item_status
        else 'in_progress'::public.work_item_status
      end,
      updated_by = auth.uid(),
      version = version + 1
  where id = target_work_item_id;
end;
$$;

grant execute on function public.review_completion_request(uuid, public.completion_request_status, text) to authenticated;
revoke execute on function public.review_completion_request(uuid, public.completion_request_status, text) from public, anon;
