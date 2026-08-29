-- Correct private authorization helpers after the earlier schema move.
-- Helper bodies must call private helpers, not removed public aliases.

create or replace function private.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function private.has_platform_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.platform_roles r
    where r.user_id = auth.uid()
      and r.role = any(roles)
  );
$$;

create or replace function private.has_application_access(
  application_key text,
  modules text[] default array['advisory','investor']
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.application_access_grants g
    where g.application_id = application_key
      and g.user_id = auth.uid()
      and g.module = any(modules)
  );
$$;

create or replace function private.application_org(application_key text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.organization_id
  from public.applications a
  where a.id = application_key;
$$;

create or replace function private.facility_org(facility_key text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.organization_id
  from public.facilities f
  join public.applications a on a.id = f.application_id
  where f.id = facility_key;
$$;

create or replace function private.can_read_application(application_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.applications a
    where a.id = application_key
      and (
        private.is_org_member(a.organization_id)
        or private.has_platform_role(array['admin','compliance','operations'])
        or private.has_application_access(a.id, array['advisory','investor'])
      )
  );
$$;
