// Pure helpers for building note files. No DOM, no network — tested with node.

export const SITE_TZ = 'America/Chicago';

const pad = (n, w = 2) => String(n).padStart(w, '0');

/** Timestamp pieces for a note in the site's timezone. */
export function noteStamp(date = new Date(), tz = SITE_TZ) {
  const parts = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).forEach(p => { parts[p.type] = p.value; });

  const y = +parts.year, mo = +parts.month, d = +parts.day;
  const h = +parts.hour, mi = +parts.minute, s = +parts.second;
  const wallMs = Date.UTC(y, mo - 1, d, h, mi, s);
  const offMin = Math.round((wallMs - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  const sign = offMin < 0 ? '-' : '+';
  const off = sign + pad(Math.floor(Math.abs(offMin) / 60)) + pad(Math.abs(offMin) % 60);

  const ymd = `${y}-${pad(mo)}-${pad(d)}`;
  return {
    stem: `${ymd}-${pad(h)}${pad(mi)}`,
    frontMatterDate: `${ymd} ${pad(h)}:${pad(mi)}:${pad(s)} ${off}`,
  };
}

/** Lowercased, de-duplicated #hashtags, ignoring URL fragments and HTML entities. */
export function extractTags(text) {
  const tags = [];
  const re = /(^|[^\w&/#])#([A-Za-z][\w-]*)/g;
  let m;
  while ((m = re.exec(text))) {
    const t = m[2].replace(/-+$/, '').toLowerCase();
    if (t && !tags.includes(t)) tags.push(t);
  }
  return tags;
}

/** Wrap bare URLs in <...> so kramdown turns them into links. */
export function linkifyBareUrls(text) {
  return text.replace(/(^|\s)(https?:\/\/[^\s<>]+)/g, (all, lead, url) => {
    let trail = '';
    // Move trailing punctuation (and unbalanced closing parens) outside the link.
    while (/[.,!?;:'"\])]$/.test(url)) {
      const ch = url.slice(-1);
      if (ch === ')' && (url.match(/\(/g) || []).length >= (url.match(/\)/g) || []).length) break;
      trail = ch + trail;
      url = url.slice(0, -1);
    }
    return `${lead}<${url}>${trail}`;
  });
}

/**
 * Make note text safe to render: kramdown passes raw HTML and any link scheme
 * straight through, so escape every "<" except <https://…> autolinks and drop
 * Markdown links/images whose target isn't http(s), a site path, or mailto.
 */
const SAFE_TARGET = /^(https?:\/\/|\/(?!\/)|mailto:|#)/i;

export function sanitizeBody(text) {
  return text
    // Raw HTML (anything but <https://…> autolinks).
    .replace(/<(?!https?:\/\/[^\s<>]+>)/g, '&lt;')
    // Kramdown attribute lists / extensions: {: onclick="…"}, {::nomarkdown}
    .replace(/\{:/g, '\\{:')
    // Inline links/images with unsafe targets (javascript:, data:, entities…).
    .replace(/(!?\[[^\]]*\])\(\s*([^)\s]*)[^)]*\)/g, (all, label, target) =>
      SAFE_TARGET.test(target) ? all : label)
    // Reference-style link definitions: [1]: javascript:…
    .replace(/^( {0,3})\[([^\]]+)\]:[ \t]*(\S*)/gm, (all, indent, ref, target) =>
      SAFE_TARGET.test(target.replace(/^<|>$/g, '')) ? all : `${indent}\\[${ref}]:`);
}

/** Reverse of sanitizeBody's escaping, for showing a note in the editor. */
export function unsanitize(text) {
  return text.replace(/\\\{:/g, '{:').replace(/&lt;/g, '<').replace(/<(https?:[^>\s]+)>/g, '$1');
}

function tagsLine(tags) {
  return tags.length ? `tags: [${tags.join(', ')}]` : null;
}

/** Full Markdown file for a new note. images: [{src, alt}] */
export function buildNote({ text, date, images = [] }) {
  const body = sanitizeBody(linkifyBareUrls(text.trim()));
  const lines = ['---', `date: ${date}`];
  const tl = tagsLine(extractTags(body));
  if (tl) lines.push(tl);
  if (images.length) {
    lines.push('images:');
    images.forEach(img => {
      lines.push(`  - src: ${img.src}`);
      lines.push(`    alt: ${JSON.stringify(img.alt || 'Photo')}`);
    });
  }
  lines.push('---');
  return lines.join('\n') + '\n' + (body ? body + '\n' : '');
}

/** Split a note file into its front matter (without --- fences) and body. */
export function parseNote(file) {
  const m = file.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { frontMatter: '', body: file, images: [], date: null };
  const frontMatter = m[1];
  const images = [...frontMatter.matchAll(/^\s*-\s*src:\s*(\S+)\s*$/gm)].map(x => x[1]);
  const dm = frontMatter.match(/^date:\s*(.+)$/m);
  return { frontMatter, body: m[2].replace(/\n+$/, ''), images, date: dm ? dm[1].trim() : null };
}

/** Replace a note's body, keeping its front matter but refreshing tags. */
export function replaceBody(file, newText) {
  const { frontMatter } = parseNote(file);
  const body = sanitizeBody(linkifyBareUrls(newText.trim()));
  const fm = frontMatter.split('\n').filter(l => !/^tags:/.test(l));
  const tl = tagsLine(extractTags(body));
  if (tl) fm.splice(1, 0, tl); // right after date
  return ['---', ...fm, '---'].join('\n') + '\n' + (body ? body + '\n' : '');
}

/** Short commit-message summary. */
export function summary(text, words = 6) {
  const w = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!w.length) return 'photo';
  return w.slice(0, words).join(' ') + (w.length > words ? '…' : '');
}

/** Plain-text preview of a note body (strips <> around links and markdown syntax). */
export function preview(body, max = 160) {
  const t = body.replace(/<(https?:[^>]+)>/g, '$1').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

// --- base64 for UTF-8 text and binary ---

export function utf8ToBase64(str) {
  return bytesToBase64(new TextEncoder().encode(str));
}

export function base64ToUtf8(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function bytesToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}
