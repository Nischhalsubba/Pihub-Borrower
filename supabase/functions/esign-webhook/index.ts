import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_WEBHOOK_BYTES = 256 * 1024;
const ALLOWED_EVENTS = new Set([
  'DOCUMENT_CREATED',
  'DOCUMENT_SENT',
  'DOCUMENT_OPENED',
  'DOCUMENT_SIGNED',
  'DOCUMENT_RECIPIENT_COMPLETED',
  'DOCUMENT_COMPLETED',
  'DOCUMENT_REJECTED',
  'DOCUMENT_CANCELLED',
  'RECIPIENT_EXPIRED',
  'DOCUMENT_REMINDER_SENT',
]);

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes(value));
  return Array.from(new Uint8Array(digest), (part) => part.toString(16).padStart(2, '0')).join('');
}

async function secretsMatch(provided: string, expected: string): Promise<boolean> {
  if (!provided || !expected) return false;
  const [providedHash, expectedHash] = await Promise.all([sha256(provided), sha256(expected)]);
  if (providedHash.length !== expectedHash.length) return false;
  let difference = 0;
  for (let index = 0; index < providedHash.length; index += 1) {
    difference |= providedHash.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  }
  return difference === 0;
}

function validIsoTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function sanitizedRecipients(payload: Record<string, unknown>): Array<Record<string, string | null>> {
  const raw = Array.isArray(payload.recipients)
    ? payload.recipients
    : Array.isArray(payload.Recipient)
      ? payload.Recipient
      : [];

  return raw.slice(0, 50).flatMap((recipient) => {
    if (!recipient || typeof recipient !== 'object') return [];
    const value = recipient as Record<string, unknown>;
    if (typeof value.email !== 'string' || !value.email.includes('@')) return [];
    return [{
      email: value.email.trim().toLowerCase().slice(0, 320),
      signingStatus: typeof value.signingStatus === 'string' ? value.signingStatus.slice(0, 40) : null,
      readStatus: typeof value.readStatus === 'string' ? value.readStatus.slice(0, 40) : null,
      sendStatus: typeof value.sendStatus === 'string' ? value.sendStatus.slice(0, 40) : null,
      signedAt: validIsoTimestamp(value.signedAt),
      expiresAt: validIsoTimestamp(value.expiresAt),
    }];
  });
}

function earliestExpiry(recipients: Array<Record<string, string | null>>): string | null {
  const expiries = recipients
    .map((recipient) => recipient.expiresAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  return expiries[0] ?? null;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const webhookSecret = Deno.env.get('DOCUMENSO_WEBHOOK_SECRET') ?? '';
  if (!webhookSecret) return json(503, { error: 'webhook_not_configured' });

  const suppliedSecret = request.headers.get('x-documenso-secret') ?? '';
  if (!(await secretsMatch(suppliedSecret, webhookSecret))) {
    return json(401, { error: 'invalid_webhook_secret' });
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
    return json(413, { error: 'payload_too_large' });
  }

  const rawBody = await request.text();
  if (bytes(rawBody).byteLength > MAX_WEBHOOK_BYTES) {
    return json(413, { error: 'payload_too_large' });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const event = typeof body.event === 'string' ? body.event : '';
  const createdAt = validIsoTimestamp(body.createdAt);
  const payload = body.payload && typeof body.payload === 'object'
    ? body.payload as Record<string, unknown>
    : null;
  const envelopeId = payload && typeof payload.envelopeId === 'string'
    ? payload.envelopeId.trim()
    : '';

  if (!ALLOWED_EVENTS.has(event) || !createdAt || !payload || !/^envelope_[A-Za-z0-9_-]{8,128}$/.test(envelopeId)) {
    return json(400, { error: 'invalid_webhook_payload' });
  }

  const recipients = sanitizedRecipients(payload);
  const payloadHash = await sha256(rawBody);
  const providerEventKey = `documenso:${await sha256(`${event}\n${envelopeId}\n${createdAt}\n${payloadHash}`)}`;
  const completedAt = validIsoTimestamp(payload.completedAt);
  const providerExpiresAt = earliestExpiry(recipients);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseSecret = Deno.env.get('SUPABASE_SECRET_KEY')
    ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    ?? '';
  if (!supabaseUrl || !supabaseSecret) {
    return json(503, { error: 'database_not_configured' });
  }

  const service = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await service.rpc('pihub_apply_signature_webhook', {
    provider_event_key: providerEventKey,
    external_envelope_key: envelopeId,
    provider_event_name: event,
    provider_event_created_at: createdAt,
    provider_payload_sha256: payloadHash,
    provider_recipients: recipients,
    provider_completed_at: completedAt,
    provider_expires_at: providerExpiresAt,
  });

  if (error) {
    const knownClientError = /signature_envelope_not_found|unsupported_signature_event|invalid_signature_webhook/.test(error.message ?? '');
    return json(knownClientError ? 400 : 500, { error: knownClientError ? 'webhook_rejected' : 'webhook_processing_failed' });
  }

  const result = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  return json(200, {
    received: true,
    duplicate: result.duplicate === true,
    status: typeof result.status === 'string' ? result.status : undefined,
  });
});
