// Internal PiHub -> Docling Serve adapter. This is not a public browser endpoint.
const noStore = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: noStore });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const expectedInternalKey = Deno.env.get('PIHUB_INTERNAL_FUNCTION_KEY');
  if (!expectedInternalKey || req.headers.get('x-pihub-internal-key') !== expectedInternalKey) return json({ error: 'unauthorized' }, 401);

  const serviceUrl = Deno.env.get('DOCLING_SERVE_URL')?.replace(/\/$/, '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!serviceUrl || !supabaseUrl) return json({ error: 'document_intelligence_not_configured' }, 503);
  const apiKey = Deno.env.get('DOCLING_SERVE_API_KEY');
  const body = await req.json().catch(() => ({})) as { documentId?: string; sourceUrl?: string };
  if (!body.documentId || !body.sourceUrl) return json({ error: 'invalid_request' }, 400);

  let source: URL;
  let storageOrigin: URL;
  try {
    source = new URL(body.sourceUrl);
    storageOrigin = new URL(supabaseUrl);
  } catch {
    return json({ error: 'invalid_source_url' }, 400);
  }
  // The platform API creates this URL from the private pihub-documents bucket.
  // Restricting it to the configured Supabase host prevents this internal
  // adapter from becoming an arbitrary remote-fetch/SSRF primitive.
  if (source.protocol !== 'https:' || source.hostname !== storageOrigin.hostname) {
    return json({ error: 'untrusted_source_url' }, 400);
  }

  const response = await fetch(`${serviceUrl}/v1/convert/source/async`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}) },
    body: JSON.stringify({
      http_sources: [{ url: source.toString() }],
      options: { to_formats: ['json', 'text'], do_ocr: true, table_mode: 'accurate', image_export_mode: 'placeholder' }
    })
  });
  const result = await response.json().catch(() => ({})) as { task_id?: string; task_status?: string };
  if (!response.ok) return json({ error: 'docling_rejected', status: response.status }, 502);
  if (!result.task_id) return json({ error: 'docling_job_missing' }, 502);
  // providerJobId is the canonical platform field; taskId remains as a
  // compatibility alias for older platform-api deployments.
  return json({ documentId: body.documentId, providerJobId: result.task_id, taskId: result.task_id, taskStatus: result.task_status ?? 'pending' }, 202);
});
