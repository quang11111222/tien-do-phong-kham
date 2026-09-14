-- Execute after migration 202609140003, inside a transaction and ROLLBACK.
-- Only creates temporary fixtures in PK-DEMO-QA-21.
do $$
<<proposal_test>>
declare
  root_id uuid; employee_id uuid; department_admin_id uuid; project_admin_id uuid;
  employee_department uuid; admin_department uuid; demo_id uuid;
  parent_id uuid := gen_random_uuid(); foreign_id uuid := gen_random_uuid();
  proposal_id uuid; child_id uuid; count_before integer; denied boolean; feed jsonb;
begin
  select id into root_id from public.profiles where username = 'admin' and active;
  select id, department_id into employee_id, employee_department from public.profiles where username = '005902' and active;
  select id, department_id into department_admin_id, admin_department from public.profiles where username = 'demo.ptpk.qtp' and active and is_department_admin;
  select id into demo_id from public.projects where code = 'PK-DEMO-QA-21' and deleted_at is null;
  select a.user_id into project_admin_id from public.project_administrators a join public.profiles p on p.id = a.user_id where a.project_id = demo_id and p.active and p.role = 'employee' limit 1;
  if root_id is null or employee_id is null or department_admin_id is null or project_admin_id is null or demo_id is null or employee_department = admin_department then raise exception 'Missing demo fixtures'; end if;
  perform set_config('request.jwt.claim.sub', root_id::text, true);
  insert into public.work_items(id, project_id, wbs, name, lead_department_id, created_by, updated_by) values
    (parent_id, demo_id, 'QA-PROPOSE', 'QA proposal parent', employee_department, root_id, root_id),
    (foreign_id, demo_id, 'QA-PRIVATE', 'QA unrelated parent', admin_department, root_id, root_id);
  select count(*) into count_before from public.work_items where project_id = demo_id;
  perform set_config('request.jwt.claim.sub', employee_id::text, true);
  denied := false;
  begin perform public.propose_child_work_item(foreign_id,'Wrong branch','QA',current_date,current_date); exception when others then denied := sqlerrm like 'Bạn chỉ được đề xuất%'; end;
  if not denied then raise exception 'Unrelated employee can propose'; end if;
  denied := false;
  begin perform public.propose_child_work_item(parent_id,'QA invalid participant','QA',current_date,current_date,'{}',array[department_admin_id]); exception when others then denied := sqlerrm like 'Người tham gia phải thuộc%'; end;
  if not denied then raise exception 'Outside-department participant allowed'; end if;
  denied := false;
  begin perform public.propose_child_work_item(parent_id,'QA duplicate','QA',current_date,current_date,array[admin_department,admin_department]); exception when others then denied := sqlerrm like 'Không được chọn trùng%'; end;
  if not denied then raise exception 'Duplicate coordination allowed'; end if;
  proposal_id := public.propose_child_work_item(parent_id,'QA child','QA real-world supplement',current_date,current_date+2,array[admin_department],array[employee_id]);
  if (select count(*) from public.work_items where project_id = demo_id) <> count_before then raise exception 'Pending proposal creates work'; end if;
  denied := false;
  begin perform public.review_work_item_proposal(proposal_id,1,'approved'); exception when others then denied := sqlerrm like 'Chỉ Quản trị dự án%'; end;
  if not denied then raise exception 'Employee can approve'; end if;
  perform set_config('request.jwt.claim.sub', department_admin_id::text, true);
  denied := false;
  begin perform public.review_work_item_proposal(proposal_id,1,'approved'); exception when others then denied := sqlerrm like 'Chỉ Quản trị dự án%'; end;
  if not denied then raise exception 'Department admin can approve proposal'; end if;
  -- Department admins may also propose in their own branch.
  perform public.propose_child_work_item(foreign_id,'QA department proposal','QA',current_date,current_date);
  feed := public.get_proposal_notifications();
  if exists(select 1 from jsonb_array_elements(feed) item where item->>'work_item_name'='QA child') then raise exception 'Department admin gets project review notification'; end if;
  perform set_config('request.jwt.claim.sub', project_admin_id::text, true);
  feed := public.get_proposal_notifications();
  if not exists(select 1 from jsonb_array_elements(feed) item where item->>'work_item_name'='QA child' and item->>'kind'='proposal_submitted') then raise exception 'Project admin missing submitted notification'; end if;
  update public.notification_policies set enabled=false where kind='proposal_submitted';
  if exists(select 1 from jsonb_array_elements(public.get_proposal_notifications()) item where item->>'kind'='proposal_submitted') then raise exception 'Disabled proposal policy still sends'; end if;
  update public.notification_policies set enabled=true where kind='proposal_submitted';
  denied := false;
  begin perform public.review_work_item_proposal(proposal_id,1,'rejected',''); exception when others then denied := sqlerrm like 'Từ chối phải nhập lý do%'; end;
  if not denied then raise exception 'Rejection without reason allowed'; end if;
  child_id := public.review_work_item_proposal(proposal_id,1,'approved','QA approved');
  if not exists(select 1 from public.work_items wi where wi.id=child_id and wi.parent_id=proposal_test.parent_id and lead_department_id=employee_department and is_supplemental and status='not_started' and wbs='QA-PROPOSE.1') then raise exception 'Approval creates invalid child'; end if;
  denied := false;
  begin perform public.review_work_item_proposal(proposal_id,1,'approved'); exception when others then denied := sqlerrm like 'Đề xuất đã được xử lý%'; end;
  if not denied then raise exception 'Duplicate approval allowed'; end if;
  perform set_config('request.jwt.claim.sub', employee_id::text, true);
  if not exists(select 1 from jsonb_array_elements(public.get_proposal_notifications()) item where item->>'work_item_name'='QA child' and item->>'kind'='proposal_approved') then raise exception 'Proposer missing approval notification'; end if;
  proposal_id := public.propose_child_work_item(parent_id,'QA resubmit','QA',current_date,current_date);
  perform public.withdraw_work_item_proposal(proposal_id,1);
  perform public.propose_child_work_item(parent_id,'QA resubmitted','QA edited',current_date,current_date,'{}','{}',proposal_id,2);
  perform set_config('request.jwt.claim.sub', root_id::text, true);
  perform public.review_work_item_proposal(proposal_id,3,'rejected','QA missing details');
  perform set_config('request.jwt.claim.sub', employee_id::text, true);
  if (select count(*) from public.work_item_proposal_events e where e.proposal_id=proposal_test.proposal_id) <> 4 then raise exception 'Proposal event history lost'; end if;
  if not exists(select 1 from jsonb_array_elements(public.get_proposal_notifications()) item where item->>'work_item_name'='QA resubmitted' and item->>'kind'='proposal_rejected') then raise exception 'Proposer missing rejected notification'; end if;
  perform public.propose_child_work_item(parent_id,'QA after rejection','QA fixed',current_date,current_date,'{}','{}',proposal_id,4);
  if (select status from public.work_item_proposals where id=proposal_id) <> 'pending' then raise exception 'Resubmission failed'; end if;
  if (select count(*) from public.notification_policies) <> 10 then raise exception 'Policy set not expanded'; end if;
  perform set_config('request.jwt.claim.sub', root_id::text, true);
  perform public.save_notification_policies((select jsonb_agg(jsonb_build_object('kind',kind,'enabled',enabled,'recipients',recipients,'days',days,'version',version)) from public.notification_policies));
  update public.work_items set lead_department_id=admin_department where id=proposal_test.parent_id;
  denied := false;
  begin perform public.review_work_item_proposal(proposal_id,5,'approved'); exception when others then denied := sqlerrm like 'Đơn vị chủ trì đã đổi%'; end;
  if not denied then raise exception 'Changed lead approved silently'; end if;
  update public.work_items set lead_department_id=employee_department where id=proposal_test.parent_id;
  perform set_config('request.jwt.claim.sub', employee_id::text, true);
  execute 'set local role authenticated';
  if exists(select 1 from public.work_item_proposals p where p.parent_id=foreign_id) then raise exception 'RLS exposes another proposer'; end if;
  if not exists(select 1 from public.work_item_proposals p where p.id=proposal_test.proposal_id) then raise exception 'RLS hides own proposal'; end if;
  denied := false;
  begin update public.work_item_proposals set status='approved' where id=proposal_id; exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Direct table approval allowed'; end if;
end;
$$;
