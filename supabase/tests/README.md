# Isolation tests

An executable check that one guest cannot reach another guest's data. It runs
against a throwaway Postgres container — no Supabase project and no network
access required, so it can be run before the schema is ever applied to a real
project.

```bash
docker run -d --name kanban-schema-test -e POSTGRES_PASSWORD=testpw -p 55433:5432 postgres:17-alpine

docker cp supabase/tests/00-supabase-shim.sql kanban-schema-test:/tmp/shim.sql
docker cp supabase/schema.sql                 kanban-schema-test:/tmp/schema.sql
docker cp supabase/tests/01-isolation.sql     kanban-schema-test:/tmp/isolation.sql

docker exec kanban-schema-test psql -U postgres -q -v ON_ERROR_STOP=1 -f /tmp/shim.sql
docker exec kanban-schema-test psql -U postgres -q -v ON_ERROR_STOP=1 -f /tmp/schema.sql
docker exec kanban-schema-test psql -U postgres -f /tmp/isolation.sql

docker rm -f kanban-schema-test
```

`00-supabase-shim.sql` recreates only what the schema depends on from a real
project: the `auth.users` table, Supabase's own `auth.uid()` definition, the
`anon` / `authenticated` roles, and the `supabase_realtime` publication.

## What `01-isolation.sql` asserts

Guest A creates a card, a member, a label, an assignment, a label link, and a
comment. Guest B then tries eight attacks. Every one must fail:

| # | Attack | Expected result |
| --- | --- | --- |
| 1 | Attach A's team member to B's own card | foreign key violation |
| 2 | Attach A's label to B's own card | foreign key violation |
| 3 | Comment on A's card | foreign key violation |
| 4 | Squat the primary key of A's assignment row | foreign key violation |
| 5 | Insert a forged row into the activity log | RLS policy violation |
| 6 | Update or delete A's card | 0 rows affected |
| 7 | Insert a row owned by A | RLS `WITH CHECK` violation |
| 8 | Create a table in schema `public` | permission denied |

Attacks 1–4 are the interesting ones. RLS alone does **not** stop them: a
policy of `user_id = auth.uid()` is satisfied because `user_id` defaults to the
attacker's own id, and PostgreSQL deliberately suppresses row security while
checking referential integrity, so a plain `references tasks (id)` would
happily resolve another tenant's row. Carrying `user_id` into every foreign key
— `(task_id, user_id) references tasks (id, user_id)` — makes the link
impossible to form in the first place.

The script also asserts the positive paths: activity is recorded with real
member and label names, deleting a member still leaves `"unassigned": "Ava
Chen"` in the audit trail rather than a placeholder, status changes record
`from`/`to`, and deleting a card cascades its comments and history away without
tripping a foreign key in the removal triggers.
