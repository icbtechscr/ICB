-- Cronograma ICB. Apply to the ICB database; no existing business tables are changed.
begin;
create table if not exists public.icb_schedule_board (
  id boolean primary key default true check (id), revision integer not null default 0
);
insert into public.icb_schedule_board (id) values (true) on conflict do nothing;
create table if not exists public.icb_schedule_tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  description text not null check (char_length(description) between 1 and 10000),
  started_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid not null, created_by_name text not null,
  column_id text not null default 'unassigned' check (column_id in ('unassigned','active','urgent','important','low','done')),
  position integer not null default 0 check (position >= 0),
  suggested_difficulty integer not null default 0 check (suggested_difficulty between 0 and 4),
  difficulty integer not null default 0 check (difficulty between 0 and 4),
  active_since timestamptz, active_ms bigint not null default 0 check (active_ms >= 0),
  completed_at timestamptz,
  check ((column_id = 'active') = (active_since is not null)),
  check ((column_id = 'done') = (completed_at is not null))
);
create index if not exists icb_schedule_tasks_order on public.icb_schedule_tasks(column_id, position);
create table if not exists public.icb_schedule_progress (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.icb_schedule_tasks(id),
  author_id uuid not null, author_name text not null,
  created_at timestamptz not null default now(),
  body text not null default '' check (char_length(body) <= 10000),
  attachments jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 4),
  check (char_length(body) > 0 or jsonb_array_length(attachments) > 0)
);
create index if not exists icb_schedule_progress_task on public.icb_schedule_progress(task_id, id desc);
alter table public.icb_schedule_board enable row level security;
alter table public.icb_schedule_tasks enable row level security;
alter table public.icb_schedule_progress enable row level security;
revoke all on public.icb_schedule_board, public.icb_schedule_tasks, public.icb_schedule_progress from anon, authenticated;
grant select, insert, update on public.icb_schedule_board, public.icb_schedule_tasks, public.icb_schedule_progress to service_role;
grant usage, select on sequence public.icb_schedule_progress_id_seq to service_role;

-- One MVCC snapshot contains both the revision and tasks.
create or replace function public.icb_schedule_snapshot() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object('revision', b.revision, 'server_now', now(), 'tasks',
    coalesce((select jsonb_agg(to_jsonb(t) order by t.column_id, t.position, t.id) from public.icb_schedule_tasks t), '[]'::jsonb))
  from public.icb_schedule_board b where id = true;
$$;

-- Every writer locks this board row. Capacity, ordering and timers commit together.
-- Actor identity and dev capability are supplied exclusively by the authenticated server.
create or replace function public.icb_schedule_mutate(p_action text, p_input jsonb, p_actor uuid, p_name text, p_dev boolean)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_revision integer; v_task public.icb_schedule_tasks; v_column text; v_position integer;
  v_id uuid; v_now timestamptz := clock_timestamp(); v_ids uuid[]; v_progress bigint;
begin
  if p_actor is null or nullif(btrim(p_name), '') is null then raise exception 'SCHEDULE_INVALID'; end if;
  select revision into v_revision from public.icb_schedule_board where id = true for update;
  if p_action <> 'create' and not p_dev then raise exception 'SCHEDULE_FORBIDDEN'; end if;
  if p_action in ('move', 'edit') and (p_input->>'revision')::integer is distinct from v_revision then
    raise exception 'SCHEDULE_CONFLICT';
  end if;
  if p_action = 'create' then
    if nullif(btrim(p_input->>'name'), '') is null or nullif(btrim(p_input->>'description'), '') is null
      or p_input->>'started_at' is null or (p_input->>'started_at')::timestamptz > v_now then raise exception 'SCHEDULE_INVALID'; end if;
    insert into public.icb_schedule_tasks(name, description, started_at, created_by, created_by_name, position, suggested_difficulty, difficulty)
    values (btrim(p_input->>'name'), btrim(p_input->>'description'), (p_input->>'started_at')::timestamptz,
      p_actor, p_name, (select count(*) from public.icb_schedule_tasks where column_id = 'unassigned'),
      (p_input->>'suggested_difficulty')::integer,
      case when p_dev then (p_input->>'suggested_difficulty')::integer else 0 end) returning id into v_id;
  elsif p_action in ('move', 'edit', 'progress') then
    v_id := (p_input->>'id')::uuid;
    select * into v_task from public.icb_schedule_tasks where id = v_id for update;
    if not found then raise exception 'SCHEDULE_NOT_FOUND'; end if;
    if p_action = 'move' then
      v_column := p_input->>'column_id';
      if v_column is null or v_column not in ('unassigned','active','urgent','important','low','done') then raise exception 'SCHEDULE_INVALID'; end if;
      if v_column = 'active' and v_task.column_id <> 'active' and
        (select count(*) from public.icb_schedule_tasks where column_id = 'active') >= 3 then raise exception 'SCHEDULE_FULL'; end if;
      select coalesce(array_agg(id order by position, id), array[]::uuid[]) into v_ids
        from public.icb_schedule_tasks where column_id = v_column and id <> v_id;
      v_position := (p_input->>'position')::integer;
      if v_position is null or v_position < 0 or v_position > cardinality(v_ids) then raise exception 'SCHEDULE_INVALID'; end if;
      v_ids := v_ids[1:v_position] || array[v_id] || v_ids[v_position + 1:cardinality(v_ids)];
      update public.icb_schedule_tasks set column_id = v_column,
        active_ms = active_ms + case when active_since is not null and v_column <> 'active'
          then greatest(0, floor(extract(epoch from (v_now - active_since)) * 1000))::bigint else 0 end,
        active_since = case when v_column = 'active' then coalesce(active_since, v_now) else null end,
        completed_at = case when v_column = 'done' then coalesce(completed_at, v_now) else null end,
        updated_at = v_now where id = v_id;
      update public.icb_schedule_tasks t set position = x.ordinality - 1
        from unnest(v_ids) with ordinality x(id, ordinality) where t.id = x.id;
      if v_task.column_id <> v_column then
        with ordered as (select id, row_number() over (order by position, id) - 1 as pos
          from public.icb_schedule_tasks where column_id = v_task.column_id)
        update public.icb_schedule_tasks t set position = o.pos from ordered o where t.id = o.id;
      end if;
    elsif p_action = 'edit' then
      if (p_input->>'expected_updated_at')::timestamptz is distinct from v_task.updated_at then raise exception 'SCHEDULE_CONFLICT'; end if;
      if nullif(btrim(p_input->>'description'), '') is null then raise exception 'SCHEDULE_INVALID'; end if;
      update public.icb_schedule_tasks set description = btrim(p_input->>'description'),
        difficulty = (p_input->>'difficulty')::integer, updated_at = v_now where id = v_id;
    else
      insert into public.icb_schedule_progress(task_id, author_id, author_name, body, attachments)
        values (v_id, p_actor, p_name, btrim(coalesce(p_input->>'body', '')), coalesce(p_input->'attachments', '[]'::jsonb))
        returning id into v_progress;
      update public.icb_schedule_tasks set updated_at = v_now where id = v_id;
    end if;
  else raise exception 'SCHEDULE_INVALID'; end if;
  update public.icb_schedule_board set revision = revision + 1 where id = true;
  return jsonb_build_object('id', v_id, 'progress_id', v_progress, 'revision', v_revision + 1);
end;
$$;
revoke all on function public.icb_schedule_snapshot() from public, anon, authenticated;
revoke all on function public.icb_schedule_mutate(text,jsonb,uuid,text,boolean) from public, anon, authenticated;
grant execute on function public.icb_schedule_snapshot() to service_role;
grant execute on function public.icb_schedule_mutate(text,jsonb,uuid,text,boolean) to service_role;

-- Private images are served through the authenticated ICB API only.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('icb-schedule', 'icb-schedule', false, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;
commit;
