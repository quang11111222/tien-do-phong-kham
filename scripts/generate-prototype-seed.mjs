import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const html = fs.readFileSync(path.join(root, 'prototype', 'index.html'), 'utf8')
const match = html.match(/^var SEED=(.*);$/m)
if (!match) throw new Error('Không tìm thấy SEED trong prototype/index.html')
const seed = JSON.parse(match[1])

const q = (value) => value == null || value === '' ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const projectValues = Object.values(seed.metas).map((project) => `(${q(project.code)}, ${q(project.name)}, ${q(project.site)}, ${q(project.planStart)}, ${q(project.planEnd)}, 'active', ${q(project.source)}, actor_id)`).join(',\n    ')
const sourceItems = seed.plans['PK-KHETRE'].tasks
const groups = sourceItems.filter((item) => item.pid == null).map((item) => ({ wbs: item.wbs, name: item.name, responsibility: item.lead || null, sort_order: sourceItems.indexOf(item) }))
const groupById = new Map(sourceItems.filter((item) => item.pid == null).map((item) => [item.id, item]))
const tasks = sourceItems.filter((item) => item.pid != null).map((item) => ({
  parent_wbs: groupById.get(item.pid)?.wbs ?? null,
  wbs: `${groupById.get(item.pid)?.wbs}.${item.wbs}`,
  name: item.name,
  responsibility: [item.lead, ...(item.coop || [])].filter(Boolean).join(' / ') || null,
  start_date: item.start || null,
  end_date: item.end || null,
  status: ({ todo: 'not_started', doing: 'in_progress', late: 'in_progress', pending: 'pending_approval', done: 'completed' })[item.st] || 'not_started',
  sort_order: sourceItems.indexOf(item),
}))

const migration = `-- Sinh tự động từ prototype/index.html. Chỉ dùng để chuyển dữ liệu mẫu đã duyệt sang Supabase.
create or replace function public.set_record_actor()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    if to_jsonb(new) ? 'created_by' and tg_op = 'INSERT' then
      new := jsonb_populate_record(new, jsonb_build_object('created_by', auth.uid()));
    end if;
    if to_jsonb(new) ? 'updated_by' then
      new := jsonb_populate_record(new, jsonb_build_object('updated_by', auth.uid()));
    end if;
    if to_jsonb(new) ? 'assigned_by' and tg_op = 'INSERT' then
      new := jsonb_populate_record(new, jsonb_build_object('assigned_by', auth.uid()));
    end if;
  end if;
  return new;
end;
$$;

do $$
declare
  actor_id uuid;
  khe_tre_id uuid;
begin
  select id into actor_id from public.profiles where username = 'admin' limit 1;
  if actor_id is null then raise exception 'Chưa có tài khoản admin để gán người tạo dữ liệu'; end if;

  insert into public.projects (code, name, site, start_date, end_date, status, source_file_name, created_by)
  values
    ${projectValues}
  on conflict (code) do update set
    name = excluded.name, site = excluded.site, start_date = excluded.start_date,
    end_date = excluded.end_date, source_file_name = excluded.source_file_name;

  select id into khe_tre_id from public.projects where code = 'PK-KHETRE';

  insert into public.work_items (project_id, parent_id, wbs, name, source_responsibility_text, sort_order, created_by, updated_by)
  select khe_tre_id, null, source.wbs, source.name, source.responsibility, source.sort_order, actor_id, actor_id
  from jsonb_to_recordset($groups$${JSON.stringify(groups)}$groups$::jsonb)
    as source(wbs text, name text, responsibility text, sort_order integer)
  where not exists (select 1 from public.work_items existing where existing.project_id = khe_tre_id and existing.wbs = source.wbs);

  insert into public.work_items (project_id, parent_id, wbs, name, source_responsibility_text, start_date, end_date, status, sort_order, created_by, updated_by)
  select khe_tre_id, parent.id, source.wbs, source.name, source.responsibility,
    source.start_date::date, source.end_date::date, source.status::public.work_item_status,
    source.sort_order, actor_id, actor_id
  from jsonb_to_recordset($tasks$${JSON.stringify(tasks)}$tasks$::jsonb)
    as source(parent_wbs text, wbs text, name text, responsibility text, start_date text, end_date text, status text, sort_order integer)
  join public.work_items parent on parent.project_id = khe_tre_id and parent.parent_id is null and parent.wbs = source.parent_wbs
  where not exists (select 1 from public.work_items existing where existing.project_id = khe_tre_id and existing.wbs = source.wbs);
end;
$$;
`

const output = path.join(root, 'supabase', 'migrations', '202609090003_seed_prototype_projects.sql')
fs.writeFileSync(output, migration, 'utf8')
console.log(`Đã tạo ${output}`)
console.log(`Dự án: ${Object.keys(seed.metas).length}; hạng mục: ${groups.length}; công việc: ${tasks.length}`)
