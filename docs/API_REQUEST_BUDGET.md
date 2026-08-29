# PiHub Borrower API Request Budget

PiHub Borrower treats backend requests as a finite operational budget. The product must minimize network and database round trips without weakening authorization, auditability, or freshness of finance-critical state.

## Request budget targets

| User flow | Target network calls |
| --- | ---: |
| Existing authenticated app load | 1 request when session includes snapshot; otherwise 2 maximum |
| Successful sign-in | 1 request when login includes snapshot; otherwise 1 login + cached/coalesced bootstrap |
| Duplicate concurrent GETs | 1 shared request |
| Repeated identical safe command within 5 seconds | 1 shared request |
| Normal mutation | 1 command request |
| Burst of mutations | N command requests + at most 1 delayed reconciliation bootstrap |
| Telemetry | batched, max 1 request per 15 seconds during activity plus page-hide flush |
| Background idle tab | 0 polling requests |

## Client rules

1. GET requests that are safe to reuse are coalesced while in flight.
2. Session data uses a short in-memory TTL. It is cleared on sign-in/sign-out.
3. Borrower bootstrap data uses a very short in-memory TTL and is invalidated on accepted mutations.
4. Session/login responses may include the authoritative Borrower `snapshot`; when present, that same payload primes bootstrap state so no second startup request is required.
5. Exact duplicate commands share one in-flight or recent result only for a conservative five-second allowlist of idempotent/set-style commands.
6. A command response may return an authoritative `snapshot`. When present, the client applies it and performs no follow-up bootstrap.
7. When the legacy command response does not include a snapshot, reconciliation is delayed and coalesced across the editing burst instead of reloading after every command.
8. Reconciliation never polls continuously. It runs only after mutations, explicit reload, authentication transitions, or a recovery path.
9. Telemetry is queued and emitted in bounded batches. Sensitive fields remain scrubbed.
10. Third-party provider calls remain server-to-server and completed expensive work is reused where a conclusive result already exists.
11. Finance-critical writes remain server-authoritative, idempotent, auditable, and protected by RLS/API authorization.

## Server evolution rule

The preferred session/login response can include:

```json
{
  "authenticated": true,
  "user": { "...": "authorized user projection" },
  "snapshot": { "...": "authoritative BorrowerState" }
}
```

This allows authentication and initial Borrower state hydration to complete with one network request.

The preferred command response contract is:

```json
{
  "accepted": true,
  "version": 42,
  "snapshot": { "...": "authoritative BorrowerState" }
}
```

Returning the canonical snapshot or a bounded canonical delta from the same transaction eliminates the extra bootstrap request entirely. Until the central PiHub command API implements that response, the client uses one coalesced reconciliation after a short mutation burst.

## Anti-patterns

- polling the bootstrap endpoint on an interval
- one API request per keystroke
- reloading the entire Borrower state after every mutation
- issuing the same GET from multiple components simultaneously
- sending one telemetry request per UI event
- replaying an expensive provider operation after a conclusive result already exists
- directly querying many Supabase tables from the browser to assemble a page

The canonical production architecture remains browser -> PiHub API -> PostgreSQL/Supabase and provider adapters. The API should batch database reads and use joins/RPCs rather than N+1 queries.