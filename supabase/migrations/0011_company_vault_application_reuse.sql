-- Canonical Company Vault document reuse across Borrower applications.
-- A reuse link references one accepted, malware-cleared document/version history.
-- It does not duplicate object storage bytes or create a second document record.

create table if not exists public.application_document_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  application_id text not null references public.applications(id) on delete cascade,
  document_id text not null references public.documents(id) on delete cascade,
  vault_item_id text not null references public.company_vault_items(id) on delete cascade,
  link_type text not null default 'vault_reuse' check (link_type in ('vault_reuse')),
  status text not null default 'active' check (status in ('active','revoked')),
  linked_by uuid references auth.users(id) on delete set null,
  linked_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (application_id, document_id)
);

create index if not exists application_document_links_org_idx on public.application_document_links(organization_id);
create index if not exists application_document_links_document_idx on public.application_document_links(document_id);
create index if not exists application_document_links_vault_idx on public.application_document_links(vault_item_id);
create index if not exists application_document_links_linked_by_idx on public.application_document_links(linked_by);

alter table public.application_document_links enable row level security;
revoke all on table public.application_document_links from public, anon, authenticated;
grant all on table public.application_document_links to service_role;

create or replace function public.pihub_borrower_reuse_vault_item(
  application_key text,
  vault_item_key text,
  caller_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_org uuid;
  vault_record public.company_vault_items%rowtype;
  source_document public.documents%rowtype;
  latest_malware_status text;
  link_id uuid;
  event_id uuid;
begin
  if caller_user_id is null then raise exception 'caller_required' using errcode = '22023'; end if;

  select a.organization_id into target_org
  from public.applications a
  join public.organization_members m on m.organization_id = a.organization_id and m.user_id = caller_user_id and m.status = 'active'
  where a.id = application_key;
  if target_org is null then raise exception 'borrower_application_not_found' using errcode = '42501'; end if;

  select v.* into vault_record
  from public.company_vault_items v
  where v.id = vault_item_key and v.organization_id = target_org and v.reusable = true
    and (v.valid_until is null or v.valid_until >= current_date);
  if vault_record.id is null then raise exception 'vault_item_not_reusable' using errcode = '42501'; end if;

  select d.* into source_document
  from public.documents d
  join public.applications source_app on source_app.id = d.application_id
  where d.id = vault_record.document_id and source_app.organization_id = target_org;
  if source_document.id is null then raise exception 'vault_document_not_found' using errcode = '42501'; end if;
  if source_document.application_id = application_key then
    return jsonb_build_object('documentId', source_document.id, 'applicationId', application_key, 'linked', true, 'alreadyOwned', true);
  end if;
  if source_document.status::text <> 'accepted' then raise exception 'vault_document_not_accepted' using errcode = '42501'; end if;
  if source_document.current_version <= 0 then raise exception 'vault_document_has_no_version' using errcode = '42501'; end if;

  select dv.malware_status into latest_malware_status
  from public.document_versions dv
  where dv.document_id = source_document.id and dv.version = source_document.current_version;
  if latest_malware_status is distinct from 'clean' then raise exception 'vault_document_not_clean' using errcode = '42501'; end if;

  insert into public.application_document_links(organization_id, application_id, document_id, vault_item_id, link_type, status, linked_by)
  values (target_org, application_key, source_document.id, vault_record.id, 'vault_reuse', 'active', caller_user_id)
  on conflict (application_id, document_id) do update
    set status = 'active', vault_item_id = excluded.vault_item_id, linked_by = excluded.linked_by, linked_at = now(), revoked_at = null
  returning id into link_id;

  insert into public.outbox_events(event_key, aggregate_type, aggregate_id, event_type, target_modules, payload, created_by, organization_id, application_id, schema_version)
  values (
    'vault-reuse:' || link_id::text || ':' || gen_random_uuid()::text,
    'document', source_document.id, 'document.vault_reused', array['advisory','admin'],
    jsonb_build_object('documentId', source_document.id, 'vaultItemId', vault_record.id, 'targetApplicationId', application_key),
    caller_user_id, target_org, application_key, 1
  ) returning id into event_id;

  return jsonb_build_object('linkId', link_id, 'documentId', source_document.id, 'applicationId', application_key, 'linked', true, 'alreadyOwned', false, 'eventId', event_id);
end;
$$;
revoke all on function public.pihub_borrower_reuse_vault_item(text,text,uuid) from public, anon, authenticated;
grant execute on function public.pihub_borrower_reuse_vault_item(text,text,uuid) to service_role;

create or replace function public.pihub_borrower_integration_projection(application_key text, caller_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  app_record public.applications%rowtype;
  compliance_state text;
  compliance_open_count integer;
  projection_revision bigint;
  result jsonb;
begin
  if caller_user_id is null then raise exception 'caller_required' using errcode = '22023'; end if;

  select a.* into app_record
  from public.applications a
  join public.organization_members m on m.organization_id = a.organization_id and m.user_id = caller_user_id and m.status = 'active'
  where application_key is null or a.id = application_key
  order by case when application_key is not null and a.id = application_key then 0 else 1 end, a.updated_at desc
  limit 1;
  if app_record.id is null then raise exception 'borrower_application_not_found' using errcode = '42501'; end if;

  select coalesce(max(v.revision), 0) into projection_revision
  from public.module_projection_versions v where v.application_id = app_record.id;

  select case
      when bool_or(c.status = 'blocked') then 'blocked'
      when bool_or(c.status = 'action_required') then 'action_required'
      when bool_or(c.status in ('open','in_review')) then 'under_review'
      when count(*) > 0 and bool_and(c.status in ('cleared','closed')) then 'cleared'
      else 'not_started'
    end,
    count(*) filter (where c.status not in ('cleared','closed'))::int
  into compliance_state, compliance_open_count
  from public.compliance_cases c
  where c.organization_id = app_record.organization_id and (c.application_id is null or c.application_id = app_record.id);

  compliance_state := coalesce(compliance_state, 'not_started');
  compliance_open_count := coalesce(compliance_open_count, 0);

  select jsonb_build_object(
    'applicationId', app_record.id,
    'projectionRevision', projection_revision,
    'moduleStates', coalesce((select jsonb_agg(jsonb_build_object('module',s.module,'state',s.state,'revision',s.revision,'updatedAt',s.updated_at) order by case s.module when 'borrower' then 1 when 'advisory' then 2 when 'admin' then 3 when 'investor' then 4 else 5 end) from public.application_module_states s where s.application_id=app_record.id), '[]'::jsonb),
    'borrowerHandoffs', coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'fromModule',h.from_module,'toModule',h.to_module,'type',h.handoff_type,'status',h.status,'createdAt',h.created_at,'updatedAt',h.updated_at) order by h.created_at desc) from public.workflow_handoffs h where h.application_id=app_record.id and (h.from_module='borrower' or h.to_module='borrower')), '[]'::jsonb),
    'workItems', coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'sourceModule',w.source_module,'kind',w.kind,'title',w.title,'description',w.description,'status',w.status,'priority',w.priority,'dueAt',w.due_at,'actionHref',case when w.action_href like '/%' then w.action_href else '/requests' end,'borrowerCompletable',coalesce((w.payload->>'borrowerCompletable')::boolean,false),'createdAt',w.created_at,'updatedAt',w.updated_at) order by case w.priority when 'critical' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,w.due_at nulls last,w.created_at desc) from public.platform_work_items w where w.organization_id=app_record.organization_id and (w.application_id is null or w.application_id=app_record.id) and w.target_module='borrower' and w.status<>'cancelled'), '[]'::jsonb),
    'compliance', jsonb_build_object('state',compliance_state,'openCount',compliance_open_count),
    'approvals', coalesce((select jsonb_agg(jsonb_build_object('type',a.approval_type,'status',a.status,'decidedAt',a.decided_at,'updatedAt',a.updated_at) order by case a.approval_type when 'finance' then 1 when 'legal' then 2 when 'signatory' then 3 when 'submission' then 4 else 5 end) from public.application_approvals a where a.application_id=app_record.id), '[]'::jsonb),
    'submissionReady', not exists (select 1 from (values ('finance'),('legal'),('signatory')) required_gate(gate) where not exists (select 1 from public.application_approvals a where a.application_id=app_record.id and a.approval_type=required_gate.gate and a.status='approved')),
    'vaultItems', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',v.id,'documentId',v.document_id,'label',v.label,'category',v.category,'validUntil',v.valid_until,'reusable',v.reusable,
        'linkedToApplication',(d.application_id=app_record.id or exists(select 1 from public.application_document_links l where l.application_id=app_record.id and l.document_id=v.document_id and l.status='active'))
      ) order by v.created_at desc)
      from public.company_vault_items v
      join public.documents d on d.id=v.document_id
      join public.applications source_app on source_app.id=d.application_id
      where v.organization_id=app_record.organization_id and source_app.organization_id=app_record.organization_id and v.reusable=true and (v.valid_until is null or v.valid_until>=current_date)
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.pihub_borrower_integration_projection(text,uuid) from public, anon, authenticated;
grant execute on function public.pihub_borrower_integration_projection(text,uuid) to service_role;
