# PiHub server-only function configuration

These values belong in the backend/Edge Function secret store. **Never expose them as `VITE_*` variables.**

## Shared
- `PIHUB_INTERNAL_FUNCTION_KEY` - authenticates calls from the trusted PiHub API/service layer to internal provider adapters.

## Document intelligence
- `DOCLING_SERVE_URL`
- `DOCLING_SERVE_API_KEY` - optional when the Docling service is privately networked/authenticated another way.

## E-signature
- `DOCUMENSO_API_BASE_URL`
- `DOCUMENSO_API_TOKEN`

## Borrower Copilot
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_BEARER_TOKEN` - optional for protected/private gateways.

## Notifications
Configure the selected email/notification provider secrets only inside the notification-dispatch runtime.

## Deployment rule
The public Borrower client talks to the PiHub API, not directly to these functions. The API performs organization/deal authorization, redaction, idempotency and audit before invoking a provider adapter.
