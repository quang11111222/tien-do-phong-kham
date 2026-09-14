-- Execute after 202609140002. All configuration writes are rolled back.
begin;
do $$ begin perform set_config('request.jwt.claim.sub', (select id::text from public.profiles where username = 'admin'), true); end; $$;
set local role authenticated;
do $$ declare denied boolean := false; rows jsonb; begin
  if (select count(*) from public.notification_policies) <> 7 then raise exception 'Manager read failed'; end if;
  begin update public.notification_policies set enabled = false where kind = 'assigned'; exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Direct policy update permitted'; end if;
  select jsonb_agg(jsonb_build_object('kind',kind,'enabled',enabled,'recipients',recipients,'days',days,'version',version)) into rows from public.notification_policies;
  perform public.save_notification_policies(rows);
end; $$;
reset role;
do $$ begin perform set_config('request.jwt.claim.sub', (select id::text from public.profiles where username = '005902'), true); end; $$;
set local role authenticated;
do $$ declare denied boolean := false; begin
  if (select count(*) from public.notification_policies) <> 0 then raise exception 'Employee reads global configuration'; end if;
  begin perform public.save_notification_policies('[]'); exception when others then denied := sqlerrm like 'Chỉ Quản trị hệ thống%'; end;
  if not denied then raise exception 'Employee write accepted'; end if;
  if not public.get_notification_scope() ? 'attention' then raise exception 'Employee scope unavailable'; end if;
end; $$;
reset role;
do $$ begin
  if has_table_privilege('anon', 'public.notification_policies', 'SELECT') then raise exception 'Anon table privilege'; end if;
  if has_function_privilege('anon','public.get_notification_scope()','EXECUTE') or has_function_privilege('anon','public.save_notification_policies(jsonb)','EXECUTE') then raise exception 'Anon RPC privilege'; end if;
end; $$;
rollback;
select (select count(*) from public.work_items where wbs like 'QA-NOTIFY%') as leftover_fixtures,
  (select jsonb_object_agg(kind, days) from public.notification_policies where days is not null) as deadline_defaults,
  exists(select 1 from supabase_migrations.schema_migrations where version = '202609140002') as migration_registered;
