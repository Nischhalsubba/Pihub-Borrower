import { invalidatePlatformReadCache, PlatformApiError } from './platformApi';
import { apiBaseUrl } from './runtime';

export interface ReuseVaultItemResult {
  linkId?: string;
  documentId: string;
  applicationId: string;
  linked: true;
  alreadyOwned: boolean;
  eventId?: string;
}

export async function reuseBorrowerVaultItem(applicationId: string, vaultItemId: string): Promise<ReuseVaultItemResult> {
  const base = apiBaseUrl();
  if (!base) throw new PlatformApiError('PiHub API base URL is not configured.', 0, 'api_not_configured');
  const response = await fetch(`${base}/api/v1/borrower/vault/${encodeURIComponent(vaultItemId)}/reuse`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationId })
  });
  if (!response.ok) {
    let message = `PiHub vault reuse request failed (${response.status}).`;
    let code: string | undefined;
    try {
      const body = await response.json() as { message?: string; code?: string };
      message = body.message || message;
      code = body.code;
    } catch { /* retain safe fallback */ }
    throw new PlatformApiError(message, response.status, code);
  }
  const result = await response.json() as ReuseVaultItemResult;
  invalidatePlatformReadCache();
  return result;
}
