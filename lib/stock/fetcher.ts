import "server-only";

import * as cheerio from "cheerio";
import { JELLYCAT_NEW_URL } from "@/lib/config/products";
import { db } from "@/lib/db/drizzle";
import { scraperState } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export type NewProduct = {
  externalId: string;
  name: string;
  url: string;
  imageUrl?: string;
  position: number;
};

export type NewProductsSnapshot = {
  products: NewProduct[];
  fetchedAt: Date;
  notModified?: boolean;
};

const NEW_PAGE_STATE_KEY = "jellycat:/new";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(retryAfter: string | null): number | null {
  if (!retryAfter) return null;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  const when = new Date(retryAfter);
  const delta = when.getTime() - Date.now();
  return Number.isFinite(delta) && delta > 0 ? delta : null;
}

function getBackoffDelayMs(attempt: number, retryAfterHeader: string | null) {
  const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
  if (retryAfterMs !== null) {
    const jitter = Math.floor(Math.random() * 250);
    return retryAfterMs + jitter;
  }

  const baseMs = 750;
  const maxMs = 30_000;
  const expo = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempt - 1)));
  const jitter = Math.floor(Math.random() * 350);
  return expo + jitter;
}

function isRetryableStatus(status: number) {
  if (status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  return status === 403;
}

async function fetchWithBackoff(
  url: string,
  init: RequestInit,
  options: { maxAttempts: number; timeoutMs: number }
) {
  const attemptFetch = async (attempt: number): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    }).catch((error) => {
      clearTimeout(timeoutId);
      throw error;
    });

    clearTimeout(timeoutId);

    if (!isRetryableStatus(response.status)) {
      return response;
    }

    if (attempt >= options.maxAttempts) {
      return response;
    }

    const delayMs = getBackoffDelayMs(
      attempt,
      response.headers.get("retry-after")
    );
    await sleep(delayMs);
    return await attemptFetch(attempt + 1);
  };

  return await attemptFetch(1);
}

async function getNewPageRequestState() {
  const rows = await db
    .select()
    .from(scraperState)
    .where(eq(scraperState.key, NEW_PAGE_STATE_KEY))
    .limit(1);

  return rows.length > 0 ? rows[0] : null;
}

async function upsertNewPageRequestState(input: {
  etag: string | null;
  lastModified: string | null;
}) {
  const now = new Date();

  await db
    .insert(scraperState)
    .values({
      key: NEW_PAGE_STATE_KEY,
      etag: input.etag,
      lastModified: input.lastModified,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: scraperState.key,
      set: {
        etag: sql`excluded.etag`,
        lastModified: sql`excluded.last_modified`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}

async function fetchNewPageHtml() {
  const existingState = await getNewPageRequestState();

  const headers: Record<string, string> = {
    "user-agent": "jellycatsalerts/1.0 (+stock-check)",
    accept: "text/html,application/xhtml+xml",
  };

  if (existingState?.etag) {
    headers["if-none-match"] = existingState.etag;
  }

  if (existingState?.lastModified) {
    headers["if-modified-since"] = existingState.lastModified;
  }

  const response = await fetchWithBackoff(
    JELLYCAT_NEW_URL,
    {
      headers,
      cache: "no-store",
    },
    { maxAttempts: 5, timeoutMs: 12_000 }
  );

  if (response.status === 304) {
    return { notModified: true as const, html: "" };
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch /new page (${response.status})`);
  }

  const nextEtag = response.headers.get("etag") ?? existingState?.etag ?? null;
  const nextLastModified =
    response.headers.get("last-modified") ??
    existingState?.lastModified ??
    null;

  if (
    nextEtag !== existingState?.etag ||
    nextLastModified !== existingState?.lastModified
  ) {
    await upsertNewPageRequestState({
      etag: nextEtag,
      lastModified: nextLastModified,
    });
  }

  return { notModified: false as const, html: await response.text() };
}

function extractProductIdFromUrl(url: string): string {
  /**
   * Use the last URL segment as a stable external id (BigCommerce product slug).
   * If the slug ends with a hyphenated SKU-ish token that includes a digit, use that.
   *
   * Examples:
   * - https://jellycat.com/heart-dragon/ -> heart-dragon
   * - https://www.jellycat.com/eu/amuseable-croissant-a2croi/ -> a2croi
   */
  const cleanUrl = url.replace(/\/$/, "");
  const lastSegment = cleanUrl.split("/").pop() ?? cleanUrl;

  const parts = lastSegment.split("-");
  const lastPart = parts[parts.length - 1] ?? lastSegment;
  const hasDigit = /\d/.test(lastPart);

  return hasDigit ? lastPart : lastSegment;
}

function parseProductsFromHtml(html: string): NewProduct[] {
  const $ = cheerio.load(html);
  const products: NewProduct[] = [];

  const baseUrl = new URL(JELLYCAT_NEW_URL);

  /**
   * BigCommerce "new" page renders product cards as anchors wrapping images.
   * Product URLs are typically single-segment slugs, e.g. /heart-dragon/
   */
  $("a[href]")
    .filter((_, element) => $(element).find("img").length > 0)
    .each((index, element) => {
      const $el = $(element);
      const href = $el.attr("href");

      if (!href) return;

      const resolvedUrl = new URL(href, baseUrl).toString();
      const pathname = new URL(resolvedUrl).pathname;
      const pathSegments = pathname.split("/").filter(Boolean);

      // Skip obvious non-product links
      const isNonProduct =
        pathname === "/" ||
        pathname === "/new" ||
        pathname === "/shop-all" ||
        pathname === "/login.php" ||
        pathname.startsWith("/collections/") ||
        pathname.startsWith("/category/") ||
        pathname.startsWith("/about") ||
        pathname.startsWith("/help");

      if (isNonProduct) return;

      // Product slugs on this site are a single path segment like /heart-dragon/
      if (pathSegments.length !== 1) return;

      // Get product name from image alt, title attribute, or nested text
      const $img = $el.find("img").first();
      const name =
        $img.attr("alt") ||
        $el.attr("title") ||
        $el.find('[class*="name"], [class*="title"]').text().trim() ||
        $el.text().trim();

      if (!name || name.length < 2) return;

      // Get image URL
      const imageUrl = $img.attr("src") || $img.attr("data-src");

      const externalId = extractProductIdFromUrl(resolvedUrl);

      // Avoid duplicates (same product might appear multiple times)
      const alreadyAdded = products.some((p) => p.externalId === externalId);
      if (alreadyAdded) return;

      products.push({
        externalId,
        name: name.substring(0, 255),
        url: resolvedUrl,
        imageUrl: imageUrl || undefined,
        position: products.length,
      });
    });

  return products;
}

/**
 * Fetches the current "New" products from Jellycat's /new page.
 * Returns a snapshot of products in their display order.
 */
export async function fetchNewProductsSnapshot(): Promise<NewProductsSnapshot> {
  const { notModified, html } = await fetchNewPageHtml();

  if (notModified) {
    return {
      products: [],
      fetchedAt: new Date(),
      notModified: true,
    };
  }

  const products = parseProductsFromHtml(html);

  return {
    products,
    fetchedAt: new Date(),
  };
}
