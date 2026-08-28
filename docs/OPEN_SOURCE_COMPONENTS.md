# Borrower v0.5 open-source component strategy

Reviewed: 2026-08-28

PiHub Borrower uses open source to close capability gaps without letting third-party projects become a second source of truth. The browser remains a Borrower client; identity, authorization, deal disclosure, audit and finance-critical state remain PiHub-owned server concerns.

## Implemented provider boundaries

### Docling / docling-serve
- License: MIT for Docling and docling-serve.
- Purpose: document parsing, tables, OCR-assisted conversion and structured output before PiHub review.
- Current upstream API: docling-serve v1 exposes `/v1/convert/source`, async `/v1/convert/source/async`, status polling and result endpoints.
- PiHub artifact: `supabase/functions/document-intelligence/index.ts` submits a short-lived server-generated document URL to Docling asynchronously. The Docling API key stays in server environment variables.
- Authority rule: extraction produces a review record. It never silently rewrites submitted financial data or decides fraud/tampering by itself.

### Apache Fineract / Mifos ecosystem
- Fineract license: Apache-2.0.
- Purpose: optional reference/adapter for repayment schedules, charges, loan transactions and servicing ledger capabilities.
- PiHub boundary: the PiHub facility/application remains canonical. Fineract may be a servicing subsystem or reconciliation source, never the origination/document/Advisory authority.
- Integration should be asynchronous/idempotent and reconcile external transaction IDs back to the canonical PiHub facility ID.

### Temporal
- Temporal server and TypeScript SDK: MIT.
- Purpose: durable long-running workflows for draw/inspection processing, document intelligence, disclosure expiry, notifications, closing timers and servicing operations.
- PiHub boundary: Temporal runs behind the PiHub API. Workflow IDs should be based on canonical aggregate IDs and idempotency keys. The browser never owns retry/timer orchestration.

### Documenso
- Community Edition: AGPL-3.0; Enterprise Edition: commercial license.
- Current v2 API uses envelope resources, supports self-hosted base URLs and server-side API-key authentication.
- PiHub artifact: `supabase/functions/esign-envelope/index.ts` demonstrates an internal server adapter using `/api/v2/envelope/create` followed by envelope distribution. API keys and signed document URLs stay server-side.
- Legal boundary: do not copy or statically incorporate AGPL server code into proprietary PiHub code without license review. An HTTP service boundary does not by itself waive AGPL obligations for a modified network-served instance.

### OpenSign
- License: AGPL-3.0.
- Purpose: alternative open-source e-sign provider candidate.
- PiHub boundary: use a separately deployed/API-isolated service only after legal/security review. The current UI supports an OpenSign provider choice but does not vendor OpenSign code.

## Evaluated frontend libraries, intentionally optional

### FullCalendar
- Standard/non-premium packages: MIT. Premium scheduler/resource packages have separate licensing.
- Candidate if deadline management grows into month/week scheduling, drag/drop inspection booking or resource calendars.
- Current v0.5 deadline center stays dependency-free because it does not yet need scheduler semantics.

### TanStack Table
- MIT.
- Candidate for server-side sorting/filtering, column visibility and virtualization once multi-SPV portfolios become large.
- Current portfolio is intentionally small enough for native React rendering.

### Recharts
- MIT.
- Candidate for cash-flow, draw burn-down and covenant-headroom time series when production APIs contain sufficient longitudinal data.
- Avoid decorative charts over thin demo fixtures.

### Papa Parse
- MIT.
- Candidate for robust CSV imports from bank/ERP/accounting exports, including large files and dialect differences.
- Current export-only CSV helper remains deliberately small.


## Ollama
- License/API: MIT-licensed server/API specification.
- Purpose: optional self-hosted Borrower Copilot inference provider behind the PiHub API.
- PiHub boundary: `supabase/functions/borrower-copilot` accepts only server-assembled, Borrower-authorized/redacted context and calls Ollama's `/api/chat`; the browser never receives the model endpoint, bearer token or unrestricted retrieval context.
- Governance: model output is informational only and cannot decide credit, compliance, covenant, settlement, valuation or legal state. Authoritative records remain the source of truth.

## External data providers that are not open source

### DATEV
Production DATEV access requires its supported developer/integration route, appropriate scopes and organization authorization. v0.5 starts authorization through a server intent and keeps provider tokens out of browser state.

### finAPI / PSD2 connectivity
Production bank connections require regulated consent/account-information flows. v0.5 models consent, scopes, sync/freshness and cash-flow snapshots; the API runtime starts provider authorization through the server rather than handling credentials in React.

## Security/licensing rules
1. Never store provider access tokens, refresh tokens, API keys or client secrets in Borrower browser state or localStorage.
2. Never give an open-source subsystem broader deal visibility than PiHub authorization grants.
3. Keep finance-critical mutations server-authorized and idempotent.
4. Treat document extraction, AI and reconciliation as evidence/advice until a PiHub domain rule accepts it.
5. Keep AGPL systems separately deployed/API-isolated unless PiHub intentionally accepts the license obligations or buys an appropriate commercial license.
6. Integrate through an HTTP/provider boundary or a separately licensed deployment; do not vendor AGPL server code into the proprietary Borrower frontend.
7. Pin versions, maintain an SBOM and scan dependencies before production adoption.
