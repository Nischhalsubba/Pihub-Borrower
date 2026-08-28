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
}

export class PlatformApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'PlatformApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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

export async function getSession(): Promise<SessionResult> {
  if (!isApiRuntime()) return { authenticated: false };
  return request<SessionResult>('/api/v1/session');
}

export async function signIn(email: string, password: string): Promise<SessionResult> {
  return request<SessionResult>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password, module: 'borrower' }) });
}

export async function signOut(): Promise<void> {
  await request<void>('/api/v1/auth/logout', { method: 'POST' });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await request<void>('/api/v1/auth/password-reset', { method: 'POST', body: JSON.stringify({ email, module: 'borrower' }) });
}

export async function fetchBorrowerSnapshot(): Promise<BorrowerState> {
  return request<BorrowerState>('/api/v1/borrower/bootstrap');
}

export interface PlatformCommand {
  idempotencyKey: string;
  command: string;
  aggregateId?: string;
  payload: Record<string, unknown>;
}

export async function sendBorrowerCommand(command: PlatformCommand): Promise<{ accepted: true; version?: number }> {
  return request<{ accepted: true; version?: number }>('/api/v1/borrower/commands', {
    method: 'POST',
    headers: { 'Idempotency-Key': command.idempotencyKey },
    body: JSON.stringify(command)
  });
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
