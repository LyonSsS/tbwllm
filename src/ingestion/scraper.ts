import { chromium, BrowserContext, Page } from 'playwright';

// ============================================================================
// TradingView scraper — no login. Closed-source scripts are filtered per-script
// by `scrapeScriptSource` (scriptAccess check), not by the listing.
// ============================================================================

const BASE_URL = 'https://www.tradingview.com';

// Listing to crawl. Default `/scripts/` — the only listing that paginates
// deeply (via `/scripts/page-N/` path segments). `/scripts/opensource/` would
// pre-filter closed-source but only paginates to ~page 2. Override with
// TV_SCRIPTS_PATH (e.g. '/scripts/opensource/', '/scripts/editors-picks/').
const rawScriptsPath = process.env.TV_SCRIPTS_PATH ?? '/scripts/';
const SCRIPTS_PATH = rawScriptsPath.endsWith('/') ? rawScriptsPath : `${rawScriptsPath}/`;
const SCRIPTS_URL = `${BASE_URL}${SCRIPTS_PATH}`;

/**
 * Thrown when a page loads but does not look like a TradingView script page at
 * all — no `window.initData` (bot wall, redirect, or a TradingView markup
 * change). Distinct from a script simply being closed-source, which returns
 * `null`. The pipeline aborts the run after several of these in a row.
 */
export class ScraperBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScraperBlockedError';
  }
}

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
  // TradingView paginates via path segments: /scripts/, /scripts/page-2/, ...
  // (`?page=N` is ignored; the "Show more publications" button switches the
  // page to infinite scroll, which is harder to drive than distinct pages.)
  const url = pageNum === 1 ? SCRIPTS_URL : `${SCRIPTS_URL}page-${pageNum}/`;
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

    // Probe window.initData for the PUB ID.
    const probe = await page.evaluate(() => {
      const initData = (window as unknown as Record<string, unknown>).initData;
      const hasInitData = initData !== undefined && initData !== null;
      const str = JSON.stringify(initData ?? '');
      const m = str.match(/PUB;([a-f0-9]{32})/i);
      return { hasInitData, pubId: m ? m[1] : null };
    });

    if (!probe.hasInitData) {
      // Page rendered without initData at all — not a script page as we expect
      // it. Treat as a scraper failure, not a closed-source script.
      throw new ScraperBlockedError(`window.initData absent on ${url}`);
    }

    if (!probe.pubId) {
      console.warn(`[scraper] initData present but no PUB id (not a standard script): ${url}`);
      return null;
    }

    const pubId = probe.pubId;

    // Fetch source from pine-facade API (accessible without auth for open-source
    // scripts). `/last` = latest published revision (not `/1`, the first).
    const result = await page.evaluate(async (id: string) => {
      const res = await fetch(
        `https://pine-facade.tradingview.com/pine-facade/get/PUB%3B${id}/last?no_4xx=true`
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
    if (err instanceof ScraperBlockedError) throw err;
    console.error(`[scraper] Error fetching ${url}: ${String(err)}`);
    return null;
  }
}

// ─── Browser lifecycle ───────────────────────────────────────────────────────

// A recent stable desktop Chrome UA. Playwright's default headless UA contains
// "HeadlessChrome" — the single clearest automation tell.
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const USER_DATA_DIR = process.env.TV_USER_DATA_DIR ?? 'data/.pw-profile';
const HEADFUL = process.env.TV_HEADFUL === '1' || process.env.TV_HEADFUL === 'true';

/**
 * Persistent browser context — reuses cookies / localStorage across runs (so we
 * aren't a brand-new visitor every time) and applies light fingerprint
 * hardening. The caller owns the returned context and must `.close()` it.
 */
export async function createContext(): Promise<BrowserContext> {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: !HEADFUL,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    userAgent: process.env.TV_USER_AGENT ?? DEFAULT_UA,
    locale: 'en-US',
    timezoneId: process.env.TV_TIMEZONE ?? 'America/New_York',
    viewport: { width: 1920, height: 1080 },
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  // Report the real-browser value for navigator.webdriver (false, not the
  // automation-set true) before any page script runs. Deeper fingerprint
  // spoofing (plugins, canvas, WebGL) is the heavy tier — a stealth plugin —
  // and only worth it if real runs start tripping ScraperBlockedError.
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  return context;
}

/**
 * Request pacer with exponential backoff. `wait()` sleeps a randomised base
 * delay times the current multiplier; `fail()` doubles the multiplier (capped),
 * `ok()` resets it. Base bounds are env-tunable (TV_DELAY_MIN_MS / _MAX_MS).
 */
export class Pacer {
  private multiplier = 1;

  constructor(
    private readonly minMs = Number(process.env.TV_DELAY_MIN_MS) || 3000,
    private readonly maxMs = Number(process.env.TV_DELAY_MAX_MS) || 6000,
    private readonly maxMultiplier = 8,
  ) {}

  ok(): void {
    this.multiplier = 1;
  }

  fail(): void {
    this.multiplier = Math.min(this.multiplier * 2, this.maxMultiplier);
  }

  async wait(): Promise<void> {
    const base = Math.random() * (this.maxMs - this.minMs) + this.minMs;
    await sleep(base * this.multiplier);
  }
}

export { randomDelay, sleep };
