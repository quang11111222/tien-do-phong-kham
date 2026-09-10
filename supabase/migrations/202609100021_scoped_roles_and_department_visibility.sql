begin;

alter table public.profiles
  add column if not exists department_id uuid references public.departments(id),
  add column if not exists is_department_admin boolean not null default false;

create table if not exists public.project_administrators (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null default auth.uid() references public.profiles(id),
  assigned_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_administrators_user_idx
  on public.project_administrators(user_id, project_id);

alter table public.project_administrators enable row level security;
grant select, insert, update, delete on public.project_administrators to authenticated;

create or replace function public.is_project_admin(target_project_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.is_manager() or exists (
    select 1 from public.project_administrators administrator
    join public.profiles profile on profile.id = administrator.user_id
    where administrator.project_id = target_project_id
      and administrator.user_id = auth.uid()
      and profile.active
  );
$$;

create or replace function public.can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$ select public.is_project_admin(target_project_id); $$;

create or replace function public.can_view_work_item(target_work_item_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  with recursive branch as (
    select child.id, child.lead_department_id
    from public.work_items child where child.id = target_work_item_id
    union all
    select child.id, child.lead_department_id
    from public.work_items child join branch parent on child.parent_id = parent.id
  ), current_profile as (
    select id, department_id from public.profiles where id = auth.uid() and active
  )
  select exists (
    select 1 from public.work_items target, current_profile profile
    where target.id = target_work_item_id
      and (
        public.is_project_admin(target.project_id)
        or exists (
          select 1 from branch item
          where item.lead_department_id = profile.department_id
            or exists (
              select 1 from public.work_item_coordinating_departments coordinator
              where coordinator.work_item_id = item.id and coordinator.department_id = profile.department_id
            )
            or exists (
              select 1 from public.work_item_participants participant
              where participant.work_item_id = item.id and participant.user_id = profile.id
            )
        )
      )
  );
$$;

create or replace function public.can_review_work_item(target_work_item_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.work_items item
    join public.profiles profile on profile.id = auth.uid() and profile.active
    where item.id = target_work_item_id
      and (
        public.is_project_admin(item.project_id)
        or (profile.is_department_admin and profile.department_id = item.lead_department_id)
      )
  );
$$;

drop policy if exists project_administrators_read on public.project_administrators;
create policy project_administrators_read on public.project_administrators
for select to authenticated using (public.is_active_user());
drop policy if exists project_administrators_manage on public.project_administrators;
create policy project_administrators_manage on public.project_administrators
for all to authenticated using (public.is_manager()) with check (public.is_manager());

drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated using (
  public.is_active_user()
  and (deleted_at is null or public.is_manager())
  and (
    public.is_project_admin(id)
    or exists (select 1 from public.work_items item where item.project_id = projects.id and public.can_view_work_item(item.id))
  )
);

drop policy if exists work_items_read on public.work_items;
create policy work_items_read on public.work_items for select to authenticated
using (public.can_view_work_item(id));

drop policy if exists participants_read on public.work_item_participants;
create policy participants_read on public.work_item_participants for select to authenticated
using (public.can_view_work_item(work_item_id));

drop policy if exists progress_updates_read on public.progress_updates;
create policy progress_updates_read on public.progress_updates for select to authenticated
using (public.can_view_work_item(work_item_id));

drop policy if exists attachments_read on public.attachments;
create policy attachments_read on public.attachments for select to authenticated
using (public.can_view_work_item(work_item_id));

drop policy if exists completion_requests_read on public.completion_requests;
create policy completion_requests_read on public.completion_requests for select to authenticated
using (
  submitted_by = auth.uid()
  or public.can_review_work_item(work_item_id)
);

drop policy if exists milestones_read on public.milestones;
create policy milestones_read on public.milestones for select to authenticated
using (exists (select 1 from public.projects project where project.id = milestones.project_id));

drop policy if exists work_items_manage_manager on public.work_items;
create policy work_items_manage_project_admin on public.work_items for all to authenticated
using (public.can_manage_project(project_id)) with check (public.can_manage_project(project_id));

drop policy if exists participants_manage_manager on public.work_item_participants;
create policy participants_manage_project_admin on public.work_item_participants for all to authenticated
using (exists (select 1 from public.work_items item where item.id = work_item_id and public.can_manage_project(item.project_id)))
with check (exists (select 1 from public.work_items item where item.id = work_item_id and public.can_manage_project(item.project_id)));

drop policy if exists coordinating_departments_manage_manager on public.work_item_coordinating_departments;
create policy coordinating_departments_manage_project_admin on public.work_item_coordinating_departments for all to authenticated
using (exists (select 1 from public.work_items item where item.id = work_item_id and public.can_manage_project(item.project_id)))
with check (exists (select 1 from public.work_items item where item.id = work_item_id and public.can_manage_project(item.project_id)));

drop policy if exists milestones_manage_manager on public.milestones;
create policy milestones_manage_project_admin on public.milestones for all to authenticated
using (public.can_manage_project(project_id)) with check (public.can_manage_project(project_id));

drop policy if exists projects_manage_project_admin on public.projects;
create policy projects_manage_project_admin on public.projects for update to authenticated
using (public.can_manage_project(id)) with check (public.can_manage_project(id));

drop policy if exists progress_updates_add_participant on public.progress_updates;
create policy progress_updates_add_participant on public.progress_updates for insert to authenticated with check (
  created_by = auth.uid()
  and (
    public.is_work_item_participant(work_item_id)
    or exists (select 1 from public.work_items item where item.id = work_item_id and public.can_manage_project(item.project_id))
  )
);

drop policy if exists attachments_add_participant on public.attachments;
create policy attachments_add_participant on public.attachments for insert to authenticated with check (
  uploaded_by = auth.uid()
  and (
    public.is_work_item_participant(work_item_id)
    or exists (select 1 from public.work_items item where item.id = work_item_id and public.can_manage_project(item.project_id))
  )
  and not exists (select 1 from public.attachments existing where existing.work_item_id = attachments.work_item_id)
  and exists (select 1 from public.work_items item where item.id = work_item_id and item.status not in ('pending_approval', 'completed'))
);

drop policy if exists attachments_delete_participant on public.attachments;
create policy attachments_delete_participant on public.attachments for delete to authenticated using (
  exists (
    select 1 from public.work_items item
    where item.id = work_item_id
      and item.status not in ('pending_approval', 'completed')
      and (public.is_work_item_participant(item.id) or public.can_manage_project(item.project_id))
  )
);

drop policy if exists evidence_upload_participant on storage.objects;
create policy evidence_upload_participant on storage.objects for insert to authenticated with check (
  bucket_id = 'evidence'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (
    public.is_work_item_participant(((storage.foldername(name))[1])::uuid)
    or exists (
      select 1 from public.work_items item
      where item.id = ((storage.foldername(name))[1])::uuid and public.can_manage_project(item.project_id)
    )
  )
  and exists (
    select 1 from public.work_items item
    where item.id = ((storage.foldername(name))[1])::uuid and item.status not in ('pending_approval', 'completed')
  )
);

drop policy if exists evidence_delete_participant on storage.objects;
create policy evidence_delete_participant on storage.objects for delete to authenticated using (
  bucket_id = 'evidence'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (
    select 1 from public.work_items item
    where item.id = ((storage.foldername(name))[1])::uuid
      and item.status not in ('pending_approval', 'completed')
      and (public.is_work_item_participant(item.id) or public.can_manage_project(item.project_id))
  )
);

-- Các RPC cũ là SECURITY DEFINER nên phải thay chính điều kiện quyền bên trong,
-- không chỉ dựa vào RLS của bảng.
do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.set_project_deleted(uuid,boolean)'::regprocedure) into definition;
  definition := regexp_replace(definition, 'if not public\.is_manager\(\) then', 'if not public.can_manage_project(target_project_id) then', 'i');
  execute definition;

  select pg_get_functiondef('public.create_work_item(uuid,uuid,text,text,uuid,uuid[],date,date,public.work_item_status,uuid[])'::regprocedure) into definition;
  definition := regexp_replace(definition, 'if not public\.is_manager\(\) then', 'if not public.can_manage_project(target_project_id) then', 'i');
  execute definition;

  select pg_get_functiondef('public.update_work_item_details(uuid,integer,text,uuid,uuid[],date,date,public.work_item_status,uuid[])'::regprocedure) into definition;
  definition := regexp_replace(
    definition,
    'if not public\.is_manager\(\) then',
    'if not exists (select 1 from public.work_items scoped_item where scoped_item.id = target_work_item_id and public.can_manage_project(scoped_item.project_id)) then',
    'i'
  );
  execute definition;

  select pg_get_functiondef('public.import_project_plan(uuid,jsonb)'::regprocedure) into definition;
  definition := regexp_replace(definition, 'if not public\.is_manager\(\) then', 'if not public.can_manage_project(target_project_id) then', 'i');
  execute definition;

  select pg_get_functiondef('public.save_project_milestones(uuid,jsonb)'::regprocedure) into definition;
  definition := regexp_replace(definition, 'if not public\.is_manager\(\) then', 'if not public.can_manage_project(target_project_id) then', 'i');
  execute definition;
end;
$$;

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

  direct_completion := public.can_manage_project(target_project_id);
  select coalesce(max(attempt_no), 0) + 1 into next_attempt from public.completion_requests where work_item_id = target_work_item_id;
  insert into public.completion_requests (
    work_item_id, attempt_no, note, status, submitted_by, reviewed_by, reviewed_at, review_note
  ) values (
    target_work_item_id, next_attempt, nullif(trim(submission_note), ''),
    case when direct_completion then 'approved'::public.completion_request_status else 'pending'::public.completion_request_status end,
    auth.uid(), case when direct_completion then auth.uid() else null end,
    case when direct_completion then now() else null end,
    case when direct_completion then 'Quản trị dự án tự xác nhận sau khi nộp bằng chứng' else null end
  ) returning id into request_id;

  update public.work_items
  set status = case when direct_completion then 'completed'::public.work_item_status else 'pending_approval'::public.work_item_status end,
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
begin
  if decision not in ('approved', 'rejected') then raise exception 'Kết quả duyệt không hợp lệ'; end if;
  if decision = 'rejected' and nullif(trim(manager_note), '') is null then raise exception 'Từ chối phải nhập lý do'; end if;

  select work_item_id, submitted_by into target_work_item_id, request_submitter
  from public.completion_requests where id = target_request_id and status = 'pending';
  if target_work_item_id is null then raise exception 'Yêu cầu không còn ở trạng thái chờ duyệt'; end if;
  if request_submitter = auth.uid() then raise exception 'Người gửi không được tự duyệt yêu cầu của mình'; end if;
  if not public.can_review_work_item(target_work_item_id) then raise exception 'Bạn không có quyền duyệt công việc này'; end if;

  update public.completion_requests
  set status = decision, reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(manager_note), '')
  where id = target_request_id and status = 'pending';
  if not found then raise exception 'Yêu cầu vừa được người khác xử lý'; end if;

  update public.work_items
  set status = case when decision = 'approved' then 'completed'::public.work_item_status else 'in_progress'::public.work_item_status end,
      updated_by = auth.uid(), version = version + 1
  where id = target_work_item_id;
end;
$$;

grant execute on function public.is_project_admin(uuid), public.can_manage_project(uuid), public.can_view_work_item(uuid), public.can_review_work_item(uuid) to authenticated;
grant execute on function public.submit_work_item_completion(uuid, text), public.review_completion_request(uuid, public.completion_request_status, text) to authenticated;

commit;
