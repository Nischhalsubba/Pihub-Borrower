# Borrower Roadmap Completion v1

Date: 2026-08-30

This release closes the remaining partial items from the 12-point Borrower integration roadmap without introducing module-specific copies of canonical PiHub deals.

## Platform completion
- Same-origin Vercel BFF owns browser authentication cookies and proxies the shared PiHub platform API.
- Supabase access/refresh tokens remain HttpOnly and never enter browser storage.
- Vercel OIDC authenticates the BFF to privileged Supabase Edge API routes.
- Canonical Borrower commands are reduced on the server against the current authoritative snapshot, then committed with optimistic revision and snapshot preconditions.
- The server re-checks organization roles and finance/legal/signatory gates for sensitive commands.
- Revision-aware workspace reads return `unchanged`, a bounded top-level patch, or a full snapshot only when a patch is unsafe.

## Cross-module completion
- Advisory, Admin/Compliance and Investor canonical domain changes automatically emit safe outbox consequences.
- Borrower notifications are created from those canonical events with no background polling loop.
- Advisory/Investor event inboxes are deal scoped through user or organization access grants. A platform role alone is not record visibility.
- Module event acknowledgement uses the same deal-level authorization.
- Borrower-facing event payloads exclude internal compliance evidence/risk notes and investor rationale.

## Borrower experience
- Company, Project and Financial forms now expose persistent completion progress, required-field summaries, focusable validation links, dirty-state unload protection and sticky save state.
- The Applications contextual navigation keeps frequent work visible while moving lower-frequency tools into an accessible `More` surface. Deep links and global search remain unchanged.
- Company Vault reuse remains canonical and does not duplicate document bytes or version history.

## Deployment boundary
The code is API-runtime capable in Vercel. Production activation must not make the application unusable: the Supabase tenant currently has no provisioned identities, so release verification must confirm an approved identity/onboarding path before the production build is switched from the verified demo runtime to authenticated API mode.

Third-party provider credentials (DATEV, finAPI, Documenso, Docling/Ollama endpoints, mail/scanner providers) remain environment integrations rather than application completeness blockers. Their secrets stay server-side.
