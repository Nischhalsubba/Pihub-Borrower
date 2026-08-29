import type { BorrowerState, IntegrationEvent } from '../state/model';
import { apiBaseUrl, isApiRuntime } from './runtime';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  modules: string[];
}

export interface SessionResult {
  authenticated: boolean;
  user?: SessionUser;
  snapshot?: BorrowerState;
}

export class PlatformApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'PlatformApiError';
  }
}

type ReadOptions = { cacheTtlMs?: number; force?: boolean };
type ReadCacheEntry = { expiresAt: number; value: unknown };

const SESSION_CACHE_TTL_MS = 20_000;
const BOOTSTRAP_CACHE_TTL_MS = 5_000;
const COMMAND_DEDUPE_TTL_MS = 5_000;
const readCache = new Map<string, ReadCacheEntry>();
const inflightReads = new Map<string, Promise<unknown>>();
const recentCommands = new Map<string, { expiresAt: number; promise: Promise<PlatformCommandResult> }>();

const DEDUPE_SAFE_COMMANDS = new Set([
  'application.section.update',
  'application.status.request',
  'closing.item.set',
  'notification.read',
  'notification.read_all',
  'organization.member.update',
  'profile.update',
  'profile.locale.set'
]);

function normalizeForSignature(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForSignature);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, normalizeForSignature(item)]));
  }
  return value;
}

function stableSignature(value: unknown): string {
  return JSON.stringify(normalizeForSignature(value));
}

function clearExpiredCaches(now = Date.now()): void {
  for (const [key, entry] of readCache) if (entry.expiresAt <= now) readCache.delete(key);
  for (const [key, entry] of recentCommands) if (entry.expiresAt <= now) recentCommands.delete(key);
}

export function invalidatePlatformReadCache(): void {
  readCache.clear();
}

function primeBorrowerSnapshot(snapshot: BorrowerState): void {
  readCache.set('GET:/api/v1/borrower/bootstrap', { expiresAt: Date.now() + BOOTSTRAP_CACHE_TTL_MS, value: snapshot });
}

async function executeRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = apiBaseUrl();
  if (!base) throw new PlatformApiError('PiHub API base URL is not configured.', 0, 'api_not_configured');
  const response = await fetch(`${base}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {})
    }
  });
  if (!response.ok) {
    let message = `PiHub API request failed (${response.status}).`;
    let code: string | undefined;
    try {
      const body = await response.json() as { message?: string; code?: string };
      message = body.message || message;
      code = body.code;
    } catch { /* keep safe fallback */ }
    throw new PlatformApiError(message, response.status, code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function request<T>(path: string, init: RequestInit = {}, options: ReadOptions = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  if (method !== 'GET') return executeRequest<T>(path, init);

  clearExpiredCaches();
  const key = `${method}:${path}`;
  if (!options.force) {
    const cached = readCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
  }

  const inflight = inflightReads.get(key);
  if (inflight) return inflight as Promise<T>;

  const pending = executeRequest<T>(path, init).then((value) => {
    if (options.cacheTtlMs && options.cacheTtlMs > 0) {
      readCache.set(key, { expiresAt: Date.now() + options.cacheTtlMs, value });
    }
    return value;
  }).finally(() => {
    inflightReads.delete(key);
  });
  inflightReads.set(key, pending);
  return pending;
}

export async function getSession(options: { force?: boolean } = {}): Promise<SessionResult> {
  if (!isApiRuntime()) return { authenticated: false };
  const result = await request<SessionResult>('/api/v1/session', {}, { cacheTtlMs: SESSION_CACHE_TTL_MS, force: options.force });
  if (result.snapshot) primeBorrowerSnapshot(result.snapshot);
  return result;
}

export async function signIn(email: string, password: string): Promise<SessionResult> {
  const result = await request<SessionResult>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password, module: 'borrower' }) });
  invalidatePlatformReadCache();
  if (result.snapshot) primeBorrowerSnapshot(result.snapshot);
  return result;
}

export async function signOut(): Promise<void> {
  await request<void>('/api/v1/auth/logout', { method: 'POST' });
  invalidatePlatformReadCache();
  recentCommands.clear();
}

export async function requestPasswordReset(email: string): Promise<void> {
  await request<void>('/api/v1/auth/password-reset', { method: 'POST', body: JSON.stringify({ email, module: 'borrower' }) });
}

export async function fetchBorrowerSnapshot(options: { force?: boolean } = {}): Promise<BorrowerState> {
  return request<BorrowerState>('/api/v1/borrower/bootstrap', {}, { cacheTtlMs: BOOTSTRAP_CACHE_TTL_MS, force: options.force });
}

export interface PlatformCommand {
  idempotencyKey: string;
  command: string;
  aggregateId?: string;
  payload: Record<string, unknown>;
}

export interface PlatformCommandResult {
  accepted: true;
  version?: number;
  snapshot?: BorrowerState;
}

export async function sendBorrowerCommand(command: PlatformCommand): Promise<PlatformCommandResult> {
  clearExpiredCaches();
  const signature = DEDUPE_SAFE_COMMANDS.has(command.command)
    ? stableSignature({ command: command.command, aggregateId: command.aggregateId ?? null, payload: command.payload })
    : undefined;

  if (signature) {
    const recent = recentCommands.get(signature);
    if (recent && recent.expiresAt > Date.now()) return recent.promise;
  }

  const pending = request<PlatformCommandResult>('/api/v1/borrower/commands', {
    method: 'POST',
    headers: { 'Idempotency-Key': command.idempotencyKey },
    body: JSON.stringify(command)
  }).then((result) => {
    invalidatePlatformReadCache();
    if (result.snapshot) primeBorrowerSnapshot(result.snapshot);
    return result;
  }).catch((error) => {
    if (signature) recentCommands.delete(signature);
    throw error;
  });

  if (signature) recentCommands.set(signature, { expiresAt: Date.now() + COMMAND_DEDUPE_TTL_MS, promise: pending });
  return pending;
}

export async function flushIntegrationEvents(events: IntegrationEvent[]): Promise<{ acknowledgedIds: string[] }> {
  if (!events.length) return { acknowledgedIds: [] };
  return request<{ acknowledgedIds: string[] }>('/api/v1/borrower/outbox', {
    method: 'POST',
    body: JSON.stringify({ events })
  });
}

export interface DocumentUploadIntent {
  uploadUrl: string;
  documentId: string;
  versionId: string;
  headers?: Record<string, string>;
}

export async function createDocumentUploadIntent(input: {
  applicationId: string;
  name: string;
  contentType: string;
  size: number;
  category: string;
}): Promise<DocumentUploadIntent> {
  return request<DocumentUploadIntent>('/api/v1/borrower/documents/upload-intent', { method: 'POST', body: JSON.stringify(input) });
}

export interface DataConnectionAuthorizationIntent {
  connectionId: string;
  provider: 'datev' | 'finapi' | 'erp_api';
  authorizationUrl: string;
  expiresAt: string;
}

export async function createDataConnectionAuthorizationIntent(input: {
  provider: 'datev' | 'finapi' | 'erp_api';
  scopes: string[];
  returnTo: string;
}): Promise<DataConnectionAuthorizationIntent> {
  return request<DataConnectionAuthorizationIntent>('/api/v1/borrower/data-connections/authorization-intent', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function createDocumentIntelligenceJob(input: { documentIds: string[] }): Promise<{ jobId: string }> {
  return request<{ jobId: string }>('/api/v1/borrower/document-intelligence/jobs', { method: 'POST', body: JSON.stringify(input) });
}

export async function createSignatureEnvelopeIntent(input: { applicationId: string; provider: 'documenso'; documentIds: string[]; signers: Array<{ name: string; email: string; order: number }> }): Promise<{ envelopeId: string; status: string }> {
  return request<{ envelopeId: string; status: string }>('/api/v1/borrower/signatures/envelopes', { method: 'POST', body: JSON.stringify(input) });
}

export async function createDataExportJob(input: { applicationId?: string; facilityId?: string; format: 'json' | 'csv' | 'zip' }): Promise<{ exportId: string; status: string }> {
  return request<{ exportId: string; status: string }>('/api/v1/borrower/exports', { method: 'POST', body: JSON.stringify(input) });
}

export interface BorrowerCopilotAnswer {
  answer: string;
  href?: string;
  sourceRecordIds?: string[];
}

export async function askBorrowerCopilot(input: { applicationId?: string; question: string }): Promise<BorrowerCopilotAnswer> {
  return request<BorrowerCopilotAnswer>('/api/v1/borrower/copilot/query', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}
