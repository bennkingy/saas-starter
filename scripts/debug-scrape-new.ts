import * as cheerio from 'cheerio';
import { JELLYCAT_NEW_URL } from '@/lib/config/products';

async function main() {
  const response = await fetch(JELLYCAT_NEW_URL, {
    headers: {
      'user-agent': 'jellycatsalerts/1.0 (+debug-scrape)',
      accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
    redirect: 'follow',
  });

  const contentType = response.headers.get('content-type');
  const html = await response.text();

  const $ = cheerio.load(html);
  const hrefs = $('a[href]')
    .map((_, el) => $(el).attr('href'))
    .get()
    .filter((href): href is string => Boolean(href));

  const sample = (items: string[], limit = 15) => items.slice(0, limit);

  const scriptSrcs = $('script[src]')
    .map((_, el) => $(el).attr('src'))
    .get()
    .filter((src): src is string => Boolean(src));

  const nextDataRaw = $('script#__NEXT_DATA__').text().trim();
  const nextDataKeys = (() => {
    if (!nextDataRaw) return [];
    try {
      const parsed = JSON.parse(nextDataRaw) as Record<string, unknown>;
      return Object.keys(parsed);
    } catch {
      return ['__NEXT_DATA__ (invalid JSON)'];
    }
  })();

  const jsonLdBlocks = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).text())
    .get()
    .map((text) => text.trim())
    .filter(Boolean);

  const absoluteOrRoot = hrefs.filter(
    (href) => href.startsWith('http') || href.startsWith('/')
  );
  const hasNew = hrefs.filter((href) => href.includes('/new'));
  const hasEuUsUk = hrefs.filter(
    (href) => href.includes('/eu/') || href.includes('/us/') || href.includes('/uk/')
  );
  const productPath = hrefs.filter((href) =>
    href.includes('/products/') || href.includes('/product/')
  );
  const productAnchorsWithImage = $('a[href]')
    .filter((_, el) => $(el).find('img').length > 0)
    .map((_, el) => $(el).attr('href'))
    .get()
    .filter((href): href is string => Boolean(href));
  const productPathWithImage = productAnchorsWithImage.filter((href) =>
    href.includes('/products/') || href.includes('/product/')
  );
  const looksLikeProduct = hrefs.filter((href) => {
    const clean = href.split('?')[0].replace(/\/$/, '');
    const segments = clean.split('/').filter(Boolean);
    return (
      (href.startsWith('/') || href.startsWith('http')) &&
      !href.includes('/new') &&
      !href.includes('/category') &&
      !href.includes('/about') &&
      !href.includes('/help') &&
      segments.length >= 1
    );
  });

  console.log(
    JSON.stringify(
      {
        urlRequested: JELLYCAT_NEW_URL,
        status: response.status,
        finalUrl: response.url,
        contentType,
        htmlStart: html.slice(0, 200),
        counts: {
          anchors: hrefs.length,
          absoluteOrRoot: absoluteOrRoot.length,
          hasNew: hasNew.length,
          hasEuUsUk: hasEuUsUk.length,
          productPath: productPath.length,
          productAnchorsWithImage: productAnchorsWithImage.length,
          productPathWithImage: productPathWithImage.length,
          looksLikeProduct: looksLikeProduct.length,
          scriptSrcs: scriptSrcs.length,
          jsonLdBlocks: jsonLdBlocks.length,
          hasNextData: nextDataRaw ? 1 : 0,
        },
        samples: {
          hasEuUsUk: sample(hasEuUsUk),
          productPath: sample(productPath),
          productPathWithImage: sample(productPathWithImage),
          anchorsWithImage: sample(productAnchorsWithImage),
          looksLikeProduct: sample(looksLikeProduct),
          allHrefs: sample(hrefs),
          scriptSrcs: sample(scriptSrcs),
          nextDataKeys,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

