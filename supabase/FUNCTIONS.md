# PiHub server-only function configuration

These values belong in the backend/Edge Function secret store. **Never expose them as `VITE_*` variables.**

## Shared
- `PIHUB_INTERNAL_FUNCTION_KEY` - authenticates calls from the trusted PiHub API/service layer to internal provider adapters.
- `PIHUB_INTERNAL_JOB_KEY` - authenticates background jobs such as malware scanning and notification delivery.
- `SUPABASE_SERVICE_ROLE_KEY` - server-only. It may be used by trusted Edge Functions after the caller/object authorization boundary has already been enforced; it must never be shipped to the browser.

## Trust boundary
- Browser requests enter through `platform-api` with a Supabase user access token.
- `platform-api` validates the user with Supabase Auth. Privileged browser-to-BFF mutations also require the trusted Vercel OIDC identity.
- Organization/application/document authorization is resolved before invoking internal provider adapters.
- Internal adapters require an internal key and are not browser APIs.
- Document intelligence and e-sign adapters only consume short-lived HTTPS URLs from the configured Supabase Storage origin. They must not act as arbitrary remote-fetch proxies.
- E-signature distribution only receives documents that belong to the authorized application and whose malware scan status is `clean`.

## Document intelligence
- `DOCLING_SERVE_URL`
- `DOCLING_SERVE_API_KEY` - optional when the Docling service is privately networked/authenticated another way.

The adapter returns a canonical `providerJobId` for the queued provider task. `taskId` is retained temporarily as a compatibility alias.

## E-signature
- `DOCUMENSO_API_BASE_URL`
- `DOCUMENSO_API_TOKEN`

The platform resolves private document versions into short-lived signed URLs and maps signer data to the provider adapter. The adapter limits file count, recipient count, PDF type and source-document size before provider submission.

## Borrower Copilot
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_BEARER_TOKEN` - optional for protected/private gateways.

## Notifications
Configure the selected email/notification provider secrets only inside the notification-dispatch runtime.

## Deployment rule
The public Borrower client talks to the PiHub API, not directly to these functions. The API performs organization/deal authorization, redaction, idempotency and audit before invoking a provider adapter. Keep the static edge-contract tests in CI so payload names and trust-boundary assumptions cannot drift independently.
