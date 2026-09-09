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

function all(candles: Candle[]): void {
  const RESULTS_DIR = 'strategies/results';
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const spanYears = (candles[candles.length - 1].timestamp - candles[0].timestamp) / (365.25 * 24 * 3600 * 1000);
  const market = `${SYMBOL} ${TF}`;
  type Row = { id: string; name: string; ret: number; hold: number; sharpe: number; dd: number; trades: number; win: number };
  const rows: Row[] = [];

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
    // Per-strategy detail (regenerable; gitignored).
    fs.writeFileSync(path.join(RESULTS_DIR, `${spec.id}.json`), JSON.stringify({
      specId: spec.id, name: spec.name, market, bars: candles.length,
      runAt: new Date().toISOString(), ...result,
    }, null, 2));
  }

  rows.sort((x, y) => y.ret - x.ret); // best return → worst

  // Console
  console.log(`\n${'strategy'.padEnd(44)} ${'return'.padStart(9)} ${'vs hold'.padStart(9)} ${'Sharpe'.padStart(7)} ${'maxDD'.padStart(7)} ${'trades'.padStart(7)}`);
  for (const r of rows) {
    console.log(`${r.id.slice(0, 44).padEnd(44)} ${pct(r.ret).padStart(9)} ${pct(r.ret - r.hold).padStart(9)} ${r.sharpe.toFixed(2).padStart(7)} ${r.dd.toFixed(1).padStart(6)}% ${String(r.trades).padStart(7)}`);
  }
  console.log(`\n${rows.length} assemblable · ${candles.length} bars (${spanYears.toFixed(1)}y) ${market} · buy & hold ${pct(rows[0]?.hold ?? 0)}`);

  // Committed leaderboard
  const md = [
    `# Backtest ranking`,
    ``,
    `${market} · ${candles.length} bars (${spanYears.toFixed(1)}y) · ${new Date().toISOString().slice(0, 10)} · buy & hold **${pct(rows[0]?.hold ?? 0)}** · ${(BT_COST_BPS)} bps/side cost`,
    ``,
    `Sorted by total return. "vs hold" = strategy return minus buy-and-hold over the same bars.`,
    ``,
    `| # | strategy | return | vs hold | Sharpe | maxDD | win% | trades |`,
    `|--:|----------|-------:|--------:|-------:|------:|-----:|-------:|`,
    ...rows.map((r, i) =>
      `| ${i + 1} | ${r.name} | ${pct(r.ret)} | ${pct(r.ret - r.hold)} | ${r.sharpe.toFixed(2)} | ${r.dd.toFixed(1)}% | ${(r.win * 100).toFixed(0)}% | ${r.trades} |`),
    ``,
  ].join('\n');
  fs.writeFileSync(path.join(RESULTS_DIR, 'RANKING.md'), md);
  console.log(`\nwrote ${RESULTS_DIR}/RANKING.md + ${rows.length} result files`);
}

const args = process.argv.slice(2);
const candles = candlesOrDie();
if (args.includes('--all')) all(candles);
else if (args[0]) one(args[0], candles);
else { console.error('usage: yarn backtest <specId> | --all'); process.exit(1); }
