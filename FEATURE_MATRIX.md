# PiHub Borrower v0.5 Functional Completeness Matrix

Status legend: **Implemented** means the Borrower reference artifact has a real route, state/action contract, visible outcome and tests. **Prepared production adapter** means the frontend/API/server boundary exists but live provider credentials/infrastructure are still required.

| Priority | Capability | v0.5 implementation | Production boundary |
|---|---|---|---|
| P0 | Product-aware workflows | **Implemented**: construction, bridge, mezzanine, corporate and related product profiles change required sections, documents, milestones and submission blockers | Product/rule catalogue remains server-governed |
| P0 | Construction Draw & Disbursement Center | **Implemented**: Sources & Uses, construction budget, line-item draws, funded-to-date, request history and cross-module events | Advisory/Investor approval and actual disbursement remain authoritative backend actions |
| P0 | Inspection workflow | **Implemented**: request, schedule/status model, draw linkage, report/exception fields | Inspector assignment/report ingestion requires production workflow/provider integration |
| P0 | Bank account connection | **Implemented + prepared adapter**: PSD2/finAPI connection intent, consent/sync/freshness/cash-flow surfaces | Live finAPI/PSD2 credentials, regulated consent and account APIs required |
| P0 | DATEV connection | **Implemented + prepared adapter**: secure authorization-intent flow, fiscal/accounting scopes, sync/freshness model | DATEV developer access and organization authorization required |
| P0 | Smart document intelligence | **Implemented + prepared OSS adapter**: bulk selection, classify/extract/review/warnings/duplicate/tamper-signal model; Docling server adapter source | Production scanner/extraction service must run server-side; output is evidence, not an automatic credit decision |
| P0 | Explainable pre-qualification | **Implemented**: readiness band, reasons, blockers and next actions | Production thresholds/rules remain server-controlled and must avoid misleading credit promises |
| P0 | Explainable matching | **Implemented**: product match score, fit reasons and gaps without exposing confidential lender policy | Provider availability and lender rules remain confidential server data |
| P0 | Multi-deal / SPV portfolio | **Implemented**: applications/SPVs/facilities, search/filter/sort, saved views and CSV export | Canonical organization/deal data comes from shared API |
| P0 | Disclosure & Consent Center | **Implemented**: deal/document disclosure grants, purpose, expiry and revoke workflow | Actual data disclosure requires server authorization, audit and recipient access grants |
| P0 | Facility transaction requests | **Implemented**: increase, additional drawdown, rollover, extension, partial/full repayment, refinance, payment-account change and payoff requests | Advisory/Investor/servicing approval is authoritative |
| P1 | Financing Scenario Lab | **Implemented**: amount, tenor, rates, fees, amortization, equity, LTV/LTC, DSCR, debt service, all-in cost and stress scenarios | Scenario output is non-binding and never edits authoritative terms |
| P1 | Payment & Statement Center | **Implemented**: schedule, transaction/report-payment workflow, statements and CSV export | Bank/provider settlement state remains read-only to Borrower |
| P1 | Auto-payment / payment instructions | **Implemented**: masked account/payment instructions, manual/SEPA modes and verification state | Actual SEPA mandate/payment initiation requires regulated payment infrastructure |
| P1 | Covenant Forecasting | **Implemented**: current covenant context, forecast value, headroom, test date, assumptions and early-warning status | Forecast never becomes official covenant compliance without server/servicer confirmation |
| P1 | Cash-flow monitoring after funding | **Implemented**: consent-scoped connection snapshots and freshness | Live monitoring depends on connected-account provider |
| P1 | External professional access | **Implemented**: accountant/lawyer/tax adviser/architect/contractor/broker, application scope, permissions, expiry and revoke | Server RBAC/access grants must enforce every read/write |
| P1 | Advanced Data Room | **Implemented**: folders, bulk upload, bulk intelligence analysis, document versions/status, manifest export | Production object storage, AV/malware scanning and signed download URLs required |
| P1 | Reusable Company Vault | **Implemented**: reusable corporate document model, validity and application links | Server determines reuse eligibility/staleness |
| P1 | Data freshness system | **Implemented**: source label, last update, fresh/stale/needs-confirmation and Borrower confirmation | Provider sync timestamps are server-authoritative |
| P1 | Deadline & Calendar Center | **Implemented**: requests, documents, payments, covenants, reporting, inspections, closing, term expiry and maturity | Production deadlines derive from canonical workflow records |
| P1 | Borrower Copilot | **Implemented**: deterministic demo assistant + **prepared self-hosted Ollama adapter** with server-only authorized/redacted context | AI cannot decide credit/compliance/legal/covenant/payment state; server retrieval/redaction required |
| P1 | Offer impact comparison | **Implemented** through scenario lab and term comparison: pricing, fees, leverage, debt service and structural impact | Only issued term sheets are authoritative offers |
| P1 | Negotiation workspace | **Implemented**: term-linked questions, counters, rationale and status history | PiHub/Advisory responses and lender decisions come from backend workflow |
| P1 | E-signature package | **Implemented + prepared OSS adapter**: envelope/signers/status; Documenso v2 server adapter source | Live signing requires separately deployed/licensed provider, identity controls and webhook reconciliation |
| P1 | ESG / Sustainability workspace | **Implemented**: EPC, energy standard, renewable share, CO2, taxonomy, KfW/certification fields | Evidence/verification remains PiHub/provider governed |
| P2 | Custom portfolio views | **Implemented**: saved filters/sort/columns | Persist via shared API in production |
| P2 | ERP / API integration hub | **Implemented**: connector catalogue/test workflow and server authorization-intent boundary | Live ERP/webhook/file connectors require enterprise configuration |
| P2 | Bulk operations | **Implemented**: multi-file upload, bulk document intelligence, manifest/export operations | Large production batches should be asynchronous/server queued |
| P2 | Loan payoff / maturity package | **Implemented**: payoff/refinance/extension request paths tied to facility | Official payoff figures and discharge status remain servicer-controlled |
| P2 | Complaint / dispute center | **Implemented**: submit, reference/status/history model | Production SLA, immutable correspondence and compliance handling are server workflows |
| P2 | Data export package | **Implemented**: local JSON/CSV/manifest controls plus governed server export-job API | Full ZIP/PDF/legal export generation occurs server-side |

## Foundation retained from v0.4
Borrower-only access, application lifecycle/versioning, financing/company/UBO/project/financial forms, autosave, documents, PiHub requests/messages, notifications, activity, terms, closing, organization/team, privacy requests, funded facility overview, servicing, payments, covenants, periodic reporting and canonical cross-module event/outbox contracts remain included.

## Open-source capability boundaries
- **Docling / docling-serve**: document parsing/extraction worker behind PiHub authorization.
- **Documenso**: API-isolated e-signature adapter; its licensing must be reviewed for the chosen deployment model.
- **Ollama**: optional self-hosted Borrower Copilot inference behind server-side retrieval/redaction.
- **Apache Fineract**: optional servicing/core-ledger integration candidate, never a browser dependency.
- **Temporal**: optional durable orchestration candidate for long-running draws, inspections, closing, reporting and servicing workflows.
- **OpenSign**: evaluated alternative e-sign provider; not exposed as a selectable provider until an adapter is implemented and licensed appropriately.
- **FullCalendar, TanStack Table, Recharts, Papa Parse**: evaluated permissive frontend candidates; intentionally not added where the current dependency-free implementation is sufficient.

## Important non-fakes
Borrower cannot mark a bank payment settled, approve its own draw, determine covenant compliance, decide KYB/KYC/AML, approve lender credit, complete PiHub/legal closing work, fund a facility, or erase regulated records from the browser. Those actions are either read-only authoritative status or become explicit requests to the owning module/service.
