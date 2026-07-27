-- Run once in the Supabase SQL Editor.
-- Requires anonymous sign-ins: Authentication -> Sign In / Providers -> User Signups.
--
-- Isolation has two layers. RLS scopes every table to auth.uid(). Composite
-- foreign keys then carry user_id into every relationship, because RLS alone
-- cannot stop cross-tenant links: user_id defaults to the caller, and Postgres
-- suppresses row security while checking referential integrity, so a plain
-- `references tasks (id)` resolves another tenant's row happily.

revoke create on schema public from anon, authenticated;

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 500),
  description text not null default '' check (char_length(description) <= 20000),
  status      text not null default 'todo'
              check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority    text not null default 'normal'
              check (priority in ('low', 'normal', 'high')),
  due_date    date,
  -- Fractional: a card dropped between two neighbours takes their midpoint, so
  -- a move costs one row update. The client renumbers when a gap gets too small.
  position    double precision not null default 1024,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Target for the child tables' composite foreign keys.
  unique (id, user_id)
);

create table public.team_members (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  color      text not null check (color ~* '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.labels (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  color      text not null check (color ~* '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

-- The composite keys below are what make cross-tenant links impossible: both
-- halves of each pair must resolve to a row owned by the same user_id.
create table public.task_assignees (
  task_id    uuid not null,
  member_id  uuid not null,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, task_id, member_id),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade,
  foreign key (member_id, user_id) references public.team_members (id, user_id) on delete cascade
);

create table public.task_labels (
  task_id    uuid not null,
  label_id   uuid not null,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, task_id, label_id),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade,
  foreign key (label_id, user_id) references public.labels (id, user_id) on delete cascade
);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade
);

create table public.task_activity (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null,
  user_id    uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (event_type in (
    'created', 'status_changed', 'priority_changed', 'due_date_changed',
    'edited', 'assigned', 'unassigned', 'label_added', 'label_removed', 'commented'
  )),
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade
);

create index tasks_user_status_position_idx on public.tasks (user_id, status, position);
create index team_members_user_idx          on public.team_members (user_id);
create index labels_user_idx                on public.labels (user_id);
create index task_assignees_task_idx        on public.task_assignees (task_id);
create index task_assignees_member_idx      on public.task_assignees (member_id, user_id);
create index task_labels_task_idx           on public.task_labels (task_id);
create index task_labels_label_idx          on public.task_labels (label_id, user_id);
create index comments_task_idx              on public.comments (task_id, created_at);
create index task_activity_task_idx         on public.task_activity (task_id, created_at desc);

create unique index labels_user_name_key       on public.labels (user_id, lower(name));
create unique index team_members_user_name_key on public.team_members (user_id, lower(name));

alter table public.tasks          enable row level security;
alter table public.team_members   enable row level security;
alter table public.labels         enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_labels    enable row level security;
alter table public.comments       enable row level security;
alter table public.task_activity  enable row level security;

create policy "Users manage own tasks" on public.tasks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage own team members" on public.team_members
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage own labels" on public.labels
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage own task assignees" on public.task_assignees
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage own task labels" on public.task_labels
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage own comments" on public.comments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Select only: history is written by the triggers below, never by a client.
create policy "Users read own task activity" on public.task_activity
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- The logging functions are SECURITY DEFINER so they can write to a table that
-- is read-only under RLS. search_path is pinned empty and every reference is
-- schema-qualified, so nothing in a user-controlled schema can be resolved.
create or replace function public.log_task_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.task_activity (task_id, user_id, event_type, meta)
  values (new.id, new.user_id, 'created', jsonb_build_object('status', new.status));
  return new;
end;
$$;

create trigger tasks_log_created
  after insert on public.tasks
  for each row execute function public.log_task_created();

create or replace function public.log_task_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.task_activity (task_id, user_id, event_type, meta)
    values (new.id, new.user_id, 'status_changed',
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;

  if new.priority is distinct from old.priority then
    insert into public.task_activity (task_id, user_id, event_type, meta)
    values (new.id, new.user_id, 'priority_changed',
            jsonb_build_object('from', old.priority, 'to', new.priority));
  end if;

  if new.due_date is distinct from old.due_date then
    insert into public.task_activity (task_id, user_id, event_type, meta)
    values (new.id, new.user_id, 'due_date_changed',
            jsonb_build_object('from', old.due_date, 'to', new.due_date));
  end if;

  if new.title is distinct from old.title then
    insert into public.task_activity (task_id, user_id, event_type, meta)
    values (new.id, new.user_id, 'edited', jsonb_build_object('field', 'title'));
  end if;

  if new.description is distinct from old.description then
    insert into public.task_activity (task_id, user_id, event_type, meta)
    values (new.id, new.user_id, 'edited', jsonb_build_object('field', 'description'));
  end if;

  return new;
end;
$$;

create trigger tasks_log_updated
  after update on public.tasks
  for each row execute function public.log_task_updated();

create or replace function public.log_assignee_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  select name into v_name from public.team_members where id = new.member_id;
  insert into public.task_activity (task_id, user_id, event_type, meta)
  values (new.task_id, new.user_id, 'assigned',
          jsonb_build_object('member_id', new.member_id,
                             'member_name', coalesce(v_name, 'a member')));
  return new;
end;
$$;

create trigger task_assignees_log_added
  after insert on public.task_assignees
  for each row execute function public.log_assignee_added();

create or replace function public.log_assignee_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  -- Deleting a task cascades here; its activity is going too, so skip logging.
  if not exists (select 1 from public.tasks where id = old.task_id) then
    return old;
  end if;

  -- Deleting a member also cascades here, parent first, so team_members no
  -- longer has the row. Fall back to the name recorded when it was assigned.
  select coalesce(
    (select name from public.team_members where id = old.member_id),
    (select meta ->> 'member_name'
       from public.task_activity
      where task_id = old.task_id
        and event_type = 'assigned'
        and meta ->> 'member_id' = old.member_id::text
      order by created_at desc
      limit 1),
    'a member'
  ) into v_name;

  insert into public.task_activity (task_id, user_id, event_type, meta)
  values (old.task_id, old.user_id, 'unassigned',
          jsonb_build_object('member_id', old.member_id, 'member_name', v_name));
  return old;
end;
$$;

create trigger task_assignees_log_removed
  after delete on public.task_assignees
  for each row execute function public.log_assignee_removed();

create or replace function public.log_label_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  select name into v_name from public.labels where id = new.label_id;
  insert into public.task_activity (task_id, user_id, event_type, meta)
  values (new.task_id, new.user_id, 'label_added',
          jsonb_build_object('label_id', new.label_id,
                             'label_name', coalesce(v_name, 'a label')));
  return new;
end;
$$;

create trigger task_labels_log_added
  after insert on public.task_labels
  for each row execute function public.log_label_added();

create or replace function public.log_label_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if not exists (select 1 from public.tasks where id = old.task_id) then
    return old;
  end if;

  -- Same cascade ordering as log_assignee_removed.
  select coalesce(
    (select name from public.labels where id = old.label_id),
    (select meta ->> 'label_name'
       from public.task_activity
      where task_id = old.task_id
        and event_type = 'label_added'
        and meta ->> 'label_id' = old.label_id::text
      order by created_at desc
      limit 1),
    'a label'
  ) into v_name;

  insert into public.task_activity (task_id, user_id, event_type, meta)
  values (old.task_id, old.user_id, 'label_removed',
          jsonb_build_object('label_id', old.label_id, 'label_name', v_name));
  return old;
end;
$$;

create trigger task_labels_log_removed
  after delete on public.task_labels
  for each row execute function public.log_label_removed();

create or replace function public.log_comment_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.task_activity (task_id, user_id, event_type, meta)
  values (new.task_id, new.user_id, 'commented',
          jsonb_build_object('excerpt', left(new.body, 140)));
  return new;
end;
$$;

create trigger comments_log_added
  after insert on public.comments
  for each row execute function public.log_comment_added();

-- Insert and update events are RLS-filtered. Delete events are not, and cannot
-- be filtered, so subscribers see other users' deleted primary keys; the client
-- ignores deletes for rows it does not hold. Replica identity stays at the
-- default because under RLS the old record is trimmed to the key regardless.
alter publication supabase_realtime add table
  public.tasks,
  public.team_members,
  public.labels,
  public.task_assignees,
  public.task_labels,
  public.comments,
  public.task_activity;
