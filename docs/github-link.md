# GitHub link page

`https://bantera.app/github` is a public HTML page for sharing Bantera's three
codebases. Its canonical and Open Graph URL both stay on `/github`; its own
1200 × 630 PNG preview is served at `/github/opengraph-image`.

After hydration, visitors are forwarded after four seconds using
`window.location.replace` to the exact destination:

https://github.com/lisenhuang?tab=repositories&q=bantera

The page has an immediate Open GitHub anchor and a Stay here button that cancels
forwarding. Without JavaScript, the anchor remains available. There is no HTTP
301/302 or meta refresh, and no user-agent-specific response. The fixed destination
cannot be overridden by query parameters.

## Human deployment

Deploy the website from `main` using the existing manual website release process
(install locked dependencies, run `pnpm build`, then run the built site with the
existing production configuration). No new environment variables, backend changes,
or database migrations are required.

After deployment:

1. Request `/github` with a normal user agent and `LinkedInBot`. Both should return
   HTTP 200 HTML, no Location header, and canonical/og:url `https://bantera.app/github`.
2. Open `/github/opengraph-image`; confirm the GitHub cover is a readable 1200 × 630 PNG.
3. Open `/github` in a browser. Confirm automatic forwarding preserves
   `?tab=repositories&q=bantera`. Reopen and select Stay here; confirm it cancels.
4. Inspect `/github` with https://www.linkedin.com/post-inspector/.
5. Add it as the experience's GitHub media card, keeping the LinkedIn media
   description empty for direct opening. Verify the persisted card href and click
   destination before removing the previous card. LinkedIn's importer still needs
   this live verification; a successful local build cannot prove its behavior.

If manually uploading the cover, use the PNG from `/github/opengraph-image` as the
media thumbnail rather than attaching a separate image card.
