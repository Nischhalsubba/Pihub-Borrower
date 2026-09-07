import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('platform uses the canonical document scan contract', async () => {
  const platform = await read('supabase/functions/platform-api/index.ts');
  const scanner = await read('supabase/functions/document-scan/index.ts');

  assert.ok(platform.includes("internalFunction('document-scan',jobKey,serviceRoleKey,{versionId:body.payload.versionId})"));
  assert.ok(!platform.includes("internalFunction('document-scan',jobKey,serviceRoleKey,{documentVersionId:body.payload.versionId})"));
  assert.ok(scanner.includes('body.versionId ?? body.documentVersionId'));
});

test('document intelligence preserves the provider job identifier contract', async () => {
  const platform = await read('supabase/functions/platform-api/index.ts');
  const adapter = await read('supabase/functions/document-intelligence/index.ts');

  assert.ok(adapter.includes('providerJobId: result.task_id'));
  assert.ok(platform.includes('(result as any).providerJobId??(result as any).taskId??null'));
});

test('signature creation is application-scoped and passes resolved private documents', async () => {
  const platform = await read('supabase/functions/platform-api/index.ts');

  assert.ok(platform.includes("pihub_borrower_integration_projection',{application_key:body.applicationId,caller_user_id:user.id}"));
  assert.ok(platform.includes("doc.application_id!==body.applicationId"));
  assert.ok(platform.includes("version.malware_status!=='clean'"));
  assert.ok(platform.includes("internalFunction('esign-envelope',key,serviceRoleKey,{externalId:body.applicationId,title:`PiHub ${body.applicationId}`,files,recipients})"));
});

test('internal document adapters reject arbitrary remote fetch targets', async () => {
  const intelligence = await read('supabase/functions/document-intelligence/index.ts');
  const esign = await read('supabase/functions/esign-envelope/index.ts');

  assert.ok(intelligence.includes("source.protocol !== 'https:' || source.hostname !== storageOrigin.hostname"));
  assert.ok(esign.includes("sourceUrl.protocol !== 'https:' || sourceUrl.hostname !== storageHost"));
  assert.ok(esign.includes('MAX_SOURCE_BYTES'));
  assert.ok(esign.includes("contentType !== 'application/pdf'"));
});

test('application exports require object authorization when scoped to an application', async () => {
  const platform = await read('supabase/functions/platform-api/index.ts');

  assert.ok(platform.includes("if(body.applicationId){const projection=await service.rpc('pihub_borrower_integration_projection'"));
  assert.ok(platform.includes("code:'application_access_forbidden',message:'You are not allowed to export this application.'"));
});
