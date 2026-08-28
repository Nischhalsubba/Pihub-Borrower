const DB_NAME = 'pihub-borrower-documents-v2';
const STORE = 'blobs';

type StoredDocumentBlob = {
  bytes: ArrayBuffer;
  type: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putDocumentBlob(key: string, file: Blob): Promise<void> {
  const payload: StoredDocumentBlob = {
    bytes: await file.arrayBuffer(),
    type: file.type || 'application/octet-stream'
  };
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(payload, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Document storage transaction was aborted.'));
    });
  } finally {
    db.close();
  }
}

export async function getDocumentBlob(key: string): Promise<Blob | undefined> {
  const db = await openDb();
  try {
    const value = await new Promise<Blob | StoredDocumentBlob | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as Blob | StoredDocumentBlob | undefined);
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error ?? new Error('Document read transaction was aborted.'));
    });
    if (value instanceof Blob) return value;
    if (value?.bytes instanceof ArrayBuffer) return new Blob([value.bytes], { type: value.type || 'application/octet-stream' });
    return undefined;
  } finally {
    db.close();
  }
}

export async function deleteDocumentBlob(key: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Document deletion transaction was aborted.'));
    });
  } finally {
    db.close();
  }
}
