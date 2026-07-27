\set ON_ERROR_STOP off
\pset pager off

insert into auth.users (id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

\echo '=== GUEST A creates data ==='
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
\echo '--- A activity (expect created / assigned Ava Chen / label_added Confidential / commented)'
select event_type, meta from public.task_activity order by created_at;
commit;

\echo ''
\echo '=== GUEST B: baseline own card ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
insert into public.tasks (id, title, status)
  values ('44444444-4444-4444-8444-444444444444', 'Guest B own card', 'todo');
\echo '--- B sees tasks (expect ONLY B''s card)'
select id, title from public.tasks;
\echo '--- B sees members / labels / comments / activity (expect 0,0,0,1)'
select (select count(*) from public.team_members) as members,
       (select count(*) from public.labels) as labels,
       (select count(*) from public.comments) as comments,
       (select count(*) from public.task_activity) as activity;
commit;

\echo ''
\echo '=== ATTACK 1: B links A''s member to B''s own card (expect FK violation) ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
insert into public.task_assignees (task_id, member_id)
  values ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222');
rollback;

\echo '=== ATTACK 2: B links A''s label to B''s own card (expect FK violation) ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
insert into public.task_labels (task_id, label_id)
  values ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333');
rollback;

\echo '=== ATTACK 3: B comments on A''s card (expect FK violation) ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
insert into public.comments (task_id, body)
  values ('11111111-1111-4111-8111-111111111111', 'injected by B');
rollback;

\echo '=== ATTACK 4: B squats A''s assignee primary key (expect FK violation) ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
insert into public.task_assignees (task_id, member_id)
  values ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');
rollback;

\echo '=== ATTACK 5: B forges an activity row (expect RLS denial) ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
insert into public.task_activity (task_id, user_id, event_type)
  values ('44444444-4444-4444-8444-444444444444', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'created');
rollback;

\echo '=== ATTACK 6: B updates/deletes A''s card (expect UPDATE 0 / DELETE 0) ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
update public.tasks set title = 'hijacked' where id = '11111111-1111-4111-8111-111111111111';
delete from public.tasks where id = '11111111-1111-4111-8111-111111111111';
rollback;

\echo '=== ATTACK 7: B inserts a row owned by A (expect RLS WITH CHECK denial) ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
insert into public.tasks (title, user_id)
  values ('spoofed', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
rollback;

\echo '=== ATTACK 8: B creates an object in schema public (expect permission denied) ==='
begin;
set local role authenticated;
create table public.evil (id int);
rollback;

\echo ''
\echo '=== GUEST A: member deletion keeps the name in the audit trail ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}';
delete from public.team_members where id = '22222222-2222-4222-8222-222222222222';
\echo '--- expect assigned=Ava Chen AND unassigned=Ava Chen (not "a member")'
select event_type, meta ->> 'member_name' as member_name
  from public.task_activity where event_type in ('assigned','unassigned') order by created_at;
commit;

\echo ''
\echo '=== GUEST A: status change logs from/to ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}';
update public.tasks set status = 'in_progress'
  where id = '11111111-1111-4111-8111-111111111111';
select event_type, meta from public.task_activity where event_type = 'status_changed';
commit;

\echo ''
\echo '=== GUEST A: deleting the card cascades cleanly ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}';
delete from public.tasks where id = '11111111-1111-4111-8111-111111111111';
\echo '--- expect 0 activity rows left for A'
select count(*) as a_activity_left from public.task_activity;
commit;

\echo ''
\echo '=== FINAL: B''s data is intact and untouched ==='
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}';
select id, title from public.tasks;
commit;
