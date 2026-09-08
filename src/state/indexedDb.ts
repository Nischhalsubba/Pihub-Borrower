const documentBlobs = new Map<string, Blob>();

/**
 * Demo document bytes are intentionally ephemeral.
 *
 * Production/API mode uploads through a protected server-issued upload intent.
 * Demo mode keeps selected files in memory only so identity/financial documents
 * cannot survive a tab refresh in IndexedDB or other persistent browser storage.
 */
export async function putDocumentBlob(key: string, file: Blob): Promise<void> {
  documentBlobs.set(key, file.slice(0, file.size, file.type || 'application/octet-stream'));
}

export async function getDocumentBlob(key: string): Promise<Blob | undefined> {
  return documentBlobs.get(key);
}

export async function deleteDocumentBlob(key: string): Promise<void> {
  documentBlobs.delete(key);
}

export function clearDocumentBlobs(): void {
  documentBlobs.clear();
}
