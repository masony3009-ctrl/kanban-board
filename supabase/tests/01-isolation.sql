\set ON_ERROR_STOP on
\pset pager off

-- Any assertion failure raises, and ON_ERROR_STOP makes psql exit non-zero, so
-- this suite fails a build rather than merely printing a transcript.

create or replace function pg_temp.expect_blocked(label text, stmt text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'PASS  %  (blocked: %)', label, sqlstate;
    return;
  end;
  raise exception 'FAIL  %: the statement succeeded but must be blocked', label;
end $$;

create or replace function pg_temp.expect_rowcount(label text, stmt text, expected bigint)
returns void language plpgsql as $$
declare affected bigint;
begin
  execute stmt;
  get diagnostics affected = row_count;
  if affected <> expected then
    raise exception 'FAIL  %: affected % rows, expected %', label, affected, expected;
  end if;
  raise notice 'PASS  %  (% rows)', label, affected;
end $$;

create or replace function pg_temp.expect_value(label text, query text, expected text)
returns void language plpgsql as $$
declare actual text;
begin
  execute query into actual;
  if actual is distinct from expected then
    raise exception 'FAIL  %: got %, expected %', label, coalesce(actual, 'NULL'), expected;
  end if;
  raise notice 'PASS  %  (%)', label, actual;
end $$;

insert into auth.users (id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

\echo ''
\echo '=== Guest A creates a card, member, label, assignment, label link, comment ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}';

insert into public.tasks (id, title, status)
  values ('11111111-1111-4111-8111-111111111111', 'Guest A secret card', 'todo');
insert into public.team_members (id, name, color)
  values ('22222222-2222-4222-8222-222222222222', 'Ava Chen', '#4338ca');
insert into public.labels (id, name, color)
  values ('33333333-3333-4333-8333-333333333333', 'Confidential', '#b91c1c');
insert into public.task_assignees (task_id, member_id)
  values ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');
insert into public.task_labels (task_id, label_id)
  values ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333');
insert into public.comments (task_id, body)
  values ('11111111-1111-4111-8111-111111111111', 'Only guest A should ever read this.');

select pg_temp.expect_value('activity logged for every action',
  'select count(*)::text from public.task_activity', '4');
select pg_temp.expect_value('assignment records the real member name',
  $$select meta ->> 'member_name' from public.task_activity where event_type = 'assigned'$$,
  'Ava Chen');
select pg_temp.expect_value('label event records the real label name',
  $$select meta ->> 'label_name' from public.task_activity where event_type = 'label_added'$$,
  'Confidential');
commit;

\echo ''
\echo '=== Guest B baseline: sees only its own data ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
insert into public.tasks (id, title, status)
  values ('44444444-4444-4444-8444-444444444444', 'Guest B own card', 'todo');

select pg_temp.expect_value('B sees only its own task',
  'select count(*)::text from public.tasks', '1');
select pg_temp.expect_value('B sees none of A''s members',
  'select count(*)::text from public.team_members', '0');
select pg_temp.expect_value('B sees none of A''s labels',
  'select count(*)::text from public.labels', '0');
select pg_temp.expect_value('B sees none of A''s comments',
  'select count(*)::text from public.comments', '0');
select pg_temp.expect_value('B sees only its own activity',
  'select count(*)::text from public.task_activity', '1');
commit;

\echo ''
\echo '=== Eight cross-guest attacks, all of which must fail ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';

select pg_temp.expect_blocked('1 attach A''s member to B''s own card', $$
  insert into public.task_assignees (task_id, member_id)
  values ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222')$$);

select pg_temp.expect_blocked('2 attach A''s label to B''s own card', $$
  insert into public.task_labels (task_id, label_id)
  values ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333')$$);

select pg_temp.expect_blocked('3 comment on A''s card', $$
  insert into public.comments (task_id, body)
  values ('11111111-1111-4111-8111-111111111111', 'injected by B')$$);

select pg_temp.expect_blocked('4 squat the key of A''s assignment', $$
  insert into public.task_assignees (task_id, member_id)
  values ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')$$);

select pg_temp.expect_blocked('5 forge an activity row', $$
  insert into public.task_activity (task_id, user_id, event_type)
  values ('44444444-4444-4444-8444-444444444444',
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'created')$$);

select pg_temp.expect_rowcount('6a update A''s card',
  $$update public.tasks set title = 'hijacked'
    where id = '11111111-1111-4111-8111-111111111111'$$, 0);
select pg_temp.expect_rowcount('6b delete A''s card',
  $$delete from public.tasks where id = '11111111-1111-4111-8111-111111111111'$$, 0);

select pg_temp.expect_blocked('7 insert a row owned by A', $$
  insert into public.tasks (title, user_id)
  values ('spoofed', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$);

select pg_temp.expect_blocked('8 create a table in schema public',
  'create table public.evil (id int)');
rollback;

\echo ''
\echo '=== A''s data survived every attack ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}';
select pg_temp.expect_value('A''s card is untouched',
  $$select title from public.tasks where id = '11111111-1111-4111-8111-111111111111'$$,
  'Guest A secret card');
select pg_temp.expect_value('no foreign comment was injected into A''s card',
  'select count(*)::text from public.comments', '1');
commit;

\echo ''
\echo '=== Audit trail survives cascading deletes ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}';

delete from public.team_members where id = '22222222-2222-4222-8222-222222222222';
select pg_temp.expect_value('removal keeps the member name, not a placeholder',
  $$select meta ->> 'member_name' from public.task_activity where event_type = 'unassigned'$$,
  'Ava Chen');

update public.tasks set status = 'in_progress'
  where id = '11111111-1111-4111-8111-111111111111';
select pg_temp.expect_value('status change records where it moved from',
  $$select meta ->> 'from' from public.task_activity where event_type = 'status_changed'$$,
  'todo');
select pg_temp.expect_value('status change records where it moved to',
  $$select meta ->> 'to' from public.task_activity where event_type = 'status_changed'$$,
  'in_progress');

delete from public.tasks where id = '11111111-1111-4111-8111-111111111111';
select pg_temp.expect_value('deleting a card cascades its history away',
  'select count(*)::text from public.task_activity', '0');
select pg_temp.expect_value('deleting a card cascades its comments away',
  'select count(*)::text from public.comments', '0');
commit;

\echo ''
\echo '=== Guest B is entirely unaffected ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
select pg_temp.expect_value('B still has its card',
  'select title from public.tasks', 'Guest B own card');
commit;

\echo ''
\echo 'ALL ASSERTIONS PASSED'
