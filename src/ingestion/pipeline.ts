import fs from 'fs';
import path from 'path';
import {
  createContext, scrapeScriptUrls, scrapeScriptSource, randomDelay,
  ScraperBlockedError, Pacer,
} from './scraper.js';
import { analyzePineScript } from './analyzer.js';
import { enrichWithLLM, buildSpecFromStatic } from './parser.js';
import {
  markPageScraped, isPageScraped,
  upsertScript, isScriptProcessed,
  markScraped, markParsed, markSkipped, markError,
  getStats,
} from './db.js';

const SPECS_DIR = 'strategies/specs/pending';
const RAW_DIR = 'strategies/raw';
const UNKNOWN_INDICATORS_FILE = 'strategies/unknown-indicators.json';

// Abort the run after this many consecutive ScraperBlockedError — means
// TradingView changed its markup or this IP is being walled; continuing is
// pointless and looks more bot-like.
const MAX_CONSECUTIVE_BLOCKS = 3;

// Only call LLM when static confidence is below threshold AND the script's
// complexity doesn't cap it below the threshold naturally.
// complex scripts max out at 0.60, medium at 0.85 — so LLM is only useful
// for scripts that could theoretically score higher.
const LLM_CONFIDENCE_THRESHOLD = 0.50;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

function makeSpecId(name: string, hash: string): string {
  return `${slugify(name)}-${hash.slice(0, 6)}`;
}

function saveSpec(spec: object, specId: string): void {
  fs.mkdirSync(SPECS_DIR, { recursive: true });
  const filePath = path.join(SPECS_DIR, `${specId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(spec, null, 2));
}

// Persist the raw Pine source, content-addressed by hash. This decouples
// scraping from analysis: an improved analyzer can be re-run over these
// offline, with no re-scraping. Written for every fetched script, including
// ones that fail the tradeable check.
function saveRawSource(source: string, rawHash: string): void {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.writeFileSync(path.join(RAW_DIR, `${rawHash}.pine`), source);
}

// Running tally of ta.* calls the analyzer can't extract, most-frequent first.
function tallyUnknownIndicators(fns: string[]): void {
  let tally: Record<string, number> = {};
  try {
    tally = JSON.parse(fs.readFileSync(UNKNOWN_INDICATORS_FILE, 'utf8'));
  } catch {
    // first write — start empty
  }
  for (const fn of fns) tally[fn] = (tally[fn] ?? 0) + 1;
  const sorted = Object.fromEntries(
    Object.entries(tally).sort((a, b) => b[1] - a[1]),
  );
  fs.writeFileSync(UNKNOWN_INDICATORS_FILE, JSON.stringify(sorted, null, 2));
}

// ─── Main pipeline ───────────────────────────────────────────────────────────

export async function runPipeline(options: {
  startPage: number;
  endPage: number;
  dryRun?: boolean;
  noLlm?: boolean;
}): Promise<void> {
  const { startPage, endPage, dryRun = false, noLlm = false } = options;

  console.log(`\n[pipeline] Starting: pages ${startPage}–${endPage}`);
  if (dryRun) console.log('[pipeline] DRY RUN — no files will be written');

  // Persistent context handles UA, locale, headers and fingerprint scrub.
  const context = await createContext();
  const page = await context.newPage();

  const pacer = new Pacer();
  let consecutiveBlocks = 0;

  try {
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      if (isPageScraped(pageNum)) {
        console.log(`[pipeline] Page ${pageNum} already scraped, skipping`);
        continue;
      }

      // Scrape listing page
      let urls: string[];
      try {
        urls = await scrapeScriptUrls(page, pageNum);
      } catch (err) {
        console.error(`[pipeline] Failed to scrape listing page ${pageNum}: ${String(err)}`);
        continue;
      }

      if (urls.length === 0) {
        console.warn(`[pipeline] No URLs found on page ${pageNum} — possible block or last page`);
        break;
      }

      if (!dryRun) markPageScraped(pageNum, urls.length);

      // Register all URLs
      if (!dryRun) {
        for (const url of urls) {
          upsertScript(url);
        }
      }

      // Process each script
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`\n[pipeline] Script ${i + 1}/${urls.length} on page ${pageNum}`);

        if (isScriptProcessed(url)) {
          console.log(`[pipeline] Already processed: ${url}`);
          continue;
        }

        // Scrape Pine Script source
        let source: string | null = null;
        try {
          source = await scrapeScriptSource(page, url);
          consecutiveBlocks = 0;
          pacer.ok();
          await pacer.wait();
        } catch (err) {
          if (err instanceof ScraperBlockedError) {
            consecutiveBlocks++;
            console.error(
              `[pipeline] BLOCKED (${consecutiveBlocks}/${MAX_CONSECUTIVE_BLOCKS}): ${String(err)}`,
            );
            if (consecutiveBlocks >= MAX_CONSECUTIVE_BLOCKS) {
              throw new Error(
                `Aborting run: ${MAX_CONSECUTIVE_BLOCKS} consecutive blocked pages — ` +
                `TradingView markup changed or this IP is walled.`,
              );
            }
            pacer.fail();
            await pacer.wait();
            continue;
          }
          if (!dryRun) markError(url, String(err));
          console.error(`[pipeline] Scrape error: ${String(err)}`);
          pacer.fail();
          await pacer.wait();
          continue;
        }

        if (!source) {
          if (!dryRun) markSkipped(url, 'no_source_extracted');
          console.log(`[pipeline] Skipped (no source): ${url}`);
          continue;
        }

        // Static analysis
        const analysis = analyzePineScript(source, url);

        // Persist raw source, content-addressed by hash, so an improved
        // analyzer can be re-run over it later without re-scraping.
        if (!dryRun) saveRawSource(source, analysis.rawHash);

        if (analysis.unknownIndicators.length > 0) {
          console.log(
            `[pipeline] Unrecognized ta.* calls: ${analysis.unknownIndicators.join(', ')}`,
          );
          if (!dryRun) tallyUnknownIndicators(analysis.unknownIndicators);
        }

        if (!analysis.isTradeable) {
          if (!dryRun) markSkipped(url, analysis.skipReason ?? 'not_tradeable');
          console.log(`[pipeline] Skipped (${analysis.skipReason}): ${url}`);
          continue;
        }

        if (!dryRun) markScraped(url, analysis.rawHash);

        const name = (analysis.partial.name as string) ?? 'unknown';
        const specId = makeSpecId(name, analysis.rawHash);

        console.log(`[pipeline] "${name}" — type: ${analysis.partial.strategyType}, complexity: ${analysis.complexity}, confidence: ${analysis.confidence}`);

        let spec = null;

        if (noLlm || analysis.confidence >= LLM_CONFIDENCE_THRESHOLD) {
          // Static analysis only
          spec = buildSpecFromStatic(analysis, specId);
          console.log(`[pipeline] Parsed by static analyzer (confidence: ${analysis.confidence})`);
        } else {
          // Need LLM enrichment
          console.log(`[pipeline] Confidence ${analysis.confidence} < ${LLM_CONFIDENCE_THRESHOLD}, calling LLM...`);
          if (!dryRun) {
            spec = await enrichWithLLM(analysis.partial, source, specId);
            if (!spec) {
              // LLM failed, fall back to static
              spec = buildSpecFromStatic(analysis, specId);
            }
          }
        }

        if (spec && !dryRun) {
          saveSpec(spec, specId);
          markParsed(url, specId, spec.strategyType, spec.parsedBy, spec.confidence);
          console.log(`[pipeline] Saved: strategies/specs/pending/${specId}.json`);
        } else if (dryRun) {
          console.log(`[pipeline] DRY RUN — would save spec: ${specId}`);
          markParsed(url, specId, analysis.partial.strategyType ?? 'condition', 'static', analysis.confidence);
        } else {
          markSkipped(url, 'parse_failed');
        }
      }

      // Stats after each page
      if (!dryRun) {
        const stats = getStats();
        console.log(`\n[pipeline] Page ${pageNum} done. Stats:`, stats);
      }

      if (pageNum < endPage) {
        console.log('[pipeline] Waiting before next page...');
        await randomDelay(5000, 10000);
      }
    }
  } finally {
    await context.close();
  }

  if (!dryRun) {
    const finalStats = getStats();
    console.log('\n[pipeline] Complete. Final stats:', finalStats);
  }
}
