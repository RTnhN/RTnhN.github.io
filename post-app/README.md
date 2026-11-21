# Post a Note (PWA)

A small installable web app for posting to the `/notes/` feed on zachstrout.com from a
phone, without AI. It commits note files straight to this repo through the GitHub API;
GitHub Pages then rebuilds the site.

- Plain HTML/JS, no build step, no dependencies.
- Writes the same format as the `post-note` Claude/Codex skill
  (`_notes/YYYY-MM-DD-HHMM.md`, photos in `images/notes/`).
- Photos are resized to 1600px and re-encoded on the phone, which strips all metadata
  (including GPS) before upload. GIFs are uploaded unchanged (up to 15 MB) so they stay
  animated.
- `#hashtags` stay in the text and are also written to `tags:`.
- One commit per note (photos included); recent notes can be edited or deleted.
- **Offline outbox:** every new post (text + photos) is saved to IndexedDB on the device
  first, then sent oldest-first whenever the app is open and GitHub is reachable (on
  open, when the connection returns, when the app comes back to the foreground, or via
  *Send now*). Notes keep the time they were written. If a commit went through but the
  reply was lost, the retry sees the identical note already in the repo and doesn't post
  it twice. iOS has no background sync for web apps, so queued posts only send while the
  app is open. Edits and deletes still need a connection.
- `?text=…&url=…` pre-fills the composer (handy for an iOS Shortcut share action).

This folder is excluded from the Jekyll build (`exclude:` in `_config.yml`), so it is
**not** published on zachstrout.com. It is hosted separately on its own origin so no
script on the main site (analytics, MathJax CDN) can read the token.

## Security model

- The token is the only key. Anyone can load the page, but without a token it can do nothing.
- The token is stored in this origin's `localStorage` on your device only, and is only
  ever sent to `api.github.com`.
- `_headers` sets a strict Content-Security-Policy: only this app's own scripts run, and
  network access is limited to `api.github.com` and `zachstrout.com`.
- Use a **fine-grained token** scoped to this one repo, with an expiry. Revoke it at
  <https://github.com/settings/tokens?type=beta> if a device is lost.
- **The app refuses over-broad tokens.** On *Save & test* (and about once a day for a
  saved token) it checks that the token:
  - is fine-grained (`github_pat_…`) with no classic OAuth scopes;
  - can write Contents to this repo (it creates an unreferenced blob, which is harmless);
  - **cannot** see the private repo `RTnhN/sample_private_repo` (`CANARY_REPO` in
    `github.js`). A token limited to this repo gets 404 there; "All repositories" gets 200;
  - has none of Administration, Webhooks, Secrets, Variables, Dependabot secrets,
    Codespaces secrets, Pull requests write, or the account permissions Email addresses,
    Git SSH keys, GPG keys, SSH signing keys, and Block another user. The Pull requests
    check sends a deliberately invalid request: GitHub answers 422 only when the
    permission exists, and nothing is created.
  - **Not checked:** Issues write (public repos accept issue attempts from anyone) and
    the Codespaces account permission (GitHub returns an empty list instead of refusing).
    These still appear, marked "ignored", in diagnostics.
  - **Not detectable from a browser:** the token's expiry (GitHub doesn't expose that
    header to web pages) and write-only permissions such as Workflows, Actions write, or
    Administration write. Check those on the token's settings page.
- **Run diagnostics** in settings shows GitHub's raw answer to every check for the token
  in the field, without saving it.

## One-time setup

### 1. Create the GitHub token

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
→ Generate new token:

- **Repository access:** Only select repositories → `RTnhN/RTnhN.github.io`
- **Permissions → Repository → Contents:** Read and write (Metadata: read is added automatically)
- **Expiration:** your choice (e.g. 6–12 months)

### 2. Host it on Cloudflare Pages

Cloudflare dashboard → Workers & Pages → Create → Pages → **Connect to Git**:

- Repository: `RTnhN/RTnhN.github.io`, production branch `master`
- Framework preset: **None**
- Build command: *(leave empty)*
- Build output directory: `post-app`

Then **Custom domains → Set up a custom domain → `post.zachstrout.com`**. If the
`zachstrout.com` DNS is not on Cloudflare, add the CNAME record it shows you
(`post` → `<project>.pages.dev`) at your DNS provider.

Every push to `master` redeploys both the site (GitHub Pages) and this app (Cloudflare).

Optional: put **Cloudflare Access** (Zero Trust → Access → Applications) in front of
`post.zachstrout.com` with an email one-time PIN so the page isn't visible to others.

### 3. Install on the iPhone

Open `https://post.zachstrout.com` in Safari → Share → **Add to Home Screen**. Open it
from the home screen, paste the token, tap **Save & test**.

## Local testing

```sh
cd post-app && python3 -m http.server 4100
```

(The CSP in `_headers` only applies on Cloudflare.)

## Files

| File | Purpose |
|---|---|
| `index.html`, `app.css` | UI |
| `app.js` | Composer, photo processing, publish/edit/delete |
| `lib.js` | Note format helpers (timestamps, tags, links, front matter) |
| `github.js` | Minimal GitHub client; multi-file commits via the Git Data API |
| `outbox.js`, `send.js` | Offline outbox (IndexedDB) and sending queued posts |
| `sw.js`, `manifest.json`, icons | Installable PWA + offline app shell |
| `_headers` | Cloudflare security headers (CSP etc.) |
