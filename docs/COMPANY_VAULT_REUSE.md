# Company Vault Application Reuse

Date: 2026-08-30

## Purpose
A reusable corporate document should remain one canonical PiHub document, not become a new file every time the same organization starts another financing request.

## Design
`application_document_links` connects a target application to an existing Company Vault document.

The link is allowed only when:
- the caller is an active member of the target application's organization;
- the vault item belongs to that same organization;
- the vault item is reusable and not expired;
- the source document belongs to an application owned by the same organization;
- the source document is accepted;
- the current source document version exists and its malware status is `clean`.

The reuse operation never inserts a new `documents` or `document_versions` row. Object storage bytes, hashes, malware state and version history remain attached to the source document identity.

## Audit and cross-module consequences
A successful reuse emits `document.vault_reused` on the canonical outbox for Advisory/Admin consumers. The target application projection reports `linkedToApplication=true` for that vault item.

## Browser/security boundary
The link table is server-owned with RLS enabled and browser privileges revoked. `pihub_borrower_reuse_vault_item` is executable by `service_role` only. `platform-api` verifies the caller JWT and forwards the verified user ID; the RPC re-checks organization ownership before linking.

## Borrower experience
Advanced Data Room shows each reusable Company Vault item as either:
- `Reusable` + **Reuse in application**; or
- `Used in this application`.

Demo mode preserves the same interaction contract locally. Production API mode will use the canonical link after the complete PiHub BFF/session cutover.
