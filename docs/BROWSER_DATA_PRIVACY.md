# Browser data privacy boundary

PiHub Borrower treats the browser as a presentation and short-lived interaction surface, not as authoritative storage for borrower identity, financial or document data.

## Production/API mode

- Authoritative application state is loaded from the authenticated PiHub platform API.
- Mutations are sent as server-authoritative commands with idempotency keys.
- Document uploads use a server-issued upload intent and are finalized through the protected platform command boundary.
- The borrower state store does not restore or persist the server snapshot through `localStorage`, `sessionStorage` or IndexedDB.
- Document downloads are requested from the protected document endpoint and object URLs are revoked after use.

## Demo mode

Demo mode is intentionally ephemeral even though its seeded examples are synthetic.

- Borrower state starts from `createInitialState()` on every page load.
- Changes live only in React memory for the current page lifetime.
- Selected demo document blobs are held in an in-memory `Map`, never IndexedDB.
- The generic demo-state helper is also memory-only.
- Resetting the demo clears the in-memory document map and restores the synthetic initial state.
- The UI explicitly reports `Session only · cleared on refresh` rather than implying durable autosave.

This protects a user who mistakenly enters or selects real information while exploring the demo: the application does not intentionally write that content into persistent browser storage.

## Telemetry

Telemetry is opt-out aware (`navigator.doNotTrack`) and uses an explicit property allowlist. Only operational metadata such as route, component, status, source and error type is eligible.

The scrubber rejects:

- properties outside the allowlist;
- long or empty strings;
- email-like strings;
- URLs;
- long digit/account-like values;
- common sensitive filenames/extensions;
- bearer/JWT-like values;
- long hexadecimal/high-entropy token-like values.

Names, document values, account/bank fields, amounts, application payloads, tokens, messages, notes and filenames are not allowlisted.

Runtime error monitoring intentionally emits only an error type and a coarse source label.

## Verification

`tests/browser-data-privacy.test.mjs` is part of `npm run test:static`. It fails if the borrower store/document helper reintroduces `localStorage`, `sessionStorage` or IndexedDB, or if telemetry returns to a denylist model or explicitly allows sensitive field categories.

Future features that need offline/persistent borrower data require a separate privacy and threat review rather than weakening this contract.
