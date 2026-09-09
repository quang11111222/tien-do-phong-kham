alter table public.profiles
  add constraint profiles_full_name_not_blank
  check (length(trim(full_name)) between 2 and 100) not valid;

alter table public.profiles validate constraint profiles_full_name_not_blank;

create or replace function public.protect_profile_account_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.username <> old.username then
    raise exception 'Không được thay đổi tên tài khoản';
  end if;

  if old.username = 'admin' and (new.role <> 'manager' or not new.active) then
    raise exception 'Không được hạ quyền hoặc khóa tài khoản admin gốc';
  end if;

  if auth.uid() = old.id and (new.role <> old.role or new.active <> old.active) then
    raise exception 'Không được tự thay đổi vai trò hoặc trạng thái tài khoản';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_account_fields on public.profiles;
create trigger profiles_protect_account_fields
before update on public.profiles
for each row execute function public.protect_profile_account_fields();

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit
after update on public.profiles
for each row execute function public.audit_row_change();

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

create or replace function public.is_work_item_participant(target_work_item_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.is_active_user() and exists (
    select 1 from public.work_item_participants
    where work_item_id = target_work_item_id and user_id = auth.uid()
  );
$$;

drop policy if exists departments_read on public.departments;
create policy departments_read on public.departments for select to authenticated using (public.is_active_user());
drop policy if exists department_aliases_read on public.department_aliases;
create policy department_aliases_read on public.department_aliases for select to authenticated using (public.is_active_user());
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_active_user());

drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated
using (public.is_active_user() and (deleted_at is null or public.is_manager()));

drop policy if exists work_items_read on public.work_items;
create policy work_items_read on public.work_items for select to authenticated
using (public.is_active_user() and (public.is_manager() or exists (
  select 1 from public.projects project where project.id = work_items.project_id and project.deleted_at is null
)));

drop policy if exists participants_read on public.work_item_participants;
create policy participants_read on public.work_item_participants for select to authenticated
using (public.is_active_user() and (public.is_manager() or exists (
  select 1 from public.work_items item join public.projects project on project.id = item.project_id
  where item.id = work_item_participants.work_item_id and project.deleted_at is null
)));

drop policy if exists progress_updates_read on public.progress_updates;
create policy progress_updates_read on public.progress_updates for select to authenticated
using (public.is_active_user() and (public.is_manager() or exists (
  select 1 from public.work_items item join public.projects project on project.id = item.project_id
  where item.id = progress_updates.work_item_id and project.deleted_at is null
)));

drop policy if exists completion_requests_read on public.completion_requests;
create policy completion_requests_read on public.completion_requests for select to authenticated
using (public.is_active_user() and (public.is_manager() or exists (
  select 1 from public.work_items item join public.projects project on project.id = item.project_id
  where item.id = completion_requests.work_item_id and project.deleted_at is null
)));

drop policy if exists milestones_read on public.milestones;
create policy milestones_read on public.milestones for select to authenticated
using (public.is_active_user() and (public.is_manager() or exists (
  select 1 from public.projects project where project.id = milestones.project_id and project.deleted_at is null
)));

drop policy if exists attachments_read on public.attachments;
create policy attachments_read on public.attachments for select to authenticated
using (public.is_active_user() and (public.is_manager() or exists (
  select 1 from public.work_items item join public.projects project on project.id = item.project_id
  where item.id = attachments.work_item_id and project.deleted_at is null
)));

drop policy if exists coordinating_departments_read on public.work_item_coordinating_departments;
create policy coordinating_departments_read on public.work_item_coordinating_departments
for select to authenticated using (public.is_active_user());

drop policy if exists activity_reads_read_own on public.work_item_activity_reads;
create policy activity_reads_read_own on public.work_item_activity_reads
for select to authenticated using (public.is_active_user() and user_id = auth.uid());
drop policy if exists activity_reads_insert_own on public.work_item_activity_reads;
create policy activity_reads_insert_own on public.work_item_activity_reads
for insert to authenticated with check (public.is_active_user() and user_id = auth.uid());
drop policy if exists activity_reads_update_own on public.work_item_activity_reads;
create policy activity_reads_update_own on public.work_item_activity_reads
for update to authenticated using (public.is_active_user() and user_id = auth.uid())
with check (public.is_active_user() and user_id = auth.uid());

drop policy if exists evidence_read_authenticated on storage.objects;
create policy evidence_read_authenticated on storage.objects
for select to authenticated using (bucket_id = 'evidence' and public.is_active_user());
