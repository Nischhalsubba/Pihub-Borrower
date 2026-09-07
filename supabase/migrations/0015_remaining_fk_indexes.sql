-- Cover the remaining foreign keys reported by the Supabase performance advisor.
-- These indexes do not change authorization or application behavior; they keep
-- referential checks and joins from degrading as the platform data set grows.

create index if not exists borrower_workspace_states_updated_by_idx
  on public.borrower_workspace_states (updated_by);

create index if not exists data_connection_authorization_intents_organization_id_idx
  on public.data_connection_authorization_intents (organization_id);

create index if not exists document_upload_intents_organization_id_idx
  on public.document_upload_intents (organization_id);

create index if not exists document_upload_intents_replace_document_id_idx
  on public.document_upload_intents (replace_document_id);

create index if not exists notifications_source_event_id_idx
  on public.notifications (source_event_id);
