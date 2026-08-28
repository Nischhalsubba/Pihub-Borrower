-- PiHub Borrower v0.5 advanced product-aware lifecycle.
-- This migration extends the canonical platform schema without making browser
-- clients authoritative for credit, settlement, compliance, signature or disclosure.

alter table public.servicing_requests drop constraint if exists servicing_requests_request_type_check;
alter table public.servicing_requests add constraint servicing_requests_request_type_check
  check (request_type in (
    'waiver','consent','amendment','extension','refinance','payment_notice',
    'facility_increase','additional_drawdown','rollover','partial_prepayment',
    'full_repayment','payment_account_change','payoff'
  ));

create table if not exists public.spvs (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  legal_form text not null,
  jurisdiction text not null,
  registration_number text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spv_applications (
  spv_id text not null references public.spvs(id) on delete cascade,
  application_id text not null references public.applications(id) on delete cascade,
  primary key (spv_id, application_id)
);

create table if not exists public.saved_portfolio_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status_filter text not null default 'all',
  sort_by text not null default 'updated' check (sort_by in ('updated','amount','maturity','name')),
  columns text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.sources_uses_lines (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  side text not null check (side in ('source','use')),
  category text not null,
  description text not null default '',
  amount numeric(18,2) not null default 0,
  funded_amount numeric(18,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.construction_budget_lines (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  cost_code text not null,
  category text not null,
  original_budget numeric(18,2) not null default 0,
  revised_budget numeric(18,2) not null default 0,
  committed numeric(18,2) not null default 0,
  paid_to_date numeric(18,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.draw_requests (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  facility_id text references public.facilities(id) on delete set null,
  draw_number integer not null,
  requested_amount numeric(18,2) not null check (requested_amount >= 0),
  approved_amount numeric(18,2),
  requested_date date not null,
  needed_by date not null,
  status text not null default 'draft' check (status in ('draft','submitted','under_review','inspection_required','approved','partially_approved','funded','rejected','withdrawn')),
  note text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(application_id, draw_number)
);

create table if not exists public.draw_line_items (
  id text primary key,
  draw_request_id text not null references public.draw_requests(id) on delete cascade,
  budget_line_id text not null references public.construction_budget_lines(id),
  amount numeric(18,2) not null check (amount >= 0),
  invoice_reference text,
  document_ids text[] not null default '{}'
);

create table if not exists public.inspection_requests (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  draw_request_id text references public.draw_requests(id) on delete set null,
  inspection_type text not null check (inspection_type in ('progress','completion','valuation','site')),
  requested_date date not null,
  preferred_date date not null,
  status text not null default 'requested' check (status in ('requested','scheduled','completed','exception','cancelled')),
  inspector text,
  report_document_id text references public.documents(id),
  exception_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_connections (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  provider text not null check (provider in ('finapi','datev','bank_csv','erp_api','fineract','custom_webhook')),
  label text not null,
  status text not null default 'pending_consent' check (status in ('disconnected','pending_consent','connected','syncing','error','expired')),
  scopes text[] not null default '{}',
  provider_connection_ref text,
  token_secret_ref text,
  last_sync_at timestamptz,
  expires_at timestamptz,
  account_count integer,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.data_connections.token_secret_ref is 'Reference to server-side secret storage only. Never return provider refresh/access tokens to the Borrower browser.';

create table if not exists public.data_freshness (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  application_id text references public.applications(id) on delete cascade,
  connection_id text references public.data_connections(id) on delete set null,
  field_group text not null,
  source_label text not null,
  last_updated_at timestamptz not null,
  confirmed_by_borrower_at timestamptz,
  status text not null check (status in ('fresh','stale','needs_confirmation')),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_flow_snapshots (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id text not null references public.data_connections(id) on delete cascade,
  period text not null,
  inflows numeric(18,2) not null default 0,
  outflows numeric(18,2) not null default 0,
  ending_cash numeric(18,2) not null default 0,
  debt_service numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(connection_id, period)
);

create table if not exists public.data_room_folders (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  application_id text references public.applications(id) on delete cascade,
  name text not null,
  purpose text not null check (purpose in ('application','company_vault','closing','servicing')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.company_vault_items (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id text not null references public.documents(id) on delete cascade,
  label text not null,
  category text not null,
  valid_until date,
  reusable boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.company_vault_application_links (
  vault_item_id text not null references public.company_vault_items(id) on delete cascade,
  application_id text not null references public.applications(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key(vault_item_id, application_id)
);

create table if not exists public.document_intelligence_results (
  id text primary key,
  document_id text not null references public.documents(id) on delete cascade,
  engine text not null,
  status text not null check (status in ('queued','processed','needs_review','failed')),
  predicted_category text,
  confidence numeric(6,5),
  extracted_fields jsonb not null default '{}'::jsonb,
  warnings text[] not null default '{}',
  duplicate_of_document_id text references public.documents(id),
  tamper_signals text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.disclosure_grants (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  provider_name text not null,
  provider_type text not null check (provider_type in ('lender','investor','adviser','service_provider')),
  document_ids text[] not null default '{}',
  purpose text not null,
  status text not null default 'pending' check (status in ('pending','active','revoked','expired')),
  consented_by uuid references auth.users(id),
  consented_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.financing_scenarios (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  name text not null,
  amount numeric(18,2) not null,
  tenor_months integer not null,
  reference_rate_pct numeric(9,5) not null,
  margin_bps integer not null,
  fees_pct numeric(9,5) not null default 0,
  amortization_pct numeric(9,5) not null default 0,
  equity numeric(18,2) not null default 0,
  property_value numeric(18,2) not null default 0,
  projected_annual_noi numeric(18,2) not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.term_negotiation_threads (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  term_sheet_id text not null references public.term_sheets(id) on delete cascade,
  status text not null default 'open' check (status in ('open','agreed','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(term_sheet_id)
);

create table if not exists public.term_negotiation_messages (
  id text primary key,
  thread_id text not null references public.term_negotiation_threads(id) on delete cascade,
  author_module text not null check(author_module in ('borrower','advisory')),
  author_user_id uuid references auth.users(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.term_counters (
  id text primary key,
  thread_id text not null references public.term_negotiation_threads(id) on delete cascade,
  field_name text not null,
  requested_value text not null,
  rationale text not null,
  status text not null default 'proposed' check (status in ('proposed','accepted','declined')),
  created_at timestamptz not null default now()
);

create table if not exists public.signature_envelopes (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  title text not null,
  provider text not null check (provider in ('documenso','opensign','other')),
  external_envelope_ref text,
  document_ids text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','sent','partially_signed','completed','voided')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.signature_signers (
  envelope_id text not null references public.signature_envelopes(id) on delete cascade,
  email text not null,
  display_name text not null,
  signing_order integer not null,
  status text not null default 'pending' check (status in ('pending','sent','viewed','signed','declined')),
  external_signer_ref text,
  primary key(envelope_id, email)
);

create table if not exists public.payment_instructions (
  id text primary key,
  facility_id text not null references public.facilities(id) on delete cascade,
  label text not null,
  iban_masked text not null,
  account_holder text not null,
  mandate_type text not null check (mandate_type in ('manual_transfer','sepa_direct_debit')),
  status text not null default 'pending_verification' check(status in ('pending_verification','active','suspended')),
  is_default boolean not null default false,
  provider_token_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.facility_statements (
  id text primary key,
  facility_id text not null references public.facilities(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  opening_balance numeric(18,2) not null,
  principal_paid numeric(18,2) not null default 0,
  interest_paid numeric(18,2) not null default 0,
  fees_paid numeric(18,2) not null default 0,
  closing_balance numeric(18,2) not null,
  object_path text,
  generated_at timestamptz not null default now(),
  unique(facility_id, period_start, period_end)
);

create table if not exists public.covenant_forecasts (
  id text primary key,
  covenant_id text not null references public.covenants(id) on delete cascade,
  test_date date not null,
  forecast_value numeric(18,4) not null,
  headroom numeric(18,4) not null,
  status text not null check(status in ('comfortable','watch','at_risk')),
  assumption text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.external_professionals (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text not null,
  profession text not null check(profession in ('accountant','lawyer','tax_adviser','architect','contractor','broker','other')),
  permissions text[] not null default '{}',
  expires_at date not null,
  status text not null default 'invited' check(status in ('invited','active','revoked','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.external_professional_application_access (
  professional_id text not null references public.external_professionals(id) on delete cascade,
  application_id text not null references public.applications(id) on delete cascade,
  primary key(professional_id, application_id)
);

create table if not exists public.esg_profiles (
  id text primary key,
  application_id text not null unique references public.applications(id) on delete cascade,
  epc_rating text,
  energy_standard text,
  renewable_share_pct numeric(8,3) not null default 0,
  operational_co2_kg_sqm numeric(12,4) not null default 0,
  taxonomy_aligned_pct numeric(8,3) not null default 0,
  kfw_program text,
  certifications text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_connectors (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  kind text not null check(kind in ('erp','webhook','servicing','workflow','document_intelligence','esign')),
  provider text not null,
  mode text not null check(mode in ('external_api','self_hosted')),
  base_url text,
  status text not null default 'configured' check(status in ('configured','connected','error','disabled')),
  capabilities text[] not null default '{}',
  secret_ref text,
  last_test_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.complaints (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  application_id text references public.applications(id) on delete set null,
  facility_id text references public.facilities(id) on delete set null,
  category text not null check(category in ('payment','document','service','decision','privacy','other')),
  subject text not null,
  description text not null,
  status text not null default 'submitted' check(status in ('submitted','acknowledged','under_review','resolved','closed')),
  reference text unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_export_packages (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  application_id text references public.applications(id) on delete set null,
  format text not null check(format in ('json','csv_manifest')),
  included_sections text[] not null default '{}',
  object_path text,
  status text not null default 'ready' check(status in ('preparing','ready','expired','failed')),
  requested_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists draw_requests_application_idx on public.draw_requests(application_id, created_at desc);
create index if not exists inspections_application_idx on public.inspection_requests(application_id, preferred_date);
create index if not exists freshness_org_idx on public.data_freshness(organization_id, field_group);
create index if not exists disclosure_application_idx on public.disclosure_grants(application_id, status);
create index if not exists scenarios_application_idx on public.financing_scenarios(application_id, created_at desc);
create index if not exists payment_instruction_facility_idx on public.payment_instructions(facility_id, status);
create index if not exists complaints_org_idx on public.complaints(organization_id, created_at desc);

-- Reuse the base migration's updated-at trigger where mutable rows need it.
create trigger spvs_touch before update on public.spvs for each row execute function public.touch_updated_at();
create trigger sources_uses_touch before update on public.sources_uses_lines for each row execute function public.touch_updated_at();
create trigger construction_budget_touch before update on public.construction_budget_lines for each row execute function public.touch_updated_at();
create trigger draws_touch before update on public.draw_requests for each row execute function public.touch_updated_at();
create trigger inspections_touch before update on public.inspection_requests for each row execute function public.touch_updated_at();
create trigger data_connections_touch before update on public.data_connections for each row execute function public.touch_updated_at();
create trigger data_freshness_touch before update on public.data_freshness for each row execute function public.touch_updated_at();
create trigger negotiation_touch before update on public.term_negotiation_threads for each row execute function public.touch_updated_at();
create trigger signatures_touch before update on public.signature_envelopes for each row execute function public.touch_updated_at();
create trigger payment_instructions_touch before update on public.payment_instructions for each row execute function public.touch_updated_at();
create trigger external_professionals_touch before update on public.external_professionals for each row execute function public.touch_updated_at();
create trigger esg_touch before update on public.esg_profiles for each row execute function public.touch_updated_at();
create trigger integration_connectors_touch before update on public.integration_connectors for each row execute function public.touch_updated_at();
create trigger complaints_touch before update on public.complaints for each row execute function public.touch_updated_at();

-- Read policies. Financial and contractual writes still flow through the PiHub API.
-- A Borrower may read its organization. Advisory/Investor may read only explicitly
-- assigned/disclosed deals through can_read_application().

alter table public.spvs enable row level security;
alter table public.spv_applications enable row level security;
alter table public.saved_portfolio_views enable row level security;
alter table public.sources_uses_lines enable row level security;
alter table public.construction_budget_lines enable row level security;
alter table public.draw_requests enable row level security;
alter table public.draw_line_items enable row level security;
alter table public.inspection_requests enable row level security;
alter table public.data_connections enable row level security;
alter table public.data_freshness enable row level security;
alter table public.cash_flow_snapshots enable row level security;
alter table public.data_room_folders enable row level security;
alter table public.company_vault_items enable row level security;
alter table public.company_vault_application_links enable row level security;
alter table public.document_intelligence_results enable row level security;
alter table public.disclosure_grants enable row level security;
alter table public.financing_scenarios enable row level security;
alter table public.term_negotiation_threads enable row level security;
alter table public.term_negotiation_messages enable row level security;
alter table public.term_counters enable row level security;
alter table public.signature_envelopes enable row level security;
alter table public.signature_signers enable row level security;
alter table public.payment_instructions enable row level security;
alter table public.facility_statements enable row level security;
alter table public.covenant_forecasts enable row level security;
alter table public.external_professionals enable row level security;
alter table public.external_professional_application_access enable row level security;
alter table public.esg_profiles enable row level security;
alter table public.integration_connectors enable row level security;
alter table public.complaints enable row level security;
alter table public.data_export_packages enable row level security;

create policy spv_read on public.spvs for select using (public.is_org_member(organization_id) or public.has_platform_role(array['admin','compliance','operations']));
create policy spv_app_read on public.spv_applications for select using (public.can_read_application(application_id));
create policy portfolio_view_self on public.saved_portfolio_views for select using (user_id=auth.uid());
create policy sources_uses_read on public.sources_uses_lines for select using (public.can_read_application(application_id));
create policy construction_budget_read on public.construction_budget_lines for select using (public.can_read_application(application_id));
create policy draw_read on public.draw_requests for select using (public.can_read_application(application_id));
create policy draw_line_read on public.draw_line_items for select using (exists(select 1 from public.draw_requests d where d.id=draw_request_id and public.can_read_application(d.application_id)));
create policy inspection_read on public.inspection_requests for select using (public.can_read_application(application_id));
create policy data_connection_org_read on public.data_connections for select using (public.is_org_member(organization_id) or public.has_platform_role(array['admin','compliance','operations']));
create policy data_freshness_org_read on public.data_freshness for select using (public.is_org_member(organization_id) or (application_id is not null and public.can_read_application(application_id)) or public.has_platform_role(array['admin','compliance','operations']));
create policy cashflow_org_read on public.cash_flow_snapshots for select using (public.is_org_member(organization_id) or public.has_platform_role(array['admin','compliance','operations']));
create policy data_room_read on public.data_room_folders for select using (public.is_org_member(organization_id) or (application_id is not null and public.can_read_application(application_id)) or public.has_platform_role(array['admin','compliance','operations']));
create policy vault_read on public.company_vault_items for select using (public.is_org_member(organization_id) or public.has_platform_role(array['admin','compliance','operations']));
create policy vault_link_read on public.company_vault_application_links for select using (public.can_read_application(application_id));
create policy intelligence_read on public.document_intelligence_results for select using (exists(select 1 from public.documents d where d.id=document_id and public.can_read_application(d.application_id)));
create policy disclosure_read on public.disclosure_grants for select using (public.can_read_application(application_id));
create policy scenario_read on public.financing_scenarios for select using (public.can_read_application(application_id));
create policy negotiation_read on public.term_negotiation_threads for select using (public.can_read_application(application_id));
create policy negotiation_message_read on public.term_negotiation_messages for select using (exists(select 1 from public.term_negotiation_threads t where t.id=thread_id and public.can_read_application(t.application_id)));
create policy counter_read on public.term_counters for select using (exists(select 1 from public.term_negotiation_threads t where t.id=thread_id and public.can_read_application(t.application_id)));
create policy signature_read on public.signature_envelopes for select using (public.can_read_application(application_id));
create policy signer_read on public.signature_signers for select using (exists(select 1 from public.signature_envelopes e where e.id=envelope_id and public.can_read_application(e.application_id)));
create policy payment_instruction_read on public.payment_instructions for select using (exists(select 1 from public.facilities f where f.id=facility_id and public.can_read_application(f.application_id)));
create policy statement_read on public.facility_statements for select using (exists(select 1 from public.facilities f where f.id=facility_id and public.can_read_application(f.application_id)));
create policy covenant_forecast_read on public.covenant_forecasts for select using (exists(select 1 from public.covenants c join public.facilities f on f.id=c.facility_id where c.id=covenant_id and public.can_read_application(f.application_id)));
create policy professional_org_read on public.external_professionals for select using (public.is_org_member(organization_id) or public.has_platform_role(array['admin','compliance','operations']));
create policy professional_app_read on public.external_professional_application_access for select using (public.can_read_application(application_id));
create policy esg_read on public.esg_profiles for select using (public.can_read_application(application_id));
create policy integration_org_read on public.integration_connectors for select using (public.is_org_member(organization_id) or public.has_platform_role(array['admin','operations']));
create policy complaint_org_read on public.complaints for select using (public.is_org_member(organization_id) or public.has_platform_role(array['admin','compliance','operations']));
create policy export_org_read on public.data_export_packages for select using (public.is_org_member(organization_id) or public.has_platform_role(array['admin','compliance','operations']));

-- As in 0001, ordinary browser roles receive no INSERT/UPDATE/DELETE policies on
-- finance-critical tables. Commands pass through the authenticated PiHub API,
-- which validates permissions, idempotency and state transitions and records
-- audit + outbox evidence transactionally.
