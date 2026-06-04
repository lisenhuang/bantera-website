import type { MetadataRoute } from "next";

const BASE = "https://bantera.app";

// Single "*" group keeps AI crawlers (GPTBot, ClaudeBot, PerplexityBot,
// Google-Extended) allowed — open crawlability is required for AEO.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/dev/", "/api/"],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
