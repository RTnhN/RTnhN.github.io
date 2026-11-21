import {
  noteStamp, buildNote, parseNote, replaceBody, extractTags, summary, preview, unsanitize,
  utf8ToBase64, base64ToUtf8, bytesToBase64,
} from './lib.js';
import { GitHub } from './github.js';

const SITE_URL = 'https://zachstrout.com';
const DEFAULTS = { repo: 'RTnhN/RTnhN.github.io', branch: 'master' };
const MAX_EDGE = 1600;
const RECENT = 10;
const MAX_GIF_BYTES = 15 * 1024 * 1024;

const isGif = file => file.type === 'image/gif' || /\.gif$/i.test(file.name || '');

// GIFs are uploaded untouched so they keep their animation (a canvas would keep
// only the first frame). Every other image is resized and re-encoded to JPEG.
async function prepareImage(file) {
  if (isGif(file)) {
    if (file.size > MAX_GIF_BYTES) {
      throw new Error(`GIF is ${(file.size / 1048576).toFixed(1)} MB; the limit is 15 MB.`);
    }
    return { blob: file, ext: 'gif' };
  }
  return { blob: await processImage(file), ext: 'jpg' };
}

const $ = id => document.getElementById(id);

// ---------- storage (wrapped: private mode or cleared data must not break the app) ----------
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

function settings() {
  return {
    token: store.get('token') || '',
    repo: store.get('repo') || DEFAULTS.repo,
    branch: store.get('branch') || DEFAULTS.branch,
  };
}
const gh = () => new GitHub(settings());

// ---------- state ----------
let photos = [];      // { blob, url, alt }
let editing = null;   // { path, file, name }
let busy = false;

// ---------- status helpers ----------
function setStatus(el, msg, kind = '') {
  el.textContent = '';
  el.className = 'status' + (kind ? ' ' + kind : '');
  if (msg instanceof Node) el.appendChild(msg); else el.textContent = msg || '';
}

function errorText(e) {
  if (e && e.status === 401) return 'GitHub rejected the token (expired or revoked?). Update it in settings.';
  if (e && e.status === 403) return 'Token lacks permission: it needs Contents read & write on this repo.';
  if (e && e.status === 404) return 'Repo or branch not found, or the token cannot see it.';
  if (e instanceof TypeError) return 'Network error. Your draft is saved; try again when online.';
  return (e && e.message) || String(e);
}

// ---------- settings panel ----------
function showSettings(show) {
  const s = settings();
  $('setup').hidden = !show;
  $('composer').hidden = show;
  $('recent').hidden = !s.token;
  if (show) {
    $('token').value = s.token;
    $('repo').value = s.repo;
    $('branch').value = s.branch;
    $('close-settings').hidden = !s.token;
    $('forget').hidden = !s.token;
    setStatus($('settings-status'), '');
  }
}

$('open-settings').addEventListener('click', () => showSettings($('setup').hidden));
$('close-settings').addEventListener('click', () => showSettings(false));

$('settings-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const token = $('token').value.trim();
  const repo = $('repo').value.trim() || DEFAULTS.repo;
  const branch = $('branch').value.trim() || DEFAULTS.branch;
  if (!token) return setStatus($('settings-status'), 'Paste a token first.', 'error');
  setStatus($('settings-status'), 'Checking…');
  try {
    await new GitHub({ token, repo, branch }).check();
    store.set('token', token);
    store.set('repo', repo);
    store.set('branch', branch);
    showSettings(false);
    loadRecent();
  } catch (e) {
    setStatus($('settings-status'), errorText(e), 'error');
  }
});

$('forget').addEventListener('click', () => {
  if (!confirm('Remove the GitHub token from this device?')) return;
  store.del('token');
  $('token').value = '';
  $('recent-list').textContent = '';
  showSettings(true);
});

// ---------- composer ----------
const textEl = $('text');

function autosize() {
  textEl.style.height = 'auto';
  textEl.style.height = Math.max(120, textEl.scrollHeight) + 'px';
}

function refreshComposer() {
  const text = textEl.value;
  const tags = extractTags(text);
  const tagsEl = $('tags');
  tagsEl.textContent = '';
  tags.forEach(t => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = '#' + t;
    tagsEl.appendChild(span);
  });
  const n = text.trim().length;
  $('count').textContent = n ? `${n}` : '';
  $('publish').disabled = busy || (!text.trim() && (editing || photos.length === 0));
  $('publish').textContent = editing ? 'Save' : 'Post';
  $('photo-label').hidden = !!editing;
  if (!editing) store.set('draft', text);
  autosize();
}

textEl.addEventListener('input', refreshComposer);

// Paste a URL/text in via ?text=…&url=… (e.g. from an iOS Shortcut).
function applyShareParams() {
  const p = new URLSearchParams(location.search);
  const parts = [p.get('text'), p.get('title'), p.get('url')].filter(Boolean);
  if (parts.length) {
    const existing = textEl.value.trim();
    textEl.value = (existing ? existing + '\n\n' : '') + parts.join(' ');
    history.replaceState(null, '', location.pathname);
    setStatus($('status'), 'Text was added from a link. Check it before posting.');
  }
}

// ---------- photos ----------
async function processImage(file) {
  // Drawing through a canvas applies EXIF orientation and drops ALL metadata (incl. GPS).
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w = img.naturalWidth, h = img.naturalHeight;
    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // flatten transparent PNGs onto white for JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res, rej) =>
      canvas.toBlob(b => (b ? res(b) : rej(new Error('Could not encode image'))), 'image/jpeg', 0.85));
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function renderPhotos() {
  const wrap = $('photos');
  wrap.textContent = '';
  photos.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'photo';
    const img = document.createElement('img');
    img.src = p.url;
    img.alt = '';
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'remove';
    rm.setAttribute('aria-label', 'Remove photo');
    rm.textContent = '×';
    rm.addEventListener('click', () => {
      URL.revokeObjectURL(p.url);
      photos.splice(i, 1);
      renderPhotos();
      refreshComposer();
    });
    const alt = document.createElement('input');
    alt.type = 'text';
    alt.placeholder = 'Describe photo (alt text)';
    alt.value = p.alt;
    alt.addEventListener('input', () => { p.alt = alt.value; });
    div.append(img, rm, alt);
    wrap.appendChild(div);
  });
}

$('photo-input').addEventListener('change', async ev => {
  const files = [...ev.target.files];
  ev.target.value = '';
  if (!files.length) return;
  setStatus($('status'), `Preparing ${files.length} photo${files.length > 1 ? 's' : ''}…`);
  for (const f of files) {
    try {
      const { blob, ext } = await prepareImage(f);
      photos.push({ blob, ext, url: URL.createObjectURL(blob), alt: '' });
    } catch (e) {
      setStatus($('status'), `Couldn't read ${f.name}: ${e.message}`, 'error');
    }
  }
  renderPhotos();
  refreshComposer();
  if ($('status').textContent.startsWith('Preparing')) setStatus($('status'), '');
});

// ---------- publish / save ----------
async function blobToBase64(blob) {
  return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
}

async function freeStem(api, stem) {
  for (let n = 1; n < 20; n++) {
    const candidate = n === 1 ? stem : `${stem}-${n}`;
    if (!(await api.exists(`_notes/${candidate}.md`))) return candidate;
  }
  throw new Error('Too many notes this minute.');
}

function liveLink(stem, prefix) {
  const frag = document.createDocumentFragment();
  frag.append(prefix + ' ');
  const a = document.createElement('a');
  a.href = `${SITE_URL}/notes/${stem}/`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = `notes/${stem}`;
  frag.append(a);
  return frag;
}

// Poll the live site until GitHub Pages has rebuilt (GitHub Pages sends CORS headers).
async function waitForLive(stem) {
  const url = `${SITE_URL}/notes/${stem}/`;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 10000));
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (res.ok) return true;
    } catch { /* keep trying */ }
  }
  return false;
}

async function publish() {
  if (busy) return;
  const text = textEl.value;
  busy = true;
  refreshComposer();
  const status = $('status');
  try {
    const api = gh();
    if (editing) {
      if (!/^_notes\/[\w.-]+\.md$/.test(editing.path)) throw new Error('Refusing to edit a file outside _notes/.');
      setStatus(status, 'Saving…');
      const updated = replaceBody(editing.file, text);
      await api.commit([{ path: editing.path, text: updated }], `note: edit ${summary(text)}`);
      const stem = editing.name;
      exitEdit();
      setStatus(status, liveLink(stem, 'Saved. Live in a minute or two:'), 'ok');
    } else {
      setStatus(status, 'Posting…');
      const stamp = noteStamp(new Date());
      const stem = await freeStem(api, stamp.stem);
      const changes = [];
      const images = [];
      for (let i = 0; i < photos.length; i++) {
        setStatus(status, `Uploading photo ${i + 1} of ${photos.length}…`);
        const path = `images/notes/${stem}-${i + 1}.${photos[i].ext}`;
        changes.push({ path, base64: await blobToBase64(photos[i].blob) });
        images.push({ src: '/' + path, alt: photos[i].alt.trim() });
      }
      changes.push({ path: `_notes/${stem}.md`, text: buildNote({ text, date: stamp.frontMatterDate, images }) });
      setStatus(status, 'Committing…');
      await api.commit(changes, `note: ${summary(text)}`);

      textEl.value = '';
      store.del('draft');
      photos.forEach(p => URL.revokeObjectURL(p.url));
      photos = [];
      renderPhotos();
      setStatus(status, liveLink(stem, 'Posted. Building…'), 'ok');
      waitForLive(stem).then(ok => {
        if ($('status').querySelector(`a[href$="/${stem}/"]`)) {
          setStatus($('status'), liveLink(stem, ok ? 'Live ✓' : 'Posted (still building; check GitHub if it doesn’t appear):'), 'ok');
        }
      });
    }
    loadRecent();
  } catch (e) {
    setStatus(status, errorText(e), 'error');
  } finally {
    busy = false;
    refreshComposer();
  }
}

$('publish').addEventListener('click', publish);
textEl.addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) publish();
});

// ---------- edit mode ----------
function enterEdit(item) {
  editing = item;
  $('edit-name').textContent = item.name;
  $('edit-banner').hidden = false;
  photos.forEach(p => URL.revokeObjectURL(p.url));
  photos = [];
  renderPhotos();
  textEl.value = unsanitize(parseNote(item.file).body);
  refreshComposer();
  setStatus($('status'), '');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  textEl.focus();
}

function exitEdit() {
  editing = null;
  $('edit-banner').hidden = true;
  textEl.value = store.get('draft') || '';
  refreshComposer();
}

$('cancel-edit').addEventListener('click', exitEdit);

// ---------- recent notes ----------
async function loadRecent() {
  const list = $('recent-list');
  if (!settings().token) return;
  const loading = document.createElement('li');
  loading.className = 'empty';
  loading.textContent = 'Loading…';
  list.replaceChildren(loading);
  try {
    const api = gh();
    const files = (await api.list('_notes'))
      .filter(f => f.name.endsWith('.md'))
      .sort((a, b) => b.name.localeCompare(a.name))
      .slice(0, RECENT);
    const notes = await Promise.all(files.map(async f => ({
      path: f.path,
      name: f.name.replace(/\.md$/, ''),
      file: base64ToUtf8(await api.getBase64(f.path)),
    })));
    list.replaceChildren();
    if (!notes.length) {
      loading.textContent = 'No notes yet.';
      list.appendChild(loading);
      return;
    }
    notes.forEach(n => list.appendChild(renderRecent(n)));
  } catch (e) {
    loading.textContent = errorText(e);
    list.replaceChildren(loading);
  }
}

function renderRecent(n) {
  const parsed = parseNote(n.file);
  const li = document.createElement('li');

  const meta = document.createElement('div');
  meta.className = 'meta';
  const when = document.createElement('a');
  when.href = `${SITE_URL}/notes/${n.name}/`;
  when.target = '_blank';
  when.rel = 'noopener';
  when.textContent = parsed.date ? parsed.date.replace(/:\d\d [+-]\d{4}$/, '') : n.name;
  meta.appendChild(when);
  if (parsed.images.length) {
    const ph = document.createElement('span');
    ph.textContent = `📷 ${parsed.images.length}`;
    meta.appendChild(ph);
  }

  const text = document.createElement('div');
  text.className = 'text';
  text.textContent = preview(parsed.body);

  const buttons = document.createElement('div');
  buttons.className = 'buttons';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'ghost small';
  edit.textContent = 'Edit';
  edit.addEventListener('click', () => enterEdit(n));
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'ghost small del';
  del.textContent = 'Delete';
  del.addEventListener('click', () => removeNote(n, parsed, del));
  buttons.append(edit, del);

  li.append(meta, text, buttons);
  return li;
}

async function removeNote(n, parsed, btn) {
  if (!confirm(`Delete note ${n.name}${parsed.images.length ? ` and its ${parsed.images.length} photo(s)` : ''}?`)) return;
  btn.disabled = true;
  try {
    const changes = [{ path: n.path, delete: true }];
    parsed.images
      .map(src => src.replace(/^\//, ''))
      .filter(p => /^images\/notes\/[\w.-]+$/.test(p))
      .forEach(path => changes.push({ path, delete: true }));
    await gh().commit(changes, `note: delete ${n.name}`);
    if (editing && editing.path === n.path) exitEdit();
    setStatus($('status'), `Deleted ${n.name}. The site updates in a minute or two.`, 'ok');
    loadRecent();
  } catch (e) {
    btn.disabled = false;
    setStatus($('status'), errorText(e), 'error');
  }
}

$('refresh').addEventListener('click', loadRecent);

// ---------- start ----------
textEl.value = store.get('draft') || '';
applyShareParams();
refreshComposer();
if (settings().token) {
  showSettings(false);
  loadRecent();
} else {
  showSettings(true);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
}
