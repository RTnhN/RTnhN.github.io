// Minimal GitHub REST client: just what's needed to commit notes.

const API = 'https://api.github.com';

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
   * Check the token is a fine-grained token limited to this one repo with only
   * Contents access. Uses reads, plus writes that are invalid on purpose (they fail
   * validation with 422 only if the token HAS the permission, otherwise 403).
   * Returns [{ ok, label, detail }].
   */
  async audit() {
    const results = [];
    const add = (ok, label, detail = '') => results.push({ ok, label, detail });
    const r = `/repos/${this.repo}`;

    // 1. Token type. Classic (ghp_) and OAuth tokens have broad scopes.
    const fine = this.token.startsWith('github_pat_');
    add(fine, 'Fine-grained token', fine ? '' : 'Classic tokens (ghp_…) can reach every repo. Create a fine-grained token instead.');
    const probe = await this.status('GET', r);
    const scopes = probe.res && probe.res.headers.get('X-OAuth-Scopes');
    if (scopes) add(false, 'No classic OAuth scopes', `Token has scopes: ${scopes}`);

    // 2. Can write Contents to this repo (creates an unreferenced blob; harmless).
    const blob = await this.status('POST', `${r}/git/blobs`, { content: '', encoding: 'utf-8' });
    add(blob.code === 201, 'Can write Contents to this repo',
      blob.code === 201 ? '' : `GitHub answered ${blob.code || 'network error'}. Grant Contents: Read and write.`);

    // 3. No other repositories.
    const repos = await this.status('GET', '/user/repos?per_page=100&sort=full_name');
    if (repos.code === 200) {
      const names = (await repos.res.json()).map(x => x.full_name)
        .filter(n => n.toLowerCase() !== this.repo.toLowerCase());
      add(names.length === 0, 'Only this repository',
        names.length ? `Also has access to: ${names.slice(0, 5).join(', ')}${names.length > 5 ? ` and ${names.length - 5} more` : ''}` : '');
    } else {
      add(true, 'Only this repository', 'Could not list repositories (that’s fine).');
    }

    // 4. No other repository permissions (reads that need a specific permission).
    const repoReads = [
      ['Administration', `${r}/keys`],
      ['Webhooks', `${r}/hooks`],
      ['Secrets', `${r}/actions/secrets`],
      ['Variables', `${r}/actions/variables`],
      ['Dependabot secrets', `${r}/dependabot/secrets`],
      ['Codespaces secrets', `${r}/codespaces/secrets`],
    ];
    // Invalid-on-purpose writes: 422 means the permission exists; nothing is created.
    const repoWrites = [
      ['Issues (write)', `${r}/issues`],
      ['Pull requests (write)', `${r}/pulls`],
    ];
    // 5. No account permissions.
    const userReads = [
      ['Email addresses', '/user/emails'],
      ['Git SSH keys', '/user/keys'],
      ['GPG keys', '/user/gpg_keys'],
      ['SSH signing keys', '/user/ssh_signing_keys'],
      ['Codespaces', '/user/codespaces'],
      ['Block another user', '/user/blocks'],
    ];

    const checks = await Promise.all([
      ...repoReads.map(async ([name, url]) => [name, (await this.status('GET', url)).code === 200]),
      ...repoWrites.map(async ([name, url]) => [name, (await this.status('POST', url, {})).code === 422]),
      ...userReads.map(async ([name, url]) => [name, (await this.status('GET', url)).code === 200]),
    ]);
    const extra = checks.filter(([, has]) => has).map(([name]) => name);
    add(extra.length === 0, 'No permissions besides Contents',
      extra.length ? `Also has: ${extra.join(', ')}` : '');

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
