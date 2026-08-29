# PiHub Borrower v0.6.x Production Backend Contract

## Boundary
The Borrower UI can demonstrate every borrower-owned workflow locally, but production truth lives in a shared PiHub backend. The backend owns identity, organization/deal authorization, canonical records, document storage, provider secrets, workflow orchestration, audit history, concurrency and cross-module delivery.

## Runtime modes
- `demo`: browser-local reference state + IndexedDB document blobs.
- `api`: secure HttpOnly server session, canonical bootstrap and server-authorized commands. Canonical business state is never persisted to localStorage.

## Security principles
1. Never place session tokens, provider tokens, client secrets, API keys or signed long-lived credentials in URLs/localStorage.
2. Every API command re-checks organization membership, deal access and action permission server-side.
3. Advisory/Investor roles do not grant blanket visibility. `application_access_grants` controls deal-level assignment/disclosure.
4. Finance-critical transitions use version checks + idempotency keys.
5. State update, audit event and outbox event commit together.
6. Browser users cannot approve draws, mark payments settled, decide covenants/KYB/KYC/AML, approve credit, fund facilities or alter immutable audit history.
7. Document uploads use narrow signed intents, then server finalization after content/type/size/hash/malware validation.
8. External professional access is application-scoped, permission-limited, expiring and revocable.
9. Disclosure consent is explicit, purpose-bound, auditable and revocable where legally/contractually permitted.
10. AI/document-intelligence outputs are advisory evidence until an authorized PiHub workflow accepts them.

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

Security/performance hardening migrations move RLS authorization helpers into a private schema, optimize `auth.uid()` policy evaluation and index relationship foreign keys used by joins, cascades and authorization checks.

## API command model
The browser may request a change; the server decides whether it is valid. The lowest-call production contract is one authenticated command request that commits the business change, audit/outbox evidence and returns an authoritative Borrower `snapshot` or bounded canonical delta from that same transaction.

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
- database access behind the PiHub API should batch related records with joins/RPCs rather than N+1 request loops.

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

### Apache Fineract / Temporal
These remain optional backend integration candidates. Fineract can supply servicing/core-loan APIs where its domain fit is appropriate; Temporal can orchestrate long-running/retryable workflows such as draws, inspections, closing and reporting. Neither should leak into the browser domain model or become a mandatory dependency without production architecture review.

## Production readiness gates
Do not enable API runtime until:
- migrations are reviewed/applied in the shared backend;
- RLS + security/performance advisors are green for actionable warnings;
- session/bootstrap/command/upload/connection/intelligence/signature/export/Copilot endpoints exist;
- the command endpoint returns canonical state/delta or supports the documented coalesced reconciliation fallback;
- provider secrets are configured in the server secret store;
- asynchronous provider callbacks/jobs are idempotent and auditable;
- request-budget regression tests pass;
- real browser/Axe/responsive tests pass on the exact release revision;
- Vercel serves that exact verified commit.
