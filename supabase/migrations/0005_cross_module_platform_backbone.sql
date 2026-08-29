-- PiHub shared cross-module backbone.
-- One canonical application/deal is observed by Borrower, Advisory, Investor and Admin
-- through module-specific state, durable handoffs, work items and per-target event delivery.

alter table public.outbox_events
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists application_id text references public.applications(id) on delete set null,
  add column if not exists schema_version integer not null default 1 check (schema_version > 0),
  add column if not exists correlation_id uuid,
  add column if not exists causation_id uuid;

alter table public.outbox_events
  drop constraint if exists outbox_events_target_modules_check;
alter table public.outbox_events
  add constraint outbox_events_target_modules_check
  check (
    cardinality(target_modules) > 0
    and target_modules <@ array['borrower','advisory','investor','admin']::text[]
  );

create index if not exists outbox_events_application_created_idx
  on public.outbox_events(application_id, created_at desc)
  where application_id is not null;
create index if not exists outbox_events_org_created_idx
  on public.outbox_events(organization_id, created_at desc)
  where organization_id is not null;
create index if not exists outbox_events_correlation_idx
  on public.outbox_events(correlation_id)
  where correlation_id is not null;

create table if not exists public.application_module_states (
  application_id text not null references public.applications(id) on delete cascade,
  module text not null check (module in ('borrower','advisory','investor','admin')),
  state text not null default 'not_started' check (state in ('not_started','ready','in_progress','blocked','completed','closed')),
  owner_user_id uuid references auth.users(id) on delete set null,
  blocked_reason text,
  summary jsonb not null default '{}'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  last_event_id uuid references public.outbox_events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (application_id, module)
);

create index if not exists application_module_states_module_state_idx
  on public.application_module_states(module, state, updated_at desc);
create index if not exists application_module_states_owner_idx
  on public.application_module_states(owner_user_id, state)
  where owner_user_id is not null;

create table if not exists public.workflow_handoffs (
  id uuid primary key default gen_random_uuid(),
  handoff_key text not null unique,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  application_id text not null references public.applications(id) on delete cascade,
  from_module text not null check (from_module in ('borrower','advisory','investor','admin')),
  to_module text not null check (to_module in ('borrower','advisory','investor','admin')),
  handoff_type text not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled','completed')),
  source_event_id uuid references public.outbox_events(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (from_module <> to_module)
);

create index if not exists workflow_handoffs_application_status_idx
  on public.workflow_handoffs(application_id, status, created_at desc);
create index if not exists workflow_handoffs_target_status_idx
  on public.workflow_handoffs(to_module, status, created_at);

create table if not exists public.platform_work_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  application_id text references public.applications(id) on delete cascade,
  facility_id text references public.facilities(id) on delete cascade,
  source_module text not null check (source_module in ('borrower','advisory','investor','admin')),
  target_module text not null check (target_module in ('borrower','advisory','investor','admin')),
  kind text not null,
  title text not null,
  description text not null default '',
  status text not null default 'open' check (status in ('open','in_progress','blocked','done','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  owner_user_id uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  related_aggregate_type text,
  related_aggregate_id text,
  action_href text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists platform_work_items_target_queue_idx
  on public.platform_work_items(target_module, status, priority, due_at)
  where status in ('open','in_progress','blocked');
create index if not exists platform_work_items_application_idx
  on public.platform_work_items(application_id, created_at desc)
  where application_id is not null;
create index if not exists platform_work_items_owner_idx
  on public.platform_work_items(owner_user_id, status, due_at)
  where owner_user_id is not null;

create table if not exists public.outbox_event_deliveries (
  event_id uuid not null references public.outbox_events(id) on delete cascade,
  target_module text not null check (target_module in ('borrower','advisory','investor','admin')),
  status text not null default 'pending' check (status in ('pending','processing','delivered','failed','dead_letter')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  primary key (event_id, target_module)
);

create index if not exists outbox_event_deliveries_pending_idx
  on public.outbox_event_deliveries(status, next_attempt_at, target_module)
  where status in ('pending','failed');

create table if not exists public.module_projection_versions (
  organization_id uuid references public.organizations(id) on delete cascade,
  application_id text not null references public.applications(id) on delete cascade,
  module text not null check (module in ('borrower','advisory','investor','admin')),
  revision bigint not null default 0 check (revision >= 0),
  last_event_id uuid references public.outbox_events(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (application_id, module)
);

create index if not exists module_projection_versions_module_updated_idx
  on public.module_projection_versions(module, updated_at desc);

create or replace function private.seed_cross_module_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target text;
  resolved_org uuid;
begin
  if new.application_id is not null then
    select a.organization_id
      into resolved_org
      from public.applications a
     where a.id = new.application_id;
  end if;

  foreach target in array new.target_modules loop
    insert into public.outbox_event_deliveries(event_id, target_module)
    values (new.id, target)
    on conflict (event_id, target_module) do nothing;

    if new.application_id is not null then
      insert into public.module_projection_versions(
        organization_id, application_id, module, revision, last_event_id, updated_at
      ) values (
        coalesce(new.organization_id, resolved_org), new.application_id, target, 1, new.id, now()
      )
      on conflict (application_id, module) do update
        set revision = public.module_projection_versions.revision + 1,
            organization_id = coalesce(excluded.organization_id, public.module_projection_versions.organization_id),
            last_event_id = excluded.last_event_id,
            updated_at = now();

      insert into public.application_module_states(
        application_id, module, state, revision, last_event_id, updated_at
      ) values (
        new.application_id, target, 'ready', 1, new.id, now()
      )
      on conflict (application_id, module) do update
        set revision = public.application_module_states.revision + 1,
            last_event_id = excluded.last_event_id,
            updated_at = now();
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.seed_cross_module_event() from public, anon, authenticated;

drop trigger if exists outbox_seed_cross_module_event on public.outbox_events;
create trigger outbox_seed_cross_module_event
after insert on public.outbox_events
for each row execute function private.seed_cross_module_event();

create trigger application_module_states_touch
before update on public.application_module_states
for each row execute function public.touch_updated_at();

create trigger workflow_handoffs_touch
before update on public.workflow_handoffs
for each row execute function public.touch_updated_at();

create trigger platform_work_items_touch
before update on public.platform_work_items
for each row execute function public.touch_updated_at();

alter table public.application_module_states enable row level security;
alter table public.workflow_handoffs enable row level security;
alter table public.platform_work_items enable row level security;
alter table public.outbox_event_deliveries enable row level security;
alter table public.module_projection_versions enable row level security;

-- These are server-owned coordination tables. Browser applications receive authorized,
-- minimized projections from the PiHub API instead of querying internal coordination state directly.
revoke all on table public.application_module_states from anon, authenticated;
revoke all on table public.workflow_handoffs from anon, authenticated;
revoke all on table public.platform_work_items from anon, authenticated;
revoke all on table public.outbox_event_deliveries from anon, authenticated;
revoke all on table public.module_projection_versions from anon, authenticated;

grant select, insert, update, delete on table public.application_module_states to service_role;
grant select, insert, update, delete on table public.workflow_handoffs to service_role;
grant select, insert, update, delete on table public.platform_work_items to service_role;
grant select, insert, update, delete on table public.outbox_event_deliveries to service_role;
grant select, insert, update, delete on table public.module_projection_versions to service_role;
