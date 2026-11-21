// Minimal GitHub REST client: just what's needed to commit notes.

const API = 'https://api.github.com';

// A private repo the posting token must NOT be able to see.
export const CANARY_REPO = 'RTnhN/sample_private_repo';

export class GitHubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const encPath = p => p.split('/').map(encodeURIComponent).join('/');

export class GitHub {
  constructor({ token, repo, branch }) {
    this.token = token;
    this.repo = repo;
    this.branch = branch;
  }

  async req(method, path, body) {
    const res = await fetch(`${API}/repos/${this.repo}${path}`, {
      method,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (data && data.message) || res.statusText;
      throw new GitHubError(res.status, msg);
    }
    return data;
  }

  /** Confirms the token can see the repo and the branch exists. */
  async check() {
    const repo = await this.req('GET', '');
    await this.req('GET', `/git/ref/heads/${encPath(this.branch)}`);
    if (repo.permissions && repo.permissions.push === false) {
      throw new GitHubError(403, 'Token can read this repo but cannot write to it.');
    }
    return repo;
  }

  /** Status code of a request (0 on network error); never throws for HTTP errors. */
  async status(method, url, body) {
    try {
      const res = await fetch(url.startsWith('http') ? url : `${API}${url}`, {
        method,
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { code: res.status, res };
    } catch {
      return { code: 0, res: null };
    }
  }

  /**
   * Every permission probe, with its raw result. Used by audit() and shown as-is in
   * the diagnostics view. `enforce: false` probes are informational only: GitHub was
   * seen answering them "yes" for tokens that lack the permission.
   */
  async probes(canary = CANARY_REPO) {
    const r = `/repos/${this.repo}`;
    const list = [
      // Another (private) repo: a token limited to this repo must get 404.
      { id: 'canary', name: `Access to ${canary}`, method: 'GET', path: `/repos/${canary}`, has: c => c === 200, enforce: true },
      // Repository permissions (reads that need the permission; 403/404 without it).
      { name: 'Administration', method: 'GET', path: `${r}/keys`, has: c => c === 200, enforce: true },
      { name: 'Webhooks', method: 'GET', path: `${r}/hooks`, has: c => c === 200, enforce: true },
      { name: 'Secrets', method: 'GET', path: `${r}/actions/secrets`, has: c => c === 200, enforce: true },
      { name: 'Variables', method: 'GET', path: `${r}/actions/variables`, has: c => c === 200, enforce: true },
      { name: 'Dependabot secrets', method: 'GET', path: `${r}/dependabot/secrets`, has: c => c === 200, enforce: true },
      { name: 'Codespaces secrets', method: 'GET', path: `${r}/codespaces/secrets`, has: c => c === 200, enforce: true },
      // Deliberately invalid writes: nothing is created either way.
      { name: 'Pull requests (write)', method: 'POST', path: `${r}/pulls`, body: {}, has: c => c === 422, enforce: true },
      { name: 'Issues (write)', method: 'POST', path: `${r}/issues`, body: {}, has: c => c === 422, enforce: false,
        note: 'Public repos accept issue attempts from anyone, so this says nothing.' },
      // Account permissions.
      { name: 'Email addresses', method: 'GET', path: '/user/emails', has: c => c === 200, enforce: true },
      { name: 'Git SSH keys', method: 'GET', path: '/user/keys', has: c => c === 200, enforce: true },
      { name: 'GPG keys', method: 'GET', path: '/user/gpg_keys', has: c => c === 200, enforce: true },
      { name: 'SSH signing keys', method: 'GET', path: '/user/ssh_signing_keys', has: c => c === 200, enforce: true },
      { name: 'Block another user', method: 'GET', path: '/user/blocks', has: c => c === 200, enforce: true },
      { name: 'Codespaces', method: 'GET', path: '/user/codespaces', has: c => c === 200, enforce: false,
        note: 'Returns an empty list instead of refusing, so this says nothing.' },
    ];
    return Promise.all(list.map(async p => {
      const { code, res } = await this.status(p.method, p.path, p.body);
      let message = '';
      if (res && code >= 400) {
        try { message = (await res.json()).message || ''; } catch { /* not JSON */ }
      }
      return { ...p, code, message, granted: p.has(code) };
    }));
  }

  /**
   * Check the token is fine-grained, limited to this one repo, with only Contents.
   * Returns [{ ok, label, detail }].
   */
  async audit(canary = CANARY_REPO) {
    const results = [];
    const add = (ok, label, detail = '') => results.push({ ok, label, detail });
    const r = `/repos/${this.repo}`;

    // 1. Token type. Classic (ghp_) and OAuth tokens have broad scopes.
    const fine = this.token.startsWith('github_pat_');
    add(fine, 'Fine-grained token', fine ? '' : 'Classic and OAuth tokens can reach every repo. Create a fine-grained token instead.');
    const probe = await this.status('GET', r);
    const scopes = probe.res && probe.res.headers.get('X-OAuth-Scopes');
    if (scopes) add(false, 'No classic OAuth scopes', `Token has scopes: ${scopes}`);

    // 2. Can write Contents to this repo (creates an unreferenced blob; harmless).
    const blob = await this.status('POST', `${r}/git/blobs`, { content: '', encoding: 'utf-8' });
    add(blob.code === 201, 'Can write Contents to this repo',
      blob.code === 201 ? '' : `GitHub answered ${blob.code || 'network error'}. Grant Contents: Read and write.`);

    const rows = (await this.probes(canary)).filter(p => p.enforce);

    // 3. Only this repository.
    const c = rows.find(p => p.id === 'canary');
    add(!c.granted, 'Only this repository',
      c.granted ? `Can read the private repo ${canary}. Set Repository access to "Only select repositories".` : '');

    // 4. No permissions besides Contents.
    const extra = rows.filter(p => p.id !== 'canary' && p.granted).map(p => p.name);
    add(extra.length === 0, 'No permissions besides Contents', extra.length ? `Also has: ${extra.join(', ')}` : '');

    return results;
  }

  async exists(path) {
    try {
      await this.req('GET', `/contents/${encPath(path)}?ref=${encodeURIComponent(this.branch)}`);
      return true;
    } catch (e) {
      if (e.status === 404) return false;
      throw e;
    }
  }

  /** Files in a directory (empty if the directory doesn't exist yet). */
  async list(dir) {
    try {
      const items = await this.req('GET', `/contents/${encPath(dir)}?ref=${encodeURIComponent(this.branch)}`);
      return Array.isArray(items) ? items.filter(i => i.type === 'file') : [];
    } catch (e) {
      if (e.status === 404) return [];
      throw e;
    }
  }

  /** Raw base64 content of a file. */
  async getBase64(path) {
    const f = await this.req('GET', `/contents/${encPath(path)}?ref=${encodeURIComponent(this.branch)}`);
    return f.content;
  }

  /**
   * One commit with any number of changes.
   * changes: [{ path, base64 }] | [{ path, text }] | [{ path, delete: true }]
   */
  async commit(changes, message) {
    // Upload blobs once; they don't depend on the branch head.
    const tree = [];
    for (const c of changes) {
      if (c.delete) {
        tree.push({ path: c.path, mode: '100644', type: 'blob', sha: null });
        continue;
      }
      const blob = await this.req('POST', '/git/blobs', c.base64 != null
        ? { content: c.base64, encoding: 'base64' }
        : { content: c.text, encoding: 'utf-8' });
      tree.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    // Build on the current head; retry if something else pushed in between.
    for (let attempt = 0; attempt < 3; attempt++) {
      const ref = await this.req('GET', `/git/ref/heads/${encPath(this.branch)}`);
      const parent = await this.req('GET', `/git/commits/${ref.object.sha}`);
      const newTree = await this.req('POST', '/git/trees', { base_tree: parent.tree.sha, tree });
      const commit = await this.req('POST', '/git/commits', {
        message, tree: newTree.sha, parents: [ref.object.sha],
      });
      try {
        await this.req('PATCH', `/git/refs/heads/${encPath(this.branch)}`, { sha: commit.sha });
        return commit;
      } catch (e) {
        if (e.status !== 422 || attempt === 2) throw e;
      }
    }
  }
}
