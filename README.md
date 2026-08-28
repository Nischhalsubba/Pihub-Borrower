# PiHub Borrower v0.5 - Origination, Capital Management & Servicing

Standalone TypeScript/React/Vite reference implementation for PiHub Borrower. The governing rule is deliberately unforgiving: **every visible Borrower control has a meaningful outcome, an explicit read-only state, or a real server/provider boundary.** Decorative finance buttons have been denied asylum.

## End-to-end product coverage

### Origination and qualification
- Borrower-only demo/API authentication boundary
- product-aware workflows for construction, bridge, mezzanine and corporate financing
- explainable pre-qualification, matching, product discovery, save/compare and eligibility
- new/product-linked applications, versions, recovery, autosave and product-specific submission readiness
- company/UBO, project/property, financial and financing-request capture

### Capital management
- multi-deal/SPV portfolio and saved views
- Sources & Uses and construction budget
- draw requests, draw line items and inspection requests
- financial-data connections, DATEV/PSD2 authorization intents, data freshness and cash-flow monitoring
- advanced data room, bulk upload, reusable company vault and document intelligence
- disclosure/consent center

### Terms and execution
- scenario lab with LTV/LTC/DSCR/debt-service/all-in-cost calculations and rate stress
- offer/term comparison
- term-linked negotiation messages and borrower counters
- e-signature envelope/signatory tracking
- closing-readiness workflow

### Post-funding servicing
- funded facility overview, statements and repayment schedule
- safe payment-reporting/reconciliation instead of borrower-created settlement
- payment instructions and facility transaction requests
- covenant monitoring + forecasting
- periodic reporting obligations
- waiver, consent, amendment, extension, refinance, payoff and maturity requests
- ESG/sustainability workspace

### Organization, governance and support
- organization/team roles and invitations
- time-limited, deal-scoped external professional access
- notifications, activity, calendar/deadlines and global search
- complaints/disputes
- privacy/data-rights and governed export packages
- Borrower Copilot with deterministic demo behavior and a prepared server-side open-source inference adapter

## Production architecture

```text
Borrower browser
   -> HttpOnly PiHub session
   -> Borrower API / authorization
   -> canonical PostgreSQL records + RLS
   -> command transaction
      -> state update
      -> immutable audit
      -> transactional outbox
   -> Advisory / Investor / Admin projections

Optional server-side providers
   -> Docling: document intelligence
   -> Documenso: e-signature
   -> Ollama: Borrower Copilot inference
   -> Apache Fineract: servicing/core-ledger integration candidate
   -> Temporal: durable workflow orchestration candidate
   -> DATEV / finAPI: external accounting/open-banking providers
```

`demo` runtime may use browser persistence and IndexedDB. `api` runtime uses the shared API and **does not persist canonical business state to localStorage**. Provider secrets/tokens are never represented in Borrower state.

## Open-source integrations prepared
See `docs/OPEN_SOURCE_COMPONENTS.md` for licenses and boundaries. Server adapter source exists for:
- Docling document intelligence
- Documenso envelope creation/distribution
- Ollama-compatible Borrower Copilot inference

Apache Fineract and Temporal are documented integration candidates rather than silently embedded dependencies. This keeps the app small and avoids pretending a core banking platform or workflow engine is needed merely to render a table.

## Design system
- PiHub Investor-derived institutional visual language
- IBM Plex Sans
- 232px desktop navigation rail / 68px utility header
- minimum 44px actions / 46px fields
- 4/8px spacing rhythm
- restrained corporate motion, transform/opacity only
- reduced-motion parity
- route lazy loading
- no decorative Three.js/GSAP/WebGL in finance workflows

## Runtime configuration

```text
VITE_PIHUB_RUNTIME=demo
# or
VITE_PIHUB_RUNTIME=api
VITE_PIHUB_API_BASE_URL=https://api.pihub-pi.com
```

Demo credentials:
- `borrower@pihub.demo`
- `Borrower2026!`

Server-side provider variables are documented in `supabase/FUNCTIONS.md`; they must never be prefixed with `VITE_`.

## Validation executed in this artifact
- local TypeScript source harness: **PASS**
- strict state/domain TypeScript compile: **PASS**
- domain/business transition tests: **38/38 PASS**
- static UI/security/architecture guards: **25/25 PASS**
- total executed automated business/static checks: **63/63 PASS**
- E2E TypeScript specification compilation: **PASS**

Dependency-backed Vite build and real Playwright/Axe browser execution remain repository/release gates because dependency installation was unavailable in this isolated runtime. No browser result is invented.

## Key documents
- `FEATURE_MATRIX.md`
- `INTEGRATION.md`
- `VALIDATION.md`
- `docs/PRODUCTION_BACKEND.md`
- `docs/OPEN_SOURCE_COMPONENTS.md`
- `docs/borrower-api.openapi.yaml`
- `design-dna/BORROWER_DNA.md`
- `supabase/migrations/0001_pihub_platform.sql`
- `supabase/migrations/0002_borrower_v05_advanced_features.sql`
