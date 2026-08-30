# PiHub Shared Platform Consumer Foundation

Date: 2026-08-30

## Goal

Connect Borrower to the shared PiHub operating model without turning independent module applications into independent copies of the same business data.

PiHub has three business modules plus one control plane:
- Borrower / Origination
- Advisory / Structuring
- Investor / Lender
- Admin / Compliance

They operate on the same canonical organization, application/deal, document, facility, workflow event and audit history. Each module receives only the projection and actions appropriate to its users.

## Delivered in this tranche

### 1. Permission-minimized Borrower projection

The shared backend now produces a dedicated Borrower integration projection instead of exposing internal coordination tables directly.

Borrower receives:
- application ID;
- projection revision;
- safe module workflow states;
- Borrower-related handoff metadata;
- Borrower-targeted work items;
- safe compliance readiness state/count;
- finance/legal/signatory approval status;
- reusable Company Vault metadata.

Borrower does **not** receive:
- compliance `internal_summary`;
- compliance evidence/provider payloads;
- risk-rating reasoning;
- module-private workflow summaries/payloads;
- service-role credentials;
- Investor-only decision material.

### 2. Organization approval gates

`application_approvals` adds explicit finance, legal, signatory and submission gates to the same canonical application.

Server authorization:
- finance approval: organization `owner` or `finance`;
- legal approval: organization `owner` or `legal`;
- signatory/submission approval: organization `owner` or `signatory`.

Every approval mutation creates a canonical outbox event for Advisory/Admin consumers. The Borrower UI now shows the three pre-submission gates on the Financing request and blocks the visual submit action until they are complete.

The future central `application.submit` command must repeat the same approval check server-side. Frontend disablement is not authorization.

### 3. Unified PiHub Request Center

Borrower request conversations and cross-module `platform_work_items` now have one user-facing home.

A work item includes:
- source module;
- title/description;
- status/priority;
- due date;
- safe Borrower action route;
- explicit `borrowerCompletable` capability.

Only work items created with `payload.borrowerCompletable=true` can be completed by the borrower. Review/evidence/compliance tasks that require PiHub validation remain open until the owning workflow closes them.

### 4. Event-driven Borrower notification seeding

When a server-owned `platform_work_item` is created for the Borrower module in `open` or `blocked` state, the backend creates a notification for each active member of the Borrower organization.

This avoids browser polling and preserves the existing low-call API contract.

### 5. Borrower-safe compliance readiness

The backend reduces internal Admin/Compliance case detail to one safe state:
- `not_started`
- `under_review`
- `action_required`
- `cleared`
- `blocked`

Borrower sees the state and number of unresolved borrower-facing cases only. Internal notes/evidence/risk reasoning stay private.

### 6. Cross-module financing timeline

Overview now shows Borrower, Advisory, Admin/Compliance and Investor as separate workflow states over the same application. The user can understand where the financing is without seeing internal module notes or creating duplicate deal records.

### 7. Shared Company Vault consumption

The existing Company Vault UI now accepts the canonical organization-level reusable-document projection. The same document identity can therefore be reused across applications once the central API consumer is enabled.

## Authenticated Edge API foundation

A new Supabase Edge Function, `platform-api`, is deployed with JWT verification enabled.

Routes currently implemented:
- `GET /api/v1/session`
- `GET /api/v1/borrower/integration?applicationId=...`
- `POST /api/v1/borrower/work-items/:id/complete`
- `POST /api/v1/borrower/approvals`

Security flow:
1. gateway requires a valid Authorization JWT;
2. function re-verifies the JWT with Supabase Auth;
3. verified `user.id` is passed to privileged RPCs;
4. privileged RPC execution is revoked from `public`, `anon` and `authenticated` and granted only to `service_role`;
5. RPCs independently verify organization membership/role before reading or mutating business records;
6. CORS is fail-closed unless an origin appears in `PIHUB_ALLOWED_ORIGINS`.

The service-role key remains inside Supabase Edge runtime and is never returned to the browser.

## Why production API mode is still intentionally off

The existing Borrower frontend command surface is larger than these new integration routes. It includes application creation/update/submission, documents, requests, notifications, organization membership, terms, closing, servicing, payments, reporting, privacy, advanced features and provider adapters.

Switching `VITE_PIHUB_RUNTIME=api` before the same-origin session/bootstrap/command service covers that whole contract would create a split-brain product where some data is canonical and some data is still browser-local.

That is explicitly rejected.

The next P0 backend tranche is:
1. same-origin HttpOnly session/BFF;
2. full canonical Borrower bootstrap;
3. complete command dispatcher with idempotency/version checks;
4. shared document upload/finalization path;
5. integration projection proxy/adoption;
6. end-to-end contract tests across Borrower → Advisory/Admin → Investor → Borrower consequences.

No access/refresh token should be moved into localStorage to accelerate this cutover.

## Request-volume contract

The platform integration keeps the existing request-budget principles:
- no background bootstrap polling;
- short in-memory read cache only;
- concurrent identical reads coalesce;
- mutations invalidate the projection cache;
- integration projection returns a revision;
- future BFF responses can use the revision to return a bounded delta/unchanged result;
- event-driven notifications/work items replace polling for module changes.

## Production verification performed

A rolled-back synthetic database transaction proved:
- authorized module context;
- safe Borrower projection;
- no internal compliance/module-summary leakage;
- event-driven notification creation;
- role-authorized approval event creation;
- borrower-completable work-item completion and return event;
- cleanup of all synthetic records.

Supabase security advisor has no actionable WARN/ERROR from this work. Remaining RLS/no-policy notices are intentional INFO entries for server-only tables with browser privileges revoked. Performance advisor reports no new unindexed foreign-key issue from this tranche.
