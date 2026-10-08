# Bantera deployment on Oracle AU

Bantera **backend, website and PostgreSQL database all run on Oracle AU (Melbourne)**. Use this host for future deployment requests; do not assume Oracle SG. Deploy only when explicitly requested. Last inspected: 7 October 2026.

## Connection and routing

```bash
ssh -i ~/.ssh/oracle-melbourne.key ubuntu@168.138.25.22
```

| Component | Existing checkout / runtime |
| --- | --- |
| Backend | `/home/ubuntu/apps/bantera-backend` |
| Website | `/home/ubuntu/apps/bantera-website` |
| PostgreSQL | Docker container `bantera-postgres`, persistent database volume |
| Release snapshots | `/home/ubuntu/releases/bantera-20261006-1` |
| Active release record | `/home/ubuntu/releases/bantera-current.json` |
| Public API | `https://api.bantera.app` through Cloudflare Tunnel |
| Public website | `https://bantera.app` through Cloudflare Tunnel |

SSH keys and production settings stay outside Git. The legacy backend settings file is `apps/bantera-backend/deploy/.env.production`; website settings are `apps/bantera-website/.env.production`. Existing container runtime settings are authoritative for this release and were cloned server-side without printing values. Protected runtime snapshots contain secrets and must never be committed or downloaded into a repository.

The shared Cloudflare Tunnel also serves other domains. Preserve its tunnel identity, credentials, all unrelated ingress entries and every existing Docker network. Do not change public DNS or restart the only healthy connector to deploy Bantera.

## Release preparation

1. Fetch the relevant Git remotes and inspect local changes. Follow the repository's version/build/test requirements. Do not reset user changes or assume a push is a deployment.
2. Inspect `bantera-current.json`, Docker containers and the active connector's configuration. Container names and source checkouts alone do not establish what is live.
3. Create a new immutable release directory. Archive the reviewed source and record its Git SHA, uncommitted changes (if explicitly deploying the working tree) and archive SHA-256. Keep `.env*`, development secrets, `.git`, build caches and dependencies out of Docker build contexts.
4. Save the previous container/image/network/configuration metadata in mode-0600 server files. Take a consistent `pg_dump -Fc` backup before any migration and verify it is readable. Do not run the backup script that sends Telegram messages as part of a deployment.
5. Build uniquely tagged backend and website Docker images while the current services keep running. Retain old images and containers. Do not overwrite a moving `latest` tag as the only rollback reference.
6. Start the backend candidate using the current production environment on the existing database networks, with its host test port bound to loopback only. Startup applies migrations. Permit only backward-compatible migrations while the old application remains online.
7. Verify backend `/version`, public lesson listing, authenticated-route rejection, migration state and startup logs. Start the website candidate, then verify `/`, `/download`, `/dashboard/login`, the AI admin login redirect, and its deployment marker.

The server-only website build scaffolding uses Node 22 and pnpm, allowing build scripts for `protobufjs`, `sharp` and `unrs-resolver`. Retain the reviewed Dockerfile and dependency-build configuration in the release snapshot. Exclude production env files from the image; inject settings at runtime.

## Rolling Cloudflare Tunnel handover

- Clone the current locally managed connector configuration. Change only the `api.bantera.app` and `bantera.app` origins to the new release's unique container names.
- Attach the candidate connector to **all** networks of the old connector, including unrelated domains' networks. Mount the existing credentials read-only and the release-specific configuration read-only.
- Validate the ingress configuration before starting it. Run the same verified cloudflared image as the current connector; do not combine an infrastructure upgrade with the release.
- Start the new connector while the old one remains online. Wait for its local `/ready` endpoint to return HTTP 200.
- Gracefully stop the old connector only after the replacement is connected. Cloudflared stops accepting new requests and drains existing requests, with a default 30-second grace period. Long-lived connections may reconnect; do not claim every connection is uninterrupted.
- Verify both **public HTTPS domains**, exact backend version and website release marker. Check main/download/login pages, API lesson listing and authentication gates. Monitor repeatedly during handover and require a stable post-switch window.
- On any promotion failure, start the previous connector, wait for it to reconnect, then drain the candidate. Verify the old API version and website via their public domains. Keep previous application containers available throughout.

Source: [Cloudflare replicas](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-availability/deploy-replicas/) and [grace-period behaviour](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/#grace-period).

## Commands and rollback for the October 6 release

The reviewed release-specific controller is preserved on Oracle AU:

```bash
cd /home/ubuntu/releases/bantera-20261006-1
python3 deploy.py build
python3 deploy.py stage
python3 deploy.py promote
```

These are **sequential phases, not a command to rerun blindly**. `stage` creates uniquely named candidates and applies the additive migration. It is not idempotent. Inspect existing state before retrying. `promote` automatically restores the previous connector if its public checks fail; it requires a two-minute stable verification window. Its rollout runs under `nohup` so closing SSH does not cancel the process. A file lock prevents concurrent controller runs.

Manual rollback for this specific release:

```bash
python3 /home/ubuntu/releases/bantera-20261006-1/deploy.py rollback
```

Rollback restores the original `cloudflared` connector and routes to the retained `bantera-api` and `bantera-website` containers. It does **not** restore the database: the new `ai_callbacks` table is additive and safe for the old app to ignore. Restoring the pre-release database would discard subsequent user writes and requires a separate recovery decision. Stop obsolete candidate background workers only after traffic has safely returned and active work has been considered.

This controller's expected versions, names and ports are specific to this release. For another release, create a new directory and update the plan from the then-current active record; do not reuse its old-version assumptions or reserved ports. Retain rollback artifacts until the release is accepted. `availability.jsonl`, `status`, build logs and `source-manifest.json` provide the audit trail. The automatic health rollback covers deployment, not indefinite monitoring.

## Current release scope

- Backend **1.0.160**, based on `5378d27` plus the tested local PCM/WAV changes. Those changes were uncommitted at deployment preparation.
- Website **0.1.57**, commit `2ef7151`.
- App **2.0.120+308**, installed only after the backend and website pass deployment checks and the user explicitly requests installation.
- Compatibility: **GO for existing published app clients**. AI routes are new; existing human DMs and authentication remain compatible.
- Migration: `20261006101252_AddAiCallbacks`, creates only `ai_callbacks` and associated indexes/foreign keys. No destructive schema change.
- No new required secrets. Existing Gemini keys must have Live access; scheduled iPhone callbacks use existing APNs configuration. Optional `BanteraAi__LiveModel` sets the default model.
- AI voice messages require no server ffmpeg. Existing `lame` remains for other audio generation.
- Real iPhone recording, APNs/CallKit callbacks, translation packs and nine-minute call timing still need device checks; HTTP availability does not establish those behaviours.

## Legacy scripts and automation

Do not use `apps/*/deploy/redeploy-server.sh` for the new procedure: they reset checkouts, replace live containers directly, and the website script restarts the shared tunnel. Their associated auto-deploy scripts are not the release controller above.

At inspection, there were no active Bantera deployment jobs in Ubuntu/root cron, system timers or OpenClaw schedules. Old auto-deploy logs stopped in May. The active daily Bantera DB backup schedule is separate. Recheck schedules and hooks before future pushes/deployments; do not rely on this historical observation forever.

## Verified deployment result

Release `bantera-20261006-1` completed successfully on 6 October 2026 at 23:59 NZDT (10:59 UTC). Both public domains served the expected release. The replacement connector is `cloudflared-20261006-1`; the active containers are `bantera-api-20261006-1` and `bantera-website-20261006-1`. Their loopback-only test ports are 18080 and 13001, and connector readiness is on 12000. The original containers remain available for rollback.

The first attempt encountered a Docker read-only bind-mount conflict before changing traffic. Automatic fallback completed and verified both old public domains. The corrected attempt mounts the candidate configuration at `/release.yml`, outside the read-only credentials directory. It then completed the rolling handover and stability window. No non-200 responses were observed by the public availability sampler; this does not prove every individual connection was uninterrupted.

The source archive checksums, private runtime snapshots, database backup, staged image IDs, controller, rollout logs and rollback command are preserved in the release directory. The deployed PCM/WAV backend changes and these runbook updates still require a separate explicit commit/push request.

The updated app **2.0.120 (308)** was subsequently installed on the user's iPhone 17 Pro on 7 October 2026. It includes conservative on-device AI spoken-word credit: detected mixed-language or uncertain utterances receive zero credit, and a durable event ID prevents duplicate counting. Detailed app behaviour is documented in `app/docs/ai-spoken-word-counting.md` in the workspace.

Device installation was confirmed through CoreDevice (version 2.0.120, build 308). Automatic launch was blocked because the iPhone was locked; the user must unlock and open Bantera for the physical-device smoke checks.


## Current release: 7 October 2026, 00:43 NZDT

Release **`bantera-20261007-1`** completed at 11:43:35 UTC on 6 October (00:43:35
NZDT on 7 October). Backend **1.0.161** and website **0.1.58** are live. The
active record is `/home/ubuntu/releases/bantera-current.json`; the release root is
`/home/ubuntu/releases/bantera-20261007-1`.

- API container `bantera-api-20261007-1`, loopback port **18081**.
- Website container `bantera-website-20261007-1`, loopback port **13002**.
- Connector `cloudflared-20261007-1`, readiness loopback port **12001**.
- Previous API, website and connector ending in `20261006-1` are retained.
- A verified PostgreSQL backup (3,240,717 bytes), private runtime snapshots,
  source archive hashes and all rollout logs are retained in the release directory.
- **156/156** sampled public-domain responses were HTTP 200. Home, download,
  login, public lessons, exact API version and website release marker passed;
  admin auth gates returned 401 (API) and 307 (website).
- No schema migration or new secret/configuration is required for this release.
  Published apps remain compatible. It adds the admin Live voice catalogue,
  persists the voice alongside the model atomically, and accepts 180-second WAV
  voice messages. Older model-only admin writes preserve the existing voice.
- Source includes reviewed uncommitted backend/website changes; deployment is not
  evidence of a Git commit or push.

Rollback for **this** release:

```bash
python3 /home/ubuntu/releases/bantera-20261007-1/deploy.py rollback
```

This restores `cloudflared-20261006-1` and the previous active release record,
without restoring or discarding database writes. Promotion already verified a
stable public-domain window and would have rolled back automatically on failure.

## Latest release: 7 October 2026

Release **`bantera-20261007-6`** completed at **10:11:10 UTC** with website
**0.1.59** and backend **1.0.168**. The admin AI page explains voice-message
reminders, explicit call requests and temporary reminder audio retention.
The active website is `bantera-website-20261007-6` (loopback 13005), behind
`cloudflared-20261007-6` (readiness 12006). The exact public release marker,
home, download and dashboard login passed; all 128 monitored public-domain
samples returned HTTP 200. Existing published apps remain compatible, with
an additive backend migration and no new environment variables.

The verified database backup, source manifests and runtime snapshots are in
`/home/ubuntu/releases/bantera-20261007-6`. Roll back using:

```bash
python3 /home/ubuntu/releases/bantera-20261007-6/deploy.py rollback
```

This restores release 5's connector, backend **1.0.166** and website **0.1.58**
without restoring the database. See the backend runbook for worker compatibility
and migration details. Deployment did not create commits or push branches.

## Android APK website release, 8 October 2026, 16:53 NZDT

Release **`bantera-20261008-9`** succeeded at **2026-10-08 03:53:32 UTC**.
Website **0.1.60** runs in `bantera-website-20261008-9`, loopback **13006**,
through `cloudflared-20261008-9` (readiness **12015**). Backend **1.4.1** is
retained in `bantera-api-20261008-8`; no database or backend change was needed.

The signed arm64 Android APK **2.5.2**, Flutter build **332** (split APK Android
version code **2332**), is published at `https://bantera.app/bantera.apk`.
Its signing certificate matches the previous public download. Both the download
page and `android-release.json` show the new release. The staged and public APK
SHA-256 hashes match the locally built file:

```
b713c68cc0ca30629698ac438398a83b17f4019603fd2a699e17096227235c0a
```

The website production build and staging checks passed. All **158/158** sampled
public API/website HTTP requests returned 200 during the handover and stability
window. The deployment controller verified the full public APK checksum before
accepting the release. Existing WebSocket continuity is not established by HTTP
checks. Source archive hashes, working-tree provenance and private runtime
snapshots remain in `/home/ubuntu/releases/bantera-20261008-9`.

Rollback:

```bash
python3 /home/ubuntu/releases/bantera-20261008-9/deploy.py rollback
```

Rollback restores connector `cloudflared-20261008-8` and the previous website,
retains backend 1.4.1 and current database writes, then stops only the candidate
website. No Git commit/push, store submission or physical-device launch was
performed for this Android website publication.

## Google Play buttons and APK removal, 8 October 2026, 21:23 NZDT

Release **`bantera-20261008-10`** succeeded at **2026-10-08 08:23:16 UTC**.
Website **0.1.61** runs in `bantera-website-20261008-10` on loopback **13007**,
via `cloudflared-20261008-10` (readiness **12016**). Backend **1.4.1** stays
in `bantera-api-20261008-8`; there are no backend, database or configuration changes.

Both homepage Android buttons and the `/download` Android button now point to
`https://play.google.com/store/apps/details?id=com.lisenhuang.bantera`.
The APK, its obsolete JSON download manifest and unused TypeScript release metadata
were removed from the local website working tree and the deployed build.
Public `/bantera.apk` and `/android-release.json` return **404**. This does not
rewrite Git history or remove rollback snapshots. Historical APK publishing
instructions above describe earlier releases; current primary distribution uses
Google Play.

The reviewed local snapshot includes the new Google Play icon, copy and analytics
changes. Focused ESLint checks and the production build passed. Staging and public
checks verify the exact Google Play anchor count (two on home, one on download),
absence of APK button links, and 404 responses for the removed files. All
**156/156** sampled public website/API HTTP checks returned 200. These availability
samples are distinct from the intentional APK/manifest 404 checks and do not prove
uninterrupted existing WebSocket connections.

The release directory contains source provenance, archive SHA-256, explicit
pre-build file-removal transformations, private runtime snapshots and rollout logs.
Rollback is available with:

```bash
python3 /home/ubuntu/releases/bantera-20261008-10/deploy.py rollback
```

It restores the previous website/connector and its old APK download, preserves
backend 1.4.1 and all database writes, then stops the candidate website. Source
changes and file deletions remain uncommitted; this deployment did not push Git.
