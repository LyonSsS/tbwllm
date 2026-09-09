import fs from 'fs';
import path from 'path';
import { StrategySpecSchema, type Candle } from '../core/types.js';
import { assemble } from '../assembly/assembler.js';
import { findCached } from '../data/fetcher.js';
import { runBacktest } from './engine.js';

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

const pct = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}%`;

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

// Run every assemblable spec over a candle set, best return first.
function rankOver(candles: Candle[], writeDetail: boolean): Row[] {
  const rows: Row[] = [];
  const market = `${SYMBOL} ${TF}`;
  for (const f of fs.readdirSync(SPECS_DIR).filter(f => f.endsWith('.json')).sort()) {
    const spec = loadSpec(path.join(SPECS_DIR, f));
    const a = assemble(spec);
    if ('unassemblable' in a) continue;
    const result = runBacktest(a.run(candles), candles, { costBps: BT_COST_BPS });
    const m = result.metrics;
    rows.push({
      id: spec.id, name: spec.name,
      ret: m.totalReturn, hold: m.buyHoldReturn ?? 0,
      sharpe: m.sharpeRatio ?? 0, dd: m.maxDrawdown, trades: m.totalTrades, win: m.winRate,
    });
    if (writeDetail) {
      fs.writeFileSync(path.join(RESULTS_DIR, `${spec.id}.json`), JSON.stringify({
        specId: spec.id, name: spec.name, market, bars: candles.length,
        runAt: new Date().toISOString(), ...result,
      }, null, 2));
    }
  }
  return rows.sort((x, y) => y.ret - x.ret);
}

const COLS = ['#', 'strategy', 'return', 'vs hold', 'Sharpe', 'maxDD', 'trades'] as const;

function cells(rows: Row[]): string[][] {
  return rows.map((r, i) => [
    String(i + 1), r.name,
    pct(r.ret), pct(r.ret - r.hold),
    r.sharpe.toFixed(2), `${r.dd.toFixed(1)}%`, String(r.trades),
  ]);
}

function mdTable(rows: Row[]): string {
  return [
    `| ${COLS.join(' | ')} |`,
    `|--:|----------|-------:|--------:|-------:|------:|-------:|`,
    ...cells(rows).map(c => `| ${c.join(' | ')} |`),
  ].join('\n');
}

// Bordered console table: centered headers, a rule between every data row,
// strategy left-aligned, everything else right-aligned, integer percents.
function boxTable(rows: Row[]): string {
  const ipct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(Math.round(x))}%`;
  const num = (x: number) => x.toFixed(2).replace('-', '−');
  const body = rows.map((r, i) => [
    String(i + 1),
    r.name.slice(0, 40),
    ipct(r.ret),
    ipct(r.ret - r.hold),
    num(r.sharpe),
    `${Math.round(r.dd)}%`,
    String(r.trades),
  ]);
  const headers = [...COLS];
  const w = headers.map((h, i) => Math.max(h.length, ...body.map(r => r[i].length)));

  const center = (s: string, width: number) => {
    const left = Math.floor((width - s.length) / 2);
    return ' '.repeat(left) + s + ' '.repeat(width - s.length - left);
  };
  const rule = (l: string, m: string, rt: string) => l + w.map(x => '─'.repeat(x + 2)).join(m) + rt;
  const headLine = '│ ' + headers.map((h, i) => center(h, w[i])).join(' │ ') + ' │';
  const dataLine = (c: string[]) => '│ ' + c.map((v, i) => (i === 1 ? v.padEnd(w[i]) : v.padStart(w[i]))).join(' │ ') + ' │';

  const out = [rule('┌', '┬', '┐'), headLine, rule('├', '┼', '┤')];
  body.forEach((c, i) => {
    out.push(dataLine(c));
    out.push(i < body.length - 1 ? rule('├', '┼', '┤') : rule('└', '┴', '┘'));
  });
  return out.join('\n');
}

function all(candles: Candle[]): void {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const lastTs = candles[candles.length - 1].timestamp;
  const fullYears = (lastTs - candles[0].timestamp) / YEAR_MS;

  // Windows: trailing 3y / 5y / full — all slices of the one cached series.
  const windows = [3, 5, Math.round(fullYears)]
    .filter((y, i, a) => a.indexOf(y) === i)
    .filter(y => y <= fullYears + 0.1)
    .map(y => ({ years: y, candles: candles.filter(c => c.timestamp >= lastTs - y * YEAR_MS) }));

  const sections: string[] = [
    `# Backtest ranking`,
    ``,
    `${SYMBOL} ${TF} · ${new Date().toISOString().slice(0, 10)} · ${BT_COST_BPS} bps/side cost · data ${new Date(candles[0].timestamp).toISOString().slice(0, 10)} → ${new Date(lastTs).toISOString().slice(0, 10)}`,
    ``,
    `Each table is the same strategies over a different trailing window. Sorted by total return; "vs hold" = strategy return minus buy-and-hold over those bars.`,
    ``,
    `**Read across the windows, not down one.** A strategy whose rank/return swings wildly between the 3y, 5y and 8y tables is fragile — its result is a few outsized trades and warm-up luck, not an edge. Consistency across windows (and the sweep's "% of trials profitable") is the signal.`,
  ];

  for (const w of windows) {
    const rows = rankOver(w.candles, w.years === windows[windows.length - 1].years); // detail JSON from the longest window
    const hold = rows[0]?.hold ?? 0;
    const heading = `${w.years} years  ·  ${w.candles.length} bars  ·  buy & hold ${pct(hold)}`;
    sections.push(``, `## ${heading}`, ``, mdTable(rows));
    console.log(`\n${heading}`);
    console.log(boxTable(rows));
  }

  fs.writeFileSync(path.join(RESULTS_DIR, 'RANKING.md'), sections.join('\n') + '\n');
  console.log(`\nwrote ${RESULTS_DIR}/RANKING.md (${windows.length} windows)`);
}

const args = process.argv.slice(2);
const candles = candlesOrDie();
if (args.includes('--all')) all(candles);
else if (args[0]) one(args[0], candles);
else { console.error('usage: yarn backtest <specId> | --all'); process.exit(1); }
