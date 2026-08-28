-- PiHub canonical platform schema, prepared for Supabase/PostgreSQL.
-- This migration is intentionally shared-platform oriented: Borrower, Advisory,
-- Investor and Admin see authorized projections of the same records.

create extension if not exists pgcrypto;

create type public.pihub_member_role as enum ('owner','editor','finance','legal','viewer','signatory');
create type public.pihub_member_status as enum ('invited','active','revoked');
create type public.pihub_application_status as enum ('draft','submitted','pihub_review','information_required','structuring','due_diligence','investor_review','indicative_terms','terms_accepted','documentation','conditions_precedent','ready_to_fund','funded','declined','withdrawn','archived');
create type public.pihub_review_status as enum ('required','submitted','under_review','accepted','rejected','expired');
create type public.pihub_request_status as enum ('open','responded','resolved','overdue');
create type public.pihub_servicing_status as enum ('draft','submitted','under_review','approved','declined','withdrawn');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  legal_name text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','action_required')),
  legal_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  phone text,
  job_title text,
  preferred_locale text not null default 'en' check (preferred_locale in ('en','de')),
  notification_email boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.pihub_member_role not null,
  status public.pihub_member_status not null default 'invited',
  invited_at timestamptz,
  invitation_sent_at timestamptz,
  primary key (organization_id, user_id)
);

create table public.platform_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('advisory','investor','admin','compliance','operations')),
  primary key (user_id, role)
);


-- Advisory/Investor roles are capabilities, not global record visibility. A deal
-- must be explicitly disclosed/assigned before those modules can read it.
create table public.application_access_grants (
  application_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null check (module in ('advisory','investor')),
  permission text not null default 'view' check (permission in ('view','manage','underwrite')),
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (application_id, user_id, module)
);

create table public.applications (
  id text primary key,
  organization_id uuid not null references public.organizations(id),
  name text not null,
  status public.pihub_application_status not null default 'draft',
  product_id text,
  financing jsonb not null default '{}'::jsonb,
  company jsonb not null default '{}'::jsonb,
  project jsonb not null default '{}'::jsonb,
  financials jsonb not null default '{}'::jsonb,
  section_completion jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.application_access_grants
  add constraint application_access_grants_application_fk
  foreign key (application_id) references public.applications(id) on delete cascade;

create table public.application_versions (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references public.applications(id) on delete cascade,
  version integer not null,
  reason text not null,
  actor_user_id uuid references auth.users(id),
  actor_label text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (application_id, version)
);

create table public.documents (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  category text not null,
  requirement_label text,
  required boolean not null default false,
  status public.pihub_review_status not null default 'required',
  due_date date,
  current_version integer not null default 0,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references public.documents(id) on delete cascade,
  version integer not null,
  object_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text,
  malware_status text not null default 'pending' check (malware_status in ('pending','clean','blocked','failed')),
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now(),
  unique(document_id, version)
);

create table public.information_requests (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  title text not null,
  description text not null,
  status public.pihub_request_status not null default 'open',
  owner text not null check (owner in ('borrower','pihub')),
  created_by_module text not null check (created_by_module in ('borrower','advisory','investor','admin')),
  priority text not null default 'normal' check (priority in ('normal','high')),
  due_date date,
  related_document_id text references public.documents(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.information_requests(id) on delete cascade,
  author_module text not null check (author_module in ('borrower','advisory','investor','admin')),
  author_user_id uuid references auth.users(id),
  body text not null,
  attachment_document_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.term_sheets (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  provider text not null,
  amount numeric(18,2) not null,
  reference_rate text not null,
  margin_bps integer not null,
  tenor_months integer not null,
  ltv numeric(8,3),
  fees_percent numeric(8,3),
  expiry_date date not null,
  status text not null default 'available' check (status in ('available','accepted','rejected','expired')),
  document_id text references public.documents(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.closing_items (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  title text not null,
  owner text not null check (owner in ('borrower','pihub','legal')),
  required boolean not null default true,
  complete boolean not null default false,
  due_date date,
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.facilities (
  id text primary key,
  application_id text not null unique references public.applications(id),
  provider text not null,
  original_amount numeric(18,2) not null,
  outstanding_amount numeric(18,2) not null,
  currency text not null default 'EUR',
  reference_rate text not null,
  margin_bps integer not null,
  start_date date not null,
  maturity_date date not null,
  security_summary text not null default '',
  status text not null check (status in ('pending_funding','active','matured','repaid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_schedule (
  id text primary key,
  facility_id text not null references public.facilities(id) on delete cascade,
  due_date date not null,
  principal numeric(18,2) not null default 0,
  interest numeric(18,2) not null default 0,
  fees numeric(18,2) not null default 0,
  status text not null check (status in ('scheduled','due','paid','overdue')),
  paid_at timestamptz,
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.covenants (
  id text primary key,
  facility_id text not null references public.facilities(id) on delete cascade,
  name text not null,
  metric text not null,
  operator text not null check (operator in ('<=','>=','=')),
  threshold numeric(18,4) not null,
  current_value numeric(18,4),
  unit text not null,
  next_test_date date not null,
  status text not null check (status in ('not_tested','compliant','warning','breach')),
  updated_at timestamptz not null default now()
);

create table public.reporting_obligations (
  id text primary key,
  facility_id text not null references public.facilities(id) on delete cascade,
  title text not null,
  frequency text not null check (frequency in ('monthly','quarterly','annual','event_driven')),
  due_date date not null,
  status public.pihub_review_status not null default 'required',
  document_id text references public.documents(id),
  remediation text,
  updated_at timestamptz not null default now()
);

create table public.servicing_requests (
  id text primary key,
  facility_id text not null references public.facilities(id) on delete cascade,
  request_type text not null check (request_type in ('waiver','consent','amendment','extension','refinance','payment_notice')),
  subject text not null,
  description text not null,
  status public.pihub_servicing_status not null default 'submitted',
  submitted_by uuid references auth.users(id),
  submitted_at timestamptz,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references auth.users(id),
  request_type text not null check (request_type in ('access','export','correction','restriction','deletion')),
  status text not null default 'submitted' check (status in ('submitted','under_review','completed','declined')),
  note text,
  legal_basis_note text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  href text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  application_id text references public.applications(id),
  user_id uuid not null references auth.users(id),
  category text not null,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  aggregate_type text not null,
  aggregate_id text not null,
  event_type text not null,
  target_modules text[] not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts integer not null default 0,
  last_error text
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid,
  actor_module text,
  organization_id uuid,
  aggregate_type text not null,
  aggregate_id text not null,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create table public.idempotency_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  command text not null,
  response jsonb,
  created_at timestamptz not null default now(),
  primary key(user_id, idempotency_key)
);

create index on public.applications(organization_id, updated_at desc);
create index on public.application_access_grants(user_id, module, application_id);
create index on public.documents(application_id, status);
create index on public.information_requests(application_id, status, due_date);
create index on public.facilities(application_id);
create index on public.payment_schedule(facility_id, due_date);
create index on public.reporting_obligations(facility_id, due_date);
create index on public.servicing_requests(facility_id, created_at desc);
create index on public.notifications(user_id, read_at, created_at desc);
create index on public.outbox_events(processed_at, created_at) where processed_at is null;
create index on public.audit_events(aggregate_type, aggregate_id, created_at desc);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger organizations_touch before update on public.organizations for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger applications_touch before update on public.applications for each row execute function public.touch_updated_at();
create trigger documents_touch before update on public.documents for each row execute function public.touch_updated_at();
create trigger requests_touch before update on public.information_requests for each row execute function public.touch_updated_at();
create trigger terms_touch before update on public.term_sheets for each row execute function public.touch_updated_at();
create trigger closing_touch before update on public.closing_items for each row execute function public.touch_updated_at();
create trigger facilities_touch before update on public.facilities for each row execute function public.touch_updated_at();
create trigger payments_touch before update on public.payment_schedule for each row execute function public.touch_updated_at();
create trigger servicing_touch before update on public.servicing_requests for each row execute function public.touch_updated_at();
create trigger privacy_touch before update on public.privacy_requests for each row execute function public.touch_updated_at();
create trigger support_touch before update on public.support_tickets for each row execute function public.touch_updated_at();

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.organization_members m where m.organization_id = target_org and m.user_id = auth.uid() and m.status = 'active');
$$;

create or replace function public.has_platform_role(roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.platform_roles r where r.user_id = auth.uid() and r.role = any(roles));
$$;

create or replace function public.application_org(application_key text)
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.applications where id = application_key;
$$;

create or replace function public.facility_org(facility_key text)
returns uuid language sql stable security definer set search_path = public as $$
  select a.organization_id from public.facilities f join public.applications a on a.id = f.application_id where f.id = facility_key;
$$;


create or replace function public.has_application_access(application_key text, modules text[] default array['advisory','investor'])
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.application_access_grants g
    where g.application_id = application_key
      and g.user_id = auth.uid()
      and g.module = any(modules)
  );
$$;

create or replace function public.can_read_application(application_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.applications a
    where a.id = application_key
      and (
        public.is_org_member(a.organization_id)
        or public.has_platform_role(array['admin','compliance','operations'])
        or public.has_application_access(a.id)
      )
  );
$$;

revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.has_platform_role(text[]) from public, anon;
revoke execute on function public.application_org(text) from public, anon;
revoke execute on function public.facility_org(text) from public, anon;
revoke execute on function public.has_application_access(text, text[]) from public, anon;
revoke execute on function public.can_read_application(text) from public, anon;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_platform_role(text[]) to authenticated;
grant execute on function public.application_org(text) to authenticated;
grant execute on function public.facility_org(text) to authenticated;
grant execute on function public.has_application_access(text, text[]) to authenticated;
grant execute on function public.can_read_application(text) to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.platform_roles enable row level security;
alter table public.application_access_grants enable row level security;
alter table public.applications enable row level security;
alter table public.application_versions enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.information_requests enable row level security;
alter table public.request_messages enable row level security;
alter table public.term_sheets enable row level security;
alter table public.closing_items enable row level security;
alter table public.facilities enable row level security;
alter table public.payment_schedule enable row level security;
alter table public.covenants enable row level security;
alter table public.reporting_obligations enable row level security;
alter table public.servicing_requests enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.outbox_events enable row level security;
alter table public.audit_events enable row level security;
alter table public.idempotency_keys enable row level security;

create policy org_read on public.organizations for select using (public.is_org_member(id) or public.has_platform_role(array['advisory','admin','compliance','operations']));
create policy profile_self on public.profiles for select using (user_id = auth.uid());
create policy profile_update_self on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy members_read on public.organization_members for select using (public.is_org_member(organization_id) or public.has_platform_role(array['advisory','admin','compliance','operations']));
create policy roles_self on public.platform_roles for select using (user_id = auth.uid());
create policy access_grants_self on public.application_access_grants for select using (user_id = auth.uid() or public.has_platform_role(array['admin','compliance','operations']));

create policy application_read on public.applications for select using (public.can_read_application(id));
create policy app_version_read on public.application_versions for select using (public.can_read_application(application_id));
create policy document_read on public.documents for select using (public.can_read_application(application_id));
create policy document_version_read on public.document_versions for select using (exists(select 1 from public.documents d where d.id = document_id and public.can_read_application(d.application_id)));
create policy request_read on public.information_requests for select using (public.can_read_application(application_id));
create policy message_read on public.request_messages for select using (exists(select 1 from public.information_requests r where r.id = request_id and public.can_read_application(r.application_id)));
create policy terms_read on public.term_sheets for select using (public.can_read_application(application_id));
create policy closing_read on public.closing_items for select using (public.can_read_application(application_id));
create policy facility_read on public.facilities for select using (public.can_read_application(application_id));
create policy payment_read on public.payment_schedule for select using (exists(select 1 from public.facilities f where f.id = facility_id and public.can_read_application(f.application_id)));
create policy covenant_read on public.covenants for select using (exists(select 1 from public.facilities f where f.id = facility_id and public.can_read_application(f.application_id)));
create policy reporting_read on public.reporting_obligations for select using (exists(select 1 from public.facilities f where f.id = facility_id and public.can_read_application(f.application_id)));
create policy servicing_read on public.servicing_requests for select using (exists(select 1 from public.facilities f where f.id = facility_id and public.can_read_application(f.application_id)));
create policy privacy_self on public.privacy_requests for select using (user_id = auth.uid() or public.has_platform_role(array['admin','compliance']));
create policy notification_self on public.notifications for select using (user_id = auth.uid());
create policy support_read on public.support_tickets for select using (user_id = auth.uid() or public.has_platform_role(array['admin','operations']));
create policy audit_staff_read on public.audit_events for select using (public.has_platform_role(array['admin','compliance','operations']));
create policy idempotency_self on public.idempotency_keys for select using (user_id = auth.uid());

-- Borrower mutations should normally pass through the shared PiHub API so commands,
-- permissions, optimistic concurrency, audit and outbox writes occur in one transaction.
-- RLS therefore defaults to read-only for finance-critical tables from the browser.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pihub-documents', 'pihub-documents', false, 26214400, array['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Object path: <organization_uuid>/<application_id>/<document_id>/<version>/<safe-filename>
create policy borrower_document_object_read on storage.objects for select to authenticated
using (bucket_id = 'pihub-documents' and public.is_org_member((storage.foldername(name))[1]::uuid));

-- Upload/delete policies are intentionally not granted to ordinary browser users.
-- The shared API issues narrowly scoped upload intents and finalizes versions only after scan/validation.
