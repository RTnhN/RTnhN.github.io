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
