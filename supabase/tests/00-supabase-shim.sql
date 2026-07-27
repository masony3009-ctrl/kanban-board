drop schema if exists public cascade;
drop schema if exists auth cascade;
drop publication if exists supabase_realtime;
create schema public;
create schema auth;

create table auth.users (
  id uuid primary key default gen_random_uuid()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

grant usage on schema public, auth to anon, authenticated;
grant select on auth.users to anon, authenticated;
alter default privileges in schema public
  grant all on tables to anon, authenticated;

create publication supabase_realtime;
