import fs from 'fs';
import path from 'path';
import { StrategySpecSchema, type Candle, type StrategySpec, type BacktestMetrics } from '../core/types.js';
import { assemble } from '../assembly/assembler.js';
import { findCached } from '../data/fetcher.js';
import { runBacktest } from './engine.js';

// ============================================================================
//   yarn sweep <specId> [--trials 300] [--min-trades 5] [--tf 1h]
//   yarn sweep --all    [--trials 200] [--min-trades 5] [--tf 1h,4h,1d]
//
// Random-searches a spec's numeric parameters, scoring every candidate on a
// chronological train/test split: the first 2/3 of history tunes the config,
// the last 1/3 — never seen during the search — judges it. A parameter set
// that only shines in-sample is overfitting; the search reports the best-by-
// train config together with how it did on the unseen test slice, so a real
// edge (holds out-of-sample) is distinguishable from a curve-fit.
// ============================================================================

const SPECS_DIR = 'strategies/specs/pending';
const RESULTS_DIR = 'strategies/results';
const SOURCE = process.env.BT_SOURCE ?? 'binance';
const SYMBOL = process.env.BT_SYMBOL ?? 'BTC/USDT';
const TRAIN_FRAC = 2 / 3;

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
const pct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}%`;

function splitCandles(c: Candle[]): Split | null {
  const i = Math.floor(c.length * TRAIN_FRAC);
  const train = c.slice(0, i);
  const test = c.slice(i);
  if (train.length === 0 || test.length === 0) return null;
  return {
    train: { candles: train, from: day(train[0].timestamp), to: day(train[train.length - 1].timestamp) },
    test: { candles: test, from: day(test[0].timestamp), to: day(test[test.length - 1].timestamp) },
  };
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

const LEGEND = [
  `tr = train slice (first ${Math.round(TRAIN_FRAC * 100)}%, tuned on) · te = test slice (last ${100 - Math.round(TRAIN_FRAC * 100)}%, unseen during search)`,
  `holds    = best-by-train config keeps Sharpe > 1 and a positive return on the test slice`,
  `marginal = test Sharpe 0.5–1`,
  `overfit  = strong on train (Sharpe > 1) but test Sharpe < 0.5`,
  `weak     = no sampled config even reached train Sharpe > 1`,
  `thin     = would hold but too few test trades to trust`,
  `no signal= nothing met the min-trades bar on train`,
];

// ── single-spec detailed output ────────────────────────────────────────────

function fmt(m: BacktestMetrics | null): string {
  if (!m) return '(no signals)';
  return `Sharpe ${shp(m).toFixed(2).padStart(6)}  return ${pct(m.totalReturn).padStart(9)}  maxDD ${Math.round(m.maxDrawdown)
    .toString().padStart(3)}%  trades ${m.totalTrades}`;
}

function printOne(r: SweepResult, split: Split, tf: string, minTrades: number): void {
  console.log(`\n${r.id}`);
  console.log(`  ${r.swept.length} sweepable param(s) on ${tf}: ${r.swept.join(', ') || '(none)'}`);
  console.log(`  train ${split.train.candles.length} bars ${split.train.from}→${split.train.to}  ·  test ${split.test.candles.length} bars ${split.test.from}→${split.test.to}`);

  console.log(`\n  baseline (author defaults)`);
  console.log(`    train  ${fmt(r.baseTrain)}`);
  console.log(`    test   ${fmt(r.baseTest)}`);

  if (r.swept.length === 0) { console.log('\n  no sweepable numeric parameters — nothing to search'); return; }

  console.log(`\n  ${r.trials} trials · ${r.validN} valid on train · ${r.trainGoodN} with train Sharpe > 1 · ${r.heldUpN} of those held test Sharpe > 1`);

  if (r.best) {
    console.log(`\n  best (picked by train Sharpe)`);
    console.log(`    train  ${fmt(r.best.train)}`);
    console.log(`    test   ${fmt(r.best.test)}`);
    console.log(`    at     ${JSON.stringify(r.best.params)}`);
  } else {
    console.log('\n  nothing cleared the min-trades bar on train');
  }

  if (r.oracle && r.oracle !== r.best) {
    console.log(`\n  best possible on test (hindsight — an upper bound, not an achievable result)`);
    console.log(`    test   ${fmt(r.oracle.test)}`);
    console.log(`    at     ${JSON.stringify(r.oracle.params)}`);
  }

  console.log(`\n  verdict: ${verdict(r, minTrades).toUpperCase()}`);
  console.log('');
  for (const l of LEGEND) console.log(`  ${l}`);
}

// ── --all summary table ────────────────────────────────────────────────────

const HEADERS = ['#', 'strategy', 'tf', 'tr Shrp', 'te Shrp', 'tr ret', 'te ret', 'te maxDD', 'te trd', 'verdict'];
const NAME_W = 30;
const clip = (s: string) => (s.length <= NAME_W ? s : s.slice(0, NAME_W - 1) + '…');
const sh = (m?: BacktestMetrics | null) => (m ? shp(m).toFixed(2).replace('-', '−') : '—');
const rt = (m?: BacktestMetrics | null) => (m ? pct(m.totalReturn) : '—');
const VLABEL: Record<Verdict, string> = {
  holds: 'holds', marginal: 'marginal', overfit: 'overfit', weak: 'weak', thin: 'thin', 'no-signal': 'no signal',
};

function tableRows(rows: { r: SweepResult; tf: string }[], minTrades: number): string[][] {
  return rows.map((x, i) => {
    const b = x.r.best;
    return [
      String(i + 1),
      clip(x.r.id),
      x.tf,
      b ? sh(b.train) : '—',
      b ? sh(b.test) : '—',
      b ? rt(b.train) : '—',
      b ? rt(b.test) : '—',
      b?.test ? `${Math.round(b.test.maxDrawdown)}%` : '—',
      b?.test ? String(b.test.totalTrades) : '—',
      VLABEL[verdict(x.r, minTrades)],
    ];
  });
}

function boxTable(headers: string[], rows: string[][]): string {
  const w = headers.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
  const center = (s: string, width: number) => {
    const l = Math.floor((width - s.length) / 2);
    return ' '.repeat(l) + s + ' '.repeat(width - s.length - l);
  };
  const rule = (l: string, m: string, rgt: string) => l + w.map(x => '─'.repeat(x + 2)).join(m) + rgt;
  const head = '│ ' + headers.map((h, i) => center(h, w[i])).join(' │ ') + ' │';
  const line = (c: string[]) => '│ ' + c.map((v, i) => (i === 1 ? v.padEnd(w[i]) : v.padStart(w[i]))).join(' │ ') + ' │';
  const out = [rule('┌', '┬', '┐'), head, rule('├', '┼', '┤')];
  rows.forEach(r => { out.push(line(r)); out.push(rule('├', '┼', '┤')); });
  out[out.length - 1] = rule('└', '┴', '┘');
  return out.join('\n');
}

function mdTable(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.join(' | ')} |`,
    `|${headers.map(() => '---').join('|')}|`,
    ...rows.map(r => `| ${r.join(' | ')} |`),
  ].join('\n');
}

function writeSweepMd(rows: { r: SweepResult; tf: string }[], trials: number, minTrades: number): string {
  const trainPct = Math.round(TRAIN_FRAC * 100);
  const md = [
    `# Parameter sweep — out-of-sample`,
    ``,
    `_Generated ${new Date().toISOString()}_`,
    ``,
    `${SYMBOL} · ${trials} trials per (spec × timeframe) · min ${minTrades} train trades · split train ${trainPct}% / test ${100 - trainPct}% (chronological).`,
    `The best config is picked by **train** Sharpe; the **test** columns are that same config on the held-out last third.`,
    ``,
    mdTable(HEADERS, tableRows(rows, minTrades)),
    ``,
    `## Legend`,
    ``,
    ...LEGEND.map(l => `- ${l}`),
    ``,
    `## Best-by-train parameters`,
    ``,
    ...rows.filter(x => x.r.best).map(x => `- \`${x.r.id}\` @ ${x.tf} — \`${JSON.stringify(x.r.best!.params)}\``),
    ``,
  ].join('\n');
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const out = path.join(RESULTS_DIR, 'SWEEP.md');
  fs.writeFileSync(out, md);
  return out;
}

// ── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const VALUE_FLAGS = ['--trials', '--min-trades', '--tf'];
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const positional = args.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1]));
const isAll = args.includes('--all');
const trials = Number(flag('--trials')) || (isAll ? 200 : 300);
const minTrades = Number(flag('--min-trades')) || 5;
const tfArg = flag('--tf');

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

  const rows: { r: SweepResult; tf: string }[] = [];
  for (const tf of tfList) {
    const c = candlesFor(tf);
    if (!c || !c.length) { console.warn(`no cached ${SYMBOL} ${tf} — skipping (yarn data:fetch ${SYMBOL} ${tf} 2017-01-01 2025-09-01)`); continue; }
    const split = splitCandles(c);
    if (!split) { console.warn(`too few cached ${SYMBOL} ${tf} candles (${c.length}) to split train/test — skipping`); continue; }
    for (const base of assemblable) {
      process.stderr.write(`  sweeping ${base.id} @ ${tf}[K\r`);
      rows.push({ r: sweepSpec(base, split, trials, minTrades), tf });
    }
  }
  process.stderr.write('[K');
  if (rows.length === 0) { console.error('no cached data for any requested timeframe'); process.exit(1); }

  const rank = (x: { r: SweepResult }) => (x.r.best?.test ? shp(x.r.best.test) : -99);
  rows.sort((a, b) => rank(b) - rank(a));

  console.log(`\n${SYMBOL} · ${trials} trials/spec · min ${minTrades} train trades · train ${Math.round(TRAIN_FRAC * 100)}% / test ${100 - Math.round(TRAIN_FRAC * 100)}%\n`);
  console.log(boxTable(HEADERS, tableRows(rows, minTrades)));
  console.log('');
  for (const l of LEGEND) console.log(`  ${l}`);
  const out = writeSweepMd(rows, trials, minTrades);
  console.log(`\nwrote ${out}`);
} else {
  const specId = positional[0];
  if (!specId) {
    console.error('usage: yarn sweep <specId> [--trials N] [--min-trades N] [--tf TF]   |   yarn sweep --all [--tf 1h,4h,1d]');
    process.exit(1);
  }
  const tf = tfArg ?? process.env.BT_TF ?? '1h';
  const c = candlesFor(tf);
  if (!c || !c.length) { console.error(`no cached ${SOURCE} ${SYMBOL} ${tf} — run yarn data:fetch first`); process.exit(1); }
  const base = loadSpec(path.join(SPECS_DIR, specId.endsWith('.json') ? specId : `${specId}.json`));
  if ('unassemblable' in assemble(base)) { console.error(`${base.id} is not assemblable — nothing to sweep`); process.exit(1); }
  const split = splitCandles(c);
  if (!split) { console.error(`too few cached ${SYMBOL} ${tf} candles (${c.length}) to split train/test`); process.exit(1); }
  printOne(sweepSpec(base, split, trials, minTrades), split, tf, minTrades);
}
