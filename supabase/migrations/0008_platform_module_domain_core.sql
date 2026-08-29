-- PiHub shared module-domain core.
-- Investor, Advisory and Admin records reference the same canonical application/deal.
-- Module-specific records express workflow/decision context; they do not clone the deal.

create table public.organization_capabilities (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  capability text not null check (capability in ('borrower','investor','sponsor','service_provider')),
  status text not null default 'pending' check (status in ('pending','active','suspended','revoked')),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, capability)
);

create table public.application_organization_access_grants (
  application_id text not null references public.applications(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module text not null check (module in ('advisory','investor')),
  permission text not null default 'view' check (permission in ('view','manage','underwrite','commit')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  primary key (application_id, organization_id, module)
);

create index application_org_access_grants_org_idx
  on public.application_organization_access_grants(organization_id, module, application_id)
  where revoked_at is null;
create index application_org_access_grants_granted_by_idx
  on public.application_organization_access_grants(granted_by)
  where granted_by is not null;

create table public.deal_parties (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references public.applications(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  party_role text not null check (party_role in ('borrower','sponsor','investor','lender','adviser','servicer','agent','security_trustee','valuer','legal','technical_adviser')),
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, organization_id, party_role)
);

create index deal_parties_org_idx on public.deal_parties(organization_id, party_role);
create index deal_parties_application_role_idx on public.deal_parties(application_id, party_role);

create table public.advisory_mandates (
  id uuid primary key default gen_random_uuid(),
  mandate_key text not null unique,
  application_id text not null references public.applications(id) on delete cascade,
  client_organization_id uuid not null references public.organizations(id) on delete restrict,
  mandate_type text not null check (mandate_type in ('debt','equity','m_and_a','refinance','other')),
  stage text not null default 'origination' check (stage in ('origination','structuring','due_diligence','term_sheet','documentation','closing','closed')),
  status text not null default 'active' check (status in ('draft','active','paused','completed','terminated')),
  owner_user_id uuid references auth.users(id) on delete set null,
  target_amount numeric(18,2),
  currency text not null default 'EUR',
  commercial_terms jsonb not null default '{}'::jsonb,
  signed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, mandate_type)
);

create index advisory_mandates_client_idx on public.advisory_mandates(client_organization_id, status);
create index advisory_mandates_owner_idx on public.advisory_mandates(owner_user_id, status) where owner_user_id is not null;
create index advisory_mandates_stage_idx on public.advisory_mandates(stage, status, updated_at desc);

create table public.due_diligence_workstreams (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references public.applications(id) on delete cascade,
  workstream_key text not null,
  title text not null,
  owner_module text not null check (owner_module in ('advisory','investor','admin')),
  owner_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'not_started' check (status in ('not_started','open','in_review','blocked','complete','waived')),
  due_at timestamptz,
  summary text not null default '',
  findings jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, workstream_key)
);

create index due_diligence_owner_queue_idx
  on public.due_diligence_workstreams(owner_module, status, due_at)
  where status in ('not_started','open','in_review','blocked');
create index due_diligence_owner_user_idx on public.due_diligence_workstreams(owner_user_id, status) where owner_user_id is not null;

create table public.deal_publications (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references public.applications(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft','approved','published','paused','withdrawn','closed')),
  title text not null,
  teaser text not null default '',
  disclosure_level text not null default 'teaser' check (disclosure_level in ('teaser','standard','full')),
  investor_criteria jsonb not null default '{}'::jsonb,
  approved_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, version)
);

create index deal_publications_status_idx on public.deal_publications(status, published_at desc);
create index deal_publications_approved_by_idx on public.deal_publications(approved_by) where approved_by is not null;
create index deal_publications_published_by_idx on public.deal_publications(published_by) where published_by is not null;

create table public.investor_commitments (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references public.applications(id) on delete cascade,
  publication_id uuid references public.deal_publications(id) on delete set null,
  investor_organization_id uuid not null references public.organizations(id) on delete cascade,
  investor_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'interested' check (status in ('interested','due_diligence','credit_review','approved','declined','committed','allocated','funded','withdrawn','expired')),
  indicated_amount numeric(18,2),
  committed_amount numeric(18,2),
  allocated_amount numeric(18,2),
  funded_amount numeric(18,2),
  currency text not null default 'EUR',
  conditions jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, investor_organization_id)
);

create index investor_commitments_org_status_idx on public.investor_commitments(investor_organization_id, status, updated_at desc);
create index investor_commitments_app_status_idx on public.investor_commitments(application_id, status);
create index investor_commitments_publication_idx on public.investor_commitments(publication_id) where publication_id is not null;
create index investor_commitments_user_idx on public.investor_commitments(investor_user_id) where investor_user_id is not null;

create table public.investor_decisions (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.investor_commitments(id) on delete cascade,
  decision_stage text not null check (decision_stage in ('screening','underwriting','credit_committee','investment_committee','final')),
  outcome text not null check (outcome in ('pending','approve','decline','conditional')),
  decided_by uuid references auth.users(id) on delete set null,
  rationale text,
  conditions jsonb not null default '{}'::jsonb,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (commitment_id, decision_stage)
);

create index investor_decisions_decided_by_idx on public.investor_decisions(decided_by) where decided_by is not null;
create index investor_decisions_outcome_idx on public.investor_decisions(outcome, decided_at desc);

create table public.compliance_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  application_id text references public.applications(id) on delete cascade,
  subject_user_id uuid references auth.users(id) on delete set null,
  case_type text not null check (case_type in ('kyb','kyc','aml','sanctions','ubo','pep','source_of_funds','document_review','other')),
  status text not null default 'open' check (status in ('open','in_review','action_required','cleared','blocked','closed')),
  risk_rating text not null default 'unknown' check (risk_rating in ('unknown','low','medium','high','critical')),
  outcome text check (outcome in ('clear','conditional','block','not_applicable')),
  owner_user_id uuid references auth.users(id) on delete set null,
  internal_summary text not null default '',
  evidence jsonb not null default '{}'::jsonb,
  opened_at timestamptz not null default now(),
  reviewed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index compliance_cases_queue_idx on public.compliance_cases(status, risk_rating, updated_at desc);
create index compliance_cases_org_idx on public.compliance_cases(organization_id, status);
create index compliance_cases_app_idx on public.compliance_cases(application_id, status) where application_id is not null;
create index compliance_cases_owner_idx on public.compliance_cases(owner_user_id, status) where owner_user_id is not null;
create index compliance_cases_subject_user_idx on public.compliance_cases(subject_user_id) where subject_user_id is not null;

create table public.compliance_checks (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.compliance_cases(id) on delete cascade,
  check_type text not null,
  provider text,
  status text not null default 'pending' check (status in ('pending','running','clear','review','match','failed')),
  external_reference text,
  result jsonb not null default '{}'::jsonb,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index compliance_checks_case_status_idx on public.compliance_checks(case_id, status);

-- Organization-level grants let an investor institution receive a disclosed deal once,
-- while all active members still pass their organization membership check.
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
  select
    exists(
      select 1
      from public.application_access_grants g
      where g.application_id = application_key
        and g.user_id = auth.uid()
        and g.module = any(modules)
    )
    or exists(
      select 1
      from public.application_organization_access_grants g
      join public.organization_members m
        on m.organization_id = g.organization_id
       and m.user_id = auth.uid()
       and m.status = 'active'
      where g.application_id = application_key
        and g.module = any(modules)
        and g.revoked_at is null
        and (g.expires_at is null or g.expires_at > now())
    );
$$;

create trigger organization_capabilities_touch before update on public.organization_capabilities for each row execute function public.touch_updated_at();
create trigger deal_parties_touch before update on public.deal_parties for each row execute function public.touch_updated_at();
create trigger advisory_mandates_touch before update on public.advisory_mandates for each row execute function public.touch_updated_at();
create trigger due_diligence_workstreams_touch before update on public.due_diligence_workstreams for each row execute function public.touch_updated_at();
create trigger deal_publications_touch before update on public.deal_publications for each row execute function public.touch_updated_at();
create trigger investor_commitments_touch before update on public.investor_commitments for each row execute function public.touch_updated_at();
create trigger compliance_cases_touch before update on public.compliance_cases for each row execute function public.touch_updated_at();
create trigger compliance_checks_touch before update on public.compliance_checks for each row execute function public.touch_updated_at();

-- These module-domain tables are server-owned until the central PiHub API projects
-- authorized module views. Do not expose internal mandate, decision or compliance data
-- directly to browser clients.
alter table public.organization_capabilities enable row level security;
alter table public.application_organization_access_grants enable row level security;
alter table public.deal_parties enable row level security;
alter table public.advisory_mandates enable row level security;
alter table public.due_diligence_workstreams enable row level security;
alter table public.deal_publications enable row level security;
alter table public.investor_commitments enable row level security;
alter table public.investor_decisions enable row level security;
alter table public.compliance_cases enable row level security;
alter table public.compliance_checks enable row level security;

revoke all on table public.organization_capabilities from anon, authenticated;
revoke all on table public.application_organization_access_grants from anon, authenticated;
revoke all on table public.deal_parties from anon, authenticated;
revoke all on table public.advisory_mandates from anon, authenticated;
revoke all on table public.due_diligence_workstreams from anon, authenticated;
revoke all on table public.deal_publications from anon, authenticated;
revoke all on table public.investor_commitments from anon, authenticated;
revoke all on table public.investor_decisions from anon, authenticated;
revoke all on table public.compliance_cases from anon, authenticated;
revoke all on table public.compliance_checks from anon, authenticated;

grant select, insert, update, delete on table public.organization_capabilities to service_role;
grant select, insert, update, delete on table public.application_organization_access_grants to service_role;
grant select, insert, update, delete on table public.deal_parties to service_role;
grant select, insert, update, delete on table public.advisory_mandates to service_role;
grant select, insert, update, delete on table public.due_diligence_workstreams to service_role;
grant select, insert, update, delete on table public.deal_publications to service_role;
grant select, insert, update, delete on table public.investor_commitments to service_role;
grant select, insert, update, delete on table public.investor_decisions to service_role;
grant select, insert, update, delete on table public.compliance_cases to service_role;
grant select, insert, update, delete on table public.compliance_checks to service_role;
