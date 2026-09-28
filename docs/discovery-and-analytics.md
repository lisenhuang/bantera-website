# Language discovery and website analytics

## Deployment

Backend 1.0.142 adds the analytics table and endpoints. Deploy it first, then this website.
Set `BANTERA_ANALYTICS_INGEST_KEY` on the website server to the same random secret
(at least 32 characters) as backend `WebsiteAnalytics__IngestKey`. This is a server-only
secret, never a NEXT_PUBLIC variable. Existing API base URL configuration still applies.
Without both keys the site continues working, but collection is disabled and the
Website analytics dashboard displays a configuration warning.

Report: `/dashboard/website` (same admin authentication as the existing dashboard).
Metrics start after deployment and consent; there is no historical backfill.
Source and language filters use exact recorded values. Dates are UTC. Sources are
campaign tags first, otherwise referral domains; missing evidence stays Direct / unknown.
This cannot reveal Google queries, impressions, AI conversation prompts or actual app installs.

The collector covers approved public pages only. It records page views, original lesson
playback, 30 seconds of playback, App Store clicks and Android APK clicks. It does not
record learner audio, form input, account identifiers or raw IP addresses. Collection is
best effort, excluded for DNT/GPC, and not retried on failure. Consent lasts 180 days.
Session IDs live in sessionStorage, expire after 30 minutes inactivity, and rotate after
24 hours at most. Data retention is 90 days with daily cleanup. Cloudflare's existing
edge analytics and security logs are separate; this code does not change Cloudflare settings.

## Search and answer discovery

`/learn` is the multilingual speaking/listening directory. Ten authored guides provide
distinct practice advice, examples, caveats and links to live public lessons. The directory
lists the full supported learning-language catalogue; it does not promise lesson supply.
All guide copy is English about learning the target language. It is not a translated site,
so there are no hreflang alternate claims. Future localizations should use reviewed copy
and separate canonical URLs rather than automatic mass pages.

Home, metadata, FAQ, download copy and llms references describe iOS, Android APK and web
accurately. Transcription comparison is not advertised as a phoneme pronunciation score.
The sitemap lists stable canonical pages without fabricated modification dates. Guides
link to lesson pages with real HTML anchors; lesson pages include an accessible transcript.
Private and duplicate legacy player URLs are excluded from the sitemap. robots.txt already
allows public crawling. llms.txt is supplementary and cannot guarantee AI recommendations.

After deployment check `/learn`, several language guides, `/sitemap.xml`, `/llms.txt`,
and a live lesson without JavaScript. Confirm canonical URLs and visible text. Check that
hosting/WAF settings permit legitimate search crawlers. Track consented source visits and
lesson-start rates over time; ranking changes are not guaranteed by these edits.
