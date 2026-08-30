# PiHub Borrower Validation Record

Updated: 2026-08-30

## Last production-verified baseline

Borrower `main` was verified at `e1856eaef8a42487639581287164cd5708efa375` (PR #12).

- GitHub Actions run `33260396285`: **PASS**
- dependency installation: **PASS**
- TypeScript/unit/static checks: **PASS**
- production Vite build: **PASS**
- Chromium: **PASS**
- Firefox: **PASS**
- WebKit: **PASS**
- mobile workflow coverage: **PASS**
- Axe serious/critical accessibility gate: **PASS**
- Vercel exact-commit deployment: **PASS**

## 2026-08-30 shared-platform consumer verification

The managed PiHub Platform Supabase project was extended and verified before the frontend integration branch was opened.

### Database changes applied
- `application_approvals` for finance/legal/signatory/submission gates.
- service-role-only session/module context projection.
- service-role-only Borrower integration projection.
- service-role-only work-item completion RPC.
- service-role-only approval RPC.
- event-driven Borrower notifications for new Borrower-targeted work items.
- explicit `borrowerCompletable` policy so evidence/review tasks cannot be self-completed.

### Direct live-database verification
A synthetic transaction created a temporary auth user, organization membership, application, per-module states, compliance case and Borrower work item, then rolled the entire test data set back.

Verified outcomes:
- session context returned only the caller's authorized module set;
- Borrower projection returned module states, safe work items, safe compliance readiness, approvals and projection revision;
- internal compliance summary/evidence and module-private summary payloads did **not** appear in the projection;
- a Borrower-targeted work item generated an event-driven notification;
- role-authorized approval generated a canonical outbox event;
- borrower-completable work-item completion generated a return event to the source module;
- non-completable work items are rejected by the server policy;
- temporary test data was rolled back.

### Supabase advisors
- Security advisor: no actionable WARN/ERROR findings from this work. Remaining RLS-with-no-policy entries are intentional INFO notices for server-owned tables whose browser privileges are revoked.
- Performance advisor: no new unindexed-foreign-key finding from this work. Unused-index entries are informational on the currently empty production data set.

### Edge API
`platform-api` is deployed as an ACTIVE Supabase Edge Function with `verify_jwt=true`.

The function:
1. requires a caller JWT;
2. re-verifies the caller with Supabase Auth;
3. uses the verified user ID when invoking service-role-only privileged RPCs;
4. fails CORS closed unless the browser origin is explicitly configured;
5. never returns service-role credentials or raw coordination/compliance tables;
6. exposes only session context, safe Borrower integration projection, authorized approval updates and explicitly borrower-completable work-item completion.

## Current integration branch release gate

The `feat/platform-consumer-foundation` branch adds:
- shared PiHub financing timeline on Overview;
- unified PiHub Request Center;
- borrower-safe compliance readiness;
- finance/legal/signatory approval gates on Financing request;
- Company Vault consumption of the shared platform projection;
- typed client contract for the integration projection and mutations;
- source-controlled Supabase migration and `platform-api` function.

Before this branch can merge, the normal mandatory release gate remains unchanged:
1. deterministic `npm ci`;
2. TypeScript + unit/static tests;
3. production build;
4. Chromium/Firefox/WebKit + mobile workflows;
5. Axe accessibility sweep;
6. exact-head Vercel status;
7. merge only when green;
8. post-merge exact-SHA GitHub Actions and Vercel verification.

## Production cutover boundary

The shared backend/API foundation is real, but Borrower production runtime is **not** switched to API mode yet. The remaining P0 is the complete same-origin server-session/bootstrap/command layer for the full Borrower command surface. Partial cutover is rejected because it would make some workflows canonical and others browser-local, which is worse than having one clearly labeled demo runtime.
