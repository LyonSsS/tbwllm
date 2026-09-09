import ccxt from 'ccxt';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { CandleSchema, type Candle } from '../core/types.js';

// ============================================================================
// OHLCV fetcher — provider-abstracted (crypto now, forex / stocks later),
// cached to data/ohlcv/ so history is downloaded once.
// ============================================================================

const CACHE_DIR = 'data/ohlcv';

export interface DataSpec {
  source: string;    // 'binance'
  symbol: string;    // 'BTC/USDT'
  timeframe: string; // '1h', '4h', '1d', ...
  since: number;     // ms epoch
  until: number;     // ms epoch
}

const TF_MS: Record<string, number> = {
  '1m': 60_000, '5m': 300_000, '15m': 900_000, '30m': 1_800_000,
  '1h': 3_600_000, '2h': 7_200_000, '4h': 14_400_000,
  '6h': 21_600_000, '12h': 43_200_000, '1d': 86_400_000,
};

const YEAR_MS = 365.25 * 24 * 3600 * 1000;
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function cacheFile(s: DataSpec): string {
  const sym = s.symbol.replace(/[/:]/g, '');
  return path.join(CACHE_DIR, `${s.source}_${sym}_${s.timeframe}_${day(s.since)}_${day(s.until)}.json`);
}

function readCache(file: string): Candle[] {
  return z.array(CandleSchema).parse(JSON.parse(fs.readFileSync(file, 'utf8')));
}

// ─── providers ──────────────────────────────────────────────────────────────

async function fetchBinance(s: DataSpec): Promise<Candle[]> {
  const step = TF_MS[s.timeframe];
  if (!step) throw new Error(`unsupported timeframe "${s.timeframe}"`);
  const ex = new ccxt.binance({ enableRateLimit: true });
  const out: Candle[] = [];
  let since = s.since;
  while (since < s.until) {
    const batch = await ex.fetchOHLCV(s.symbol, s.timeframe, since, 1000);
    if (!batch.length) break;
    for (const row of batch) {
      const ts = row[0] as number;
      if (ts >= s.until) break;
      out.push({
        timestamp: ts,
        open: row[1] as number, high: row[2] as number, low: row[3] as number,
        close: row[4] as number, volume: row[5] as number,
      });
    }
    const last = batch[batch.length - 1][0] as number;
    if (last < since + step) break; // no forward progress
    since = last + step;
    process.stdout.write(`\r[data] ${s.symbol} ${s.timeframe} → ${day(since)}  (${out.length} candles)`);
  }
  process.stdout.write('\n');

  if (out.length) {
    const first = out[0].timestamp;
    const gotY = (out[out.length - 1].timestamp - first) / YEAR_MS;
    if (first > s.since + step) {
      console.warn(
        `[data] requested from ${day(s.since)} — ${s.source} ${s.symbol} starts ${day(first)}; ` +
        `got ${gotY.toFixed(1)} years, not ${((s.until - s.since) / YEAR_MS).toFixed(1)}`,
      );
    }
    console.log(`[data] actual range ${day(first)} → ${day(out[out.length - 1].timestamp)} (${gotY.toFixed(1)}y)`);
  }
  return out;
}

const PROVIDERS: Record<string, (s: DataSpec) => Promise<Candle[]>> = {
  binance: fetchBinance,
};

// ─── public API ─────────────────────────────────────────────────────────────

/** Cached OHLCV. Fetches + caches on a miss. */
export async function getOHLCV(s: DataSpec): Promise<Candle[]> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = cacheFile(s);
  if (fs.existsSync(file)) return readCache(file);

  const provider = PROVIDERS[s.source];
  if (!provider) {
    throw new Error(`unknown data source "${s.source}" — have: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  const candles = await provider(s);
  if (candles.length === 0) throw new Error(`no candles returned for ${JSON.stringify(s)}`);
  fs.writeFileSync(file, JSON.stringify(candles));
  console.log(`[data] cached ${candles.length} candles → ${file}`);
  return candles;
}

/** Cached OHLCV or null — never fetches. For the backtester. */
export function loadOHLCV(s: DataSpec): Candle[] | null {
  const file = cacheFile(s);
  return fs.existsSync(file) ? readCache(file) : null;
}

/** Any cached file matching source/symbol/timeframe; the one with the widest
 *  date range wins. */
export function findCached(source: string, symbol: string, timeframe: string): Candle[] | null {
  if (!fs.existsSync(CACHE_DIR)) return null;
  const sym = symbol.replace(/[/:]/g, '');
  const prefix = `${source}_${sym}_${timeframe}_`;
  const span = (f: string): number => {
    const m = f.match(/_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\.json$/);
    return m ? Date.parse(m[2]) - Date.parse(m[1]) : 0;
  };
  const match = fs.readdirSync(CACHE_DIR)
    .filter(f => f.startsWith(prefix))
    .sort((a, b) => span(b) - span(a))[0];
  return match ? readCache(path.join(CACHE_DIR, match)) : null;
}
