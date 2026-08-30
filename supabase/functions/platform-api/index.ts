import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

type ModuleId = 'borrower' | 'advisory' | 'investor' | 'admin';
type SessionContext = { userId: string; displayName: string; preferredLocale: string; modules: ModuleId[] };

const noStoreHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer'
};

function configuredOrigins(): Set<string> {
  return new Set((Deno.env.get('PIHUB_ALLOWED_ORIGINS') ?? '').split(',').map((value) => value.trim()).filter(Boolean));
}
function corsHeaders(request: Request): Record<string, string> | null {
  const origin = request.headers.get('origin');
  if (!origin) return {};
  if (!configuredOrigins().has(origin)) return null;
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'authorization, content-type, x-client-info',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'vary': 'Origin'
  };
}
function json(request: Request, body: unknown, status = 200): Response {
  const cors = corsHeaders(request);
  return new Response(JSON.stringify(body), { status, headers: { ...noStoreHeaders, ...(cors ?? {}) } });
}
function normalizedPath(request: Request): string {
  const pathname = new URL(request.url).pathname;
  const marker = '/platform-api';
  const index = pathname.indexOf(marker);
  if (index === -1) return pathname;
  return pathname.slice(index + marker.length) || '/';
}
function statusForRpcError(code?: string): number {
  if (code === '42501' || code === '28000') return 403;
  if (code === '22023') return 400;
  return 500;
}

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: cors ? 204 : 403, headers: cors ?? {} });
  if (!cors) return json(request, { code: 'origin_not_allowed', message: 'This PiHub origin is not allowed.' }, 403);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const authKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !authKey || !serviceRoleKey) return json(request, { code: 'service_not_configured', message: 'PiHub platform API is not configured.' }, 503);

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json(request, { code: 'authentication_required', message: 'Authentication is required.' }, 401);

  const authClient = createClient(supabaseUrl, authKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json(request, { code: 'invalid_session', message: 'The PiHub session is invalid or expired.' }, 401);

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const path = normalizedPath(request);

  try {
    if (request.method === 'GET' && path === '/api/v1/session') {
      const { data, error } = await service.rpc('pihub_session_context', { caller_user_id: user.id });
      if (error) return json(request, { code: 'session_context_failed', message: 'Unable to load PiHub access context.' }, statusForRpcError(error.code));
      const context = data as SessionContext;
      return json(request, { authenticated: true, user: { id: user.id, email: user.email ?? '', name: context.displayName || user.email || 'PiHub user', modules: context.modules }, preferredLocale: context.preferredLocale });
    }

    if (request.method === 'GET' && path === '/api/v1/borrower/integration') {
      const applicationId = new URL(request.url).searchParams.get('applicationId');
      const { data, error } = await service.rpc('pihub_borrower_integration_projection', { application_key: applicationId, caller_user_id: user.id });
      if (error) return json(request, { code: 'borrower_projection_failed', message: 'Unable to load the authorized Borrower platform projection.' }, statusForRpcError(error.code));
      return json(request, data);
    }

    const workItemMatch = path.match(/^\/api\/v1\/borrower\/work-items\/([0-9a-f-]{36})\/complete$/i);
    if (request.method === 'POST' && workItemMatch) {
      const { data, error } = await service.rpc('pihub_borrower_complete_work_item', { work_item_key: workItemMatch[1], caller_user_id: user.id });
      if (error) return json(request, { code: 'work_item_update_failed', message: 'Unable to complete this Borrower work item.' }, statusForRpcError(error.code));
      return json(request, data);
    }

    if (request.method === 'POST' && path === '/api/v1/borrower/approvals') {
      const body = await request.json() as { applicationId?: string; type?: string; decision?: string; note?: string };
      if (!body.applicationId || !body.type || !body.decision) return json(request, { code: 'invalid_request', message: 'applicationId, type and decision are required.' }, 400);
      const { data, error } = await service.rpc('pihub_borrower_set_approval', { application_key: body.applicationId, approval_gate: body.type, decision: body.decision, decision_note: body.note ?? '', caller_user_id: user.id });
      if (error) return json(request, { code: 'approval_update_failed', message: 'Unable to update this approval gate.' }, statusForRpcError(error.code));
      return json(request, data);
    }

    const vaultMatch = path.match(/^\/api\/v1\/borrower\/vault\/([^/]+)\/reuse$/i);
    if (request.method === 'POST' && vaultMatch) {
      const body = await request.json() as { applicationId?: string };
      if (!body.applicationId) return json(request, { code: 'invalid_request', message: 'applicationId is required.' }, 400);
      const { data, error } = await service.rpc('pihub_borrower_reuse_vault_item', { application_key: body.applicationId, vault_item_key: decodeURIComponent(vaultMatch[1]), caller_user_id: user.id });
      if (error) return json(request, { code: 'vault_reuse_failed', message: 'Unable to reuse this Company Vault document.' }, statusForRpcError(error.code));
      return json(request, data);
    }

    return json(request, { code: 'not_found', message: 'PiHub platform API route not found.' }, 404);
  } catch (error) {
    console.error('platform-api request failed', { path, method: request.method, userId: user.id, error: error instanceof Error ? error.message : String(error) });
    return json(request, { code: 'internal_error', message: 'PiHub platform API request failed.' }, 500);
  }
});
