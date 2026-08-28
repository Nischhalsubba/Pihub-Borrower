# PiHub Borrower v0.4 — Functional Completeness Release Contract

**Release artifact:** PiHub Borrower v0.4  
**Branch:** `feat/borrower-v0.4-functional-completeness`  
**Base:** `main`  
**Target PR:** `feat: complete Borrower lifecycle and servicing`

> This document is the acceptance contract for v0.4. It intentionally distinguishes **planned scope** from **verified implementation**. The release is not complete merely because a screen exists; every user-visible action must have a defined start state, runtime behavior, persistence boundary, resulting state, failure behavior, authorization rule, and test coverage.

---

## 1. Executive summary

PiHub Borrower v0.4 turns the standalone Borrower application from a primarily origination-focused workspace into a complete borrower lifecycle surface that is ready to connect to a production backend without rewriting the frontend contract.

The release is organized around seven outcomes:

1. **Lifecycle completeness** — every Borrower journey has a defined beginning, intermediate state, terminal outcome, and recovery path.
2. **Post-funding servicing** — the product does not stop at closing; funded borrowers can understand obligations, servicing status, documents, activity, and next actions.
3. **Runtime API boundary** — UI code consumes a stable application-facing API contract rather than coupling directly to persistence details.
4. **Canonical domain events** — important state changes emit a consistent event vocabulary suitable for audit, notifications, analytics, integrations, and future workflow automation.
5. **Backend and RLS preparation** — frontend contracts explicitly carry the identifiers and ownership assumptions required for secure tenant/user-scoped persistence.
6. **Security hardening** — authorization, unsafe state transitions, sensitive data exposure, insecure defaults, and error handling are treated as product behavior, not cleanup.
7. **Evidence-based release quality** — unit, build, end-to-end, accessibility, and negative-path checks are release gates.

This repository remains **Borrower-only**. Investor, Advisory, Admin, and Access applications are outside this repository's ownership boundary.

---

## 2. Release principles

### 2.1 Complete flows, not decorative controls

A feature is complete only when all of the following exist:

- entry point;
- eligibility/precondition checks;
- user action;
- loading/pending behavior;
- runtime/API call or explicit local-only behavior;
- success result;
- resulting persisted/domain state;
- error and retry behavior;
- authorization rule;
- audit/event emission where relevant;
- downstream visibility in the appropriate Borrower surface;
- automated coverage for the happy path and material failure paths.

Buttons that merely change local UI state without a defined product outcome do not satisfy v0.4 acceptance.

### 2.2 Frontend implementation must preserve backend replaceability

UI components must not depend on database table shapes, RLS implementation details, provider-specific SDK response objects, or transport-specific error formats. Those concerns belong behind the runtime boundary.

### 2.3 Secure-by-default state transitions

The client may improve UX by hiding impossible or unauthorized actions, but it must never be treated as the authority for permissions or lifecycle validity. Every mutating runtime operation must be designed so the backend can independently validate actor, resource ownership, current state, target state, and transition policy.

### 2.4 Canonical events are product contracts

Events represent meaningful domain facts, not arbitrary UI clicks. They should be stable enough to support audit trails, notifications, analytics, and future cross-module orchestration.

---

## 3. Scope

### 3.1 Borrower lifecycle completeness

v0.4 must provide a coherent path across the Borrower lifecycle:

1. access/authenticated entry;
2. borrower/company/project context;
3. financing discovery and eligibility context;
4. application creation;
5. application data completion;
6. document request and document completion state;
7. submission/readiness validation;
8. review/status progression visible to the borrower;
9. offer/terms acknowledgement where applicable;
10. closing/readiness tracking;
11. funding outcome;
12. post-funding servicing;
13. account/history/document continuity after funding.

Each stage must expose the current state, the next valid borrower action, blockers, and the resulting outcome.

### 3.2 Post-funding servicing

The funded state must be treated as an active product phase rather than a terminal success screen. The servicing surface should be able to represent, as contracts and backend availability permit:

- active financing/facility summary;
- principal or committed amount;
- funded/disbursed amount;
- repayment or servicing schedule summary;
- next due item/date where applicable;
- servicing status;
- borrower-visible notices;
- required servicing actions;
- statements and financing documents;
- payment/repayment activity history;
- support/contact escalation path;
- lifecycle/event history relevant to the borrower.

No servicing UI should fabricate financial truth. Unknown or unavailable backend values must render as unavailable/pending states rather than plausible-looking placeholders.

### 3.3 Runtime API boundary

Introduce or complete an application-facing runtime layer with these characteristics:

- typed request/response contracts where the codebase permits;
- normalized error model;
- explicit loading, empty, success, conflict, unauthorized, forbidden, validation, and server-failure states;
- cancellation/stale-response protection for request-driven views where relevant;
- no direct persistence coupling from presentation components;
- no provider-specific response objects leaking into domain/UI state;
- test doubles/fakes that use the same public runtime contract;
- a clear path from current frontend data sources to a real backend without component rewrites.

Recommended conceptual separation:

`UI -> application/runtime service -> transport adapter -> backend`

The exact file structure may evolve, but the dependency direction must remain one-way.

### 3.4 Canonical domain events

The implementation should converge on a small, documented, versionable event vocabulary. Candidate event families include:

- `borrower.profile.updated`
- `borrower.company.updated`
- `borrower.project.updated`
- `financing.application.created`
- `financing.application.updated`
- `financing.application.submitted`
- `financing.application.status_changed`
- `document.requested`
- `document.uploaded`
- `document.accepted`
- `document.rejected`
- `financing.offer.received`
- `financing.offer.acknowledged`
- `closing.requirement.completed`
- `financing.funded`
- `servicing.schedule.updated`
- `servicing.payment.recorded`
- `servicing.notice.published`

Event names may change during implementation, but v0.4 must avoid multiple names for the same domain fact.

Every canonical event should define:

- event name/version;
- event ID;
- occurred-at timestamp;
- actor/subject identity where appropriate;
- borrower/account/application/facility correlation identifiers as applicable;
- previous and resulting state for state transitions where safe and useful;
- payload schema;
- privacy classification;
- idempotency expectations for backend processing.

### 3.5 Backend and RLS preparation

The frontend/runtime contract must be compatible with row-level authorization and tenant/resource isolation. Preparation includes:

- stable resource IDs instead of display labels as authorities;
- explicit borrower/user/account/application/facility ownership context;
- no client-generated authorization decisions treated as authoritative;
- mutation contracts that let the server validate the current resource state;
- avoidance of broad list queries that assume unrestricted table access;
- clear distinction between borrower-owned, borrower-visible, and system-managed records;
- server-generated audit timestamps and security-sensitive fields where appropriate;
- no secrets, service-role credentials, or privileged tokens in the browser bundle;
- future RLS policies able to answer: **who is this actor, what resource is being accessed, and why are they allowed to access it?**

### 3.6 Security hardening

Security acceptance must cover at least:

- authentication-required routes behaving safely when session state is missing/expired;
- borrower-only resource access assumptions preserved;
- authorization-friendly runtime contracts;
- sensitive values not persisted to browser storage unless explicitly justified;
- no credentials, secrets, service-role tokens, or private keys in client code;
- output rendered safely without unsafe HTML injection;
- mutating actions protected against accidental duplicate submission;
- state-transition requests capable of server-side conflict checking;
- normalized errors that do not leak internal stack traces or raw provider payloads to users;
- file/document flows prepared for type/size/status validation and server-side authorization;
- open redirects and unvalidated external navigation avoided;
- destructive or irreversible actions requiring explicit confirmation where applicable;
- dependency/build warnings reviewed before release.

### 3.7 Documentation

v0.4 documentation must leave future engineers able to answer:

- what the Borrower repository owns;
- what v0.4 changes;
- what each lifecycle state means;
- what the runtime boundary guarantees;
- what canonical events exist;
- what the backend must enforce;
- what RLS/authorization assumptions the frontend makes;
- how to run the quality gates;
- what is intentionally deferred.

---

## 4. Lifecycle state model

The exact domain model may be refined during implementation, but UI behavior should map to explicit states rather than scattered booleans.

### 4.1 Application-level states

A representative state progression is:

`draft -> incomplete -> ready_to_submit -> submitted -> in_review -> action_required -> approved/declined/withdrawn -> closing -> funded`

Rules:

- invalid transitions are not offered in the UI;
- the runtime/backend remains authoritative for whether a transition is valid;
- rejected/conflicted transitions return a recoverable state and refresh current truth;
- borrower-visible status labels are derived from canonical domain state;
- terminal states remain visible in history even when no longer actionable.

### 4.2 Servicing-level states

A funded facility may require a separate servicing status, for example:

`pending_activation -> active -> attention_required -> delinquent -> completed/closed`

These labels are illustrative until backend contracts are finalized. The release requirement is the separation of origination status from servicing status so the system does not overload one field with incompatible meanings.

---

## 5. UX and accessibility acceptance

v0.4 must preserve the established Borrower/Investor-derived UI contract while prioritizing functional clarity.

Required behavior:

- consistent shell, spacing, typography, controls, status treatment, and action hierarchy;
- a single visually dominant next action per workflow context where possible;
- disabled actions explain the blocker rather than silently failing;
- keyboard-accessible navigation and controls;
- visible focus treatment;
- semantic labels for forms and interactive controls;
- touch-safe targets on compact layouts;
- no horizontal document overflow at supported breakpoints;
- loading states do not cause destructive layout shifts;
- empty states explain what the user can do next;
- error messages are specific enough to recover from without exposing internals;
- reduced-motion preferences are respected for non-essential animation.

---

## 6. Testing and evidence matrix

The repository exposes the following release-relevant commands:

```bash
npm ci --legacy-peer-deps
npm run test:unit
npm run build
npm run test:e2e
```

v0.4 acceptance requires evidence across the following matrix.

| Area | Minimum evidence |
|---|---|
| Lifecycle state logic | Unit tests for allowed/blocked transitions and derived UI state |
| Runtime layer | Unit tests for success, validation, auth, forbidden, conflict, network/server failure normalization |
| Critical borrower flows | Playwright coverage from entry through at least one complete origination path |
| Post-funding servicing | Playwright coverage for funded state, servicing summary, next action, and history/document visibility |
| Forms | Validation, submission, duplicate-submit protection, and recoverable failure behavior |
| Documents | Request/status behavior plus invalid/unavailable-state coverage |
| Authorization UX | Expired/missing session and unauthorized/forbidden responses |
| Responsive UI | Existing layout contract plus new v0.4 surfaces at representative desktop/compact widths |
| Accessibility | Keyboard navigation and automated accessibility checks on critical screens |
| Build | Production build passes with no release-blocking errors |

A passing build alone is not sufficient evidence of functional completeness.

---

## 7. Observability and diagnosability

Where the runtime/backend interface permits, production-facing operations should be diagnosable using correlation-safe metadata rather than raw sensitive payloads.

The design should support:

- request/correlation IDs;
- canonical event IDs;
- meaningful client error categories;
- non-sensitive operation names;
- timestamps;
- current/target state for failed transitions where safe;
- enough context for support engineers to distinguish validation, authorization, conflict, transport, and server failures.

Sensitive financial or identity data must not be copied indiscriminately into client logs.

---

## 8. Rollout and rollback

### Rollout

1. Keep the PR in draft while functional slices are incomplete.
2. Land work in reviewable commits/slices rather than one opaque final commit.
3. Run unit tests and production build on every meaningful integration point.
4. Run critical Playwright flows before marking ready for review.
5. Verify the preview deployment against the same lifecycle acceptance criteria.
6. Merge only when the acceptance checklist is evidence-backed.
7. Produce the **PiHub Borrower v0.4** release artifact from the verified merge commit.

### Rollback

v0.4 must remain rollback-friendly:

- no frontend deployment may require an irreversible client-side migration;
- backend contract changes should remain backward-compatible during rollout where feasible;
- new runtime behavior should fail closed or degrade to a clear unavailable state rather than inventing data;
- release notes must identify any backend/schema dependency that makes simple frontend rollback unsafe.

---

## 9. Definition of done

The release is complete only when all applicable items below are checked with evidence in the PR.

### Functional completeness

- [ ] All primary Borrower lifecycle entry points are connected to end states.
- [ ] Application status is represented by canonical domain state.
- [ ] Action-required/recovery paths are implemented.
- [ ] Closing/funding transition is represented coherently.
- [ ] Funded borrowers enter a real servicing experience rather than a dead-end success state.
- [ ] Documents and account/history remain continuous across lifecycle phases.

### Runtime and backend readiness

- [ ] Presentation components depend on a stable runtime/application boundary.
- [ ] Runtime errors are normalized.
- [ ] Mutations are designed for server-side transition validation.
- [ ] Resource identifiers/ownership context are RLS-friendly.
- [ ] No privileged backend credential is exposed to the client.
- [ ] Canonical event vocabulary is documented and used consistently.

### Security

- [ ] Missing/expired session behavior is verified.
- [ ] Unauthorized and forbidden behavior is verified.
- [ ] Sensitive data storage/logging has been reviewed.
- [ ] Duplicate/unsafe mutations are guarded.
- [ ] Document/file actions are authorization-ready.
- [ ] No release-blocking dependency/security issue remains unexplained.

### Quality

- [ ] `npm run test:unit` passes.
- [ ] `npm run build` passes.
- [ ] `npm run test:e2e` passes for critical flows.
- [ ] Accessibility checks pass for critical flows.
- [ ] Desktop and compact responsive behavior is manually verified.
- [ ] Preview deployment is verified before merge.

### Documentation and release

- [ ] PR body reflects the final implementation, not merely the original plan.
- [ ] Material architectural decisions are documented.
- [ ] Backend/RLS dependencies are documented.
- [ ] Known limitations/deferred work are explicit.
- [ ] Release notes for **PiHub Borrower v0.4** are complete.

---

## 10. Explicit non-goals

Unless required to make a Borrower flow genuinely complete, v0.4 does not aim to:

- recreate Investor, Advisory, Admin, or Access inside this repository;
- make the browser an authorization authority;
- embed database/provider implementation details into React components;
- invent production financial data when a backend endpoint is unavailable;
- complete unrelated visual redesign work outside Borrower lifecycle/servicing needs;
- replace the future dedicated PiHub Platform/package strategy.

---

## 11. Reviewer guide

Review the PR in this order:

1. **Domain truth:** Are lifecycle states and transitions coherent?
2. **End-to-end behavior:** Does every action terminate in a meaningful, recoverable outcome?
3. **Runtime boundary:** Can the backend implementation change without rewriting UI components?
4. **Authorization posture:** Can the server independently validate every sensitive read/mutation?
5. **Servicing continuity:** Does funding lead into an ongoing borrower experience?
6. **Events/auditability:** Are material domain facts represented consistently?
7. **Failure modes:** Are validation, conflicts, expired sessions, forbidden access, and server failures recoverable?
8. **Evidence:** Do automated tests and preview verification prove the behavior?
9. **Maintainability:** Is the implementation understandable without tribal knowledge?

A reviewer should request changes for any feature that appears visually complete but lacks a real runtime outcome or secure server-enforceable contract.

---

## 12. PR status convention

The PR should remain **Draft** while any release-critical implementation item is pending. Checkboxes in the PR description are evidence markers, not aspirational decoration.

When the final implementation is ready, the PR description must be updated with:

- exact implementation summary;
- changed architecture/contracts;
- test results;
- preview/deployment evidence;
- security review notes;
- known limitations;
- migration/rollback notes;
- final release artifact/version.
