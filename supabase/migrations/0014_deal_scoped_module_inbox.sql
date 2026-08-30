-- Deal-scoped module event delivery. Advisory/Investor roles are capabilities,
-- not permission to read every financing transaction on the platform.
create or replace function private.can_consume_module_event(caller_user_id uuid,requested_module text,event_uuid uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
   select 1 from public.outbox_events e join public.outbox_event_deliveries d on d.event_id=e.id and d.target_module=requested_module
   where e.id=event_uuid and(
     (requested_module='borrower' and exists(select 1 from public.organization_members m where m.organization_id=e.organization_id and m.user_id=caller_user_id and m.status='active'))
     or(requested_module='admin' and exists(select 1 from public.platform_roles r where r.user_id=caller_user_id and r.role in('admin','compliance','operations')))
     or(requested_module in('advisory','investor') and e.application_id is not null and(
       exists(select 1 from public.application_access_grants g where g.application_id=e.application_id and g.user_id=caller_user_id and g.module=requested_module)
       or exists(select 1 from public.application_organization_access_grants g join public.organization_members m on m.organization_id=g.organization_id where g.application_id=e.application_id and g.module=requested_module and m.user_id=caller_user_id and m.status='active' and g.revoked_at is null and(g.expires_at is null or g.expires_at>now()))
     ))
   )
 )
$$;
revoke all on function private.can_consume_module_event(uuid,text,uuid) from public,anon,authenticated;grant execute on function private.can_consume_module_event(uuid,text,uuid) to service_role;

create or replace function public.pihub_module_inbox(caller_user_id uuid,requested_module text,after_time timestamptz default null,result_limit int default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare capable boolean:=false;
begin
 if requested_module not in('advisory','investor','admin','borrower') then raise exception 'invalid_module' using errcode='22023';end if;
 if requested_module='borrower' then capable:=exists(select 1 from public.organization_members m where m.user_id=caller_user_id and m.status='active');
 elsif requested_module='admin' then capable:=exists(select 1 from public.platform_roles r where r.user_id=caller_user_id and r.role in('admin','compliance','operations'));
 else capable:=exists(select 1 from public.platform_roles r where r.user_id=caller_user_id and r.role=requested_module)or exists(select 1 from public.application_access_grants g where g.user_id=caller_user_id and g.module=requested_module)or exists(select 1 from public.application_organization_access_grants g join public.organization_members m on m.organization_id=g.organization_id where g.module=requested_module and m.user_id=caller_user_id and m.status='active' and g.revoked_at is null and(g.expires_at is null or g.expires_at>now()));end if;
 if not capable then raise exception 'module_access_forbidden' using errcode='42501';end if;
 return jsonb_build_object('module',requested_module,'events',coalesce((select jsonb_agg(jsonb_build_object('eventId',e.id,'eventType',e.event_type,'aggregateType',e.aggregate_type,'aggregateId',e.aggregate_id,'applicationId',e.application_id,'organizationId',e.organization_id,'payload',e.payload,'createdAt',e.created_at,'deliveryStatus',d.status) order by e.created_at) from(select d.* from public.outbox_event_deliveries d where d.target_module=requested_module and(after_time is null or coalesce(d.delivered_at,d.last_attempt_at,d.next_attempt_at)>after_time)and private.can_consume_module_event(caller_user_id,requested_module,d.event_id) order by d.next_attempt_at limit least(greatest(result_limit,1),100))d join public.outbox_events e on e.id=d.event_id),'[]'::jsonb));
end $$;
revoke all on function public.pihub_module_inbox(uuid,text,timestamptz,int) from public,anon,authenticated;grant execute on function public.pihub_module_inbox(uuid,text,timestamptz,int) to service_role;

create or replace function public.pihub_ack_module_event(caller_user_id uuid,requested_module text,event_uuid uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.can_consume_module_event(caller_user_id,requested_module,event_uuid) then raise exception 'module_event_forbidden' using errcode='42501';end if;
 update public.outbox_event_deliveries set status='delivered',attempts=attempts+1,last_attempt_at=now(),delivered_at=now(),last_error=null where event_id=event_uuid and target_module=requested_module;
 if not found then raise exception 'module_event_not_found' using errcode='22023';end if;
 return jsonb_build_object('eventId',event_uuid,'module',requested_module,'status','delivered');
end $$;
revoke all on function public.pihub_ack_module_event(uuid,text,uuid) from public,anon,authenticated;grant execute on function public.pihub_ack_module_event(uuid,text,uuid) to service_role;
