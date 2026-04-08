import { chromium, Browser, Page } from 'playwright';

// ============================================================================
// TradingView scraper — no login, open-source scripts only
// ============================================================================

const BASE_URL = 'https://www.tradingview.com';
const SCRIPTS_URL = `${BASE_URL}/scripts/`;

// Delay between requests to avoid rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay(minMs = 3000, maxMs = 6000): Promise<void> {
  return sleep(Math.floor(Math.random() * (maxMs - minMs) + minMs));
}

// ─── Page scraping ───────────────────────────────────────────────────────────

export async function scrapeScriptUrls(
  page: Page,
  pageNum: number
): Promise<string[]> {
  const url = pageNum === 1 ? SCRIPTS_URL : `${SCRIPTS_URL}?page=${pageNum}`;
  console.log(`[scraper] Fetching listing page ${pageNum}: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  await sleep(3000); // extra wait for JS-rendered cards

  // Try to wait for script cards to appear
  try {
    await page.waitForSelector('a[href*="/script/"]', { timeout: 10000 });
  } catch {
    console.warn('[scraper] Timed out waiting for script links — trying anyway');
  }

  const title = await page.title();
  console.log(`[scraper] Page title: ${title}`);

  // Extract all script links from the card grid
  const urls = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/script/"]'));
    const found = new Set<string>();
    for (const link of links) {
      const href = (link as HTMLAnchorElement).href;
      // Only include individual script pages (not tag/author pages or fragments)
      if (/\/script\/[A-Za-z0-9]/.test(href) && !href.includes('/scripts/')) {
        // Strip query params, fragments, and trailing slash
        const clean = href.split('?')[0].split('#')[0].replace(/\/$/, '');
        found.add(clean);
      }
    }
    return Array.from(found);
  });

  console.log(`[scraper] Found ${urls.length} script URLs on page ${pageNum}`);
  return urls;
}

// ─── Script source extraction via pine-facade API ────────────────────────────
//
// TradingView stores Pine Script source at:
//   https://pine-facade.tradingview.com/pine-facade/get/PUB%3B{pubId}/1
// The PUB ID is embedded in window.initData on the script page.
// Open-source scripts return scriptAccess: "open_no_auth" — no login required.

export async function scrapeScriptSource(
  page: Page,
  url: string
): Promise<string | null> {
  console.log(`[scraper] Fetching script: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await sleep(1500);

    // Extract PUB ID from window.initData
    const pubId = await page.evaluate(() => {
      const initData = (window as unknown as Record<string, unknown>).initData;
      const str = JSON.stringify(initData ?? '');
      const m = str.match(/PUB;([a-f0-9]{32})/i);
      return m ? m[1] : null;
    });

    if (!pubId) {
      console.warn(`[scraper] No PUB ID found on: ${url}`);
      return null;
    }

    // Fetch source from pine-facade API (accessible without auth for open-source scripts)
    const result = await page.evaluate(async (id: string) => {
      const res = await fetch(
        `https://pine-facade.tradingview.com/pine-facade/get/PUB%3B${id}/1?no_4xx=true`
      );
      if (!res.ok) return null;
      const json = await res.json() as {
        source?: string;
        scriptAccess?: string;
      };
      // Only return source for open-access scripts
      if (json.scriptAccess !== 'open_no_auth') return null;
      return json.source ?? null;
    }, pubId);

    if (result && result.includes('@version')) {
      return result.trim();
    }

    console.warn(`[scraper] Script not open-source or no source: ${url}`);
    return null;
  } catch (err) {
    console.error(`[scraper] Error fetching ${url}: ${String(err)}`);
    return null;
  }
}

// ─── Browser lifecycle ───────────────────────────────────────────────────────

export async function createBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });
}

export { randomDelay, sleep };
