# Borrower BFF trust boundary

PiHub Borrower uses Vercel OIDC to prove that privileged platform mutations came through the trusted server-side BFF rather than directly from browser code.

## Default production rule

`PIHUB_TRUSTED_VERCEL_ENVIRONMENTS` is optional. When it is absent, the Supabase `platform-api` trusts only Vercel OIDC tokens whose `environment` claim is `production`.

The verification boundary also requires the configured Vercel issuer/audience, team owner, and project claims to match.

## Non-production environments

Preview or other non-production Vercel environments must not be added to the trusted environment list when they target production PiHub data.

If a staging deployment genuinely needs privileged writes:

1. use an isolated staging Supabase project/data set;
2. explicitly configure `PIHUB_TRUSTED_VERCEL_ENVIRONMENTS` in that staging Edge Function environment;
3. keep the production Edge Function on the production-only default;
4. do not share production service-role credentials, internal job keys, or financial records with preview deployments.

Example staging-only value:

`PIHUB_TRUSTED_VERCEL_ENVIRONMENTS=preview`

Do not set that value on the production data plane.

## Regression rule

The repository test `tests/bff-trust-boundary.test.mjs` protects the default production-only behavior and verifies that issuer, audience, team, and project binding remain part of the OIDC trust decision.

Changing this trust boundary requires a dedicated security review and must not carry a `[deploy]` marker by itself.
