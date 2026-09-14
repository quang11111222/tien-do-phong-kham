-- Run against the PTPK demo database after migration 202609140002.
-- All fixtures/config changes are rolled back. No Khe Tre/Son Tay writes.
begin;
do $$
declare
  root_id uuid; employee_id uuid; department_admin_id uuid; project_admin_id uuid;
  employee_department uuid; admin_department uuid; demo_id uuid;
  parent_id uuid := gen_random_uuid(); assigned_id uuid := gen_random_uuid(); overdue_id uuid := gen_random_uuid();
  far_id uuid := gen_random_uuid(); unassigned_id uuid := gen_random_uuid(); null_date_id uuid := gen_random_uuid();
  own_department_id uuid := gen_random_uuid(); coordinated_id uuid := gen_random_uuid();
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  scope jsonb; before_config jsonb; input_config jsonb; denied boolean;
begin
  select id into root_id from public.profiles where username = 'admin' and active;
  select id, department_id into employee_id, employee_department from public.profiles where username = '005902' and active;
  select id, department_id into department_admin_id, admin_department from public.profiles
    where username = 'demo.ptpk.qtp' and active and is_department_admin;
  select id into demo_id from public.projects where code = 'PK-DEMO-QA-21' and deleted_at is null;
  select administrator.user_id into project_admin_id from public.project_administrators administrator
    join public.profiles profile on profile.id = administrator.user_id
    where administrator.project_id = demo_id and profile.active and profile.role = 'employee' limit 1;
  if root_id is null or employee_id is null or department_admin_id is null or demo_id is null
    or project_admin_id is null or employee_department = admin_department then raise exception 'Missing demo fixtures'; end if;
  perform set_config('request.jwt.claim.sub', root_id::text, true);

  insert into public.work_items(id, project_id, parent_id, wbs, name, lead_department_id, end_date, created_by, updated_by) values
    (parent_id, demo_id, null, 'QA-NOTIFY', 'QA notification parent', employee_department, today - 1, root_id, root_id),
    (assigned_id, demo_id, parent_id, 'QA-NOTIFY.1', 'QA upcoming assigned', employee_department, today + 2, root_id, root_id),
    (overdue_id, demo_id, parent_id, 'QA-NOTIFY.2', 'QA overdue assigned', employee_department, today - 1, root_id, root_id),
    (far_id, demo_id, parent_id, 'QA-NOTIFY.3', 'QA outside window', employee_department, today + 4, root_id, root_id),
    (unassigned_id, demo_id, parent_id, 'QA-NOTIFY.4', 'QA visible not assigned', employee_department, today - 1, root_id, root_id),
    (null_date_id, demo_id, parent_id, 'QA-NOTIFY.5', 'QA no deadline', employee_department, null, root_id, root_id),
    (own_department_id, demo_id, parent_id, 'QA-NOTIFY.6', 'QA department lead', admin_department, today + 2, root_id, root_id),
    (coordinated_id, demo_id, parent_id, 'QA-NOTIFY.7', 'QA department coordinating', employee_department, today - 1, root_id, root_id);
  insert into public.work_item_participants(work_item_id, user_id, assigned_by)
    select item, employee_id, root_id from unnest(array[parent_id,assigned_id,overdue_id,far_id,null_date_id]) item;
  insert into public.work_item_coordinating_departments(work_item_id, department_id) values (coordinated_id, admin_department);

  -- Root can see everything but must not receive all deadline reminders implicitly.
  scope := public.get_notification_scope();
  if exists (select 1 from jsonb_array_elements(scope->'attention') item where item->>'work_item_id' in (assigned_id::text, overdue_id::text, own_department_id::text)) then raise exception 'Root receives unassigned deadline'; end if;

  perform set_config('request.jwt.claim.sub', employee_id::text, true);
  scope := public.get_notification_scope();
  if not scope->'attention' @> jsonb_build_array(jsonb_build_object('work_item_id', assigned_id, 'kind', 'due_soon')) then raise exception 'Assigned upcoming reminder missing'; end if;
  if not scope->'attention' @> jsonb_build_array(jsonb_build_object('work_item_id', overdue_id, 'kind', 'overdue')) then raise exception 'Assigned overdue reminder missing'; end if;
  if exists (select 1 from jsonb_array_elements(scope->'attention') item where item->>'work_item_id' in (parent_id::text, far_id::text, unassigned_id::text, null_date_id::text, own_department_id::text)) then raise exception 'Employee scope/leaf/window incorrect'; end if;
  denied := false;
  begin perform public.save_notification_policies('[]'); exception when others then denied := sqlerrm like 'Chỉ Quản trị hệ thống%'; end;
  if not denied then raise exception 'Employee can configure notifications'; end if;

  perform set_config('request.jwt.claim.sub', department_admin_id::text, true);
  scope := public.get_notification_scope();
  if not scope->'attention' @> jsonb_build_array(jsonb_build_object('work_item_id', own_department_id)) then raise exception 'Lead department admin reminder missing'; end if;
  if exists (select 1 from jsonb_array_elements(scope->'attention') item where item->>'work_item_id' = coordinated_id::text) then raise exception 'Coordinator receives unassigned deadline'; end if;
  denied := false;
  begin perform public.save_notification_policies('[]'); exception when others then denied := sqlerrm like 'Chỉ Quản trị hệ thống%'; end;
  if not denied then raise exception 'Department admin can configure'; end if;

  -- Combined role/assignment must yield only one current reminder per work.
  insert into public.work_item_participants(work_item_id, user_id, assigned_by) values (own_department_id, department_admin_id, root_id);
  scope := public.get_notification_scope();
  if (select count(*) from jsonb_array_elements(scope->'attention') item where item->>'work_item_id' = own_department_id::text) <> 1 then raise exception 'Duplicate role reminder'; end if;
  perform set_config('request.jwt.claim.sub', project_admin_id::text, true);
  scope := public.get_notification_scope();
  if not scope->'attention' @> jsonb_build_array(jsonb_build_object('work_item_id', unassigned_id)) then raise exception 'Explicit project admin reminder missing'; end if;
  if exists (select 1 from jsonb_array_elements(scope->'attention') item join public.work_items work on work.id = (item->>'work_item_id')::uuid where work.status in ('completed','pending_approval')) then raise exception 'Submitted/completed task reminder'; end if;

  -- Atomic save, version conflict, invalid days, toggles and live removal.
  perform set_config('request.jwt.claim.sub', root_id::text, true);
  select jsonb_agg(jsonb_build_object('kind',kind,'enabled',enabled,'recipients',recipients,'days',days,'version',version) order by kind) into before_config from public.notification_policies;
  perform public.save_notification_policies(before_config);
  denied := false;
  begin perform public.save_notification_policies(before_config); exception when others then denied := sqlerrm like 'Cấu hình đã được người khác%'; end;
  if not denied then raise exception 'Stale version accepted'; end if;
  select jsonb_agg(jsonb_build_object('kind',kind,'enabled',enabled,'recipients',recipients,'days',case when kind = 'due_soon' then 31 else days end,'version',version) order by kind) into input_config from public.notification_policies;
  denied := false;
  begin perform public.save_notification_policies(input_config); exception when check_violation then denied := true; end;
  if not denied then raise exception 'Invalid days accepted'; end if;
  if exists (select 1 from public.notification_policies policy join jsonb_array_elements(before_config) entry on entry->>'kind' = policy.kind where policy.version <> (entry->>'version')::integer + 1) then raise exception 'Partial config save'; end if;
  update public.notification_policies set enabled = false where kind = 'due_soon';
  perform set_config('request.jwt.claim.sub', employee_id::text, true);
  scope := public.get_notification_scope();
  if exists (select 1 from jsonb_array_elements(scope->'attention') item where item->>'kind' = 'due_soon') then raise exception 'Disabled upcoming still shown'; end if;
  update public.work_items set end_date = today + 40 where id = overdue_id;
  scope := public.get_notification_scope();
  if exists (select 1 from jsonb_array_elements(scope->'attention') item where item->>'work_item_id' = overdue_id::text) then raise exception 'Changed deadline reminder remains'; end if;
  delete from public.work_item_participants where work_item_id = assigned_id and user_id = employee_id;
  update public.notification_policies set enabled = true where kind = 'due_soon';
  scope := public.get_notification_scope();
  if exists (select 1 from jsonb_array_elements(scope->'attention') item where item->>'work_item_id' = assigned_id::text) then raise exception 'Removed assignment reminder remains'; end if;
  perform set_config('request.jwt.claim.sub', '', true);
  denied := false;
  begin perform public.get_notification_scope(); exception when others then denied := sqlerrm like 'Tài khoản không có quyền%'; end;
  if not denied then raise exception 'Anonymous scope accepted'; end if;
end;
$$;
rollback;
