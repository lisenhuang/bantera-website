<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Git commits

- **Do not run `git commit` (or `git push`) automatically.** Committing is a human task.
- Make and stage edits as needed, but leave the actual commit/push to the user — only commit if they explicitly ask you to in that request.

## CI/CD checks

- A push-only request does not require running local tests/builds or inspecting existing GitHub CI runs before pushing. Run appropriate checks during implementation; do not repeat them solely because the user asks to push.
- Preserve meaningful assertions when implementing changes; do not skip tests, disable checks or reduce coverage just to obtain a green result.
- After an authorized push, inspect GitHub Actions for the **exact pushed commit SHA** and wait for all required jobs to complete. A local pass or successful `git push` is not CI success.
- If CI/CD fails, diagnose the failure, fix its cause, verify locally and push the authorized fix, then check the replacement run. Continue until the required checks pass or a concrete external blocker requires user action. Clearly report pending, failed or inaccessible checks rather than claiming completion.
- Bantera has three independent repositories: `lisenhuang/bantera-app`, `lisenhuang/bantera-backend` and `lisenhuang/bantera-website`. When the user asks to push/check all codebases, verify each one separately.
- Prefer the connected GitHub tools for run status and job logs; use the GitHub CLI or browser when necessary. CI repair does not authorize production deployment, app installation or app-store submission.

## Sync with remote before modifying code

- **Before making any code change, check GitHub for newer commits and pull them first.** Run, from this directory:

  ```
  git fetch origin
  git status -sb          # "behind N" means the remote has newer commits
  git pull --rebase       # only if behind
  ```

- Only start editing once the local branch is up to date with the remote.
- If the rebase conflicts or uncommitted local changes block it, stop and report to the user — do not force, reset, or stash without being asked.

## Language choices

- Hide Taiwan Chinese (`zh-TW`, including script/underscore variants) when the visitor's IP country is mainland China or their primary browser/system language is Simplified Chinese. Keep it hidden when the country is unknown. `getLearningLanguages` filters the shared website catalogue using request context, covering browsing and WebMCP language discovery. Do not fold Taiwan into the Mainland Chinese group or rewrite existing lesson/profile identifiers.

## Android download (generated files — do not hand-edit)

`public/bantera.apk`, `public/android-release.json`, and `src/lib/android-release.ts` are **generated** by the Flutter app's
`app/scripts/publish_android.sh` (build + sign + copy + version stamp). Don't edit them by hand —
they're overwritten on every Android publish. The `/download` page imports `android-release.ts`
to show the current Android version and links to `/bantera.apk`; the JSON manifest is used by the
Android app's update checker. To ship a new Android build, run
that script in the `app` repo, then commit all three generated files here.

## Deployment authorization and safeguards

- Deploy only when the user explicitly requests deployment. A code edit or push alone is not deployment authorization.
- Bantera backend, website and PostgreSQL are on **Oracle AU (Melbourne)**, `ubuntu@168.138.25.22`. SSH identity on the user's Mac: `~/.ssh/oracle-melbourne.key`.
- Preserve Cloudflare Tunnel routing for `api.bantera.app` and `bantera.app`. Minimise downtime using staged containers and a rolling connector handover; retain the previous release for rollback.
- Follow the Oracle AU deployment runbook. Verify both public domains and the expected release, not just localhost, before reporting success. Automatically restore the previous connector if promotion checks fail.
- Never print production environment values, private keys or database contents. Back up the database before migrations; application rollback must not automatically restore an old database and discard newer writes.
- Do not run the legacy server redeploy scripts: they replace live containers directly and the website script restarts the shared tunnel.
- Before pushing, check for deployment hooks or active auto-deploy schedules. Do not enable automatic deployment without an explicit request.

Runbook: [docs/oracle-au-deployment.md](docs/oracle-au-deployment.md).
