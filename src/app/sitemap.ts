import type { MetadataRoute } from "next";

const BASE = "https://bantera.app";

// Public, stable routes only. Excludes /dashboard/*, /dev/*, /api/*, and the
// volatile external-API-backed dynamic routes (/webapp/[videoId],
// /webapp/shadowing/[audioId]).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/download`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/webapp`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/webapp/studio`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/delete-account`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
