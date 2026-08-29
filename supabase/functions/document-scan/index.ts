import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const internalKey = Deno.env.get('PIHUB_INTERNAL_JOB_KEY');
  if (!internalKey || request.headers.get('x-pihub-internal-key') !== internalKey) return json({ error: 'unauthorized' }, 401);
  const { versionId } = await request.json() as { versionId?: string };
  if (!versionId) return json({ error: 'versionId_required' }, 400);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const scannerUrl = Deno.env.get('PIHUB_MALWARE_SCANNER_URL');
  const scannerToken = Deno.env.get('PIHUB_MALWARE_SCANNER_TOKEN');
  if (!url || !serviceRole || !scannerUrl || !scannerToken) return json({ error: 'service_not_configured' }, 503);
  const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });

  const { data: version, error } = await supabase.from('document_versions').select('id,object_path,malware_status,sha256').eq('id', versionId).single();
  if (error || !version) return json({ error: 'document_version_not_found' }, 404);
  if (version.malware_status === 'clean' || version.malware_status === 'blocked') {
    return json({ versionId, status: version.malware_status, sha256: version.sha256 ?? undefined, cached: true });
  }

  const { data: signed, error: signedError } = await supabase.storage.from('pihub-documents').createSignedUrl(version.object_path, 300);
  if (signedError || !signed?.signedUrl) return json({ error: 'signed_url_failed' }, 500);

  try {
    const scan = await fetch(scannerUrl, { method: 'POST', headers: { authorization: `Bearer ${scannerToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ url: signed.signedUrl }) });
    if (!scan.ok) throw new Error(`scanner_${scan.status}`);
    const result = await scan.json() as { clean?: boolean; sha256?: string };
    const status = result.clean ? 'clean' : 'blocked';
    await supabase.from('document_versions').update({ malware_status: status, sha256: result.sha256 ?? null }).eq('id', versionId);
    return json({ versionId, status, sha256: result.sha256 ?? undefined, cached: false });
  } catch {
    await supabase.from('document_versions').update({ malware_status: 'failed' }).eq('id', versionId);
    return json({ error: 'scan_failed' }, 502);
  }
});
