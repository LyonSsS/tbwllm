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
  const { trades, metrics: m } = runBacktest(a.run(candles), candles);
  console.log(`  trades ${m.totalTrades}  win ${(m.winRate * 100).toFixed(0)}%  return ${pct(m.totalReturn)}  ` +
    `Sharpe ${m.sharpeRatio!.toFixed(2)}  maxDD ${m.maxDrawdown.toFixed(1)}%  avgTrade ${pct(m.avgPnl)}`);
  if (trades.length) {
    const last = trades[trades.length - 1];
    console.log(`  last trade: ${last.type} ${pct(last.pnlPercent)}`);
  }
}

function all(candles: Candle[]): void {
  const rows: Array<{ id: string; ret: number; sharpe: number; dd: number; trades: number }> = [];
  for (const f of fs.readdirSync(SPECS_DIR).filter(f => f.endsWith('.json')).sort()) {
    const spec = loadSpec(path.join(SPECS_DIR, f));
    const a = assemble(spec);
    if ('unassemblable' in a) continue;
    const { metrics: m } = runBacktest(a.run(candles), candles);
    rows.push({ id: spec.id, ret: m.totalReturn, sharpe: m.sharpeRatio ?? 0, dd: m.maxDrawdown, trades: m.totalTrades });
  }
  rows.sort((x, y) => y.sharpe - x.sharpe);
  console.log(`\n${'strategy'.padEnd(46)} ${'return'.padStart(9)} ${'Sharpe'.padStart(7)} ${'maxDD'.padStart(7)} ${'trades'.padStart(7)}`);
  for (const r of rows) {
    console.log(`${r.id.slice(0, 46).padEnd(46)} ${pct(r.ret).padStart(9)} ${r.sharpe.toFixed(2).padStart(7)} ${r.dd.toFixed(1).padStart(6)}% ${String(r.trades).padStart(7)}`);
  }
  const spanYears = (candles[candles.length - 1].timestamp - candles[0].timestamp) / (365.25 * 24 * 3600 * 1000);
  console.log(`\n${rows.length} assemblable · ${candles.length} bars (${spanYears.toFixed(1)}y) ${SYMBOL} ${TF}`);
}

const args = process.argv.slice(2);
const candles = candlesOrDie();
if (args.includes('--all')) all(candles);
else if (args[0]) one(args[0], candles);
else { console.error('usage: yarn backtest <specId> | --all'); process.exit(1); }
