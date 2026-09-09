create extension if not exists pgcrypto;

create type public.app_role as enum ('manager', 'employee');
create type public.project_status as enum ('draft', 'active', 'completed', 'archived');
create type public.work_item_status as enum ('not_started', 'in_progress', 'pending_approval', 'completed');
create type public.completion_request_status as enum ('pending', 'approved', 'rejected');

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.department_aliases (
  alias text primary key,
  department_id uuid not null references public.departments(id) on delete cascade
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'employee',
  department_id uuid references public.departments(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  site text,
  start_date date,
  end_date date,
  status public.project_status not null default 'draft',
  source_file_name text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_date_order check (start_date is null or end_date is null or start_date <= end_date)
);

create table public.work_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.work_items(id) on delete cascade,
  wbs text not null,
  name text not null,
  source_responsibility_text text,
  start_date date,
  end_date date,
  status public.work_item_status not null default 'not_started',
  sort_order integer not null default 0,
  version integer not null default 1,
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_items_date_order check (start_date is null or end_date is null or start_date <= end_date),
  constraint work_items_parent_not_self check (parent_id is null or parent_id <> id)
);

create index work_items_project_sort_idx on public.work_items(project_id, sort_order);
create index work_items_parent_idx on public.work_items(parent_id);

create table public.work_item_participants (
  work_item_id uuid not null references public.work_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id),
  assigned_at timestamptz not null default now(),
  primary key (work_item_id, user_id)
);

create index work_item_participants_user_idx on public.work_item_participants(user_id);

create table public.progress_updates (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items(id) on delete cascade,
  content text not null check (length(trim(content)) > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.completion_requests (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items(id) on delete cascade,
  attempt_no integer not null,
  note text,
  status public.completion_request_status not null default 'pending',
  submitted_by uuid not null references public.profiles(id),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  unique (work_item_id, attempt_no)
);

create unique index completion_requests_one_pending_idx
  on public.completion_requests(work_item_id)
  where status = 'pending';

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  due_date date not null,
  condition_text text,
  achieved boolean not null default false,
  achieved_at date,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items(id) on delete cascade,
  completion_request_id uuid references public.completion_requests(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null check (size_bytes >= 0),
  uploaded_by uuid not null references public.profiles(id),
  uploaded_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor_id uuid references public.profiles(id),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();
create trigger work_items_set_updated_at before update on public.work_items
for each row execute function public.set_updated_at();
create trigger milestones_set_updated_at before update on public.milestones
for each row execute function public.set_updated_at();

create or replace function public.set_record_actor()
returns trigger
language plpgsql
as $$
begin
  if to_jsonb(new) ? 'created_by' and tg_op = 'INSERT' then
    new := jsonb_populate_record(new, jsonb_build_object('created_by', auth.uid()));
  end if;
  if to_jsonb(new) ? 'updated_by' then
    new := jsonb_populate_record(new, jsonb_build_object('updated_by', auth.uid()));
  end if;
  if to_jsonb(new) ? 'assigned_by' and tg_op = 'INSERT' then
    new := jsonb_populate_record(new, jsonb_build_object('assigned_by', auth.uid()));
  end if;
  return new;
end;
$$;

create trigger projects_set_actor before insert on public.projects
for each row execute function public.set_record_actor();
create trigger work_items_set_actor before insert or update on public.work_items
for each row execute function public.set_record_actor();
create trigger milestones_set_actor before insert or update on public.milestones
for each row execute function public.set_record_actor();
create trigger participants_set_actor before insert on public.work_item_participants
for each row execute function public.set_record_actor();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager' and active
  );
$$;

create or replace function public.is_work_item_participant(target_work_item_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.work_item_participants
    where work_item_id = target_work_item_id and user_id = auth.uid()
  );
$$;

create or replace function public.submit_work_item_completion(target_work_item_id uuid, submission_note text default null)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  request_id uuid;
  next_attempt integer;
begin
  if not public.is_manager() and not public.is_work_item_participant(target_work_item_id) then
    raise exception 'Bạn không tham gia công việc này';
  end if;

  if exists (select 1 from public.completion_requests where work_item_id = target_work_item_id and status = 'pending') then
    raise exception 'Công việc đã có yêu cầu chờ duyệt';
  end if;

  select coalesce(max(attempt_no), 0) + 1 into next_attempt
  from public.completion_requests where work_item_id = target_work_item_id;

  insert into public.completion_requests (work_item_id, attempt_no, note, submitted_by)
  values (target_work_item_id, next_attempt, nullif(trim(submission_note), ''), auth.uid())
  returning id into request_id;

  update public.work_items
  set status = 'pending_approval', updated_by = auth.uid(), version = version + 1
  where id = target_work_item_id and status <> 'completed';

  if not found then raise exception 'Không thể gửi duyệt công việc đã hoàn thành'; end if;
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
begin
  if not public.is_manager() then raise exception 'Chỉ sếp được duyệt công việc'; end if;
  if decision not in ('approved', 'rejected') then raise exception 'Kết quả duyệt không hợp lệ'; end if;

  update public.completion_requests
  set status = decision, reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(manager_note), '')
  where id = target_request_id and status = 'pending'
  returning work_item_id into target_work_item_id;

  if target_work_item_id is null then raise exception 'Yêu cầu không còn ở trạng thái chờ duyệt'; end if;

  update public.work_items
  set status = case when decision = 'approved' then 'completed' else 'in_progress' end,
      updated_by = auth.uid(), version = version + 1
  where id = target_work_item_id;
end;
$$;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  old_data jsonb;
  new_data jsonb;
  target_id uuid;
begin
  old_data := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_data := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  target_id := coalesce((new_data ->> 'id')::uuid, (old_data ->> 'id')::uuid);

  insert into public.audit_logs (entity_type, entity_id, action, actor_id, before_data, after_data)
  values (tg_table_name, target_id, lower(tg_op), auth.uid(), old_data, new_data);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger projects_audit after insert or update or delete on public.projects
for each row execute function public.audit_row_change();
create trigger work_items_audit after insert or update or delete on public.work_items
for each row execute function public.audit_row_change();
create trigger completion_requests_audit after insert or update or delete on public.completion_requests
for each row execute function public.audit_row_change();
create trigger milestones_audit after insert or update or delete on public.milestones
for each row execute function public.audit_row_change();

alter table public.departments enable row level security;
alter table public.department_aliases enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.work_items enable row level security;
alter table public.work_item_participants enable row level security;
alter table public.progress_updates enable row level security;
alter table public.completion_requests enable row level security;
alter table public.milestones enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_logs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.departments, public.profiles, public.projects, public.work_items,
  public.work_item_participants, public.progress_updates, public.completion_requests,
  public.milestones, public.attachments to authenticated;
grant select on public.department_aliases to authenticated;
grant insert on public.progress_updates, public.attachments to authenticated;
grant all on public.departments, public.department_aliases, public.profiles, public.projects,
  public.work_items, public.work_item_participants, public.milestones to authenticated;
grant select on public.audit_logs to authenticated;
grant execute on function public.submit_work_item_completion(uuid, text) to authenticated;
grant execute on function public.review_completion_request(uuid, public.completion_request_status, text) to authenticated;
revoke execute on function public.submit_work_item_completion(uuid, text) from public, anon;
revoke execute on function public.review_completion_request(uuid, public.completion_request_status, text) from public, anon;

create policy departments_read on public.departments for select to authenticated using (true);
create policy department_aliases_read on public.department_aliases for select to authenticated using (true);
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy projects_read on public.projects for select to authenticated using (true);
create policy work_items_read on public.work_items for select to authenticated using (true);
create policy participants_read on public.work_item_participants for select to authenticated using (true);
create policy progress_updates_read on public.progress_updates for select to authenticated using (true);
create policy completion_requests_read on public.completion_requests for select to authenticated using (true);
create policy milestones_read on public.milestones for select to authenticated using (true);
create policy attachments_read on public.attachments for select to authenticated using (true);
create policy audit_logs_read_manager on public.audit_logs for select to authenticated using (public.is_manager());

create policy departments_manage_manager on public.departments for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy department_aliases_manage_manager on public.department_aliases for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy profiles_manage_manager on public.profiles for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy projects_manage_manager on public.projects for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy work_items_manage_manager on public.work_items for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy participants_manage_manager on public.work_item_participants for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy milestones_manage_manager on public.milestones for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy progress_updates_add_participant on public.progress_updates
for insert to authenticated
with check (
  created_by = auth.uid()
  and (public.is_manager() or public.is_work_item_participant(work_item_id))
  and exists (select 1 from public.work_items where id = work_item_id and status <> 'pending_approval' and status <> 'completed')
);

create policy attachments_add_participant on public.attachments
for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and (public.is_manager() or public.is_work_item_participant(work_item_id))
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('evidence', 'evidence', false, 52428800)
on conflict (id) do nothing;

create policy evidence_read_authenticated on storage.objects
for select to authenticated using (bucket_id = 'evidence');

create policy evidence_upload_participant on storage.objects
for insert to authenticated
with check (
  bucket_id = 'evidence'
  and (
    public.is_manager()
    or public.is_work_item_participant(((storage.foldername(name))[1])::uuid)
  )
);

insert into public.departments (code, name, sort_order) values
  ('CN-NVY', 'Công nghệ - Nghiệp vụ y', 1),
  ('CTXH', 'Công tác xã hội', 2),
  ('HCTH', 'Hành chính tổng hợp', 3),
  ('HCVHĐN', 'Hành chính Văn hóa Đối ngoại', 4),
  ('KSNB', 'Kiểm soát nội bộ', 5),
  ('MARKETING', 'Marketing', 6),
  ('PTNL1', 'PTNL1', 7),
  ('PTNL2', 'PTNL2', 8),
  ('CUNGUNG', 'Cung ứng', 9),
  ('PTDA', 'Phát triển dự án', 10),
  ('Z1', 'Z1', 11),
  ('TUYENDUNG', 'Tuyển dụng', 12),
  ('SOHOA', 'Số hóa', 13),
  ('TBTN', 'Thiết bị tòa nhà', 14),
  ('TBYT', 'Thiết bị y tế', 15),
  ('TCKT', 'Tài chính kế toán', 16),
  ('TCKH', 'Tài chính kế hoạch', 17),
  ('THIETKE', 'Thiết kế', 18),
  ('PTPK', 'Phát triển phòng khám', 19),
  ('BQLDA', 'Ban Quản lý dự án', 20),
  ('KT', 'Phòng Kỹ thuật', 21);

insert into public.department_aliases (alias, department_id)
select alias, d.id from (values
  ('NVY', 'CN-NVY'), ('P.NVY', 'CN-NVY'), ('PHÒNG NVY', 'CN-NVY'),
  ('MKT', 'MARKETING'), ('PHÒNG MKT', 'MARKETING'), ('PHÒNG MARKETING', 'MARKETING'),
  ('BQLDA', 'BQLDA'), ('BAN QLDA', 'BQLDA'), ('BAN QUẢN LÝ DỰ ÁN', 'BQLDA'),
  ('P.KỸ THUẬT', 'KT'), ('PHÒNG KỸ THUẬT', 'KT'), ('KỸ THUẬT', 'KT'),
  ('P.TBTN', 'TBTN'), ('PHÒNG TBTN', 'TBTN'),
  ('P.TBYT', 'TBYT'), ('PHÒNG TBYT', 'TBYT'), ('PHÒNG. TBYT', 'TBYT'),
  ('PHÒNG THIẾT KẾ', 'THIETKE'), ('PHÒNG HCTH', 'HCTH'),
  ('PHÒNG CUNG ỨNG', 'CUNGUNG'), ('PHÒNG SỐ HÓA', 'SOHOA'), ('PHÒNG PTPK', 'PTPK')
) as source(alias, code)
join public.departments d on d.code = source.code
on conflict (alias) do update set department_id = excluded.department_id;
