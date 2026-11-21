// Sending one queued post. Kept free of DOM code so it can be tested in node.
import { buildNote, summary, base64ToUtf8, bytesToBase64 } from './lib.js';

async function blobToBase64(blob) {
  return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
}

/** Files for a queued item under a given stem. */
export async function itemChanges(item, stem) {
  const changes = [];
  const images = [];
  for (let i = 0; i < item.photos.length; i++) {
    const p = item.photos[i];
    const path = `images/notes/${stem}-${i + 1}.${p.ext}`;
    changes.push({ path, base64: await blobToBase64(p.blob) });
    images.push({ src: '/' + path, alt: p.alt });
  }
  const note = buildNote({ text: item.text, date: item.stamp.frontMatterDate, images });
  changes.push({ path: `_notes/${stem}.md`, text: note });
  return { changes, note };
}

/**
 * Commit one queued item. If a previous attempt actually succeeded but the reply was
 * lost (connection dropped), the identical note is already there: treat it as sent
 * instead of posting a duplicate.
 */
export async function sendItem(api, item) {
  for (let n = 1; n < 20; n++) {
    const stem = n === 1 ? item.stamp.stem : `${item.stamp.stem}-${n}`;
    const path = `_notes/${stem}.md`;
    const { changes, note } = await itemChanges(item, stem);
    if (await api.exists(path)) {
      const existing = base64ToUtf8(await api.getBase64(path));
      if (existing === note) return stem; // already sent earlier
      continue;                           // a different note has this name
    }
    await api.commit(changes, `note: ${summary(item.text)}`);
    return stem;
  }
  throw new Error('Too many notes with the same time.');
}

