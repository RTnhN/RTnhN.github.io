---
name: post-note
description: Publish, edit, or delete a short microblog note on this Jekyll site (the /notes/ feed). Use when the user says "post a note", "publish this as a note", "note:", or asks to change or remove a note, optionally with photos or links.
---

# Post a note

Notes are short, untitled microblog posts. Each one is a Markdown file in `_notes/` and
gets its own page at `/notes/<filename>/`, a card in the `/notes/` feed, and an entry in
`/feed/notes.xml`. The site is built by GitHub Pages from `master`, so a note is live a
minute or two after it is pushed.

## Rules

- **Publish the user's words verbatim.** Do not rewrite, polish, add hashtags, emoji, or
  a title. Only fix things if the user asks ("clean this up", "fix typos").
- If the request is ambiguous about what text to post, ask before publishing.
- Asking to post/publish a note *is* the request to commit and push it. Editing or
  deleting a note: make the change, show the diff, then commit and push.

## Creating a note

1. Get the current time in the site's timezone (America/Chicago):
   `TZ=America/Chicago date '+%Y-%m-%d %H:%M:%S %z'`
2. Filename: `_notes/YYYY-MM-DD-HHMM.md` from that time. If it exists, append `-2`, `-3`…
3. Photos (optional, any number). For each attached image, in order:
   - Save it to `images/notes/<note-stem>-<n>.jpg` (n starts at 1).
   - Fix orientation, shrink, and strip ALL metadata (iPhone photos carry GPS):
     `convert IN -auto-orient -resize '1600x1600>' -strip -quality 85 OUT.jpg`
     (or Pillow: `ImageOps.exif_transpose`, `thumbnail((1600,1600))`, save without exif).
   - Write a short, plain alt text describing the photo.
   - If you cannot get the image as a file (only see it), tell the user instead of
     posting without it.
4. Write the file:

   ```markdown
   ---
   date: 2026-11-20 14:32:00 -0600
   images:            # omit entirely when there are no photos
     - src: /images/notes/2026-11-20-1432-1.jpg
       alt: White mug with a Vancouver illustration on a wooden desk
   ---
   The note text, exactly as given. Links as <https://example.com> or [text](https://example.com).
   ```

   - Wrap bare URLs in `<...>` so they become links.
   - A photo-only note is fine: leave the body empty.
5. Build to check it renders: `bundle exec jekyll build` (use `bundle3.2` if plain
   `bundle` fails). Skip only if Ruby/bundler is unavailable.
6. Commit only the note and its images:
   `git add _notes/<file> images/notes/<stem>-*` then
   `git commit -m "note: <first few words>"` and push to `master`.
   If pushing to `master` is not allowed in this environment, push a branch, open a PR,
   and tell the user it needs merging to go live.
7. Reply with the note's URL: `https://rtnhn.github.io/notes/<stem>/`.

## Editing or deleting

- "my last note" = the newest file in `_notes/` by `date`.
- Edit: change only the body/images requested; keep `date` unless asked.
- Delete: `git rm` the note and its `images/notes/<stem>-*` files.
