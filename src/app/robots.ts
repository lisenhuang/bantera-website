import type { MetadataRoute } from "next";

const BASE = "https://bantera.app";

// Public content is crawlable by search and AI user agents. Crawling permission
// alone does not guarantee indexing or inclusion in an AI answer.
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
