import fs from 'fs';
import path from 'path';
import { StrategySpecSchema, type Candle, type Signal, type StrategySpec } from '../core/types.js';
import { assemble } from '../assembly/assembler.js';
import { findCached } from '../data/fetcher.js';
import { runBacktest } from './engine.js';
import { pct, ipct, boxTable, mdTable } from './format.js';

// ============================================================================
//   yarn backtest <specId>         backtest one spec on cached BTC/USDT 1h
//   yarn backtest --all            table over every assemblable spec
//
// Data comes from the newest cached data/ohlcv/binance_BTCUSDT_1h_* file —
// run `yarn data:fetch BTC/USDT 1h <from> <to>` first.
// ============================================================================

const SPECS_DIR = 'strategies/specs/pending';
const SOURCE = process.env.BT_SOURCE ?? 'binance';
const SYMBOL = process.env.BT_SYMBOL ?? 'BTC/USDT';
const TF = process.env.BT_TF ?? '1h';
const BT_COST_BPS = Number(process.env.BT_COST_BPS) || 5;

// Extra markets tested once, daily-only, alongside the primary crypto run
// (same source-abstracted fetcher, just the 'yahoo' provider — see
// src/data/fetcher.ts). Add more here to extend coverage later, e.g. other
// FX crosses or indices; each reuses crypto's own window list rather than
// its own (longer) history, so results stay comparable across markets.
const EXTRA_MARKETS = [
  { source: 'yahoo', symbol: '^GSPC', label: 'S&P 500' },
  { source: 'yahoo', symbol: 'EURUSD=X', label: 'EUR/USD' },
];

function candlesOrDie(): Candle[] {
  const c = findCached(SOURCE, SYMBOL, TF);
  if (!c) {
    console.error(`no cached ${SOURCE} ${SYMBOL} ${TF} data — run: yarn data:fetch ${SYMBOL} ${TF} 2022-01-01 2025-01-01`);
    process.exit(1);
  }
  return c;
}

function loadSpec(file: string) {
  return StrategySpecSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')));
}

function one(specId: string, candles: Candle[]): void {
  const spec = loadSpec(path.join(SPECS_DIR, specId.endsWith('.json') ? specId : `${specId}.json`));
  const a = assemble(spec);
  console.log(`\n${spec.id}  [${spec.strategyType}]  ${spec.name}`);
  if ('unassemblable' in a) {
    console.log(`  ✗ unassemblable — ${a.reason}`);
    return;
  }
  const { trades, metrics: m } = runBacktest(a.run(candles), candles, { costBps: BT_COST_BPS });
  console.log(`  trades ${m.totalTrades}  win ${(m.winRate * 100).toFixed(0)}%  return ${pct(m.totalReturn)}  ` +
    `Sharpe ${m.sharpeRatio!.toFixed(2)}  maxDD ${m.maxDrawdown.toFixed(1)}%  avgTrade ${pct(m.avgPnl)}`);
  if (trades.length) {
    const last = trades[trades.length - 1];
    console.log(`  last trade: ${last.type} ${pct(last.pnlPercent)}`);
  }
}

const YEAR_MS = 365.25 * 24 * 3600 * 1000;
const RESULTS_DIR = 'strategies/results';

type Row = { id: string; name: string; ret: number; hold: number; sharpe: number; dd: number; trades: number; win: number };
type Built = { spec: StrategySpec; run: (c: Candle[]) => Signal[] };

// Assemble every spec once (reused across every window × timeframe).
function assembleAll(): { built: Built[]; hints: string[] } {
  const built: Built[] = [];
  const hints: string[] = [];
  for (const f of fs.readdirSync(SPECS_DIR).filter(f => f.endsWith('.json')).sort()) {
    const spec = loadSpec(path.join(SPECS_DIR, f));
    if (spec.timeframe) hints.push(`${spec.name} → ${spec.timeframe}`);
    const a = assemble(spec);
    if (!('unassemblable' in a)) built.push({ spec, run: a.run });
  }
  return { built, hints };
}

function rankOn(built: Built[], candles: Candle[]): Row[] {
  return built
    .map(b => {
      const m = runBacktest(b.run(candles), candles, { costBps: BT_COST_BPS }).metrics;
      return {
        id: b.spec.id, name: b.spec.name,
        ret: m.totalReturn, hold: m.buyHoldReturn ?? 0,
        sharpe: m.sharpeRatio ?? 0, dd: m.maxDrawdown, trades: m.totalTrades, win: m.winRate,
      };
    })
    .sort((x, y) => y.ret - x.ret);
}

const COLS = ['#', 'strategy', 'return', 'vs hold', 'Sharpe', 'maxDD', 'trades'] as const;

function cells(rows: Row[]): string[][] {
  return rows.map((r, i) => [
    String(i + 1), r.name,
    pct(r.ret), pct(r.ret - r.hold),
    r.sharpe.toFixed(2), `${r.dd.toFixed(1)}%`, String(r.trades),
  ]);
}

// Strategy name clipped to a fixed width so the box table never wraps.
const NAME_W = 26;
const clip = (s: string) => (s.length <= NAME_W ? s : s.slice(0, NAME_W - 1) + '…');

function boxCells(rows: Row[]): string[][] {
  const dash = '—';
  return rows.map((r, i) => [
    String(i + 1),
    clip(r.name),
    r.trades === 0 ? dash : ipct(r.ret),
    r.trades === 0 ? dash : ipct(r.ret - r.hold),
    r.trades === 0 ? dash : r.sharpe.toFixed(2).replace('-', '−'),
    r.trades === 0 ? dash : `${Math.round(r.dd)}%`,
    String(r.trades),
  ]);
}

const LEGEND = [
  `return  = strategy's total % gain/loss over the window`,
  `vs hold = that return minus buy-and-hold BTC over the same bars  (positive = beat just holding)`,
  `Sharpe  = mean bar-return / its std-dev, annualised  (>1 good · ~0 flat · <0 losing)`,
  `maxDD   = largest peak-to-trough drop in account value over the window  (lower = smoother)`,
  `trades  = round-trip positions; "—" = the strategy assembled but never met a condition`,
];

// Renders one (window, timeframe, candles) table to console + the two report buffers.
function renderWindow(
  years: number, tf: string, candles: Candle[], built: Built[],
  sections: string[], report: string[],
): void {
  const cutoff = candles[candles.length - 1].timestamp - years * YEAR_MS;
  const slice = candles.filter(x => x.timestamp >= cutoff);
  const rows = rankOn(built, slice);
  const head = `${tf}  ·  ${slice.length} bars  ·  buy & hold ${pct(rows[0]?.hold ?? 0)}`;
  const table = boxTable([...COLS], boxCells(rows));
  console.log(`\n${head}\n${table}`);
  sections.push(``, `### ${head}`, ``, mdTable([...COLS], cells(rows)));
  report.push(``, head, table);
}

function all(): void {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const tfList = (process.env.BT_TFS ?? '1h,4h,1d').split(',').map(s => s.trim()).filter(Boolean);
  const byTf = new Map<string, Candle[]>();
  for (const tf of tfList) {
    const c = findCached(SOURCE, SYMBOL, tf);
    if (c && c.length) byTf.set(tf, c);
    else console.warn(`[backtest] no cached ${SYMBOL} ${tf} — skipping (yarn data:fetch ${SYMBOL} ${tf} 2017-01-01 2025-09-01)`);
  }
  if (byTf.size === 0) { console.error('no cached data for any timeframe'); process.exit(1); }
  const tfs = [...byTf.keys()];

  const { built, hints } = assembleAll();
  const primary = byTf.get(tfs[0])!;
  const fullYears = (primary[primary.length - 1].timestamp - primary[0].timestamp) / YEAR_MS;
  const windows = [3, 5, Math.round(fullYears)].filter((y, i, a) => a.indexOf(y) === i).filter(y => y <= fullYears + 0.1);

  const date = new Date().toISOString().slice(0, 10);
  const sections: string[] = [
    `# Backtest ranking`, ``,
    `${SYMBOL} · ${date} · ${BT_COST_BPS} bps/side cost · ${built.length} assemblable strategies`, ``,
    '```', ...LEGEND, '```', ``,
    `Grouped by window (3 / 5 / 8 years), then timeframe. Each strategy is run on every timeframe — most scripts don't declare one. Sorted by total return.`,
  ];
  const report: string[] = [
    `Backtest report — ${SYMBOL} · ${date} · ${BT_COST_BPS} bps/side cost`, ``,
    ...LEGEND, ``,
    `Grouped by window, then timeframe. Each strategy run on every timeframe.`,
  ];
  console.log(`\n${LEGEND.join('\n')}`);

  for (const years of windows) {
    console.log(`\n══ ${years} YEARS ══`);
    sections.push(``, `## ${years} years`);
    report.push(``, `══ ${years} YEARS ══`);
    for (const tf of tfs) {
      renderWindow(years, tf, byTf.get(tf)!, built, sections, report);
    }
  }

  // Extra markets: daily-only, reusing crypto's own window list (not their
  // own — much longer — history) so results stay comparable across markets.
  for (const market of EXTRA_MARKETS) {
    const c = findCached(market.source, market.symbol, '1d');
    if (!c || !c.length) {
      console.warn(`[backtest] no cached ${market.source} ${market.symbol} 1d — skipping (yarn data:fetch '${market.symbol}' 1d <from> <to> ${market.source})`);
      continue;
    }
    const marketFullYears = (c[c.length - 1].timestamp - c[0].timestamp) / YEAR_MS;
    const marketWindows = windows.filter(y => y <= marketFullYears + 0.1);
    console.log(`\n════ ${market.label} (daily) ════`);
    sections.push(``, `## ${market.label} (daily)`);
    report.push(``, `════ ${market.label} (daily) ════`);
    for (const years of marketWindows) {
      renderWindow(years, `${years}y`, c, built, sections, report);
    }
  }

  if (hints.length) {
    const lines = ['Declared timeframe (from the script itself):', ...hints.map(h => `  ${h}`)];
    console.log(`\n${lines.join('\n')}`);
    sections.push(``, `## Declared timeframe`, ``, ...hints.map(h => `- ${h}`));
    report.push(``, ...lines);
  }

  // Per-strategy detail from the longest window on the primary timeframe.
  const longest = windows[windows.length - 1];
  const pc = primary.filter(x => x.timestamp >= primary[primary.length - 1].timestamp - longest * YEAR_MS);
  for (const b of built) {
    const result = runBacktest(b.run(pc), pc, { costBps: BT_COST_BPS });
    fs.writeFileSync(path.join(RESULTS_DIR, `${b.spec.id}.json`), JSON.stringify({
      specId: b.spec.id, name: b.spec.name, market: `${SYMBOL} ${tfs[0]}`, window: `${longest}y`,
      bars: pc.length, runAt: new Date().toISOString(), ...result,
    }, null, 2));
  }

  fs.writeFileSync(path.join(RESULTS_DIR, 'RANKING.md'), sections.join('\n') + '\n');
  fs.mkdirSync('reports', { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '');
  const reportFile = `reports/backtest_${windows.join('-')}y_${tfs.join('')}_${stamp}.txt`;
  fs.writeFileSync(reportFile, report.join('\n') + '\n');
  console.log(`\nwrote ${RESULTS_DIR}/RANKING.md and ${reportFile}`);
}

const args = process.argv.slice(2);
if (args.includes('--all')) all();
else if (args[0]) one(args[0], candlesOrDie());
else { console.error('usage: yarn backtest <specId> | --all'); process.exit(1); }
