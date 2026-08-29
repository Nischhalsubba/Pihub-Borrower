-- Cover the remaining module-domain foreign-key path reported by the Supabase performance advisor.

create index organization_capabilities_verified_by_idx
  on public.organization_capabilities(verified_by)
  where verified_by is not null;
