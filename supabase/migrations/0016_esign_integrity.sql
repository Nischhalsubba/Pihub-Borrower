-- E-sign integrity: immutable provider events, replay protection, source hashes,
-- and server-owned envelope/signer state transitions.

alter table public.signature_envelopes
  add column if not exists source_document_hashes jsonb not null default '{}'::jsonb,
  add column if not exists completed_at timestamptz,
  add column if not exists provider_expires_at timestamptz,
  add column if not exists last_provider_event_at timestamptz;

alter table public.signature_envelopes
  drop constraint if exists signature_envelopes_status_check;
alter table public.signature_envelopes
  add constraint signature_envelopes_status_check
  check (status in ('draft','sent','partially_signed','completed','voided','expired'));

create unique index if not exists signature_envelopes_provider_external_idx
  on public.signature_envelopes(provider, external_envelope_id)
  where external_envelope_id is not null;

create table if not exists public.signature_events (
  id uuid primary key default gen_random_uuid(),
  envelope_id text not null references public.signature_envelopes(id) on delete restrict,
  provider text not null check (provider in ('documenso','opensign','other')),
  provider_event_id text not null unique,
  event_type text not null,
  provider_created_at timestamptz not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  applied_status text not null check (applied_status in ('draft','sent','partially_signed','completed','voided','expired')),
  received_at timestamptz not null default now()
);

create index if not exists signature_events_envelope_time_idx
  on public.signature_events(envelope_id, provider_created_at desc);

alter table public.signature_events enable row level security;
revoke all on table public.signature_events from public, anon, authenticated;
grant all on table public.signature_events to service_role;

create or replace function private.capture_signature_source_hashes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_count integer;
  hashed_count integer;
  hashes jsonb;
begin
  expected_count := coalesce(cardinality(new.document_ids), 0);
  if expected_count = 0 then
    raise exception 'signature_documents_required' using errcode = '22023';
  end if;

  select count(*)::integer,
         coalesce(jsonb_object_agg(d.id, lower(v.sha256)), '{}'::jsonb)
    into hashed_count, hashes
  from unnest(new.document_ids) as requested(document_id)
  join public.documents d on d.id = requested.document_id
  join public.document_versions v
    on v.document_id = d.id
   and v.version = d.current_version
  where v.malware_status = 'clean'
    and v.sha256 is not null
    and v.sha256 ~ '^[0-9A-Fa-f]{64}$';

  if hashed_count <> expected_count then
    raise exception 'signature_document_hash_missing_or_unverified' using errcode = '22023';
  end if;

  new.source_document_hashes := hashes;
  return new;
end;
$$;

revoke all on function private.capture_signature_source_hashes() from public, anon, authenticated;

drop trigger if exists signature_envelopes_capture_hashes on public.signature_envelopes;
create trigger signature_envelopes_capture_hashes
before insert or update of document_ids on public.signature_envelopes
for each row execute function private.capture_signature_source_hashes();

create or replace function private.prevent_signature_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'signature_events_are_immutable';
end;
$$;

revoke all on function private.prevent_signature_event_mutation() from public, anon, authenticated;

drop trigger if exists signature_events_immutable on public.signature_events;
create trigger signature_events_immutable
before update or delete on public.signature_events
for each row execute function private.prevent_signature_event_mutation();

create or replace function public.pihub_apply_signature_webhook(
  provider_event_key text,
  external_envelope_key text,
  provider_event_name text,
  provider_event_created_at timestamptz,
  provider_payload_sha256 text,
  provider_recipients jsonb default '[]'::jsonb,
  provider_completed_at timestamptz default null,
  provider_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.signature_envelopes%rowtype;
  inserted_event_id uuid;
  recipient jsonb;
  next_status text;
begin
  if nullif(trim(provider_event_key), '') is null
     or nullif(trim(external_envelope_key), '') is null
     or nullif(trim(provider_event_name), '') is null
     or provider_event_created_at is null
     or provider_payload_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_signature_webhook' using errcode = '22023';
  end if;

  if provider_event_name not in (
    'DOCUMENT_CREATED',
    'DOCUMENT_SENT',
    'DOCUMENT_OPENED',
    'DOCUMENT_SIGNED',
    'DOCUMENT_RECIPIENT_COMPLETED',
    'DOCUMENT_COMPLETED',
    'DOCUMENT_REJECTED',
    'DOCUMENT_CANCELLED',
    'RECIPIENT_EXPIRED',
    'DOCUMENT_REMINDER_SENT'
  ) then
    raise exception 'unsupported_signature_event' using errcode = '22023';
  end if;

  select * into target
  from public.signature_envelopes e
  where e.provider = 'documenso'
    and e.external_envelope_id = external_envelope_key
  for update;

  if target.id is null then
    raise exception 'signature_envelope_not_found' using errcode = '22023';
  end if;

  insert into public.signature_events(
    envelope_id,
    provider,
    provider_event_id,
    event_type,
    provider_created_at,
    payload_sha256,
    applied_status
  ) values (
    target.id,
    'documenso',
    provider_event_key,
    provider_event_name,
    provider_event_created_at,
    provider_payload_sha256,
    target.status
  )
  on conflict (provider_event_id) do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then
    return jsonb_build_object(
      'accepted', true,
      'duplicate', true,
      'envelopeId', target.id,
      'status', target.status
    );
  end if;

  if provider_recipients is not null and jsonb_typeof(provider_recipients) = 'array' then
    for recipient in select value from jsonb_array_elements(provider_recipients)
    loop
      if nullif(lower(trim(recipient->>'email')), '') is null then
        continue;
      end if;

      update public.signature_signers
      set status = case
        when recipient->>'signingStatus' = 'SIGNED' then 'signed'
        when recipient->>'signingStatus' = 'REJECTED' and status <> 'signed' then 'declined'
        when recipient->>'readStatus' = 'OPENED' and status in ('pending','sent') then 'viewed'
        when recipient->>'sendStatus' = 'SENT' and status = 'pending' then 'sent'
        else status
      end
      where envelope_id = target.id
        and lower(email) = lower(trim(recipient->>'email'));
    end loop;
  end if;

  next_status := target.status;
  if target.status not in ('completed','voided','expired') then
    next_status := case provider_event_name
      when 'DOCUMENT_SENT' then 'sent'
      when 'DOCUMENT_COMPLETED' then 'completed'
      when 'DOCUMENT_REJECTED' then 'voided'
      when 'DOCUMENT_CANCELLED' then 'voided'
      when 'RECIPIENT_EXPIRED' then 'expired'
      when 'DOCUMENT_SIGNED' then
        case when exists (
          select 1 from public.signature_signers s
          where s.envelope_id = target.id and s.status <> 'signed'
        ) then 'partially_signed' else 'completed' end
      when 'DOCUMENT_RECIPIENT_COMPLETED' then
        case when exists (
          select 1 from public.signature_signers s
          where s.envelope_id = target.id and s.status <> 'signed'
        ) then 'partially_signed' else 'completed' end
      else target.status
    end;
  end if;

  update public.signature_envelopes
  set status = next_status,
      completed_at = case
        when next_status = 'completed' then coalesce(provider_completed_at, completed_at, provider_event_created_at)
        else completed_at
      end,
      provider_expires_at = coalesce(provider_expires_at, signature_envelopes.provider_expires_at),
      last_provider_event_at = greatest(
        coalesce(signature_envelopes.last_provider_event_at, provider_event_created_at),
        provider_event_created_at
      )
  where id = target.id;

  -- Immutable rows cannot be updated after insertion, so the event records the
  -- status that existed when it was accepted. The current authoritative status
  -- is returned separately and remains queryable from signature_envelopes.
  return jsonb_build_object(
    'accepted', true,
    'duplicate', false,
    'envelopeId', target.id,
    'status', next_status
  );
end;
$$;

revoke all on function public.pihub_apply_signature_webhook(text,text,text,timestamptz,text,jsonb,timestamptz,timestamptz)
  from public, anon, authenticated;
grant execute on function public.pihub_apply_signature_webhook(text,text,text,timestamptz,text,jsonb,timestamptz,timestamptz)
  to service_role;
