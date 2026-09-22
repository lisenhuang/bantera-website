<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Git commits

- **Do not run `git commit` (or `git push`) automatically.** Committing is a human task.
- Make and stage edits as needed, but leave the actual commit/push to the user — only commit if they explicitly ask you to in that request.

## Sync with remote before modifying code

- **Before making any code change, check GitHub for newer commits and pull them first.** Run, from this directory:

  ```
  git fetch origin
  git status -sb          # "behind N" means the remote has newer commits
  git pull --rebase       # only if behind
  ```

- Only start editing once the local branch is up to date with the remote.
- If the rebase conflicts or uncommitted local changes block it, stop and report to the user — do not force, reset, or stash without being asked.

## Android download (generated files — do not hand-edit)

`public/bantera.apk`, `public/android-release.json`, and `src/lib/android-release.ts` are **generated** by the Flutter app's
`app/scripts/publish_android.sh` (build + sign + copy + version stamp). Don't edit them by hand —
they're overwritten on every Android publish. The `/download` page imports `android-release.ts`
to show the current Android version and links to `/bantera.apk`; the JSON manifest is used by the
Android app's update checker. To ship a new Android build, run
that script in the `app` repo, then commit all three generated files here.
