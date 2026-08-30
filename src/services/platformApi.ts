import type { BorrowerState, IntegrationEvent } from '../state/model';
import type { ApprovalGateStatus, ApprovalGateType, BorrowerPlatformProjection } from '../platform/types';
import { apiBaseUrl, isApiRuntime } from './runtime';

export interface SessionUser { id: string; email: string; name: string; modules: string[]; }
export interface SessionResult { authenticated: boolean; user?: SessionUser; snapshot?: BorrowerState; revision?: number; }
export interface WorkspaceSyncResult { initialized: boolean; revision: number; unchanged?: boolean; patch?: Partial<BorrowerState>; snapshot?: BorrowerState; }

export class PlatformApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); this.name = 'PlatformApiError'; }
}

type ReadOptions = { cacheTtlMs?: number; force?: boolean };
type ReadCacheEntry = { expiresAt: number; value: unknown };
const SESSION_CACHE_TTL_MS = 20_000;
const BOOTSTRAP_CACHE_TTL_MS = 5_000;
const PLATFORM_PROJECTION_CACHE_TTL_MS = 5_000;
const COMMAND_DEDUPE_TTL_MS = 5_000;
const readCache = new Map<string, ReadCacheEntry>();
const inflightReads = new Map<string, Promise<unknown>>();
const recentCommands = new Map<string, { expiresAt: number; promise: Promise<PlatformCommandResult> }>();
let canonicalSnapshot: BorrowerState | undefined;
let canonicalRevision = 0;

const DEDUPE_SAFE_COMMANDS = new Set(['application.section.update','application.status.request','closing.item.set','notification.read','notification.read_all','organization.member.update','profile.update','profile.locale.set']);

function normalizeForSignature(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForSignature);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([,item])=>item!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,normalizeForSignature(item)]));
  return value;
}
function stableSignature(value: unknown): string { return JSON.stringify(normalizeForSignature(value)); }
function clearExpiredCaches(now=Date.now()): void { for (const [key,entry] of readCache) if (entry.expiresAt<=now) readCache.delete(key); for (const [key,entry] of recentCommands) if (entry.expiresAt<=now) recentCommands.delete(key); }
export function invalidatePlatformReadCache(): void { readCache.clear(); }
function primeBorrowerSnapshot(snapshot: BorrowerState, revision?: number): void {
  canonicalSnapshot = snapshot;
  if (typeof revision === 'number' && Number.isFinite(revision)) canonicalRevision = revision;
  readCache.set('GET:/api/v1/borrower/bootstrap', { expiresAt: Date.now()+BOOTSTRAP_CACHE_TTL_MS, value: snapshot });
}
export function currentBorrowerRevision(): number { return canonicalRevision; }

async function executeRequest<T>(path:string,init:RequestInit={}):Promise<T>{
  const base=apiBaseUrl();
  const response=await fetch(`${base}${path}`,{...init,credentials:'include',headers:{Accept:'application/json',...(init.body?{'Content-Type':'application/json'}:{}),...(init.headers??{})}});
  if(!response.ok){let message=`PiHub API request failed (${response.status}).`;let code:string|undefined;try{const body=await response.json() as{message?:string;code?:string};message=body.message||message;code=body.code;}catch{}throw new PlatformApiError(message,response.status,code);}
  if(response.status===204)return undefined as T;
  return response.json() as Promise<T>;
}
async function request<T>(path:string,init:RequestInit={},options:ReadOptions={}):Promise<T>{
  const method=(init.method??'GET').toUpperCase();if(method!=='GET')return executeRequest<T>(path,init);
  clearExpiredCaches();const key=`${method}:${path}`;
  if(!options.force){const cached=readCache.get(key);if(cached&&cached.expiresAt>Date.now())return cached.value as T;}
  const inflight=inflightReads.get(key);if(inflight)return inflight as Promise<T>;
  const pending=executeRequest<T>(path,init).then(value=>{if(options.cacheTtlMs&&options.cacheTtlMs>0)readCache.set(key,{expiresAt:Date.now()+options.cacheTtlMs,value});return value;}).finally(()=>inflightReads.delete(key));
  inflightReads.set(key,pending);return pending;
}

export async function getSession(options:{force?:boolean}={}):Promise<SessionResult>{
  if(!isApiRuntime())return{authenticated:false};
  const result=await request<SessionResult>('/api/v1/session',{}, {cacheTtlMs:SESSION_CACHE_TTL_MS,force:options.force});
  if(result.snapshot)primeBorrowerSnapshot(result.snapshot,result.revision);return result;
}
export async function signIn(email:string,password:string):Promise<SessionResult>{
  const result=await request<SessionResult>('/api/v1/auth/login',{method:'POST',body:JSON.stringify({email,password,module:'borrower'})});invalidatePlatformReadCache();if(result.snapshot)primeBorrowerSnapshot(result.snapshot,result.revision);return result;
}
export async function signOut():Promise<void>{await request<void>('/api/v1/auth/logout',{method:'POST'});invalidatePlatformReadCache();recentCommands.clear();canonicalSnapshot=undefined;canonicalRevision=0;}
export async function requestPasswordReset(email:string):Promise<void>{await request<void>('/api/v1/auth/password-reset',{method:'POST',body:JSON.stringify({email,module:'borrower'})});}

export async function fetchBorrowerSnapshot(options:{force?:boolean}={}):Promise<BorrowerState>{
  if (!isApiRuntime()) throw new PlatformApiError('PiHub API runtime is not enabled.',0,'api_not_configured');
  const useDelta=!options.force&&canonicalRevision>0&&Boolean(canonicalSnapshot);
  const path=useDelta?`/api/v1/borrower/bootstrap?sinceRevision=${canonicalRevision}`:'/api/v1/borrower/bootstrap';
  const envelope=await request<WorkspaceSyncResult>(path,{}, {cacheTtlMs:useDelta?0:BOOTSTRAP_CACHE_TTL_MS,force:options.force});
  if(envelope.unchanged&&canonicalSnapshot){canonicalRevision=envelope.revision;return canonicalSnapshot;}
  if(envelope.patch&&canonicalSnapshot){canonicalSnapshot={...canonicalSnapshot,...envelope.patch,lastSavedAt:(envelope.patch.lastSavedAt??canonicalSnapshot.lastSavedAt)} as BorrowerState;canonicalRevision=envelope.revision;primeBorrowerSnapshot(canonicalSnapshot,canonicalRevision);return canonicalSnapshot;}
  if(envelope.snapshot){primeBorrowerSnapshot(envelope.snapshot,envelope.revision);return envelope.snapshot;}
  throw new PlatformApiError('PiHub returned no canonical Borrower workspace.',409,'workspace_unavailable');
}

export async function fetchBorrowerIntegrationProjection(applicationId:string,options:{force?:boolean}={}):Promise<BorrowerPlatformProjection>{const path=`/api/v1/borrower/integration?applicationId=${encodeURIComponent(applicationId)}`;return request<BorrowerPlatformProjection>(path,{}, {cacheTtlMs:PLATFORM_PROJECTION_CACHE_TTL_MS,force:options.force});}
export async function completeBorrowerPlatformWorkItem(workItemId:string):Promise<{id:string;status:'done';eventId?:string}>{const response=await request<{result?:{id:string;status:'done';eventId?:string};id?:string;status?:'done';eventId?:string}>(`/api/v1/borrower/work-items/${encodeURIComponent(workItemId)}/complete`,{method:'POST'});invalidatePlatformReadCache();return response.result??response as{ id:string;status:'done';eventId?:string};}
export async function setBorrowerPlatformApproval(applicationId:string,type:ApprovalGateType,decision:Exclude<ApprovalGateStatus,'pending'>,note=''):Promise<{id:string;type:ApprovalGateType;status:ApprovalGateStatus;eventId?:string}>{const response=await request<any>('/api/v1/borrower/approvals',{method:'POST',body:JSON.stringify({applicationId,type,decision,note})});invalidatePlatformReadCache();return response.result??response;}

export interface PlatformCommand { idempotencyKey:string;command:string;aggregateId?:string;payload:Record<string,unknown>; }
export interface PlatformCommandResult { accepted:true;revision?:number;version?:number;snapshot?:BorrowerState; }
export async function sendBorrowerCommand(command:PlatformCommand):Promise<PlatformCommandResult>{
  clearExpiredCaches();const signature=DEDUPE_SAFE_COMMANDS.has(command.command)?stableSignature({command:command.command,aggregateId:command.aggregateId??null,payload:command.payload}):undefined;
  if(signature){const recent=recentCommands.get(signature);if(recent&&recent.expiresAt>Date.now())return recent.promise;}
  const pending=request<PlatformCommandResult>('/api/v1/borrower/commands',{method:'POST',headers:{'Idempotency-Key':command.idempotencyKey},body:JSON.stringify(command)}).then(result=>{invalidatePlatformReadCache();if(result.snapshot)primeBorrowerSnapshot(result.snapshot,result.revision);else if(typeof result.revision==='number')canonicalRevision=result.revision;return result;}).catch(error=>{if(signature)recentCommands.delete(signature);throw error;});
  if(signature)recentCommands.set(signature,{expiresAt:Date.now()+COMMAND_DEDUPE_TTL_MS,promise:pending});return pending;
}

export async function flushIntegrationEvents(events:IntegrationEvent[]):Promise<{acknowledgedIds:string[]}>{if(!events.length)return{acknowledgedIds:[]};return request('/api/v1/borrower/outbox',{method:'POST',body:JSON.stringify({events})});}
export interface DocumentUploadIntent{uploadUrl:string;documentId:string;versionId:string;headers?:Record<string,string>}
export async function createDocumentUploadIntent(input:{applicationId:string;name:string;contentType:string;size:number;category:string;replaceId?:string}):Promise<DocumentUploadIntent>{return request('/api/v1/borrower/documents/upload-intent',{method:'POST',body:JSON.stringify(input)});}
export interface DataConnectionAuthorizationIntent{connectionId:string;provider:'datev'|'finapi'|'erp_api';authorizationUrl:string;expiresAt:string}
export async function createDataConnectionAuthorizationIntent(input:{provider:'datev'|'finapi'|'erp_api';scopes:string[];returnTo:string}):Promise<DataConnectionAuthorizationIntent>{const callbackUrl=`${window.location.origin}/api/v1/borrower/data-connections/callback`;return request('/api/v1/borrower/data-connections/authorization-intent',{method:'POST',body:JSON.stringify({...input,callbackUrl})});}
export async function createDocumentIntelligenceJob(input:{documentIds:string[]}):Promise<{jobId:string}>{return request('/api/v1/borrower/document-intelligence/jobs',{method:'POST',body:JSON.stringify(input)});}
export async function createSignatureEnvelopeIntent(input:{applicationId:string;provider:'documenso';documentIds:string[];signers:Array<{name:string;email:string;order:number}>}):Promise<{envelopeId:string;status:string}>{return request('/api/v1/borrower/signatures/envelopes',{method:'POST',body:JSON.stringify(input)});}
export async function createDataExportJob(input:{applicationId?:string;facilityId?:string;format:'json'|'csv'|'zip'}):Promise<{exportId:string;status:string}>{return request('/api/v1/borrower/exports',{method:'POST',body:JSON.stringify(input)});}
export interface BorrowerCopilotAnswer{answer:string;href?:string;sourceRecordIds?:string[]}
export async function askBorrowerCopilot(input:{applicationId?:string;question:string}):Promise<BorrowerCopilotAnswer>{return request('/api/v1/borrower/copilot/query',{method:'POST',body:JSON.stringify(input)});}
