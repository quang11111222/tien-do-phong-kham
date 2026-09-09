import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const html = fs.readFileSync(path.join(root, 'prototype', 'index.html'), 'utf8')
const seed = JSON.parse(html.match(/^var SEED=(.*);$/m)[1])
const milestones = seed.miles['PK-KHETRE'].items.map((item, index) => ({ name: item.name, due_date: item.date, condition_text: item.cond || null, achieved: Boolean(item.done), achieved_at: item.doneAt || null, sort_order: index }))
const sql = `-- Mốc kiểm soát từ prototype và quy tắc bằng chứng/duyệt đã chốt.
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
  from jsonb_to_recordset($m$${JSON.stringify(milestones)}$m$::jsonb) as source(name text, due_date text, condition_text text, achieved boolean, achieved_at text, sort_order integer)
  where not exists (select 1 from public.milestones existing where existing.project_id = target_project_id and existing.name = source.name);
end;
$$;
`
const output = path.join(root, 'supabase', 'migrations', '202609090004_seed_milestones_and_workflow.sql')
fs.writeFileSync(output, sql, 'utf8')
console.log(`Đã tạo ${output} với ${milestones.length} mốc kiểm soát`)
