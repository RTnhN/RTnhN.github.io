// Posts waiting to be sent, kept in IndexedDB (it can hold photo Blobs, unlike
// localStorage). Each item: { id, created, stamp: {stem, frontMatterDate}, text,
// photos: [{ blob, ext, alt }] }.

const DB = 'post-app';
const STORE = 'outbox';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const result = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('Storage transaction aborted'));
    });
  } finally {
    db.close();
  }
}

export const outbox = {
  add: item => tx('readwrite', s => s.put(item)),
  remove: id => tx('readwrite', s => s.delete(id)),
  async all() {
    const items = (await tx('readonly', s => s.getAll())) || [];
    return items.sort((a, b) => a.created - b.created);
  },
};

/** Ask the browser not to evict our storage under pressure (best effort). */
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch { /* not supported */ }
}
