begin;

-- Preserve assignment identity/time when saving an unchanged participant list.
-- Keep the deployed functions' permission and optimistic-lock checks intact.
do $$
declare
  definition text;
  updated_definition text;
begin
  definition := pg_get_functiondef('public.update_work_item_details(uuid,integer,text,uuid,uuid[],date,date,public.work_item_status,uuid[])'::regprocedure);
  updated_definition := replace(definition,
    'delete from public.work_item_participants where work_item_id = target_work_item_id;',
    'delete from public.work_item_participants where work_item_id = target_work_item_id and not (user_id = any(coalesce(participant_ids, ''{}''::uuid[])));');
  updated_definition := replace(updated_definition,
    'select target_work_item_id, participant_id from unnest(coalesce(participant_ids, ''{}''::uuid[])) participant_id;',
    'select target_work_item_id, participant_id from unnest(coalesce(participant_ids, ''{}''::uuid[])) participant_id on conflict (work_item_id, user_id) do nothing;');
  if updated_definition = definition
    or position('and not (user_id = any(coalesce(participant_ids, ''{}''::uuid[])))' in updated_definition) = 0
    or position('on conflict (work_item_id, user_id) do nothing' in updated_definition) = 0 then
    raise exception 'Unexpected update_work_item_details definition; review before applying migration';
  end if;
  execute updated_definition;

  definition := pg_get_functiondef('public.update_work_item_participants(uuid,integer,uuid[])'::regprocedure);
  updated_definition := replace(definition,
    'where work_item_id = target_work_item_id;',
    'where work_item_id = target_work_item_id and not (user_id = any(requested_participant_ids));');
  updated_definition := replace(updated_definition,
    'from unnest(requested_participant_ids) requested(user_id);',
    'from unnest(requested_participant_ids) requested(user_id) on conflict (work_item_id, user_id) do nothing;');
  if updated_definition = definition
    or position('and not (user_id = any(requested_participant_ids))' in updated_definition) = 0
    or position('on conflict (work_item_id, user_id) do nothing' in updated_definition) = 0 then
    raise exception 'Unexpected update_work_item_participants definition; review before applying migration';
  end if;
  execute updated_definition;
end;
$$;

commit;
