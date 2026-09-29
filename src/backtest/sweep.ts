import fs from 'fs';
import path from 'path';
import { StrategySpecSchema, type Candle, type StrategySpec, type BacktestMetrics } from '../core/types.js';
import { assemble } from '../assembly/assembler.js';
import { findCached } from '../data/fetcher.js';
import { runBacktest } from './engine.js';
import { pct, boxTable, mdTable } from './format.js';

// ============================================================================
//   yarn sweep <specId> [--trials 300] [--min-trades 5] [--tf 1h] [--folds 4]
//   yarn sweep --all    [--trials 200] [--min-trades 5] [--tf 1h,4h,1d] [--folds 4]
//
// Random-searches a spec's numeric parameters across an *anchored walk-
// forward* split, not one static train/test cut: history is divided into
// `folds + 1` equal chronological blocks, and fold i trains on the
// expanding window of every block before it, testing on the next block it
// has never seen. Each block is used as a test slice exactly once, so a
// fold's test data can never leak into an earlier fold's training window.
//
// A single lucky (or unlucky) split can make a worthless strategy look
// good, or a real one look bad — picking the best-by-train config on one
// 67/33 cut is itself a form of overfitting once you consider that cut was
// one of many possible ones. Requiring the result to hold up on most folds,
// not just one, is what actually distinguishes a real edge from a curve-fit.
// ============================================================================

const SPECS_DIR = 'strategies/specs/pending';
const RESULTS_DIR = 'strategies/results';
const SOURCE = process.env.BT_SOURCE ?? 'binance';
const SYMBOL = process.env.BT_SYMBOL ?? 'BTC/USDT';
const DEFAULT_FOLDS = 4;
const MIN_BLOCK_BARS = 20; // below this a block is too thin to backtest meaningfully

type Range = { lo: number; hi: number; int: boolean };
type Slice = { candles: Candle[]; from: string; to: string };
type Split = { train: Slice; test: Slice };

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

const day = (ts: number) => new Date(ts).toISOString().slice(0, 10);

function toSlice(c: Candle[]): Slice {
  return { candles: c, from: day(c[0].timestamp), to: day(c[c.length - 1].timestamp) };
}

// `numFolds + 1` equal chronological blocks → `numFolds` folds. Fold i
// trains on blocks[0..i] concatenated (an expanding/"anchored" window) and
// tests on block[i+1], which no earlier fold ever trained or tested on.
function buildFolds(candles: Candle[], numFolds: number): Split[] {
  const numBlocks = numFolds + 1;
  const blockLen = Math.floor(candles.length / numBlocks);
  if (blockLen < MIN_BLOCK_BARS) return [];

  const blocks: Candle[][] = [];
  for (let i = 0; i < numBlocks; i++) {
    const start = i * blockLen;
    const end = i === numBlocks - 1 ? candles.length : start + blockLen;
    blocks.push(candles.slice(start, end));
  }

  const folds: Split[] = [];
  for (let i = 1; i < numBlocks; i++) {
    const train = blocks.slice(0, i).flat();
    const test = blocks[i];
    if (train.length === 0 || test.length === 0) continue;
    folds.push({ train: toSlice(train), test: toSlice(test) });
  }
  return folds;
}

function score(spec: StrategySpec, candles: Candle[]): BacktestMetrics | null {
  const a = assemble(spec);
  if ('unassemblable' in a) return null;
  return runBacktest(a.run(candles), candles).metrics;
}

function sweepableRanges(spec: StrategySpec): Map<string, Range> {
  const ranges = new Map<string, Range>();
  for (const [k, v] of Object.entries(spec.parameters ?? {})) {
    if (typeof v !== 'number') continue;
    const r = rangeFor(k, v);
    if (r) ranges.set(k, r);
  }
  return ranges;
}

const shp = (m: BacktestMetrics) => m.sharpeRatio ?? 0;

type Pick = { params: Record<string, number>; train: BacktestMetrics; test: BacktestMetrics | null };
type SweepResult = {
  id: string;
  swept: string[];
  baseTrain: BacktestMetrics | null;
  baseTest: BacktestMetrics | null;
  trials: number;
  validN: number;     // trials meeting min-trades on train
  trainGoodN: number; // valid trials with train Sharpe > 1
  heldUpN: number;    // trainGood trials that also held test Sharpe > 1
  best: Pick | null;  // highest train Sharpe among valid trials
  oracle: Pick | null; // highest test Sharpe among valid trials (hindsight upper bound)
};

// One fold's random search — unchanged from the single-split version, just
// invoked once per fold now instead of once per spec.
function sweepSpec(base: StrategySpec, split: Split, trials: number, minTrades: number): SweepResult {
  const ranges = sweepableRanges(base);
  const swept = [...ranges.keys()];
  const res: SweepResult = {
    id: base.id, swept,
    baseTrain: score(base, split.train.candles),
    baseTest: score(base, split.test.candles),
    trials, validN: 0, trainGoodN: 0, heldUpN: 0, best: null, oracle: null,
  };
  if (swept.length === 0) return res;

  for (let t = 0; t < trials; t++) {
    const params = { ...base.parameters } as Record<string, number>;
    for (const [k, r] of ranges) {
      const x = r.lo + Math.random() * (r.hi - r.lo);
      params[k] = r.int ? Math.round(x) : Number(x.toFixed(4));
    }
    const cand = { ...base, parameters: params };
    const train = score(cand, split.train.candles);
    if (!train || train.totalTrades < minTrades) continue;
    res.validN++;
    const test = score(cand, split.test.candles);
    const sw: Record<string, number> = {};
    for (const k of swept) sw[k] = params[k];
    const pick: Pick = { params: sw, train, test };
    if (shp(train) > 1) {
      res.trainGoodN++;
      if (test && shp(test) > 1) res.heldUpN++;
    }
    if (!res.best || shp(train) > shp(res.best.train)) res.best = pick;
    if (test && (!res.oracle || shp(test) > shp(res.oracle.test!))) res.oracle = pick;
  }
  return res;
}

type Verdict = 'holds' | 'marginal' | 'overfit' | 'weak' | 'thin' | 'no-signal';

function verdict(r: SweepResult, minTrades: number): Verdict {
  const b = r.best;
  if (!b) return 'no-signal';
  if (shp(b.train) < 1) return 'weak';
  const ts = b.test ? shp(b.test) : -Infinity;
  const tr = b.test?.totalReturn ?? -Infinity;
  const tt = b.test?.totalTrades ?? 0;
  if (ts >= 1 && tr > 0) return tt >= Math.max(3, Math.ceil(minTrades / 2)) ? 'holds' : 'thin';
  if (ts >= 0.5) return 'marginal';
  return 'overfit';
}

// ── walk-forward aggregation across folds ──────────────────────────────────

type WFVerdict = 'holds' | 'marginal' | 'overfit' | 'weak' | 'no-signal';

type WalkForwardResult = {
  id: string;
  swept: string[];
  folds: SweepResult[];
  foldVerdicts: Verdict[];
  holdRate: number; // fraction of folds that individually verdict 'holds'
  avgTestSharpe: number | null;
  verdict: WFVerdict;
};

// Holds only if the *majority* of folds individually hold (≥75%) — a
// single lucky fold isn't enough. 'marginal' if at least one fold held, or
// most folds landed holds/marginal/thin without clearing the bar outright.
function aggregateVerdict(perFold: Verdict[]): WFVerdict {
  if (perFold.length === 0 || perFold.every(v => v === 'no-signal')) return 'no-signal';
  const holdRate = perFold.filter(v => v === 'holds').length / perFold.length;
  if (holdRate >= 0.75) return 'holds';
  const okRate = perFold.filter(v => v === 'holds' || v === 'marginal' || v === 'thin').length / perFold.length;
  if (holdRate > 0 || okRate >= 0.5) return 'marginal';
  if (perFold.some(v => v === 'weak')) return 'weak';
  return 'overfit';
}

function sweepWalkForward(base: StrategySpec, folds: Split[], trials: number, minTrades: number): WalkForwardResult {
  const foldResults = folds.map(f => sweepSpec(base, f, trials, minTrades));
  const foldVerdicts = foldResults.map(r => verdict(r, minTrades));
  const testSharpes = foldResults
    .map(r => (r.best?.test ? shp(r.best.test) : null))
    .filter((x): x is number => x !== null);
  return {
    id: base.id,
    swept: foldResults[0]?.swept ?? [],
    folds: foldResults,
    foldVerdicts,
    holdRate: foldVerdicts.filter(v => v === 'holds').length / (folds.length || 1),
    avgTestSharpe: testSharpes.length ? testSharpes.reduce((a, b) => a + b, 0) / testSharpes.length : null,
    verdict: aggregateVerdict(foldVerdicts),
  };
}

const LEGEND = [
  `Anchored walk-forward: history → folds+1 equal blocks; fold i trains on every block before it (expanding window), tests on the next untouched block.`,
  `holds    = that fold's best-by-train config keeps Sharpe > 1 and a positive return on its test block`,
  `marginal = test Sharpe 0.5–1`,
  `overfit  = strong on train (Sharpe > 1) but test Sharpe < 0.5`,
  `weak     = no sampled config even reached train Sharpe > 1`,
  `thin     = would hold but too few test trades to trust`,
  `verdict  = aggregated across folds — HOLDS needs ≥75% of folds to individually hold, not just one`,
];

// ── single-spec detailed output ────────────────────────────────────────────

function fmt(m: BacktestMetrics | null): string {
  if (!m) return '(no signals)';
  return `Sharpe ${shp(m).toFixed(2).padStart(6)}  return ${pct(m.totalReturn).padStart(9)}  maxDD ${Math.round(m.maxDrawdown)
    .toString().padStart(3)}%  trades ${m.totalTrades}`;
}

function printOne(wf: WalkForwardResult, folds: Split[], tf: string): void {
  console.log(`\n${wf.id}`);
  console.log(`  ${wf.swept.length} sweepable param(s) on ${tf}: ${wf.swept.join(', ') || '(none)'}`);

  if (wf.swept.length === 0) { console.log('\n  no sweepable numeric parameters — nothing to search'); return; }

  wf.folds.forEach((r, i) => {
    const s = folds[i];
    console.log(`\n  fold ${i + 1}/${wf.folds.length}  train ${s.train.candles.length} bars ${s.train.from}→${s.train.to}  ·  test ${s.test.candles.length} bars ${s.test.from}→${s.test.to}`);
    console.log(`    baseline  train ${fmt(r.baseTrain)}   test ${fmt(r.baseTest)}`);
    if (r.best) {
      console.log(`    best      train ${fmt(r.best.train)}   test ${fmt(r.best.test)}`);
      console.log(`              at ${JSON.stringify(r.best.params)}`);
    } else {
      console.log('    nothing cleared the min-trades bar on train');
    }
    console.log(`    fold verdict: ${wf.foldVerdicts[i].toUpperCase()}`);
  });

  console.log(`\n  ${wf.folds.filter((_, i) => wf.foldVerdicts[i] === 'holds').length}/${wf.folds.length} folds hold  ·  avg test Sharpe ${wf.avgTestSharpe?.toFixed(2) ?? '—'}`);
  console.log(`  aggregate verdict: ${wf.verdict.toUpperCase()}`);
  console.log('');
  for (const l of LEGEND) console.log(`  ${l}`);
}

// ── --all summary table ────────────────────────────────────────────────────

const HEADERS = ['#', 'strategy', 'tf', 'folds held', 'avg te Shrp', 'verdict'];
const NAME_W = 30;
const clip = (s: string) => (s.length <= NAME_W ? s : s.slice(0, NAME_W - 1) + '…');
const VLABEL: Record<WFVerdict, string> = {
  holds: 'holds', marginal: 'marginal', overfit: 'overfit', weak: 'weak', 'no-signal': 'no signal',
};

function tableRows(rows: { wf: WalkForwardResult; tf: string }[]): string[][] {
  return rows.map((x, i) => [
    String(i + 1),
    clip(x.wf.id),
    x.tf,
    `${x.wf.foldVerdicts.filter(v => v === 'holds').length}/${x.wf.folds.length}`,
    x.wf.avgTestSharpe != null ? x.wf.avgTestSharpe.toFixed(2).replace('-', '−') : '—',
    VLABEL[x.wf.verdict],
  ]);
}

function writeSweepMd(rows: { wf: WalkForwardResult; tf: string }[], trials: number, minTrades: number, folds: number): string {
  const md = [
    `# Parameter sweep — walk-forward out-of-sample`,
    ``,
    `_Generated ${new Date().toISOString()}_`,
    ``,
    `${SYMBOL} · ${trials} trials per (spec × timeframe × fold) · min ${minTrades} train trades · ${folds} anchored walk-forward folds.`,
    `Each fold's best config is picked by **train** Sharpe on an expanding window; the **test** Sharpe is that config on the next untouched block. A strategy only counts as holding if it holds on most folds, not one.`,
    ``,
    mdTable(HEADERS, tableRows(rows)),
    ``,
    `## Legend`,
    ``,
    ...LEGEND.map(l => `- ${l}`),
    ``,
  ].join('\n');
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const out = path.join(RESULTS_DIR, 'SWEEP.md');
  fs.writeFileSync(out, md);
  return out;
}

// ── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const VALUE_FLAGS = ['--trials', '--min-trades', '--tf', '--folds'];
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const positional = args.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1]));
const isAll = args.includes('--all');
const trials = Number(flag('--trials')) || (isAll ? 200 : 300);
const minTrades = Number(flag('--min-trades')) || 5;
const tfArg = flag('--tf');
const numFolds = Number(flag('--folds')) || DEFAULT_FOLDS;

function candlesFor(tf: string): Candle[] | null {
  return findCached(SOURCE, SYMBOL, tf) ?? null;
}

if (isAll) {
  const tfList = (tfArg ?? '1h,4h,1d').split(',').map(s => s.trim()).filter(Boolean);
  const assemblable: StrategySpec[] = [];
  for (const f of fs.readdirSync(SPECS_DIR).filter(x => x.endsWith('.json'))) {
    const s = loadSpec(path.join(SPECS_DIR, f));
    if (!('unassemblable' in assemble(s))) assemblable.push(s);
  }
  if (assemblable.length === 0) { console.error('no assemblable specs'); process.exit(1); }

  const rows: { wf: WalkForwardResult; tf: string }[] = [];
  for (const tf of tfList) {
    const c = candlesFor(tf);
    if (!c || !c.length) { console.warn(`no cached ${SYMBOL} ${tf} — skipping (yarn data:fetch ${SYMBOL} ${tf} 2017-01-01 2025-09-01)`); continue; }
    const folds = buildFolds(c, numFolds);
    if (folds.length === 0) { console.warn(`too few cached ${SYMBOL} ${tf} candles (${c.length}) for ${numFolds} folds — skipping`); continue; }
    for (const base of assemblable) {
      process.stderr.write(`  sweeping ${base.id} @ ${tf}[K\r`);
      rows.push({ wf: sweepWalkForward(base, folds, trials, minTrades), tf });
    }
  }
  process.stderr.write('[K');
  if (rows.length === 0) { console.error('no cached data for any requested timeframe'); process.exit(1); }

  rows.sort((a, b) => (b.wf.holdRate - a.wf.holdRate) || ((b.wf.avgTestSharpe ?? -99) - (a.wf.avgTestSharpe ?? -99)));

  console.log(`\n${SYMBOL} · ${trials} trials/fold · min ${minTrades} train trades · ${numFolds} anchored walk-forward folds\n`);
  console.log(boxTable(HEADERS, tableRows(rows)));
  console.log('');
  for (const l of LEGEND) console.log(`  ${l}`);
  const out = writeSweepMd(rows, trials, minTrades, numFolds);
  console.log(`\nwrote ${out}`);
} else {
  const specId = positional[0];
  if (!specId) {
    console.error('usage: yarn sweep <specId> [--trials N] [--min-trades N] [--tf TF] [--folds N]   |   yarn sweep --all [--tf 1h,4h,1d]');
    process.exit(1);
  }
  const tf = tfArg ?? process.env.BT_TF ?? '1h';
  const c = candlesFor(tf);
  if (!c || !c.length) { console.error(`no cached ${SOURCE} ${SYMBOL} ${tf} — run yarn data:fetch first`); process.exit(1); }
  const base = loadSpec(path.join(SPECS_DIR, specId.endsWith('.json') ? specId : `${specId}.json`));
  if ('unassemblable' in assemble(base)) { console.error(`${base.id} is not assemblable — nothing to sweep`); process.exit(1); }
  const folds = buildFolds(c, numFolds);
  if (folds.length === 0) { console.error(`too few cached ${SYMBOL} ${tf} candles (${c.length}) for ${numFolds} folds`); process.exit(1); }
  printOne(sweepWalkForward(base, folds, trials, minTrades), folds, tf);
}
