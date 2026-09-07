# Borrower RLS verification — 2026-09-07

This evidence records a live, rollback-only verification of PiHub Borrower's Supabase authorization boundary against project `spednauhubdmgurdbnwc` on 2026-09-07.

It supplements migration review; it does not replace application/API authorization tests or future re-verification after schema/policy changes.

## Current Supabase guidance used

The verification follows the current Supabase RLS model:

- exposed tables use PostgreSQL row-level security;
- table grants and RLS policies both participate in authorization;
- an `UPDATE` policy needs the relevant `SELECT` access and appropriate `USING` / `WITH CHECK` predicates;
- `auth.uid()` / trusted JWT claims are appropriate policy inputs;
- service-role credentials must never be exposed to the browser.

No September 2026 Supabase breaking change affecting these RLS semantics was identified during the verification.

## Live catalog result

Every ordinary table in the exposed `public` schema had `relrowsecurity = true`.

The sensitive browser-facing tables below were verified with PostgreSQL `has_table_privilege` for the `authenticated` role:

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `applications` | yes | no | no | no |
| `company_vault_items` | yes | no | no | no |
| `data_room_folders` | yes | no | no | no |
| `documents` | yes | no | no | no |
| `financing_scenarios` | yes | no | no | no |
| `organizations` | yes | no | no | no |
| `request_messages` | yes | no | no | no |
| `signature_envelopes` | yes | no | no | no |
| `signature_signers` | yes | no | no | no |

This is deliberate: the browser may read authorized rows, but authoritative writes for these domains stay behind the trusted platform API / Edge Function boundary.

`profiles` is the documented exception for a browser mutation. Its live policy was verified as self-only: `SELECT` uses `user_id = auth.uid()` and `UPDATE` uses both a self-only `USING` predicate and the same self-only `WITH CHECK` predicate.

## Sensitive read policies inspected live

The following live policies were inspected:

- `applications.application_read` → `private.can_read_application(id)`
- `documents.document_read` → `private.can_read_application(application_id)`
- `financing_scenarios.scenario_read` → `private.can_read_application(application_id)`
- `request_messages.message_read` → request must resolve to an application passing `private.can_read_application`
- `signature_envelopes.signature_read` → `private.can_read_application(application_id)`
- `signature_signers.signer_read` → parent envelope's application must pass `private.can_read_application`
- `organizations.org_read` → organization membership or explicitly privileged platform role
- `organization_members.members_read` → organization membership or explicitly privileged platform role
- `company_vault_items.vault_read` → organization membership or explicitly privileged platform role
- `data_room_folders.data_room_read` → organization membership, readable linked application, or explicitly privileged platform role

## Cross-tenant live test

The connected project had zero real Auth users at verification time, so the test did **not** manufacture persistent customer accounts or mutate permanent application data.

Instead, the verifier:

1. began one transaction;
2. inserted two synthetic `auth.users`, two organizations and organization memberships;
3. inserted paired synthetic applications, documents, request messages, data-room folders, company-vault items, financing scenarios, signature envelopes and signers;
4. switched to PostgreSQL role `authenticated`;
5. set the JWT subject to synthetic Tenant A's user;
6. queried both Tenant A and Tenant B fixtures;
7. asserted Tenant A could see exactly its own row and **zero** Tenant B rows for every tested domain;
8. reset the role and rolled the entire transaction back.

The live assertion output was:

| Assertion | Actual | Expected |
| --- | ---: | ---: |
| visible applications | 1 | 1 |
| cross-tenant application | 0 | 0 |
| visible documents | 1 | 1 |
| cross-tenant document | 0 | 0 |
| visible request messages | 1 | 1 |
| cross-tenant request message | 0 | 0 |
| visible data rooms | 1 | 1 |
| cross-tenant data room | 0 | 0 |
| visible organizations | 1 | 1 |
| cross-tenant organization | 0 | 0 |
| visible company vault items | 1 | 1 |
| cross-tenant company vault item | 0 | 0 |
| visible financing scenarios | 1 | 1 |
| cross-tenant financing scenario | 0 | 0 |
| visible signature envelopes | 1 | 1 |
| cross-tenant signature envelope | 0 | 0 |
| visible signature signers | 1 | 1 |
| cross-tenant signature signer | 0 | 0 |

No fixture rows were retained because the transaction ended with `ROLLBACK`.

## Repeatable verifier

`supabase/tests/rls_tenant_boundary.sql` contains the repeatable self-asserting version of this verification. It also fails if any ordinary `public` table has RLS disabled or if the listed authoritative tables gain direct browser `INSERT`, `UPDATE` or `DELETE` grants.

Run this check against a controlled verification database after policy/grant migrations and before a production cutover. Do not run synthetic fixture tests against a live customer dataset without an approved operational procedure.

## What this proves

For the verified schema state, authenticated browser access cannot directly mutate the listed authoritative tables and the tested read policies deny the synthetic cross-tenant reads for applications, documents, messages, data rooms, organizations, company-vault data, financing scenarios and e-sign records.

## What this does not prove

- It does not prove every future policy or migration remains safe.
- It does not replace Edge Function/API authorization tests.
- It does not validate service-role handling in browser bundles; that is a separate static/runtime trust-boundary check.
- It does not make the e-sign provider itself trusted; provider webhook authentication/replay/tamper controls are validated separately.
