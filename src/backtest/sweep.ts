import fs from 'fs';
import path from 'path';
import { StrategySpecSchema, type Candle, type StrategySpec } from '../core/types.js';
import { assemble } from '../assembly/assembler.js';
import { findCached } from '../data/fetcher.js';
import { runBacktest } from './engine.js';

// ============================================================================
//   yarn sweep <specId> [--trials 300] [--min-trades 5]
//
// Random-searches the spec's numeric parameters and reports the best config by
// Sharpe. Answers "does a slight change turn this into something profitable?" —
// a strategy that's flat at the author's defaults may have a strong region
// elsewhere in its parameter space.
// ============================================================================

const SPECS_DIR = 'strategies/specs/pending';
const SOURCE = process.env.BT_SOURCE ?? 'binance';
const SYMBOL = process.env.BT_SYMBOL ?? 'BTC/USDT';
const TF = process.env.BT_TF ?? '1h';

type Range = { lo: number; hi: number; int: boolean };

// Range for a numeric parameter, inferred from its name and default value.
function rangeFor(name: string, v: number): Range | null {
  if (!Number.isFinite(v)) return null;
  const n = name.toLowerCase();
  if (/(len|length|period|bars|lookback)$/.test(n) || /(len|length|period|lookback)/.test(n)) {
    return { lo: Math.max(2, Math.round(v * 0.4)), hi: Math.max(6, Math.round(v * 2.5)), int: true };
  }
  if (/(level|thresh|threshold|band)/.test(n)) {
    return { lo: v * 0.5, hi: v * 1.5 || 1, int: false };
  }
  if (/(mult|factor|ratio|pct|percent|dev|stdev|deviation)/.test(n)) {
    return { lo: Math.max(0.1, v * 0.3), hi: (v || 1) * 3, int: false };
  }
  if (v !== 0) return { lo: v * 0.5, hi: v * 1.5, int: Number.isInteger(v) };
  return null;
}

function loadSpec(file: string): StrategySpec {
  return StrategySpecSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')));
}

function candlesOrDie(): Candle[] {
  const c = findCached(SOURCE, SYMBOL, TF);
  if (!c) { console.error(`no cached ${SOURCE} ${SYMBOL} ${TF} — run yarn data:fetch first`); process.exit(1); }
  return c;
}

function score(spec: StrategySpec, candles: Candle[], minTrades: number) {
  const a = assemble(spec);
  if ('unassemblable' in a) return null;
  const { metrics: m } = runBacktest(a.run(candles), candles);
  if (m.totalTrades < minTrades) return null;
  return m;
}

const args = process.argv.slice(2);
const specId = args[0];
if (!specId) { console.error('usage: yarn sweep <specId> [--trials N] [--min-trades N]'); process.exit(1); }
const trials = Number(args[args.indexOf('--trials') + 1]) || 300;
const minTrades = Number(args[args.indexOf('--min-trades') + 1]) || 5;

const candles = candlesOrDie();
const base = loadSpec(path.join(SPECS_DIR, specId.endsWith('.json') ? specId : `${specId}.json`));

if ('unassemblable' in assemble(base)) {
  console.error(`${base.id} is not assemblable — nothing to sweep`);
  process.exit(1);
}

const ranges = new Map<string, Range>();
for (const [k, v] of Object.entries(base.parameters ?? {})) {
  if (typeof v !== 'number') continue;
  const r = rangeFor(k, v);
  if (r) ranges.set(k, r);
}
if (ranges.size === 0) { console.error(`${base.id} has no sweepable numeric parameters`); process.exit(1); }

const pct = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}%`;
const baseM = score(base, candles, 1);
console.log(`\n${base.id}  —  sweeping ${ranges.size} param(s): ${[...ranges.keys()].join(', ')}`);
console.log(`baseline (author defaults): ${baseM ? `Sharpe ${baseM.sharpeRatio!.toFixed(2)}  return ${pct(baseM.totalReturn)}  trades ${baseM.totalTrades}` : '(too few trades)'}`);

let best: { params: Record<string, number>; sharpe: number; ret: number; dd: number; trades: number } | null = null;
let profitable = 0;
let sharpeOver1 = 0;

for (let t = 0; t < trials; t++) {
  const params = { ...base.parameters } as Record<string, number>;
  for (const [k, r] of ranges) {
    const x = r.lo + Math.random() * (r.hi - r.lo);
    params[k] = r.int ? Math.round(x) : Number(x.toFixed(4));
  }
  const m = score({ ...base, parameters: params }, candles, minTrades);
  if (!m) continue;
  if (m.totalReturn > 0) profitable++;
  if ((m.sharpeRatio ?? 0) > 1) sharpeOver1++;
  if (!best || (m.sharpeRatio ?? 0) > best.sharpe) {
    best = { params: pickSwept(params, ranges), sharpe: m.sharpeRatio ?? 0, ret: m.totalReturn, dd: m.maxDrawdown, trades: m.totalTrades };
  }
}

function pickSwept(p: Record<string, number>, rs: Map<string, Range>): Record<string, number> {
  const o: Record<string, number> = {};
  for (const k of rs.keys()) o[k] = p[k];
  return o;
}

console.log(`\n${trials} trials · ${profitable} profitable · ${sharpeOver1} with Sharpe > 1`);
if (best) {
  console.log(`best:  Sharpe ${best.sharpe.toFixed(2)}  return ${pct(best.ret)}  maxDD ${best.dd.toFixed(1)}%  trades ${best.trades}`);
  console.log(`  at:  ${JSON.stringify(best.params)}`);
} else {
  console.log('best:  nothing cleared the min-trades bar');
}
