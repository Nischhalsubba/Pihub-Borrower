# PiHub Shared Platform / Borrower Production Backend Contract

## Boundary
The Borrower UI can demonstrate borrower-owned workflows locally, but production truth lives in the shared PiHub backend. The backend owns identity, organization/deal authorization, canonical records, document storage, provider secrets, workflow orchestration, audit history, concurrency and cross-module delivery.

PiHub has three business modules — **Borrower / Origination**, **Investor / Lender** and **Advisory / Structuring** — plus **Admin / Compliance** as the supporting control plane. These modules may be independently deployed and independently repository-owned. They must still operate over the same canonical organizations, applications/deals, documents, facilities, workflow events and audit history. Repository boundaries are not data boundaries.

## Runtime modes
- `demo`: browser-local reference state + IndexedDB document blobs.
- `api`: secure HttpOnly server session, canonical bootstrap and server-authorized commands. Canonical business state is never persisted to localStorage.

## Security principles
1. Never place session tokens, provider tokens, client secrets, API keys or signed long-lived credentials in URLs/localStorage.
2. Every API command re-checks organization membership, deal access and action permission server-side.
3. Advisory/Investor roles do not grant blanket visibility. User and organization deal-access grants control assignment/disclosure.
4. Finance-critical transitions use version checks + idempotency keys.
5. State update, audit event and outbox event commit together.
6. Browser users cannot approve draws, mark payments settled, decide covenants/KYB/KYC/AML, approve credit, fund facilities or alter immutable audit history.
7. Document uploads use narrow signed intents, then server finalization after content/type/size/hash/malware validation.
8. External professional access is application-scoped, permission-limited, expiring and revocable.
9. Disclosure consent is explicit, purpose-bound, auditable and revocable where legally/contractually permitted.
10. AI/document-intelligence outputs are advisory evidence until an authorized PiHub workflow accepts them.
11. Internal module coordination and internal decision/compliance tables are server-only. Borrower, Investor, Advisory and Admin frontends receive authorized projections rather than direct access to backend internals.

## Canonical records
Core migration (`0001`): organizations/memberships/roles/access grants, applications/versions, documents/versions, requests/messages, terms, closing, facilities, payments, covenants, reporting, servicing, privacy, notifications, support, idempotency, audit and outbox.

Advanced migration (`0002`):
- SPVs and portfolio views
- Sources & Uses and construction budgets
- draw requests/line items and inspections
- data connections/freshness/cash-flow snapshots
- data-room folders/company-vault references/document-intelligence results
- disclosure grants
- financing scenarios
- term negotiation and signature envelopes
- payment instructions/statements/covenant forecasts
- external professionals and deal access
- ESG profiles
- integration connector metadata
- complaints/disputes and export packages

Security/performance hardening migrations (`0003`–`0004`) move RLS authorization helpers into a private schema, optimize `auth.uid()` policy evaluation and index relationship foreign keys used by joins, cascades and authorization checks.

## Cross-module platform backbone
Migrations `0005_cross_module_platform_backbone.sql` and `0006_cross_module_fk_indexes.sql` make the shared database explicitly multi-module rather than treating cross-module behavior as a Borrower afterthought.

### One canonical deal, multiple module states
`application_module_states` stores the state of the **same application/deal** in Borrower, Advisory, Investor and Admin without copying the underlying application record. A Borrower application can therefore be complete in Borrower, ready/in-progress in Advisory, blocked in Admin compliance and not yet disclosed to Investor while retaining one canonical application ID.

Each module state carries its own workflow state, owner, blocker summary, revision and last domain event. The canonical application remains the source record.

### Durable module-to-module handoffs
`workflow_handoffs` records explicit transfers such as:
- Borrower submission → Advisory intake;
- Advisory due-diligence request → Borrower response;
- Admin compliance clearance/block → Advisory/Investor visibility;
- Advisory publication → Investor review;
- Investor decision/commitment → Advisory execution;
- funding/servicing events → Borrower and Investor monitoring.

A handoff has a source module, target module, type, status, source event, audit actors and payload. This prevents hidden workflow ownership from being reconstructed from screen state.

### Shared work queue
`platform_work_items` is the common server-side work/task contract for cross-module actions. A task can originate in one module and be owned by another while remaining attached to the same organization/application/facility. Frontends receive only tasks they are authorized to see.

### Per-target event delivery
`outbox_events` now carries canonical organization/application references, schema version, correlation ID and causation ID. `outbox_event_deliveries` adds one delivery status per target module.

This matters because a single global `processed_at` flag is insufficient when the same event must reach Advisory, Admin and Investor independently. One target may be delivered while another retries or enters dead-letter handling without duplicating the original business transaction.

### Cheap change detection
`module_projection_versions` maintains a revision per application + module. The shared API can use it to determine whether a module projection actually changed before rebuilding or retransmitting a full snapshot. That aligns with the Borrower request-budget rule: **do not spend an API call or large response when nothing relevant changed**.

### Event seeding
The private `seed_cross_module_event()` trigger runs after an outbox event is committed. It:
- creates one target-delivery row per module;
- advances the affected module projection revision;
- seeds/updates that module's application workflow state.

The function is in the private schema, has a locked search path and is not executable by `public`, `anon` or `authenticated` roles.

### Browser/security boundary
The coordination tables have RLS enabled and browser privileges revoked. They intentionally have no browser RLS policy. Only trusted server/service-role code owns orchestration. The module APIs expose minimized, authorized projections instead of turning internal workflow tables into a public RPC surface.

## Authorization helper correction
Migration `0007_fix_private_authorization_helpers.sql` fixes a latent issue from the earlier helper-schema move. The authorization functions had been moved into `private`, but `private.can_read_application()` still referenced the removed `public.is_org_member`, `public.has_platform_role` and `public.has_application_access` names. The corrected helper chain uses fully qualified private helper calls and a locked empty search path.

The production verification query now executes `private.can_read_application`, `private.has_platform_role` and `private.is_org_member` without resolution errors and returns false for an unauthenticated/nonexistent test subject, as expected.

## Shared Investor / Advisory / Admin domain core
Migrations `0008_platform_module_domain_core.sql` and `0009_platform_module_domain_fk_indexes.sql` add first-class module-specific records while preserving one canonical deal/application.

### Organization capabilities and institution-level deal access
`organization_capabilities` classifies organizations as borrower, investor, sponsor or service provider without overloading user/member roles.

`application_organization_access_grants` lets an investor/advisory institution receive a deal once at organization level. `private.has_application_access()` now accepts either an explicit user grant or an active membership in an organization with an unexpired, non-revoked application grant. This avoids issuing one grant per employee and keeps disclosure revocable at institution level.

### Shared transaction parties
`deal_parties` attaches borrower, sponsor, investor/lender, adviser, servicer, agent, security trustee, valuer, legal and technical-adviser organizations to the same application ID. Advisory can therefore coordinate counterparties and Investor can inspect authorized parties without creating duplicate party/deal records.

### Advisory mandate and due diligence
`advisory_mandates` gives Advisory a first-class mandate record tied to the canonical application and client organization, including transaction type, commercial stage, owner, target amount and commercial terms.

`due_diligence_workstreams` provides shared DD ownership/status/findings for Advisory, Investor and Admin. This is deliberately separate from documents: documents are evidence; workstreams are the review/decision process around that evidence.

### Advisory → Investor publication
`deal_publications` models the controlled act of publishing an approved version of a canonical deal to investors. Publications have version, status, disclosure level, teaser and investor criteria. Publication does not copy the application itself.

### Investor commitments and decisions
`investor_commitments` ties an investor organization to the canonical application/publication and tracks interest → DD → credit review → approval/decline → commitment → allocation → funding.

`investor_decisions` records stage-specific screening, underwriting, credit/investment-committee and final outcomes. Internal rationale/conditions remain server-owned and must never be leaked into Borrower projections merely because they share a deal ID.

### Admin / Compliance
`compliance_cases` and `compliance_checks` provide explicit Admin control-plane records for KYB, KYC, AML, sanctions, UBO, PEP, source-of-funds and document review. They attach to the relevant organization/application/user while remaining server-only. Borrower should receive only safe consequences such as `action_required`, `under_review`, `cleared` or `blocked`, not internal compliance notes/provider payloads.

### Module-domain security
All new module-domain tables have RLS enabled and browser privileges revoked. They are intentionally API/service-owned until the central PiHub API exposes permission-minimized module projections. Supabase performance-advisor foreign-key findings are covered by indexes; unused-index notices on the empty/pre-production dataset are informational and are not grounds to remove relationship indexes prematurely.

### Synthetic verification
A temporary canonical application was used to create a Borrower party, Advisory mandate, Advisory DD workstream, Investor publication/commitment/decision, Admin compliance case and a two-target `investor + admin` domain event. The domain records inserted successfully. A separate post-statement verification confirmed two target deliveries, two module states and two projection revisions. All synthetic data was deleted afterward.

## API command model
The browser may request a change; the server decides whether it is valid. The lowest-call production contract is one authenticated command request that commits the business change, audit/outbox evidence and returns an authoritative module snapshot or bounded canonical delta from that same transaction.

The client must not reload the entire bootstrap after every accepted command. If a legacy command response does not yet include canonical state, accepted command results are reconciled with one delayed bootstrap after the mutation burst. Rejected commands still trigger immediate authoritative recovery.

Exact repeated commands are deduped client-side only for a conservative allowlist of idempotent/set-style operations. Non-idempotent actions such as creating support tickets, payment notices or other new records are never suppressed merely because their payloads look identical.

## API request budget
The production budget is defined in `docs/API_REQUEST_BUDGET.md` and is part of the architecture contract:

- concurrent duplicate GETs share one in-flight request;
- session and bootstrap reads use short in-memory TTLs only;
- API-mode autosave has a 3-second minimum delay;
- a mutation burst causes at most one delayed bootstrap reconciliation;
- telemetry is transported in bounded batches rather than one request per UI event;
- no background bootstrap polling is allowed;
- provider calls happen server-to-server and must be idempotent/retry-safe;
- database access behind the PiHub API should batch related records with joins/RPCs rather than N+1 request loops;
- module projection revisions should be checked before transmitting a full cross-module projection;
- event consumers should batch work and avoid Edge-Function-to-Edge-Function fan-out when shared libraries or database/queue processing are sufficient.

This keeps request volume predictable without turning finance data into a stale browser cache.

## Provider integrations
### DATEV / finAPI / ERP
`/data-connections/authorization-intent` creates server-managed consent/OAuth intents. The browser receives an expiring authorization URL only. Refresh/access tokens stay server-side.

### Docling document intelligence
`supabase/functions/document-intelligence` calls docling-serve asynchronously with short-lived server-generated source URLs. Extraction, classification, table parsing and warnings return to a review workflow; they do not silently overwrite borrower-submitted finance data.

### Documenso e-signature
`supabase/functions/esign-envelope` creates/distributes signing envelopes with a server-side API token. Completed/declined signer state must be reconciled from provider webhooks/polling before becoming canonical.

### Ollama Borrower Copilot
`supabase/functions/borrower-copilot` is a self-hosted inference option. The PiHub API must first assemble authorized Borrower-only evidence, redact sensitive/internal content and pass that limited context to the function. The model cannot make credit, legal, compliance, covenant, valuation or settlement decisions.

### Durable background delivery
Supabase Queues/PGMQ is a valid future worker layer for durable high-volume event consumption and provider jobs. It is **not enabled merely for architectural fashion**. The current database outbox + per-module delivery rows remain sufficient until an actual worker/consumer exists. When volume requires it, queue consumers should process batches, archive completed messages and keep client browsers away from internal queues.

### Apache Fineract / Temporal
These remain optional backend integration candidates. Fineract can supply servicing/core-loan APIs where its domain fit is appropriate; Temporal can orchestrate long-running/retryable workflows such as draws, inspections, closing and reporting. Neither should leak into the browser domain model or become a mandatory dependency without production architecture review.

## Borrower enhancements unlocked by the shared backend
The following are high-value Borrower additions because they can now be backed by shared canonical state rather than local UI simulation:

1. **Cross-module financing timeline** — show Borrower-safe progress through Origination → Advisory → compliance → Investor review → documentation → funding → servicing, based on module states and canonical events.
2. **Unified PiHub Request Center** — requests created by Advisory/Admin/Investor appear in one Borrower inbox with due dates, documents, threaded responses and completion state.
3. **Reusable Company Vault** — verified organization/profile/document data can be reused across new financing applications without re-uploading unchanged material.
4. **Borrower-safe compliance readiness** — show required/action-needed/cleared states without leaking internal compliance notes or investor-only decision material.
5. **Automatic term/decision/closing updates** — Borrower sees the authorized consequence of Advisory/Investor/Admin actions without manually refreshing or recreating records.
6. **Organization approvals before submission** — finance/legal/signatory roles can review and approve a draft before an authorized submit command.
7. **Document reuse with disclosure control** — one canonical document/version history with explicit application/module disclosure grants, not duplicate uploads per portal.
8. **Post-funding command center** — payments, statements, covenant/reporting obligations, servicing requests and notices remain tied to the facility created from the same application.
9. **Revision-aware synchronization** — return unchanged/304-style semantics or a bounded delta when the module projection revision did not materially change.
10. **Event-driven notification feed** — generate notifications from canonical events and work items instead of polling every module.

## Production readiness gates
Do not enable API runtime until:
- migrations are reviewed/applied in the shared backend;
- RLS + security/performance advisors are green for actionable warnings;
- session/bootstrap/command/upload/connection/intelligence/signature/export/Copilot endpoints exist;
- the command endpoint returns canonical state/delta or supports the documented coalesced reconciliation fallback;
- module APIs enforce record/module permissions and never expose internal coordination or internal decision/compliance tables directly;
- organization-level deal grants are issued/revoked only through authorized server/admin commands;
- provider secrets are configured in the server secret store;
- asynchronous provider callbacks/jobs are idempotent and auditable;
- cross-module handoff/event-delivery tests prove one canonical record travels through the full lifecycle;
- request-budget regression tests pass;
- real browser/Axe/responsive tests pass on the exact release revision;
- Vercel serves that exact verified commit.
