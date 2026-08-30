-- PiHub Borrower consumer foundation.
--
-- This migration records the final hardened state of the live Supabase changes
-- applied on 2026-08-30. Browser roles do not receive table access or privileged
-- RPC execution. The authenticated Edge API verifies the caller and invokes these
-- service-role-only functions with the verified user id.

create table if not exists public.application_approvals (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references public.applications(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  approval_type text not null check (approval_type in ('finance','legal','signatory','submission')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','revoked')),
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  note text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (application_id, approval_type)
);

create index if not exists application_approvals_org_idx on public.application_approvals(organization_id);
create index if not exists application_approvals_requested_by_idx on public.application_approvals(requested_by);
create index if not exists application_approvals_decided_by_idx on public.application_approvals(decided_by);

alter table public.application_approvals enable row level security;
revoke all on table public.application_approvals from public, anon, authenticated;
grant all on table public.application_approvals to service_role;

drop function if exists public.pihub_session_context();
drop function if exists public.pihub_borrower_integration_projection(text);
drop function if exists public.pihub_borrower_complete_work_item(uuid);
drop function if exists public.pihub_borrower_set_approval(text,text,text,text);

create or replace function public.pihub_session_context(caller_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if caller_user_id is null then
    raise exception 'caller_required' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'userId', caller_user_id,
    'displayName', coalesce(p.display_name, ''),
    'preferredLocale', coalesce(p.preferred_locale, 'en'),
    'modules', (
      select coalesce(jsonb_agg(module_name order by module_name), '[]'::jsonb)
      from (
        select distinct module_name
        from (
          select 'borrower'::text as module_name
          where exists (
            select 1 from public.organization_members m
            where m.user_id = caller_user_id and m.status = 'active'
          )
          union all
          select 'advisory'::text
          where exists (
            select 1 from public.platform_roles r
            where r.user_id = caller_user_id and r.role = 'advisory'
          ) or exists (
            select 1 from public.application_access_grants g
            where g.user_id = caller_user_id and g.module = 'advisory'
          ) or exists (
            select 1
            from public.application_organization_access_grants g
            join public.organization_members m on m.organization_id = g.organization_id
            where m.user_id = caller_user_id and m.status = 'active'
              and g.module = 'advisory' and g.revoked_at is null
              and (g.expires_at is null or g.expires_at > now())
          )
          union all
          select 'investor'::text
          where exists (
            select 1 from public.platform_roles r
            where r.user_id = caller_user_id and r.role = 'investor'
          ) or exists (
            select 1 from public.application_access_grants g
            where g.user_id = caller_user_id and g.module = 'investor'
          ) or exists (
            select 1
            from public.application_organization_access_grants g
            join public.organization_members m on m.organization_id = g.organization_id
            where m.user_id = caller_user_id and m.status = 'active'
              and g.module = 'investor' and g.revoked_at is null
              and (g.expires_at is null or g.expires_at > now())
          )
          union all
          select 'admin'::text
          where exists (
            select 1 from public.platform_roles r
            where r.user_id = caller_user_id and r.role in ('admin','compliance','operations')
          )
        ) modules
      ) distinct_modules
    )
  ) into result
  from (select 1) seed
  left join public.profiles p on p.user_id = caller_user_id;

  return result;
end;
$$;
revoke all on function public.pihub_session_context(uuid) from public, anon, authenticated;
grant execute on function public.pihub_session_context(uuid) to service_role;

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
  if caller_user_id is null then
    raise exception 'caller_required' using errcode = '22023';
  end if;

  select a.* into app_record
  from public.applications a
  join public.organization_members m
    on m.organization_id = a.organization_id
   and m.user_id = caller_user_id
   and m.status = 'active'
  where application_key is null or a.id = application_key
  order by case when application_key is not null and a.id = application_key then 0 else 1 end,
           a.updated_at desc
  limit 1;

  if app_record.id is null then
    raise exception 'borrower_application_not_found' using errcode = '42501';
  end if;

  select coalesce(max(v.revision), 0)
  into projection_revision
  from public.module_projection_versions v
  where v.application_id = app_record.id;

  select
    case
      when bool_or(c.status = 'blocked') then 'blocked'
      when bool_or(c.status = 'action_required') then 'action_required'
      when bool_or(c.status in ('open','in_review')) then 'under_review'
      when count(*) > 0 and bool_and(c.status in ('cleared','closed')) then 'cleared'
      else 'not_started'
    end,
    count(*) filter (where c.status not in ('cleared','closed'))::int
  into compliance_state, compliance_open_count
  from public.compliance_cases c
  where c.organization_id = app_record.organization_id
    and (c.application_id is null or c.application_id = app_record.id);

  compliance_state := coalesce(compliance_state, 'not_started');
  compliance_open_count := coalesce(compliance_open_count, 0);

  select jsonb_build_object(
    'applicationId', app_record.id,
    'projectionRevision', projection_revision,
    'moduleStates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'module', s.module,
        'state', s.state,
        'revision', s.revision,
        'updatedAt', s.updated_at
      ) order by case s.module when 'borrower' then 1 when 'advisory' then 2 when 'admin' then 3 when 'investor' then 4 else 5 end)
      from public.application_module_states s
      where s.application_id = app_record.id
    ), '[]'::jsonb),
    'borrowerHandoffs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id,
        'fromModule', h.from_module,
        'toModule', h.to_module,
        'type', h.handoff_type,
        'status', h.status,
        'createdAt', h.created_at,
        'updatedAt', h.updated_at
      ) order by h.created_at desc)
      from public.workflow_handoffs h
      where h.application_id = app_record.id
        and (h.from_module = 'borrower' or h.to_module = 'borrower')
    ), '[]'::jsonb),
    'workItems', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', w.id,
        'sourceModule', w.source_module,
        'kind', w.kind,
        'title', w.title,
        'description', w.description,
        'status', w.status,
        'priority', w.priority,
        'dueAt', w.due_at,
        'actionHref', case when w.action_href like '/%' then w.action_href else '/requests' end,
        'borrowerCompletable', coalesce((w.payload->>'borrowerCompletable')::boolean, false),
        'createdAt', w.created_at,
        'updatedAt', w.updated_at
      ) order by
        case w.priority when 'critical' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,
        w.due_at nulls last,
        w.created_at desc)
      from public.platform_work_items w
      where w.organization_id = app_record.organization_id
        and (w.application_id is null or w.application_id = app_record.id)
        and w.target_module = 'borrower'
        and w.status <> 'cancelled'
    ), '[]'::jsonb),
    'compliance', jsonb_build_object('state', compliance_state, 'openCount', compliance_open_count),
    'approvals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'type', a.approval_type,
        'status', a.status,
        'decidedAt', a.decided_at,
        'updatedAt', a.updated_at
      ) order by case a.approval_type when 'finance' then 1 when 'legal' then 2 when 'signatory' then 3 when 'submission' then 4 else 5 end)
      from public.application_approvals a
      where a.application_id = app_record.id
    ), '[]'::jsonb),
    'submissionReady', not exists (
      select 1
      from (values ('finance'),('legal'),('signatory')) required_gate(gate)
      where not exists (
        select 1 from public.application_approvals a
        where a.application_id = app_record.id
          and a.approval_type = required_gate.gate
          and a.status = 'approved'
      )
    ),
    'vaultItems', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id,
        'documentId', v.document_id,
        'label', v.label,
        'category', v.category,
        'validUntil', v.valid_until,
        'reusable', v.reusable
      ) order by v.created_at desc)
      from public.company_vault_items v
      where v.organization_id = app_record.organization_id and v.reusable = true
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;
revoke all on function public.pihub_borrower_integration_projection(text,uuid) from public, anon, authenticated;
grant execute on function public.pihub_borrower_integration_projection(text,uuid) to service_role;

create or replace function public.pihub_borrower_complete_work_item(work_item_key uuid, caller_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.platform_work_items%rowtype;
  event_id uuid;
begin
  if caller_user_id is null then
    raise exception 'caller_required' using errcode = '22023';
  end if;

  select w.* into item
  from public.platform_work_items w
  join public.organization_members m
    on m.organization_id = w.organization_id
   and m.user_id = caller_user_id
   and m.status = 'active'
  where w.id = work_item_key
    and w.target_module = 'borrower'
  for update;

  if item.id is null then
    raise exception 'borrower_work_item_not_found' using errcode = '42501';
  end if;
  if not coalesce((item.payload->>'borrowerCompletable')::boolean, false) then
    raise exception 'work_item_requires_pihub_validation' using errcode = '42501';
  end if;

  if item.status not in ('done','cancelled') then
    update public.platform_work_items
    set status = 'done', resolved_at = now(), updated_at = now(), owner_user_id = coalesce(owner_user_id, caller_user_id)
    where id = item.id;

    insert into public.outbox_events(
      event_key, aggregate_type, aggregate_id, event_type, target_modules, payload,
      created_by, organization_id, application_id, schema_version
    ) values (
      'work-item:' || item.id::text || ':done:' || gen_random_uuid()::text,
      coalesce(item.related_aggregate_type, 'work_item'),
      coalesce(item.related_aggregate_id, item.id::text),
      'platform.work_item.completed',
      array[item.source_module],
      jsonb_build_object('workItemId', item.id, 'sourceModule', item.source_module, 'targetModule', 'borrower'),
      caller_user_id, item.organization_id, item.application_id, 1
    ) returning id into event_id;
  end if;

  return jsonb_build_object('id', item.id, 'status', 'done', 'eventId', event_id);
end;
$$;
revoke all on function public.pihub_borrower_complete_work_item(uuid,uuid) from public, anon, authenticated;
grant execute on function public.pihub_borrower_complete_work_item(uuid,uuid) to service_role;

create or replace function public.pihub_borrower_set_approval(
  application_key text,
  approval_gate text,
  decision text,
  decision_note text,
  caller_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  app_org uuid;
  caller_role text;
  approval_id uuid;
  event_id uuid;
begin
  if caller_user_id is null then
    raise exception 'caller_required' using errcode = '22023';
  end if;
  if approval_gate not in ('finance','legal','signatory','submission') then
    raise exception 'invalid_approval_gate' using errcode = '22023';
  end if;
  if decision not in ('approved','rejected','revoked') then
    raise exception 'invalid_approval_decision' using errcode = '22023';
  end if;

  select a.organization_id, m.role::text
  into app_org, caller_role
  from public.applications a
  join public.organization_members m
    on m.organization_id = a.organization_id
   and m.user_id = caller_user_id
   and m.status = 'active'
  where a.id = application_key;

  if app_org is null then
    raise exception 'borrower_application_not_found' using errcode = '42501';
  end if;

  if approval_gate = 'finance' and caller_role not in ('owner','finance') then
    raise exception 'finance_approval_forbidden' using errcode = '42501';
  elsif approval_gate = 'legal' and caller_role not in ('owner','legal') then
    raise exception 'legal_approval_forbidden' using errcode = '42501';
  elsif approval_gate in ('signatory','submission') and caller_role not in ('owner','signatory') then
    raise exception 'signatory_approval_forbidden' using errcode = '42501';
  end if;

  insert into public.application_approvals(
    application_id, organization_id, approval_type, status, requested_by, decided_by,
    note, requested_at, decided_at, updated_at
  ) values (
    application_key, app_org, approval_gate, decision, caller_user_id, caller_user_id,
    nullif(trim(decision_note), ''), now(), now(), now()
  )
  on conflict (application_id, approval_type) do update
  set status = excluded.status,
      decided_by = excluded.decided_by,
      note = excluded.note,
      decided_at = excluded.decided_at,
      updated_at = excluded.updated_at
  returning id into approval_id;

  insert into public.outbox_events(
    event_key, aggregate_type, aggregate_id, event_type, target_modules, payload,
    created_by, organization_id, application_id, schema_version
  ) values (
    'approval:' || approval_id::text || ':' || decision || ':' || gen_random_uuid()::text,
    'application', application_key, 'application.approval.updated',
    array['advisory','admin'],
    jsonb_build_object('approvalType', approval_gate, 'status', decision),
    caller_user_id, app_org, application_key, 1
  ) returning id into event_id;

  return jsonb_build_object('id', approval_id, 'type', approval_gate, 'status', decision, 'eventId', event_id);
end;
$$;
revoke all on function public.pihub_borrower_set_approval(text,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.pihub_borrower_set_approval(text,text,text,text,uuid) to service_role;

create or replace function private.notify_borrower_work_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.target_module = 'borrower' and new.status in ('open','blocked') then
    insert into public.notifications(user_id, kind, title, body, href, created_at)
    select m.user_id,
           'request',
           new.title,
           new.description,
           case when new.action_href like '/%' then new.action_href else '/requests' end,
           now()
    from public.organization_members m
    where m.organization_id = new.organization_id
      and m.status = 'active';
  end if;
  return new;
end;
$$;
revoke all on function private.notify_borrower_work_item() from public, anon, authenticated;

drop trigger if exists platform_work_items_borrower_notification on public.platform_work_items;
create trigger platform_work_items_borrower_notification
after insert on public.platform_work_items
for each row execute function private.notify_borrower_work_item();
