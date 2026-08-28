# Integration into `Nischhalsubba/Pihub-Borrower`

This v0.5 artifact is **not** a merged or deployed repository revision. Integrate it from the latest verified Borrower `main`, preserving the existing Investor-derived shell and production rollback path.

## Safe integration order
1. Create `feat/borrower-v0.5-capital-management` from the latest verified `main`.
2. Preserve shared shell/tokens first; port Borrower-owned pages/composition without duplicating global design primitives.
3. Port schema-v5 state/model/core/store + v2/v3/v4→v5 migration tests.
4. Port product-aware readiness before enabling application submission.
5. Port the new routes: portfolio, qualification, capital/draws, connections, data room, disclosures, scenario lab, negotiation/e-sign, calendar, payments, ESG, complaints and Copilot.
6. Port production API adapter and OpenAPI changes. API mode must never store canonical business state or provider credentials in localStorage.
7. Port v0.5 backend migration into the **shared backend project**, not into a Borrower-only database silo.
8. Deploy optional provider adapters only after security/license review; never expose provider secrets to the browser.
9. Run `npm ci`, `npm run build`, 38 domain tests, 25 static guards and the Playwright/Axe matrix.
10. Merge only on green CI, then verify the exact merged SHA on Vercel.

## Browser demo-state migration
Current demo storage key: `pihub.borrower.v5`.
The store recognizes legacy v2/v3/v4 state and migrates into schema v5 without turning demo fixtures into production truth.

## API runtime endpoints
`VITE_PIHUB_RUNTIME=api` expects at least:
- `GET /api/v1/session`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/password-reset`
- `GET /api/v1/borrower/bootstrap`
- `POST /api/v1/borrower/commands`
- `POST /api/v1/borrower/documents/upload-intent`
- `POST /api/v1/borrower/data-connections/authorization-intent`
- `POST /api/v1/borrower/document-intelligence/jobs`
- `POST /api/v1/borrower/signatures/envelopes`
- `POST /api/v1/borrower/exports`
- `POST /api/v1/borrower/copilot/query`
- authenticated document/download/export result endpoints

Commands are server-authorized and idempotent. Finance-critical commands must atomically update canonical state, append audit evidence and enqueue the authoritative outbox event.

## Cross-module consequences
| Borrower action | Canonical consequence | Other modules |
|---|---|---|
| application submit | `application.submitted` | Advisory, Admin |
| document upload / reporting package | document/reporting event | Advisory, Investor as disclosed |
| PiHub request response | ownership returns to PiHub | Advisory |
| disclosure consent/revoke | disclosure/access-grant update | Advisory/Admin + disclosed provider projection |
| construction draw submit | draw workflow starts | Advisory, Investor when authorized |
| inspection request | inspection workflow | Advisory/Operations |
| term counter / accept / reject | terms workflow update | Advisory, Investor |
| signing package | e-sign workflow | Advisory/Admin |
| payment report | reconciliation request, not settlement | Advisory, Investor/Admin |
| servicing/payoff/refinance request | servicing workflow | Advisory, Investor/Admin |
| complaint/privacy request | governance workflow | Admin/Compliance |

## Provider boundaries
- DATEV / finAPI authorization begins server-side and returns only an expiring authorization URL.
- Docling receives only a short-lived authorized source URL from the server.
- Documenso receives only server-fetched documents/signers; its API token stays server-side.
- Ollama receives only server-assembled, Borrower-authorized/redacted evidence, never raw unrestricted platform data.
- Apache Fineract/Temporal remain optional backend candidates; do not bind the Borrower frontend directly to them.

## Backend deployment boundary
The SQL and Edge Function source are prepared artifacts. Provisioning a real Supabase/PostgreSQL project, applying migrations, configuring secrets/providers and validating RLS/security advisors are separate production infrastructure actions.
