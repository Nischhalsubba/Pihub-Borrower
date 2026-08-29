-- Cover foreign-key paths used by cross-module coordination and cleanup.
-- These indexes are intentionally created before production data volume grows.

create index if not exists application_module_states_last_event_idx
  on public.application_module_states(last_event_id)
  where last_event_id is not null;

create index if not exists module_projection_versions_last_event_idx
  on public.module_projection_versions(last_event_id)
  where last_event_id is not null;

create index if not exists module_projection_versions_org_idx
  on public.module_projection_versions(organization_id)
  where organization_id is not null;

create index if not exists platform_work_items_created_by_idx
  on public.platform_work_items(created_by)
  where created_by is not null;

create index if not exists platform_work_items_facility_idx
  on public.platform_work_items(facility_id)
  where facility_id is not null;

create index if not exists platform_work_items_org_idx
  on public.platform_work_items(organization_id);

create index if not exists workflow_handoffs_accepted_by_idx
  on public.workflow_handoffs(accepted_by)
  where accepted_by is not null;

create index if not exists workflow_handoffs_created_by_idx
  on public.workflow_handoffs(created_by)
  where created_by is not null;

create index if not exists workflow_handoffs_org_idx
  on public.workflow_handoffs(organization_id);

create index if not exists workflow_handoffs_source_event_idx
  on public.workflow_handoffs(source_event_id)
  where source_event_id is not null;
