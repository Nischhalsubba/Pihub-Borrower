// Internal PiHub -> Documenso v2 envelope adapter. Provider API keys remain server-side.
const noStore = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: noStore });
type Field = { identifier: number; type: 'SIGNATURE'|'DATE'|'NAME'|'EMAIL'|'TEXT'; page: number; positionX: number; positionY: number; width: number; height: number };
type Recipient = { email: string; name: string; role?: 'SIGNER'|'APPROVER'|'CC'|'VIEWER'; signingOrder?: number; fields?: Field[] };
const MAX_FILES = 10;
const MAX_RECIPIENTS = 20;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const expectedInternalKey = Deno.env.get('PIHUB_INTERNAL_FUNCTION_KEY');
  if (!expectedInternalKey || req.headers.get('x-pihub-internal-key') !== expectedInternalKey) return json({ error: 'unauthorized' }, 401);

  const token = Deno.env.get('DOCUMENSO_API_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const baseUrl = (Deno.env.get('DOCUMENSO_API_BASE_URL') ?? 'https://app.documenso.com/api/v2').replace(/\/$/, '');
  if (!token || !supabaseUrl) return json({ error: 'esign_not_configured' }, 503);
  const storageHost = new URL(supabaseUrl).hostname;
  const body = await req.json().catch(() => ({})) as { externalId?: string; title?: string; files?: Array<{ name: string; signedUrl: string }>; recipients?: Recipient[] };
  if (!body.title || !body.files?.length || !body.recipients?.length) return json({ error: 'invalid_request' }, 400);
  if (body.files.length > MAX_FILES || body.recipients.length > MAX_RECIPIENTS) return json({ error: 'request_too_large' }, 413);
  if (body.recipients.some((recipient) => !recipient.name?.trim() || !EMAIL.test(recipient.email ?? ''))) {
    return json({ error: 'invalid_recipient' }, 400);
  }

  const form = new FormData();
  form.append('payload', JSON.stringify({ type: 'DOCUMENT', title: body.title, externalId: body.externalId, recipients: body.recipients.map((r) => ({ ...r, role: r.role ?? 'SIGNER' })) }));
  for (const file of body.files) {
    let sourceUrl: URL;
    try {
      sourceUrl = new URL(file.signedUrl);
    } catch {
      return json({ error: 'invalid_file_url' }, 400);
    }
    // Only consume short-lived URLs created by the configured private Supabase
    // storage origin. Never allow this internal adapter to fetch arbitrary URLs.
    if (sourceUrl.protocol !== 'https:' || sourceUrl.hostname !== storageHost) return json({ error: 'untrusted_file_url' }, 400);
    const source = await fetch(sourceUrl);
    if (!source.ok) return json({ error: 'source_document_unavailable', file: file.name }, 502);
    const contentLength = Number(source.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_BYTES) return json({ error: 'source_document_too_large', file: file.name }, 413);
    const contentType = (source.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
    if (contentType && contentType !== 'application/pdf') return json({ error: 'unsupported_document_type', file: file.name }, 415);
    const bytes = await source.arrayBuffer();
    if (bytes.byteLength > MAX_SOURCE_BYTES) return json({ error: 'source_document_too_large', file: file.name }, 413);
    const safeName = (file.name || 'document.pdf').replace(/[\r\n"\\/]/g, '_').slice(0, 180);
    form.append('files', new File([bytes], safeName, { type: 'application/pdf' }));
  }

  const created = await fetch(`${baseUrl}/envelope/create`, { method: 'POST', headers: { Authorization: token }, body: form });
  const envelope = await created.json().catch(() => ({})) as { id?: string };
  if (!created.ok || !envelope.id) return json({ error: 'esign_create_failed', providerStatus: created.status }, 502);

  const distributed = await fetch(`${baseUrl}/envelope/${encodeURIComponent(envelope.id)}/distribute`, { method: 'POST', headers: { Authorization: token, 'content-type': 'application/json' }, body: JSON.stringify({}) });
  const result = await distributed.json().catch(() => ({})) as { recipients?: unknown[] };
  if (!distributed.ok) return json({ error: 'esign_distribute_failed', envelopeId: envelope.id, providerStatus: distributed.status }, 502);
  return json({ envelopeId: envelope.id, externalEnvelopeId: envelope.id, status: 'PENDING', recipients: result.recipients ?? [] }, 202);
});
