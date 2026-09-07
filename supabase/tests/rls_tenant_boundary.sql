-- PiHub Borrower live RLS verification.
--
-- Run against a non-production-equivalent schema using a database owner/admin session.
-- The entire fixture is wrapped in one transaction and rolled back. The script
-- raises an exception on any authorization regression and leaves no fixture data.

begin;

-- Every exposed public table must keep RLS enabled.
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r'
      and n.nspname = 'public'
      and not c.relrowsecurity
  ) then
    raise exception 'RLS regression: a public table has RLS disabled';
  end if;
end;
$$;

-- Authoritative sensitive tables are browser-readable only. Browser writes must
-- go through the server-authoritative platform API / Edge Function layer.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'applications',
    'company_vault_items',
    'data_room_folders',
    'documents',
    'financing_scenarios',
    'organizations',
    'request_messages',
    'signature_envelopes',
    'signature_signers'
  ] loop
    if not has_table_privilege(
      'authenticated',
      format('public.%I', table_name),
      'SELECT'
    ) then
      raise exception 'RLS contract regression: authenticated lost SELECT on %', table_name;
    end if;
    if has_table_privilege(
      'authenticated',
      format('public.%I', table_name),
      'INSERT'
    ) or has_table_privilege(
      'authenticated',
      format('public.%I', table_name),
      'UPDATE'
    ) or has_table_privilege(
      'authenticated',
      format('public.%I', table_name),
      'DELETE'
    ) then
      raise exception 'RLS contract regression: browser write grant exists on %', table_name;
    end if;
  end loop;
end;
$$;

-- Synthetic principals and tenants. Fixed UUIDs make the assertions readable.
insert into auth.users (
  id,
  aud,
  role,
  email,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
) values
  (
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'rls-a@example.invalid',
    false,
    false,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'rls-b@example.invalid',
    false,
    false,
    now(),
    now()
  );

insert into public.organizations (id, public_id, legal_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'rls-org-a', 'RLS Org A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'rls-org-b', 'RLS Org B');

insert into public.organization_members (
  organization_id,
  user_id,
  role,
  status
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'owner',
    'active'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'owner',
    'active'
  );

insert into public.applications (id, organization_id, name) values
  ('rls-app-a', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'RLS App A'),
  ('rls-app-b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'RLS App B');

insert into public.documents (id, application_id, category) values
  ('rls-doc-a', 'rls-app-a', 'test'),
  ('rls-doc-b', 'rls-app-b', 'test');

insert into public.information_requests (
  id,
  application_id,
  title,
  description,
  owner,
  created_by_module
) values
  ('rls-req-a', 'rls-app-a', 'A', 'A', 'borrower', 'borrower'),
  ('rls-req-b', 'rls-app-b', 'B', 'B', 'borrower', 'borrower');

insert into public.request_messages (request_id, author_module, body) values
  ('rls-req-a', 'borrower', 'A'),
  ('rls-req-b', 'borrower', 'B');

insert into public.data_room_folders (
  id,
  organization_id,
  application_id,
  name,
  purpose
) values
  (
    'rls-room-a',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'rls-app-a',
    'A',
    'application'
  ),
  (
    'rls-room-b',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'rls-app-b',
    'B',
    'application'
  );

insert into public.company_vault_items (
  id,
  organization_id,
  document_id,
  label,
  category
) values
  (
    'rls-vault-a',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'rls-doc-a',
    'A',
    'test'
  ),
  (
    'rls-vault-b',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'rls-doc-b',
    'B',
    'test'
  );

insert into public.financing_scenarios (
  id,
  application_id,
  name,
  amount,
  tenor_months,
  reference_rate_pct,
  margin_bps
) values
  ('rls-fin-a', 'rls-app-a', 'A', 1000000, 120, 5.25, 200),
  ('rls-fin-b', 'rls-app-b', 'B', 2000000, 120, 5.25, 200);

insert into public.signature_envelopes (
  id,
  application_id,
  title,
  provider,
  document_ids
) values
  ('rls-env-a', 'rls-app-a', 'A', 'other', array['rls-doc-a']),
  ('rls-env-b', 'rls-app-b', 'B', 'other', array['rls-doc-b']);

insert into public.signature_signers (
  envelope_id,
  email,
  display_name,
  signing_order
) values
  ('rls-env-a', 'a@example.invalid', 'A', 1),
  ('rls-env-b', 'b@example.invalid', 'B', 1);

create temporary table rls_assertions (
  name text primary key,
  actual bigint not null,
  expected bigint not null
) on commit drop;
grant select, insert on rls_assertions to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

insert into rls_assertions (name, actual, expected) values
  (
    'visible applications',
    (select count(*) from public.applications where id in ('rls-app-a', 'rls-app-b')),
    1
  ),
  (
    'cross-tenant application',
    (select count(*) from public.applications where id = 'rls-app-b'),
    0
  ),
  (
    'visible documents',
    (select count(*) from public.documents where id in ('rls-doc-a', 'rls-doc-b')),
    1
  ),
  (
    'cross-tenant document',
    (select count(*) from public.documents where id = 'rls-doc-b'),
    0
  ),
  (
    'visible request messages',
    (
      select count(*)
      from public.request_messages
      where request_id in ('rls-req-a', 'rls-req-b')
    ),
    1
  ),
  (
    'cross-tenant request message',
    (select count(*) from public.request_messages where request_id = 'rls-req-b'),
    0
  ),
  (
    'visible data rooms',
    (
      select count(*)
      from public.data_room_folders
      where id in ('rls-room-a', 'rls-room-b')
    ),
    1
  ),
  (
    'cross-tenant data room',
    (select count(*) from public.data_room_folders where id = 'rls-room-b'),
    0
  ),
  (
    'visible organizations',
    (
      select count(*)
      from public.organizations
      where id in (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      )
    ),
    1
  ),
  (
    'cross-tenant organization',
    (
      select count(*)
      from public.organizations
      where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    ),
    0
  ),
  (
    'visible company vault items',
    (
      select count(*)
      from public.company_vault_items
      where id in ('rls-vault-a', 'rls-vault-b')
    ),
    1
  ),
  (
    'cross-tenant company vault item',
    (select count(*) from public.company_vault_items where id = 'rls-vault-b'),
    0
  ),
  (
    'visible financing scenarios',
    (
      select count(*)
      from public.financing_scenarios
      where id in ('rls-fin-a', 'rls-fin-b')
    ),
    1
  ),
  (
    'cross-tenant financing scenario',
    (select count(*) from public.financing_scenarios where id = 'rls-fin-b'),
    0
  ),
  (
    'visible signature envelopes',
    (
      select count(*)
      from public.signature_envelopes
      where id in ('rls-env-a', 'rls-env-b')
    ),
    1
  ),
  (
    'cross-tenant signature envelope',
    (select count(*) from public.signature_envelopes where id = 'rls-env-b'),
    0
  ),
  (
    'visible signature signers',
    (
      select count(*)
      from public.signature_signers
      where envelope_id in ('rls-env-a', 'rls-env-b')
    ),
    1
  ),
  (
    'cross-tenant signature signer',
    (select count(*) from public.signature_signers where envelope_id = 'rls-env-b'),
    0
  );

reset role;

do $$
declare
  failed record;
begin
  select * into failed
  from rls_assertions
  where actual <> expected
  order by name
  limit 1;

  if found then
    raise exception 'RLS assertion failed: % expected %, got %',
      failed.name,
      failed.expected,
      failed.actual;
  end if;
end;
$$;

select name, actual, expected
from rls_assertions
order by name;

rollback;
