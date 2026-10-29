# Bantera deployment on Oracle AU

## 29 October 2026: Māori visibility and configurable app leaderboard

Website **0.28.0** and API **1.55.0** are verified live in release
`bantera-20261029-4`. `/dashboard/practice` includes “Show Māori to everyone”,
which remains **off** for admin-only testing. The dashboard's “App leaderboard
period” control accepts 1–365 days and remains at **30 days**. Its preview reads
the configured API report and uses the returned period and dates. Save success
requires the backend to confirm the requested value. Existing analytics filters
remain separate. No live setting was changed during deployment.

Website typecheck, production build and **33 tests** passed; lint reported no
errors and ten existing warnings. Candidate/public verification passed **32
non-mutating checks**, including versions, protected routes, the actual Practice
toggle, defaults, the exact 720-hour leaderboard window and admin-only metadata
privacy. The authenticated leaderboard dashboard was not rendered live because
its normal request would change real activity tracking; local tests and the
production build cover that view. Both public domains were checked after cleanup.

The initial promotion safely rolled back when a verification-script timestamp
parser rejected valid .NET precision. The corrected check passed 0/3/6/7-digit
cases; the same application images then completed promotion and the two-minute
stability window. All **144/144** availability probes returned HTTP 200. Current
release 4 and working rollback release 2 are retained. The never-promoted
release-3 candidates were removed. No database migration or new configuration
was required, and no volumes or backups were deleted. Final free disk was about
**87.4 GiB**. See the backend runbook for full evidence and compatibility details.

Rollback: `python3 /home/ubuntu/releases/bantera-20261029-4/deploy.py rollback`.
It restores release 2 without restoring the database. No commit or push occurred.
Bantera **3.35.0 (506)** was installed on Ethan's iPhone 17 Pro and confirmed in
the device inventory, without launching the app.

## 29 October 2026: Practice repeat-window settings

Website **0.26.0** and API **1.53.0** are live in release
`bantera-20261029-2`. The new `/dashboard/practice` page lets admins save an
exclusion window of 10–500 recent exercises, default 50. Only admins can read or
write the API setting. Errors do not report a successful save. The form explains
per-user/language/level scope, reuse, preparation costs, and current/Saved Practice
exceptions. The backend stores the setting with update time and administrator.

Website typecheck, lint (existing warnings), 25 tests and production build passed.
Staged and public checks passed; 128/128 availability probes returned HTTP 200.
The public website release marker, API version and protected-page redirect were
verified after cleanup. A database backup and one working rollback release are
retained. See the backend deployment runbook for the schema and rollback details.
No commit/push or app installation was performed.

## Speaking leaderboard: 22 October 2026

Release **bantera-20261021-9** publishes API **1.32.2** and website **0.17.1**.
It follows the same-day initial leaderboard releases 1.32.0/1.32.1. API runs in
`bantera-api-20261021-9` (loopback 18148), website in
`bantera-website-20261021-9` (loopback 13042), with
`cloudflared-20261021-9` (readiness 12074).

The Goal entry opens a paginated Speaking leaderboard. Rankings combine spoken
words across languages for today's UTC calendar date plus the preceding six
calendar days. Each row shows the current profile name/photo, current learning
language and exact total. Ties share a rank. The owner's ordinary row says You;
there is no pinned own row, language breakdown, eye control or hiding dialog.
Names/photos are always shown. Users can change them through Edit Profile.
The authenticated dashboard includes a matching seven-day preview, separate
from the existing Today / This week / All time admin rankings.

**GO for existing published apps:** the leaderboard API and UTC activity sync
are additive; previous APIs remain unchanged. The initial leaderboard migration
added three tables. This correction needs no further migration, configuration
or secret. The now-unused visibility table is retained rather than dropped.
The pre-release mobile client's visibility route remains authenticated, accepts
show requests without writing, and returns 409 for unsupported hide requests.
Current mobile code has no visibility caller.

Historical limitation: earlier app versions saved local dates without timestamps.
Their original date buckets remain included and explicitly labelled; new activity
uses UTC. Upgraded-device snapshots replace the old source atomically, preventing
double counting. Changing the selected language never removes previous counts.

Local validation: backend build and 1,088 tests passed (16 optional skips),
including isolated PostgreSQL tests for aggregation, ties, pagination, UTC source
replacement and visible profiles despite old hidden preferences. Website type
checking, build and 14 tests passed; lint had no errors (13 existing warnings).
App 3.3.2 (425) passed 60 selected tests, including leaderboard layouts across
17 locales, callback/CallKit and audio regressions. Focused analysis was clean;
whole-app analysis reported 44 existing informational notices. Light/dark golden
mockups are under app/docs/design/speaking-leaderboard. No physical-device testing
or launch was performed; installation alone does not verify locked-screen audio.

Release status **SUCCESS** at 2026-10-21 11:16:42 UTC. Both public version
markers and authenticated dashboard rendering passed. Candidate and live checks
each passed 13 existing HTTP contracts, 20 admin ranking checks and 11 speaking
checks, including independent read-only SQL comparison of every returned name,
photo presence, language and total. No test data was written to production.
All **160/160** monitored public responses returned 200. Verified database backup:
**6,232,364 bytes**. Post-release cleanup completed; **111 GB of 194 GB** remains
available (44% reported usage), with current and one rollback release retained.
Both public services were rechecked after cleanup.

Signed iOS **3.3.2 (425)** was installed on Ethan’s iPhone 17 Pro and verified
through the installed-app inventory. The app was not launched or tested on the
physical phone.

Rollback retains database writes and the additive tables:

```bash
python3 /home/ubuntu/releases/bantera-20261021-9/deploy.py rollback
```

The preceding release is API 1.32.1 / website 0.17.0 in bantera-20261021-8.
Source manifests, backups and verification proofs remain on the server. No Git
commit/push, App Store submission or Google Play submission was performed.

## Admin word activity rankings: 21 October 2026

Release **bantera-20261021-5** is published with status **SUCCESS**. Backend
**1.31.0** runs in `bantera-api-20261021-5` (loopback 18144), website
**0.16.0** in `bantera-website-20261021-5` (loopback 13038), and connector
`cloudflared-20261021-5` uses readiness port 12070.

The Overview page now ranks users by listened or spoken words for Today,
This week and All time, with pagination and links to user details. Activity
uses existing device-local date buckets; the reference date is Pacific/Auckland
and weeks start Monday. Counts combine legacy and language-tagged device
snapshots. Offline activity appears after syncing.

**GO for existing published apps:** additive admin-only endpoint, no migration,
no new secret, and no mobile update. The latest phone callback search handoff
from API 1.30.1 is preserved. The website's existing BANTERA_API_BASE_URL setting
now targets the candidate API internally; both containers share the dedicated
internal network `bantera-app-20261021-5`, retaining their existing networks.
The first staged dashboard check caught separate Docker networks before
promotion; after adding that private connection, all checks passed.

Validation: backend build and 1,083 tests passed (16 optional skips); website
lint had zero errors, type checking/build passed, and all 14 tests passed.
Candidate and public checks each passed 13 existing HTTP contracts and 20
ranking checks, including all six filters against independent read-only SQL
aggregates, admin authorization, pagination and rendered dashboard content.
Live browser checks confirmed period and metric controls. All 130 monitored
public responses returned 200. Verified PostgreSQL backup: **6,185,226 bytes**.
No test data was written to production.

Previous API 1.30.1, website 0.15.0 and connector remain available for rollback
without restoring the database:

```bash
python3 /home/ubuntu/releases/bantera-20261021-5/deploy.py rollback
```

Source hashes, runtime snapshots, backup and verification proofs remain in the
release directory. Post-release retention completed with approximately 111 GB
available. No App Store or Google Play release was required.

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

The current server-only website build scaffolding uses Node 24 and pnpm with the repository's dependency-build configuration. Retain the reviewed Dockerfile and dependency-build configuration in the release snapshot. Exclude production env files from the image; inject settings at runtime.

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

## 20 October 2026: Practice audio paid-fallback control

Website **0.12.0**, release **bantera-20261020-6**, deployed with compatible backend
1.24.1. Completed **2026-10-20 00:04:53 UTC**, with **132/132** public availability
samples returning 200 and both public version markers verified. Node 24 production
build, lint, type checking and 12 tests passed. Authenticated public-dashboard
verification confirmed the labelled checkbox, help text and default-off state.
The checkbox is in Bantera AI → Paid fallback; changes require Save paid fallback
settings. It applies to shared Practice audio independently of per-user call modes.
No key value or setting was changed during verification. Existing saved keys can
be retained by leaving the replacement-key field blank.

The design uses an accessible labelled checkbox with explanatory copy inside the
existing settings panel, informed by Carbon's checkbox guidance:
https://www.carbondesignsystem.com/building-blocks/core/components/checkbox/guidelines
The deployed working tree also contains the previously prepared AI-consent privacy
copy. APK distribution files were not changed. No Git commit/push was performed.
For rollback and full source/candidate provenance, see the backend runbook section
for this release and `/home/ubuntu/releases/bantera-20261020-6` on Oracle AU.

## 27 October 2026: Admin users, locations and word rankings

Website **0.23.0**, release **bantera-20261027-4**, deployed with compatible
backend **1.45.0**, completed **01:18:14 UTC**. Users now shows Name, Country,
Native, Learning, Joined and Last Login. Country and language cells include flags;
Email, Role, Status and Content columns are removed. User details show the last
recorded city/country and activity date without displaying an IP address.

The overview retains Word activity rankings, defaults to Words spoken and places
spoken before listened. The separate Speaking leaderboard section is removed
from the admin overview; app leaderboards are unchanged.

Node 24 production build, focused ESLint and 25 tests passed. Backend's 31 focused
tests include actual isolated PostgreSQL projection and activity-location checks.
Candidate and public smoke checks each passed 14 contracts; all **130/130**
monitored public responses returned 200. No authenticated dashboard login was
performed. Public release markers and auth gates passed again after cleanup.
No migration or new configuration is required for existing published clients.

Retention kept the current and previous release; disk free space was 112 GB
before building and 111 GB afterward. The verified database backup is 8,598,539
bytes. No commit/push occurred. Rollback preserves database writes:
`python3 /home/ubuntu/releases/bantera-20261027-4/deploy.py rollback`


## 27 October 2026: Private Māori model evaluation dashboard

Release **bantera-20261027-10** completed at **05:47:21 UTC**. Backend
**1.48.0**, website **0.24.0**, and private model service **1.0.1** are deployed.
Dashboard: `https://bantera.app/dashboard/model-tests`. API loopback 18170,
website 13061, connector readiness 12099. Current release 10 and rollback
release 9 are retained. No mobile source, build or installation was changed;
no Git commit or push was performed.

**GO for existing published apps:** additive admin-only routes, no PostgreSQL
schema migration. New backend settings `LocalModelTests__BaseUrl` and
`LocalModelTests__ServiceKey` are installed server-side. Existing API contracts
are unchanged. The 8,819,462-byte PostgreSQL backup was verified before staging.
The current active admin role is checked for every route, and worker jobs/results,
cancellation and assessments are owner-only. The website enforces same-origin
writes; the private worker requires a service key and backend-provided owner.

Model container `bantera-model-service-1` uses an internal Docker network shared
only with the backend, no published ports, a non-root user, read-only root,
Docker init, no added capabilities, no swap, two CPU cores and 8 GiB memory.
One durable background job runs at a time. Audio is capped at 8 MiB/60 seconds;
translation at 1,000 characters/256 input tokens and 128 output tokens. Jobs
have a 900-second inference deadline and 24-hour result retention. Temporary
audio is removed after completion, failure/cancellation and startup recovery.
Do not remove `/home/ubuntu/bantera-model-data` or `bantera-model-state` in build
cleanup. Server-only service credentials stay in the 0600 `service.env` file.

Exact model files: multilingual Whisper Small Q5_1 and large-v3 Q5_0 from the
whisper.cpp distribution revision `5359861c739e955e79d9a303bcbc70fb988958b1`;
Google MADLAD-400-3B-MT Q4_K GGUF revision
`fa184c675da0b5c9e1c8694fccd4e12e2d422094`. Runtimes: whisper.cpp 1.9.5 and
Candle 0.9.1. Exact SHA-256, image/binary hashes, source archive and full licence
notices are retained in the model-service proof and source snapshot.

Two existing synthetic Māori Practice cues (2.184 s and 1.440 s) were benchmarked.
Small took 18.5–20.9 s, large-v3 128.1–129.2 s and MADLAD 7.4–9.6 s. Both
Whisper sizes had 100% and 66.7% WER on these clips; MADLAD had meaning errors.
These results do not justify mobile integration or establish native-speaker
accuracy. Detailed benchmarks are in backend `docs/model-tests/`.

Validation: backend build/3 gateway tests, website build/typecheck/focused lint
and 25 tests; 15 Linux worker tests. Forced container restart terminated running
inference, failed queued work clearly and removed temporary audio. Candidate
and public checks each passed 17 existing HTTP contracts and 38 dashboard/auth
checks; real transcription, translation and assessment saving passed through
both candidate and public website proxies. Public job creation returned in
46–56 ms. All **132/132** handover availability samples returned 200. The browser
verified the unauthenticated login gate; authenticated behaviour was verified
through HTTP, not a logged-in visual browser session.

Post-release cleanup retained the previous application/connector release and
working model rollback image. Disposable model build directories and temporary
benchmark audio copies were removed; model weights, state, backups and original
Bantera source audio were preserved. Free disk was 112 GiB before preparation
and approximately 102 GiB after final cleanup; both public services passed again.

Rollback preserves database writes:
`python3 /home/ubuntu/releases/bantera-20261027-10/deploy.py rollback`

The previous backend has no model-testing routes. The private model worker can
remain idle or be stopped separately on application rollback. Never restore an
old database as part of application rollback.

## Generated Māori round-trip dashboard: 27 October 2026

Release **bantera-20261027-11** publishes API **1.49.0**, website **0.25.0**,
and private model service **1.1.0** at `/dashboard/model-tests`. Admins choose
5–60 Māori words and either local Whisper size. The app's shared text provider
writes the passage and English reference; its Māori Practice Gemini TTS path
creates audio; Whisper explicitly recognises `mi`; MADLAD translates the
Whisper transcript. Results include actual model names, word count, timings,
audio playback, WER and manual translation assessment. Machine references and
synthetic recordings are explicitly labelled as not human-verified truth.

**GO for existing published apps:** additive admin routes and hosted worker;
existing app API contracts remain unchanged. No PostgreSQL migration, new
secret, mobile source change, build or installation. Existing private model
service settings remain valid. The SQLite queue received additive columns;
both PostgreSQL (8,899,354 bytes) and SQLite (28,672 bytes) were backed up first.

Generation has one global claim, a renewable 60-second lease and a ten-minute
deadline. Provider handoffs are private and cannot be reached through the public
gateways. Current active-admin checks apply to all public endpoints, including
settings and audio; jobs and generated audio are owner-only. Cancellation and
lease expiry prevent late provider responses from reviving a job. Local
inference remains serial, capped at 2 CPUs / 8 GiB RAM with no swap. Generated
successful audio is retained for 24 hours; cancelled/failed audio and inference
temporary files are deleted. Cloud preparation can overlap one local inference.

Validation: backend build and 174 focused tests; website build/typecheck/focused
lint and 25 tests; 38 isolated Linux test executions. Candidate and public
existing API/website smoke checks passed (17 each), plus admin endpoint checks.
The real 10-word pipeline used `chatgpt/gpt-6-luna` and
`gemini-2.5-flash-preview-tts` with Kore: text 3.744 s, TTS 5.675 s, Whisper Small
19.937 s, MADLAD 10.267 s. Submission took 39 ms. Public audio playback/range
seeking, role rejection and assessment persistence passed. An initial public
audio probe without the standard verification User-Agent failed; the same
endpoint passed with the standard verification headers. Authenticated
behaviour was verified over HTTP, not in a logged-in visual browser session.
Whisper WER was 70% on this synthetic example; translation remains unassessed.
See backend `docs/model-tests/` for exact models, licences and full measurements.

The connector handover passed **132/132 HTTP 200** availability samples. Cleanup
retained release 10 as the application rollback and model image 1.0.1 as the
model rollback. Free disk changed from about 102 GiB to 100.4 GiB. The builder
was stopped after deployment. Existing databases, volumes, model files and
unrelated services were preserved. No commit or push was performed.

Containers: `bantera-api-20261027-11` (loopback 18171),
`bantera-website-20261027-11` (13062), `cloudflared-20261027-11` (12100), and
`bantera-model-service-2` (no published port, internal Docker network).

Rollback: `python3 /home/ubuntu/releases/bantera-20261027-11/deploy.py rollback`.
Keep model service 1.1.0 on application rollback because it remains compatible
with manual jobs; do not restore SQLite or PostgreSQL over newer writes.
Never start both model-service containers against the same state directory.
Model binaries/weights are unchanged from 1.0.1. Canonical server sources and
notices remain under `/home/ubuntu/bantera-model-service`; protected runtime
snapshots and proofs are in the immutable release directory.

## 27 October 2026: TURN-only recommendation

Verified release `bantera-20261027-13`: website **0.25.1**, API **1.50.1**.
The Calls settings page recommends keeping TURN only enabled for more consistent
connections across mobile networks, restrictive Wi-Fi and different devices.
Existing relay cost/fail-closed and app-version limitations remain visible.
Production was already set to relay; authenticated public settings, six relay-only
ICE URLs and the rendered recommendation/switch were verified after deployment.
All 128 public availability samples returned 200. Current release 13 and rollback
release 12 are retained, with approximately 98 GiB free after cleanup. No database
migration, new configuration, commit/push or store submission.

## Call rollback: 27 October 2026

At the owner's request, call cancellation work is paused after continued ringing
and immediate termination after answering were reported. Activation record
`bantera-20261027-14` restores the retained release-12 containers: API **1.50.0**,
website **0.25.0** (its original website marker is `bantera-20261027-11`), and
`cloudflared-20261027-12`. This is an image rollback, not a new source build.
Source versions are bumped to API 1.50.2 / website 0.25.2 for the rollback diff.

Local preflight, public API/version, website marker, homepage, download, login,
public content and admin-auth checks passed. Both public markers remained healthy
through a two-minute stability window. Completion: **2026-10-27 10:13:09 UTC**.
The active record references release 14's manifest and the restored release 12
containers; its previous-release record retains release 13 as an operational
fallback. Release 13's call behavior is known to be problematic and must not be
reintroduced as a call fix without further authorized investigation.

No database restore, migration or user-data deletion occurred. The pre-existing
TURN-only policy remains. **Compatible with published apps:** the restored API
is their previous contract; the short-lived ringing-status extension was not
published to either app store and is removed from the replacement iPhone build.
No new configuration or secrets are required.

Cleanup kept both retained application sets and their mounted configurations,
removed no volumes/data, and left **98 GB free (50% used)**, unchanged from before
the rollback. Public version checks passed again after cleanup. Historical
release-13 entries above describe the reverted deployment, not the active code.
