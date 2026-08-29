-- PiHub Supabase security hardening applied to the managed Frankfurt backend.
-- Keeps authorization helpers out of the exposed public Data API schema while
-- preserving their use inside RLS policies, and avoids per-row auth.uid() work.

create schema if not exists private;

alter function public.is_org_member(uuid) set schema private;
alter function public.has_platform_role(text[]) set schema private;
alter function public.application_org(text) set schema private;
alter function public.facility_org(text) set schema private;
alter function public.has_application_access(text, text[]) set schema private;
alter function public.can_read_application(text) set schema private;

alter function public.touch_updated_at() set search_path = public, pg_temp;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_platform_role(text[]) to authenticated;
grant execute on function private.application_org(text) to authenticated;
grant execute on function private.facility_org(text) to authenticated;
grant execute on function private.has_application_access(text, text[]) to authenticated;
grant execute on function private.can_read_application(text) to authenticated;

alter policy profile_self on public.profiles
  using (user_id = (select auth.uid()));

alter policy profile_update_self on public.profiles
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy roles_self on public.platform_roles
  using (user_id = (select auth.uid()));

alter policy access_grants_self on public.application_access_grants
  using (user_id = (select auth.uid()) or private.has_platform_role(array['admin','compliance','operations']));

alter policy privacy_self on public.privacy_requests
  using (user_id = (select auth.uid()) or private.has_platform_role(array['admin','compliance']));

alter policy notification_self on public.notifications
  using (user_id = (select auth.uid()));

alter policy support_read on public.support_tickets
  using (user_id = (select auth.uid()) or private.has_platform_role(array['admin','operations']));

alter policy idempotency_self on public.idempotency_keys
  using (user_id = (select auth.uid()));

alter policy portfolio_view_self on public.saved_portfolio_views
  using (user_id = (select auth.uid()));

-- outbox_events intentionally has RLS enabled with no browser policy.
-- It is an internal delivery queue and must remain inaccessible to ordinary clients.
