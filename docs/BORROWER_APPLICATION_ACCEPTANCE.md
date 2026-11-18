# Borrower application and servicing acceptance criteria

> Status: contributor review checklist, not a claim that the product has passed an audit. This document introduces review expectations; it does not change application behavior.

## Why this exists

Define auditable, user-centered tests for origination, finance calculations, document access and servicing requests.

## Review rules

1. Capture which financing product and eligibility assumptions apply before displaying estimated LTV, LTC, DSCR, debt service or all-in costs. Record formulas, denominators, currencies, periods and rounding.
2. Keep application drafts, submitted revisions, underwriter decisions and signed documents as separate states. A disabled submission is not a successful submission; errors must preserve entered data.
3. Test team roles, organizations, data-room permissions and expired access across both UI and server/provider boundaries; hiding a button is not authorization.
4. Obtain granular consent before connecting financial data, uploading sensitive documents or contacting signatories. Explain retention and revocation semantics where implemented.
5. Repayment or disbursement requests must not be represented as bank-settled transactions without reconciliation from the proper provider.
6. Verify timeouts, incomplete KYC, rejected uploads, mismatched signatures, stale offers and conflict between simultaneous edits.

## Verification

From repository root run `npm run typecheck`, `npm run test` and `npm run build`. For changed browser flows also run `npm run test:e2e`. Validate a role matrix for borrower, team member and unauthorized user with fixture data; do not use real borrower identities.

## Required evidence in a change request

PR: journey and state transitions, exact numerical examples, input/consent provenance, permission matrix, API boundary, screenshots of failure and recovery, executed commands and risk owner.

## Rollback and incident response

Preserve submitted application versions and audit events. Disable a broken request path and restore a previous presentation, never silently rewrite a signed offer or payment record.

## Acceptance criteria

- [ ] The change addresses a stated user or maintainer risk.
- [ ] Evidence and source-of-truth references are attached or explicitly marked unavailable.
- [ ] Relevant automated checks are reported with actual outcomes; unrun checks are not marked passing.
- [ ] Negative, failure and recovery states are accounted for.
- [ ] A reviewer can understand what changed, remaining risk and how to revert it.

Document owner: repository maintainers. Review this checklist when workflows, dependencies or public claims materially change.
