// Internal PiHub -> Docling Serve adapter. This is not a public browser endpoint.
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const expectedInternalKey = Deno.env.get('PIHUB_INTERNAL_FUNCTION_KEY');
  if (!expectedInternalKey || req.headers.get('x-pihub-internal-key') !== expectedInternalKey) return json({ error: 'unauthorized' }, 401);

  const serviceUrl = Deno.env.get('DOCLING_SERVE_URL')?.replace(/\/$/, '');
  if (!serviceUrl) return json({ error: 'docling_not_configured' }, 503);
  const apiKey = Deno.env.get('DOCLING_SERVE_API_KEY');
  const body = await req.json().catch(() => ({})) as { documentId?: string; sourceUrl?: string };
  if (!body.documentId || !body.sourceUrl || !/^https:\/\//i.test(body.sourceUrl)) return json({ error: 'invalid_request' }, 400);

  const response = await fetch(`${serviceUrl}/v1/convert/source/async`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}) },
    body: JSON.stringify({
      http_sources: [{ url: body.sourceUrl }],
      options: { to_formats: ['json', 'text'], do_ocr: true, table_mode: 'accurate', image_export_mode: 'placeholder' }
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return json({ error: 'docling_rejected', status: response.status }, 502);
  return json({ documentId: body.documentId, taskId: result.task_id, taskStatus: result.task_status ?? 'pending' }, 202);
});
