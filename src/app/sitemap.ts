import type { MetadataRoute } from 'next';
import { LANGUAGE_GUIDES } from '@/lib/language-guides';
import { SITE_PAGES, SITE_URL } from '@/lib/site-content';

// No invented lastModified dates. Language pages link to live public lessons;
// private, admin, API and duplicate legacy player URLs are deliberately excluded.
export default function sitemap(): MetadataRoute.Sitemap {
  return [...SITE_PAGES.map(p => ({ url: `${SITE_URL}${p.path}` })),
    ...LANGUAGE_GUIDES.map(l => ({ url: `${SITE_URL}/learn/${l.slug}` }))];
}
