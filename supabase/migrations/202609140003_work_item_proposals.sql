begin;

alter table public.work_items add column is_supplemental boolean not null default false;
create table public.work_item_proposals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  parent_id uuid references public.work_items(id) on delete set null,
  parent_name text not null,
  name text not null check(length(trim(name)) > 0),
  reason text not null check(length(trim(reason)) > 0),
  lead_department_id uuid not null references public.departments(id),
  coordinating_department_ids uuid[] not null default '{}',
  participant_ids uuid[] not null default '{}',
  start_date date not null,
  end_date date not null check(end_date >= start_date),
  proposed_by uuid not null references public.profiles(id),
  status text not null default 'pending' check(status in ('pending','withdrawn','rejected','approved')),
  version integer not null default 1,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_work_item_id uuid references public.work_items(id) on delete set null
);
create index work_item_proposals_project_idx on public.work_item_proposals(project_id, status);
create table public.work_item_proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.work_item_proposals(id),
  action text not null check(action in ('submitted','withdrawn','rejected','approved')),
  actor_id uuid not null references public.profiles(id),
  note text,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.work_item_proposals enable row level security;
alter table public.work_item_proposal_events enable row level security;
revoke all on public.work_item_proposals, public.work_item_proposal_events from anon, authenticated;
grant select on public.work_item_proposals, public.work_item_proposal_events to authenticated;
create policy proposals_read on public.work_item_proposals for select to authenticated using (
  public.is_active_user() and (proposed_by = auth.uid() or public.can_manage_project(project_id))
);
create policy proposal_events_read on public.work_item_proposal_events for select to authenticated using (
  exists(select 1 from public.work_item_proposals p where p.id = proposal_id)
);

create function public.propose_child_work_item(
  target_parent_id uuid, target_name text, target_reason text,
  target_start_date date, target_end_date date,
  coordinating_department_ids uuid[] default '{}', participant_ids uuid[] default '{}',
  target_proposal_id uuid default null, expected_version integer default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  parent public.work_items;
  proposal public.work_item_proposals;
  lead_id uuid;
  new_id uuid;
begin
  if not public.is_active_user() or not public.can_view_work_item_detail(target_parent_id) then
    raise exception 'Bạn chỉ được đề xuất trong hạng mục thuộc phạm vi của mình';
  end if;
  select * into parent from public.work_items where id = target_parent_id for share;
  if not found or exists(select 1 from public.projects where id = parent.project_id and deleted_at is not null) then
    raise exception 'Hạng mục hoặc dự án không còn hoạt động';
  end if;
  with recursive path as (
    select id, parent_id, lead_department_id, 0 as depth from public.work_items where id = target_parent_id
    union all select p.id, p.parent_id, p.lead_department_id, path.depth + 1 from public.work_items p join path on p.id = path.parent_id
  ) select lead_department_id into lead_id from path where lead_department_id is not null order by depth limit 1;
  if lead_id is null then raise exception 'Hạng mục cha cần có đơn vị chủ trì trước khi đề xuất'; end if;
  if nullif(trim(target_name),'') is null or nullif(trim(target_reason),'') is null then
    raise exception 'Cần nhập tên công việc và lý do phát sinh';
  end if;
  if length(trim(target_name)) > 500 or length(trim(target_reason)) > 4000 then
    raise exception 'Tên tối đa 500 ký tự, lý do tối đa 4000 ký tự';
  end if;
  if cardinality(coordinating_department_ids) <> (select count(distinct value) from unnest(coordinating_department_ids) as requested(value)) or
     cardinality(participant_ids) <> (select count(distinct value) from unnest(participant_ids) as requested(value)) then
    raise exception 'Không được chọn trùng đơn vị hoặc người tham gia';
  end if;
  if target_start_date is null or target_end_date is null or target_end_date < target_start_date then
    raise exception 'Ngày thực hiện không hợp lệ';
  end if;
  if coordinating_department_ids is null or participant_ids is null or
    exists(select 1 from unnest(coordinating_department_ids) as requested(value) left join public.departments d on d.id = requested.value where d.id is null or not d.active or d.id = lead_id) then
    raise exception 'Đơn vị phối hợp không hợp lệ';
  end if;
  if exists(select 1 from unnest(participant_ids) as requested(value) left join public.profiles p on p.id = requested.value where p.id is null or not p.active or p.department_id is null or not(p.department_id = lead_id or p.department_id = any(coordinating_department_ids))) then
    raise exception 'Người tham gia phải thuộc đơn vị chủ trì hoặc phối hợp';
  end if;
  if target_proposal_id is not null then
    select * into proposal from public.work_item_proposals where id = target_proposal_id for update;
    if not found or proposal.proposed_by <> auth.uid() or proposal.version is distinct from expected_version or proposal.status not in ('rejected','withdrawn') then
      raise exception 'Đề xuất đã thay đổi hoặc không được phép sửa. Hãy tải lại';
    end if;
    if proposal.parent_id is distinct from target_parent_id then raise exception 'Không đổi hạng mục cha của đề xuất cũ'; end if;
    update public.work_item_proposals set name = trim(target_name), reason = trim(target_reason),
      lead_department_id = lead_id, coordinating_department_ids = propose_child_work_item.coordinating_department_ids,
      participant_ids = propose_child_work_item.participant_ids, start_date = target_start_date, end_date = target_end_date,
      status = 'pending', version = version + 1, submitted_at = now(), reviewed_by = null, reviewed_at = null, review_note = null
    where id = proposal.id returning id into new_id;
  else
    insert into public.work_item_proposals(project_id, parent_id, parent_name, name, reason, lead_department_id, coordinating_department_ids, participant_ids, start_date, end_date, proposed_by)
    values(parent.project_id, parent.id, parent.name, trim(target_name), trim(target_reason), lead_id, coordinating_department_ids, participant_ids, target_start_date, target_end_date, auth.uid()) returning id into new_id;
  end if;
  insert into public.work_item_proposal_events(proposal_id, action, actor_id, note, snapshot)
  select new_id, 'submitted', auth.uid(), reason, to_jsonb(p) from public.work_item_proposals p where id = new_id;
  return new_id;
end;
$$;

create function public.withdraw_work_item_proposal(target_proposal_id uuid, expected_version integer)
returns void language plpgsql security definer set search_path = public as $$
declare p public.work_item_proposals;
begin
  select * into p from public.work_item_proposals where id = target_proposal_id for update;
  if not public.is_active_user() or not found or p.proposed_by <> auth.uid() or p.status <> 'pending' or p.version is distinct from expected_version then
    raise exception 'Không thể rút đề xuất. Hãy tải lại';
  end if;
  update public.work_item_proposals set status = 'withdrawn', version = version + 1 where id = p.id;
  insert into public.work_item_proposal_events(proposal_id, action, actor_id, snapshot) values(p.id, 'withdrawn', auth.uid(), to_jsonb(p));
end;
$$;

create function public.review_work_item_proposal(target_proposal_id uuid, expected_version integer, decision text, manager_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  p public.work_item_proposals;
  parent public.work_items;
  new_id uuid;
  next_number integer;
  inherited_lead uuid;
begin
  select * into p from public.work_item_proposals where id = target_proposal_id for update;
  if not found or not public.is_active_user() or not public.can_manage_project(p.project_id) then
    raise exception 'Chỉ Quản trị dự án hoặc Quản trị hệ thống được duyệt bổ sung';
  end if;
  if p.status <> 'pending' or p.version is distinct from expected_version then raise exception 'Đề xuất đã được xử lý. Hãy tải lại'; end if;
  if decision not in ('approved','rejected') or decision is null then raise exception 'Quyết định không hợp lệ'; end if;
  if decision = 'rejected' and nullif(trim(manager_note),'') is null then raise exception 'Từ chối phải nhập lý do'; end if;
  if decision = 'approved' then
    perform pg_advisory_xact_lock(hashtext(p.project_id::text));
    select * into parent from public.work_items where id = p.parent_id and project_id = p.project_id for update;
    if not found or exists(select 1 from public.projects where id = p.project_id and deleted_at is not null) then raise exception 'Hạng mục cha hoặc dự án đã bị xóa'; end if;
    with recursive path as (
      select id, parent_id, lead_department_id, 0 depth from public.work_items where id = parent.id
      union all select a.id, a.parent_id, a.lead_department_id, path.depth + 1 from public.work_items a join path on a.id = path.parent_id
    ) select lead_department_id into inherited_lead from path where lead_department_id is not null order by depth limit 1;
    if inherited_lead is distinct from p.lead_department_id then raise exception 'Đơn vị chủ trì đã đổi. Hãy từ chối để người đề xuất cập nhật lại'; end if;
    if not exists(select 1 from public.departments where id = inherited_lead and active) or
      exists(select 1 from unnest(p.coordinating_department_ids) as requested(value) left join public.departments d on d.id = requested.value where d.id is null or not d.active) then raise exception 'Đơn vị đã ngừng hoạt động. Hãy yêu cầu cập nhật đề xuất'; end if;
    if exists(select 1 from unnest(p.participant_ids) as requested(value) left join public.profiles person on person.id = requested.value
      where person.id is null or not person.active or person.department_id is null or not(person.department_id = inherited_lead or person.department_id = any(p.coordinating_department_ids))) then
      raise exception 'Nhân sự đã thay đổi phòng/ban hoặc ngừng hoạt động. Hãy yêu cầu cập nhật đề xuất';
    end if;
    select coalesce(max(case when split_part(wbs, '.', array_length(string_to_array(parent.wbs, '.'), 1) + 1) ~ '^[0-9]{1,8}$'
      then split_part(wbs, '.', array_length(string_to_array(parent.wbs, '.'), 1) + 1)::integer else 0 end), 0) + 1 into next_number
      from public.work_items where parent_id = parent.id;
    new_id := public.create_work_item(p.project_id, parent.id, parent.wbs || '.' || next_number, p.name,
      p.lead_department_id, p.coordinating_department_ids, p.start_date, p.end_date, 'not_started', p.participant_ids);
    update public.work_items set is_supplemental = true where id = new_id;
  end if;
  update public.work_item_proposals set status = decision, version = version + 1, reviewed_by = auth.uid(),
    reviewed_at = now(), review_note = nullif(trim(manager_note),''), created_work_item_id = new_id where id = p.id;
  insert into public.work_item_proposal_events(proposal_id, action, actor_id, note, snapshot)
  values(p.id, decision, auth.uid(), nullif(trim(manager_note),''), to_jsonb(p));
  return new_id;
end;
$$;
revoke all on function public.propose_child_work_item(uuid,text,text,date,date,uuid[],uuid[],uuid,integer), public.withdraw_work_item_proposal(uuid,integer), public.review_work_item_proposal(uuid,integer,text,text) from public, anon;
grant execute on function public.propose_child_work_item(uuid,text,text,date,date,uuid[],uuid[],uuid,integer), public.withdraw_work_item_proposal(uuid,integer), public.review_work_item_proposal(uuid,integer,text,text) to authenticated;

alter table public.notification_policies drop constraint notification_policies_kind_check;
alter table public.notification_policies add constraint notification_policies_kind_check check(kind in ('assigned','progress','submitted','approved','rejected','due_soon','overdue','proposal_submitted','proposal_approved','proposal_rejected'));
alter table public.notification_policies add constraint proposal_notification_recipients_check check(
  case when kind = 'proposal_submitted' then recipients <@ array['project_managers','system_managers']::text[]
    when kind in ('proposal_approved','proposal_rejected') then recipients <@ array['participants']::text[] else true end
);
insert into public.notification_policies(kind, recipients) values
  ('proposal_submitted', array['project_managers','system_managers']),
  ('proposal_approved', array['participants']), ('proposal_rejected', array['participants']);
-- Preserve version locking and existing validation; only expand the required complete set.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.save_notification_policies(jsonb)'::regprocedure);
  if position('jsonb_array_length(policies) <> 7' in definition) = 0 then raise exception 'Unexpected policy save function; review migration'; end if;
  definition := replace(definition, 'jsonb_array_length(policies) <> 7', 'jsonb_array_length(policies) <> 10');
  definition := replace(definition, 'entry) <> 7', 'entry) <> 10');
  definition := replace(definition, 'Cần đủ bảy loại thông báo', 'Cần đủ mười loại thông báo');
  execute definition;
end;
$$;

create function public.get_proposal_notifications()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_active_user() then raise exception 'Tài khoản không có quyền truy cập'; end if;
  select coalesce(jsonb_agg(to_jsonb(feed) order by feed.created_at desc), '[]') into result from (
    select e.id::text as id, p.parent_id as work_item_id, parent.wbs as work_item_wbs, p.name as work_item_name,
      p.project_id, project.code as project_code, project.name as project_name,
      'proposal_' || e.action as kind, coalesce(e.note, case when e.action = 'submitted' then 'Đề xuất bổ sung công việc cần được duyệt' else 'Đề xuất đã được xử lý' end) as content,
      actor.full_name as actor_name, e.created_at, 'update' as category,
      e.created_at > coalesce(read.last_seen_at, '-infinity'::timestamptz) as "isUnread"
    from public.work_item_proposal_events e
    join public.work_item_proposals p on p.id = e.proposal_id
    join public.work_items parent on parent.id = p.parent_id
    join public.projects project on project.id = p.project_id and project.deleted_at is null
    join public.profiles actor on actor.id = e.actor_id
    join public.notification_policies policy on policy.kind = 'proposal_' || e.action and policy.enabled
    left join public.work_item_activity_reads read on read.work_item_id = parent.id and read.user_id = auth.uid()
    where e.actor_id <> auth.uid() and (
      (e.action = 'submitted' and p.status = 'pending' and e.created_at >= p.submitted_at and public.can_manage_project(p.project_id) and (
        ('system_managers' = any(policy.recipients) and public.is_manager()) or
        ('project_managers' = any(policy.recipients) and exists(select 1 from public.project_administrators a where a.project_id = p.project_id and a.user_id = auth.uid()))
      )) or (e.action in ('approved','rejected') and p.proposed_by = auth.uid() and 'participants' = any(policy.recipients))
    ) order by e.created_at desc limit 20
  ) feed;
  return result;
end;
$$;
revoke all on function public.get_proposal_notifications() from public, anon;
grant execute on function public.get_proposal_notifications() to authenticated;

commit;
