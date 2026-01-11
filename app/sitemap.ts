import type { MetadataRoute } from 'next';
import { requirePublicSiteUrl } from '@/lib/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = requirePublicSiteUrl();
  const now = new Date();

  const routes = ['/', '/pricing'] as const;

  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.7
  }));
}
