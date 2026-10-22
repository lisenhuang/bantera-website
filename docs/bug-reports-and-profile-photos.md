# Bug reports and profile photos (0.18.0)

The new admin-only Bug reports page shows the reporting account, issue category,
summary, details, conversation source and UTC submission time. The confirmation
excerpt and report ID expand under Submission details. Newest reports appear
first, 20 per page. Empty and failed loads have distinct states. Source text is
escaped, not rendered as HTML. It uses the backend 1.36.0 admin endpoint.

Profile photos failed because API-generated URLs contained the private Docker
origin used by server-side dashboard requests. The underlying photo was intact
and returned HTTP 200 through the public API. A shared browser-safe URL helper
rewrites profile endpoint URLs to the public API origin and retains the revision
query. A shared avatar component on Users, user details and the leaderboard
shows initials while loading or if a photo fails, preserving the fixed layout.
The leaderboard preview now requests `days=30`, matching the app; this means a
rolling 30-day window, not a calendar month. The legacy API default stays 7 days.

Validation: production build and type checking passed on Node 24; 16 tests
passed. Lint: no errors, 11 existing warnings. Synthetic browser preview covered
report details/pagination. Deployment smoke checks cover admin authentication,
private/no-store caching, pagination, rendered pages, public avatar origins and
fetching an existing photo. Tests create no production reports.

Release artifacts: `/home/ubuntu/releases/bantera-20261022-4` on Oracle AU.

Publication verified: release `bantera-20261022-4` succeeded; API 1.36.0 and
website 0.18.0 are live. All 132 public availability samples returned 200, and
post-cleanup dashboard/avatar/authentication checks passed. A synthetic local
UI test also verified that a failed image becomes initials with no broken image
remaining in the DOM. No production reports were created during verification.
