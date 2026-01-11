export const SITE_NAME = 'Jellycat Alerts';

export const SITE_DESCRIPTION =
  'Fast email alerts (and optional SMS) when new Jellycats drop on the official Jellycat New page.';

export function getPublicSiteUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!rawUrl) return null;

  return rawUrl.replace(/\/$/, '');
}

export function requirePublicSiteUrl() {
  const siteUrl = getPublicSiteUrl();

  if (!siteUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SITE_URL. Set it to your production URL (e.g. https://jellycatalerts.com) so sitemap/robots/canonical URLs are correct.',
    );
  }

  return siteUrl;
}
