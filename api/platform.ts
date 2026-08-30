import {
  createApplication,
  createDraftFromVersion,
  createInitialState,
  createPrivacyRequest,
  createServicingRequest,
  createSupportTicket,
  decideTermSheet,
  inviteTeamMember,
  markNotificationRead,
  removeDocument,
  reportPaymentMade,
  resendTeamInvitation,
  respondToRequest,
  setApplicationStatus,
  setLocale,
  submitReportingObligation,
  toggleClosingItem,
  toggleComparedProduct,
  toggleSavedProduct,
  updateApplicationSection,
  updateProfile,
  updateTeamMember,
  withdrawApplication,
  withdrawServicingRequest,
  upsertDocument
} from '../src/state/core';
import { applyAdvancedAction } from '../src/state/advanced';
import type { BorrowerState } from '../src/state/model';
import type { BorrowerFeatureAction } from '../src/state/advancedModel';

const SUPABASE_URL = process.env.PIHUB_SUPABASE_URL ?? 'https://spednauhubdmgurdbnwc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.PIHUB_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_FXEt9e9dmfdpG2nC2N4xYQ_3baXVubp';
const PLATFORM_URL = `${SUPABASE_URL}/functions/v1/platform-api`;
const ACCESS_COOKIE = '__Host-pihub_at';
const REFRESH_COOKIE = '__Host-pihub_rt';
const ACCESS_MAX_AGE = 3600;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

type AuthTokens = { access_token: string; refresh_token: string; expires_in?: number; user?: { id?: string; email?: string } };
type PlatformSession = {
  userId: string;
  displayName: string;
  preferredLocale: string;
  modules: string[];
  organization?: { id: string; name: string; role: string; verificationStatus: string } | null;
};
type WorkspaceEnvelope = { initialized: boolean; revision: number; unchanged?: boolean; patch?: Partial<BorrowerState>; snapshot?: BorrowerState };
type SessionBootstrap = { session: PlatformSession; workspace: WorkspaceEnvelope };

type CookieMutation = { name: string; value: string; maxAge: number };

function json(body: unknown, status = 200, cookieMutations: CookieMutation[] = []): Response {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'private, no-store, max-age=0',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer'
  });
  for (const cookie of cookieMutations) headers.append('set-cookie', serializeCookie(cookie));
  return new Response(JSON.stringify(body), { status, headers });
}

function serializeCookie(cookie: CookieMutation): string {
  return `${cookie.name}=${encodeURIComponent(cookie.value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${cookie.maxAge}`;
}

function clearCookies(): CookieMutation[] {
  return [
    { name: ACCESS_COOKIE, value: '', maxAge: 0 },
    { name: REFRESH_COOKIE, value: '', maxAge: 0 }
  ];
}

function tokenCookies(tokens: AuthTokens): CookieMutation[] {
  return [
    { name: ACCESS_COOKIE, value: tokens.access_token, maxAge: Math.max(60, Number(tokens.expires_in ?? ACCESS_MAX_AGE)) },
    { name: REFRESH_COOKIE, value: tokens.refresh_token, maxAge: REFRESH_MAX_AGE }
  ];
}

function parseCookies(request: Request): Record<string, string> {
  return Object.fromEntries((request.headers.get('cookie') ?? '').split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return index < 0 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
  }));
}

function requestedPath(request: Request): string {
  const url = new URL(request.url);
  const forwarded = url.searchParams.get('__path');
  if (forwarded) return `/api/v1/${forwarded.replace(/^\/+/, '')}`;
  return url.pathname.replace(/^\/api\/platform/, '') || '/api/v1/session';
}

function requestQuery(request: Request): string {
  const url = new URL(request.url);
  const query = new URLSearchParams(url.searchParams);
  query.delete('__path');
  const value = query.toString();
  return value ? `?${value}` : '';
}

function sameOriginMutation(request: Request): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

async function authRequest(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'content-type': 'application/json',
      ...(init.headers ?? {})
    }
  });
}

async function passwordGrant(email: string, password: string): Promise<AuthTokens | null> {
  const response = await authRequest('/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (!response.ok) return null;
  return response.json() as Promise<AuthTokens>;
}

async function refreshGrant(refreshToken: string): Promise<AuthTokens | null> {
  const response = await authRequest('/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) });
  if (!response.ok) return null;
  return response.json() as Promise<AuthTokens>;
}

async function callPlatform(path: string, accessToken: string, request: Request, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${accessToken}`);
  headers.set('apikey', SUPABASE_PUBLISHABLE_KEY);
  headers.set('accept', 'application/json');
  const oidc = process.env.VERCEL_OIDC_TOKEN;
  if (oidc) headers.set('x-pihub-bff-oidc', oidc);
  if (init.body && !headers.has('content-type')) headers.set('content-type', request.headers.get('content-type') ?? 'application/json');
  return fetch(`${PLATFORM_URL}${path}`, { ...init, headers });
}

async function withSession(request: Request, callback: (accessToken: string, cookieMutations: CookieMutation[]) => Promise<Response>): Promise<Response> {
  const cookies = parseCookies(request);
  const access = cookies[ACCESS_COOKIE];
  const refresh = cookies[REFRESH_COOKIE];
  if (!access && !refresh) return json({ code: 'authentication_required', message: 'Authentication is required.' }, 401, clearCookies());

  if (access) {
    const response = await callback(access, []);
    if (response.status !== 401 || !refresh) return response;
  }

  if (!refresh) return json({ code: 'invalid_session', message: 'The PiHub session expired.' }, 401, clearCookies());
  const tokens = await refreshGrant(refresh);
  if (!tokens) return json({ code: 'invalid_session', message: 'The PiHub session expired.' }, 401, clearCookies());
  return callback(tokens.access_token, tokenCookies(tokens));
}

function newApplicationId(): string {
  return `PH-${new Date().getUTCFullYear()}-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}

function productionInitialState(session: PlatformSession, email: string): BorrowerState {
  const template = createInitialState();
  const now = new Date().toISOString();
  const organization = session.organization;
  if (!organization) throw new Error('Borrower organization is required.');
  const appId = newApplicationId();
  const base = structuredClone(template.applications[0]);
  const app = {
    ...base,
    id: appId,
    organizationId: organization.id,
    name: 'New financing request',
    status: 'draft' as const,
    createdAt: now,
    updatedAt: now,
    submittedAt: undefined,
    version: 1,
    financing: { ...base.financing, productId: null, purpose: '', amount: 0, desiredFundingDate: '', tenorMonths: 0, structure: '', useOfProceeds: '', sponsorEquity: 0, existingDebt: 0, repaymentProfile: '' },
    company: { ...base.company, legalName: organization.name ?? '', registrationNumber: '', legalForm: '', country: '', city: '', website: '', industry: '', description: '', ownershipSummary: '', uboNames: '', bankingRelationships: '', revenue: 0, ebitda: 0, employees: 0 },
    project: { ...base.project, name: '', location: '', assetClass: '', stage: 'Planning', acquisitionPrice: 0, constructionBudget: 0, grossDevelopmentValue: 0, expectedCompletion: '', planningStatus: '', preSalesOrLeasing: '', valuation: 0, exitStrategy: '', sustainability: '' },
    financials: { ...base.financials, revenue2024: 0, revenue2025: 0, ebitda2024: 0, ebitda2025: 0, cash: 0, debt: 0, equity: 0, forecastNote: '' },
    sectionCompletion: { financing: false, company: false, project: false, financials: false, documents: false }
  };

  return {
    ...template,
    locale: session.preferredLocale === 'de' ? 'de' : 'en',
    activeApplicationId: appId,
    organization: { id: organization.id, name: organization.name, verificationStatus: organization.verificationStatus as BorrowerState['organization']['verificationStatus'] },
    applications: [app],
    applicationVersions: [], documents: [], requests: [], notifications: [], activity: [], outbox: [],
    team: [{ id: session.userId, name: session.displayName || email, email, role: (organization.role || 'owner') as BorrowerState['team'][number]['role'], status: 'active' }],
    terms: [], closingItems: [], savedProductIds: [], comparisonProductIds: [], supportTickets: [], facilities: [], paymentSchedule: [], covenants: [], reportingObligations: [], servicingRequests: [], privacyRequests: [],
    advanced: {
      ...template.advanced,
      prequalification: [], matches: [], spvs: [], portfolioViews: [], sourcesUses: [], constructionBudget: [], drawRequests: [], inspections: [],
      connections: template.advanced.connections.map((item) => ({ ...item, status: 'disconnected' as const, lastSyncAt: undefined, expiresAt: undefined, error: undefined, accountCount: undefined })),
      freshness: [], cashFlow: [], dataRoomFolders: [], companyVault: [], documentIntelligence: [], disclosures: [], scenarios: [], negotiations: [], signatureEnvelopes: [], deadlines: [], paymentInstructions: [], statements: [], covenantForecasts: [], professionals: [], esgProfiles: [],
      integrations: template.advanced.integrations.map((item) => ({ ...item, status: item.status === 'connected' ? 'configured' as const : item.status, lastTestAt: undefined })),
      complaints: [], exportPackages: [], copilot: []
    },
    profile: { name: session.displayName || email, email, phone: '', jobTitle: '', notificationEmail: true },
    lastSavedAt: now
  };
}

async function ensureWorkspace(accessToken: string, request: Request, email = ''): Promise<SessionBootstrap> {
  let response = await callPlatform('/api/v1/borrower/session-bootstrap', accessToken, request);
  if (!response.ok) throw new Error(`bootstrap:${response.status}`);
  let bootstrap = await response.json() as SessionBootstrap;
  if (!bootstrap.workspace.initialized) {
    const snapshot = productionInitialState(bootstrap.session, email);
    const initialized = await callPlatform('/api/v1/borrower/workspace/initialize', accessToken, request, { method: 'POST', body: JSON.stringify({ snapshot }) });
    if (!initialized.ok) throw new Error(`initialize:${initialized.status}`);
    response = await callPlatform('/api/v1/borrower/session-bootstrap', accessToken, request);
    if (!response.ok) throw new Error(`bootstrap:${response.status}`);
    bootstrap = await response.json() as SessionBootstrap;
  }
  return bootstrap;
}

function sessionResult(bootstrap: SessionBootstrap, email: string) {
  return {
    authenticated: true,
    user: { id: bootstrap.session.userId, email, name: bootstrap.session.displayName || email, modules: bootstrap.session.modules },
    snapshot: bootstrap.workspace.snapshot,
    revision: bootstrap.workspace.revision,
    preferredLocale: bootstrap.session.preferredLocale
  };
}

function commandNextState(state: BorrowerState, command: string, payload: Record<string, any>, aggregateId?: string): BorrowerState {
  switch (command) {
    case 'application.create': return createApplication(state, { name: String(payload.name ?? ''), productId: (payload.productId as string | null | undefined) ?? null });
    case 'application.create_from_version': return createDraftFromVersion(state, String(payload.versionId ?? ''));
    case 'application.withdraw': return withdrawApplication(state, String(aggregateId ?? ''));
    case 'application.section.update': {
      const section = payload.section as 'financing'|'company'|'project'|'financials';
      if (!['financing','company','project','financials'].includes(section)) return state;
      return updateApplicationSection(state, section, (payload.patch ?? {}) as any, payload.complete !== false);
    }
    case 'application.submit': return setApplicationStatus(state, 'submitted');
    case 'application.status.request': return setApplicationStatus(state, payload.status as BorrowerState['applications'][number]['status']);
    case 'document.upload.finalize': return upsertDocument(state, { id: aggregateId, applicationId: String(payload.applicationId ?? state.activeApplicationId), category: String(payload.category ?? 'Other'), name: 'Secure upload', mimeType: 'application/octet-stream', size: 0, required: false, blobKey: String(payload.versionId ?? '') });
    case 'document.remove': return removeDocument(state, String(aggregateId ?? ''));
    case 'request.respond': return respondToRequest(state, String(aggregateId ?? ''), String(payload.text ?? ''), Array.isArray(payload.attachmentDocumentIds) ? payload.attachmentDocumentIds : []);
    case 'notification.read': return markNotificationRead(state, String(payload.notificationId ?? ''));
    case 'notification.read_all': return markNotificationRead(state);
    case 'organization.member.invite': return inviteTeamMember(state, payload as any);
    case 'organization.member.invitation.resend': return resendTeamInvitation(state, String(payload.memberId ?? ''));
    case 'organization.member.update': return updateTeamMember(state, String(payload.memberId ?? ''), (payload.patch ?? {}) as any);
    case 'terms.decide': return decideTermSheet(state, String(aggregateId ?? ''), payload.decision as 'accepted'|'rejected');
    case 'closing.item.set': return toggleClosingItem(state, String(aggregateId ?? ''), Boolean(payload.complete));
    case 'preference.product.saved.toggle': return toggleSavedProduct(state, String(payload.productId ?? ''));
    case 'preference.product.compare.toggle': return toggleComparedProduct(state, String(payload.productId ?? ''));
    case 'support.request.create': return createSupportTicket(state, payload as any);
    case 'servicing.request.create': return createServicingRequest(state, payload as any);
    case 'servicing.request.withdraw': return withdrawServicingRequest(state, String(aggregateId ?? ''));
    case 'reporting.submit': return submitReportingObligation(state, String(aggregateId ?? ''), payload.documentId ? String(payload.documentId) : undefined);
    case 'payment.notice.create': return reportPaymentMade(state, String(aggregateId ?? ''), String(payload.note ?? ''));
    case 'privacy.request.create': return createPrivacyRequest(state, payload.type as any, String(payload.note ?? ''));
    case 'borrower.feature': return applyAdvancedAction(state, payload as unknown as BorrowerFeatureAction);
    case 'profile.update': return updateProfile(state, (payload.patch ?? {}) as any);
    case 'profile.locale.set': return setLocale(state, payload.locale === 'de' ? 'de' : 'en');
    default: throw new Error('unsupported_borrower_command');
  }
}

async function readJson(request: Request): Promise<Record<string, any>> {
  try { return await request.json() as Record<string, any>; } catch { return {}; }
}

async function proxyAuthenticated(request: Request, path: string): Promise<Response> {
  return withSession(request, async (accessToken, cookieMutations) => {
    const body = ['GET','HEAD'].includes(request.method) ? undefined : await request.text();
    const upstream = await callPlatform(`${path}${requestQuery(request)}`, accessToken, request, { method: request.method, body });
    const text = await upstream.text();
    const headers = new Headers({ 'content-type': upstream.headers.get('content-type') ?? 'application/json', 'cache-control': 'private, no-store, max-age=0' });
    for (const cookie of cookieMutations) headers.append('set-cookie', serializeCookie(cookie));
    return new Response(text, { status: upstream.status, headers });
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (!sameOriginMutation(request)) return json({ code: 'csrf_rejected', message: 'Cross-site mutation rejected.' }, 403);
    const path = requestedPath(request);

    if (request.method === 'POST' && path === '/api/v1/auth/login') {
      const body = await readJson(request);
      const email = String(body.email ?? '').trim().toLowerCase();
      const password = String(body.password ?? '');
      if (!email || !password) return json({ code: 'invalid_credentials', message: 'Email and password are required.' }, 400);
      const tokens = await passwordGrant(email, password);
      if (!tokens) return json({ code: 'invalid_credentials', message: 'Email or password is incorrect.' }, 401, clearCookies());
      try {
        const bootstrap = await ensureWorkspace(tokens.access_token, request, email);
        if (!bootstrap.session.modules.includes('borrower')) return json({ code: 'borrower_access_required', message: 'This account is not authorized for Borrower.' }, 403, clearCookies());
        return json(sessionResult(bootstrap, email), 200, tokenCookies(tokens));
      } catch {
        return json({ code: 'bootstrap_failed', message: 'PiHub could not initialize the Borrower workspace.' }, 503, clearCookies());
      }
    }

    if (request.method === 'POST' && path === '/api/v1/auth/logout') {
      const cookies = parseCookies(request);
      const access = cookies[ACCESS_COOKIE];
      if (access) await authRequest('/logout', { method: 'POST', headers: { authorization: `Bearer ${access}` } }).catch(() => undefined);
      return json({ signedOut: true }, 200, clearCookies());
    }

    if (request.method === 'POST' && path === '/api/v1/auth/password-reset') {
      const body = await readJson(request);
      const email = String(body.email ?? '').trim().toLowerCase();
      if (email) await authRequest('/recover', { method: 'POST', body: JSON.stringify({ email }) });
      return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
    }

    if (request.method === 'GET' && path === '/api/v1/session') {
      return withSession(request, async (accessToken, cookieMutations) => {
        const userResponse = await authRequest('/user', { method: 'GET', headers: { authorization: `Bearer ${accessToken}` } });
        if (!userResponse.ok) return json({ authenticated: false }, 401, clearCookies());
        const user = await userResponse.json() as { email?: string };
        try {
          const bootstrap = await ensureWorkspace(accessToken, request, user.email ?? '');
          return json(sessionResult(bootstrap, user.email ?? ''), 200, cookieMutations);
        } catch { return json({ code: 'bootstrap_failed', message: 'Unable to load PiHub session.' }, 503, cookieMutations); }
      });
    }

    if (request.method === 'GET' && path === '/api/v1/borrower/bootstrap') {
      return withSession(request, async (accessToken, cookieMutations) => {
        const since = new URL(request.url).searchParams.get('sinceRevision');
        const suffix = since ? `?sinceRevision=${encodeURIComponent(since)}` : '';
        const upstream = await callPlatform(`/api/v1/borrower/session-bootstrap${suffix}`, accessToken, request);
        if (!upstream.ok) return json(await upstream.json().catch(() => ({ code: 'bootstrap_failed' })), upstream.status, cookieMutations);
        const envelope = await upstream.json() as SessionBootstrap;
        if (!envelope.workspace.initialized) {
          const userResponse = await authRequest('/user', { method: 'GET', headers: { authorization: `Bearer ${accessToken}` } });
          const user = await userResponse.json().catch(() => ({})) as { email?: string };
          const initialized = await ensureWorkspace(accessToken, request, user.email ?? '');
          return json(initialized.workspace, 200, cookieMutations);
        }
        return json(envelope.workspace, 200, cookieMutations);
      });
    }

    if (request.method === 'POST' && path === '/api/v1/borrower/commands') {
      const command = await readJson(request);
      return withSession(request, async (accessToken, cookieMutations) => {
        const bootstrapResponse = await callPlatform('/api/v1/borrower/session-bootstrap', accessToken, request);
        if (!bootstrapResponse.ok) return json({ code: 'bootstrap_failed', message: 'Unable to load canonical Borrower state.' }, bootstrapResponse.status, cookieMutations);
        const bootstrap = await bootstrapResponse.json() as SessionBootstrap;
        if (!bootstrap.workspace.snapshot) return json({ code: 'workspace_not_initialized', message: 'Borrower workspace is not initialized.' }, 409, cookieMutations);
        let nextSnapshot: BorrowerState;
        try { nextSnapshot = commandNextState(structuredClone(bootstrap.workspace.snapshot), String(command.command ?? ''), command.payload ?? {}, command.aggregateId ? String(command.aggregateId) : undefined); }
        catch { return json({ code: 'unsupported_borrower_command', message: 'This Borrower action is not supported by the canonical command service.' }, 400, cookieMutations); }
        const upstream = await callPlatform('/api/v1/borrower/commands', accessToken, request, {
          method: 'POST',
          headers: { 'idempotency-key': String(command.idempotencyKey ?? '') },
          body: JSON.stringify({
            idempotencyKey: command.idempotencyKey,
            command: command.command,
            aggregateId: command.aggregateId ?? null,
            payload: command.payload ?? {},
            expectedRevision: bootstrap.workspace.revision,
            previousSnapshot: bootstrap.workspace.snapshot,
            nextSnapshot
          })
        });
        return json(await upstream.json().catch(() => ({ code: 'command_failed' })), upstream.status, cookieMutations);
      });
    }

    const downloadMatch = path.match(/^\/api\/v1\/borrower\/documents\/([^/]+)\/download$/);
    if (request.method === 'GET' && downloadMatch) {
      return withSession(request, async (accessToken, cookieMutations) => {
        const upstream = await callPlatform(path, accessToken, request);
        if (!upstream.ok) return json(await upstream.json().catch(() => ({ code: 'download_failed' })), upstream.status, cookieMutations);
        const payload = await upstream.json() as { downloadUrl?: string };
        if (!payload.downloadUrl) return json({ code: 'download_failed', message: 'PiHub did not return a secure download.' }, 502, cookieMutations);
        const file = await fetch(payload.downloadUrl);
        const headers = new Headers({
          'content-type': file.headers.get('content-type') ?? 'application/octet-stream',
          'content-disposition': file.headers.get('content-disposition') ?? 'attachment',
          'cache-control': 'private, no-store, max-age=0'
        });
        for (const cookie of cookieMutations) headers.append('set-cookie', serializeCookie(cookie));
        return new Response(file.body, { status: file.status, headers });
      });
    }

    return proxyAuthenticated(request, path);
  }
};
