// Internal PiHub -> Documenso v2 envelope adapter. Provider API keys remain server-side.
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
type Field = { identifier: number; type: 'SIGNATURE'|'DATE'|'NAME'|'EMAIL'|'TEXT'; page: number; positionX: number; positionY: number; width: number; height: number };
type Recipient = { email: string; name: string; role?: 'SIGNER'|'APPROVER'|'CC'|'VIEWER'; signingOrder?: number; fields?: Field[] };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const expectedInternalKey = Deno.env.get('PIHUB_INTERNAL_FUNCTION_KEY');
  if (!expectedInternalKey || req.headers.get('x-pihub-internal-key') !== expectedInternalKey) return json({ error: 'unauthorized' }, 401);

  const token = Deno.env.get('DOCUMENSO_API_TOKEN');
  const baseUrl = (Deno.env.get('DOCUMENSO_API_BASE_URL') ?? 'https://app.documenso.com/api/v2').replace(/\/$/, '');
  if (!token) return json({ error: 'esign_not_configured' }, 503);
  const body = await req.json().catch(() => ({})) as { externalId?: string; title?: string; files?: Array<{ name: string; signedUrl: string }>; recipients?: Recipient[] };
  if (!body.title || !body.files?.length || !body.recipients?.length) return json({ error: 'invalid_request' }, 400);

  const form = new FormData();
  form.append('payload', JSON.stringify({ type: 'DOCUMENT', title: body.title, externalId: body.externalId, recipients: body.recipients.map((r) => ({ ...r, role: r.role ?? 'SIGNER' })) }));
  for (const file of body.files) {
    if (!/^https:\/\//i.test(file.signedUrl)) return json({ error: 'invalid_file_url' }, 400);
    const source = await fetch(file.signedUrl);
    if (!source.ok) return json({ error: 'source_document_unavailable', file: file.name }, 502);
    form.append('files', new File([await source.arrayBuffer()], file.name, { type: source.headers.get('content-type') ?? 'application/pdf' }));
  }

  const created = await fetch(`${baseUrl}/envelope/create`, { method: 'POST', headers: { Authorization: token }, body: form });
  const envelope = await created.json().catch(() => ({}));
  if (!created.ok || !envelope.id) return json({ error: 'esign_create_failed', providerStatus: created.status }, 502);

  const distributed = await fetch(`${baseUrl}/envelope/${encodeURIComponent(envelope.id)}/distribute`, { method: 'POST', headers: { Authorization: token, 'content-type': 'application/json' }, body: JSON.stringify({}) });
  const result = await distributed.json().catch(() => ({}));
  if (!distributed.ok) return json({ error: 'esign_distribute_failed', envelopeId: envelope.id, providerStatus: distributed.status }, 502);
  return json({ envelopeId: envelope.id, status: 'PENDING', recipients: result.recipients ?? [] }, 202);
});
