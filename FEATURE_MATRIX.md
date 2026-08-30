# PiHub Borrower v0.6+ Functional & Platform Integration Matrix

Updated: 2026-08-30

**Status meanings**
- **Implemented**: real Borrower route/state/action with a visible outcome.
- **Live shared-backend foundation**: the managed PiHub Supabase backend contains the canonical contract and it has been verified directly.
- **Prepared production consumer**: the secure API/client contract exists, but the Borrower production runtime is intentionally not switched until the complete same-origin session/bootstrap/command service is ready.

## Shared PiHub integration

| Priority | Capability | Current state | Production boundary |
|---|---|---|---|
| P0 | One canonical deal across modules | **Live shared-backend foundation** | Borrower, Advisory, Investor and Admin must keep using the same application/deal IDs |
| P0 | Module workflow state | **Live shared-backend foundation + Borrower UI**: Borrower overview consumes a permission-minimized module-state projection and renders the financing timeline | Central API/BFF adoption is required before production runtime cutover |
| P0 | Cross-module handoffs | **Live shared-backend foundation**: durable source/target handoffs remain attached to the canonical application | Borrower projection exposes only Borrower-related handoff metadata, never private payload/notes |
| P0 | Unified PiHub Request Center | **Implemented**: existing request conversations and authorized shared work items are presented in one Borrower inbox | Shared work items come from the central platform API in production |
| P0 | Borrower-safe compliance readiness | **Implemented + live backend projection** | Only safe readiness state/count are exposed; internal compliance notes, evidence, risk and provider results remain private |
| P0 | Organization approvals before submission | **Implemented + live backend contract**: finance, legal and signatory gates are role-enforced server-side and shown on Financing request | Final production submit command must re-check approvals in the central command service |
| P0 | Event-driven Borrower work notifications | **Live shared-backend foundation**: new Borrower-targeted work items create notifications for active organization members | Delivery channel fan-out remains a server worker/provider concern |
| P0 | Borrower-completable work-item policy | **Live shared-backend foundation**: only work items explicitly marked borrower-completable can be closed by the borrower | PiHub-validated evidence/review tasks cannot be self-completed |
| P0 | Authenticated platform API foundation | **Live**: `platform-api` Edge Function is deployed with JWT verification, caller re-verification and service-role-only privileged RPC access | It is an internal API foundation, not yet the complete browser BFF/login/bootstrap/command service |
| P1 | Reusable Company Vault | **Implemented + shared projection support** | Production reuse eligibility and validity remain server-authoritative |
| P1 | Revision-aware module projection | **Live shared-backend foundation**: projection revision is returned with the authorized Borrower integration payload | Future BFF can use the revision for bounded delta/unchanged responses |
| P1 | Automatic Advisory/Admin/Investor consequences | **Backend event/handoff foundation implemented** | Each module consumer still needs to adopt the central API/event contract end to end |
| P1 | Post-funding continuity | **Implemented**: facility, payment, covenant, reporting, servicing and portfolio surfaces already remain tied to the same application | Settlement/compliance/servicer decisions remain authoritative backend actions |

## Existing Borrower capability set retained

| Area | Current implementation |
|---|---|
| Financing application | Financing/company/UBO/project/financial forms, autosave, product-aware workflow readiness, versions and withdrawal |
| Product discovery | Product catalogue, pre-qualification, explainable matching and comparison |
| Documents | Requirements, upload/version state, Advanced Data Room, bulk manifest/export and document intelligence review |
| Connected data | DATEV/finAPI/ERP authorization-intent model, freshness and cash-flow snapshots |
| Construction finance | Sources & Uses, construction budget, draw requests and inspections |
| Terms & execution | Indicative terms, scenario lab, negotiation, e-sign envelope model, closing readiness and calendar |
| Organization | Team/roles, external professionals, disclosure/consent, Company Vault, account and privacy rights |
| Servicing | Facility overview, payment schedule/statements, reporting, covenants/forecasting, servicing requests and payoff/refinance paths |
| Governance | Notifications, activity/audit-facing history, complaints/disputes, data exports and Borrower Copilot |
| Localization/accessibility | EN/DE architecture, keyboard navigation, reduced motion, multi-browser/Axe release gate |

## Provider/adaptor boundaries
- **Docling / docling-serve**: server-side document parsing/extraction only.
- **Documenso**: server-side e-signature adapter; final signer state comes from provider reconciliation.
- **Ollama**: optional self-hosted Borrower Copilot inference behind authorized/redacted context.
- **finAPI / DATEV / ERP**: server-managed authorization and tokens; no provider credentials in browser storage.
- **Apache Fineract / Temporal**: optional future servicing/orchestration components, not browser dependencies.

## Non-negotiable production boundary
The current production Borrower frontend remains on its verified runtime until the central same-origin PiHub session/bootstrap/command service covers the full application command set. The new shared projection and Edge API do **not** justify placing bearer/refresh tokens in localStorage or enabling a partial API runtime that would break existing workflows.

Borrower cannot mark a bank payment settled, approve its own draw, determine official covenant compliance, decide KYB/KYC/AML, approve lender credit, complete PiHub/legal work, fund a facility or erase regulated records from the browser. Those remain owned by the authorized backend/module workflow.
