import type { Candle, Signal, Trade, BacktestMetrics, BacktestResult } from '../core/types.js';

// ============================================================================
// Backtest engine — turn a strategy's Signal[] into an equity curve + metrics.
//
// Model: one position at a time. A signal at bar i's close takes effect for
// bar i+1's move (no look-ahead). BUY → long, SELL → short, CLOSE → flat; a
// BUY while short (or SELL while long) flips. A one-way cost in basis points
// is charged on every position change.
// ============================================================================

export interface BacktestOpts {
  costBps?: number;      // one-way cost (fees + slippage), default 5 → 10 bps round trip
  barsPerYear?: number;  // for annualising Sharpe; default inferred from candle spacing
}

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

function inferBarsPerYear(candles: Candle[]): number {
  if (candles.length < 3) return 252;
  const gaps: number[] = [];
  for (let i = 1; i < Math.min(candles.length, 200); i++) gaps.push(candles[i].timestamp - candles[i - 1].timestamp);
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)] || 3_600_000;
  return YEAR_MS / median;
}

export function runBacktest(signals: Signal[], candles: Candle[], opts: BacktestOpts = {}): BacktestResult {
  const n = candles.length;
  const cost = (opts.costBps ?? 5) / 10_000;
  const barsPerYear = opts.barsPerYear ?? inferBarsPerYear(candles);

  const sigAt = new Map<number, Signal>();
  for (const s of signals) sigAt.set(s.timestamp, s);

  // pos[i] = position held out of bar i (after acting on bar i's signal).
  const pos = new Array<number>(n).fill(0);
  const trades: Trade[] = [];
  let cur = 0;
  let entryPrice = 0;
  let entryTs = 0;

  const closeTrade = (exitPrice: number, exitTs: number) => {
    const dir = cur; // +1 / -1
    const gross = dir * (exitPrice / entryPrice - 1);
    const pnlPercent = (gross - 2 * cost) * 100;
    trades.push({
      entryTimestamp: entryTs, entryPrice,
      exitTimestamp: exitTs, exitPrice,
      type: dir > 0 ? 'LONG' : 'SHORT',
      pnl: pnlPercent, pnlPercent,
    });
  };

  for (let i = 0; i < n; i++) {
    const c = candles[i];
    const sig = sigAt.get(c.timestamp);
    if (sig) {
      if (sig.type === 'CLOSE' && cur !== 0) {
        closeTrade(c.close, c.timestamp);
        cur = 0;
      } else if (sig.type === 'BUY' && cur <= 0) {
        if (cur < 0) closeTrade(c.close, c.timestamp);
        cur = 1; entryPrice = c.close; entryTs = c.timestamp;
      } else if (sig.type === 'SELL' && cur >= 0) {
        if (cur > 0) closeTrade(c.close, c.timestamp);
        cur = -1; entryPrice = c.close; entryTs = c.timestamp;
      }
    }
    pos[i] = cur;
  }
  if (cur !== 0) closeTrade(candles[n - 1].close, candles[n - 1].timestamp);

  // Per-bar strategy return: position held INTO bar i is pos[i-1]; charge cost
  // whenever the position changed at bar i-1.
  const rets: number[] = [];
  for (let i = 1; i < n; i++) {
    const held = pos[i - 1];
    const mkt = candles[i].close / candles[i - 1].close - 1;
    const turnover = Math.abs(pos[i - 1] - (i >= 2 ? pos[i - 2] : 0));
    rets.push(held * mkt - turnover * cost);
  }

  return { trades, metrics: metricsFrom(rets, trades, barsPerYear) };
}

function metricsFrom(rets: number[], trades: Trade[], barsPerYear: number): BacktestMetrics {
  let equity = 1;
  let peak = 1;
  let maxDd = 0;
  for (const r of rets) {
    equity *= 1 + r;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, (peak - equity) / peak);
  }
  const totalReturn = (equity - 1) * 100;

  const mean = rets.reduce((s, r) => s + r, 0) / (rets.length || 1);
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length || 1);
  const sd = Math.sqrt(variance);
  const sharpe = sd > 0 ? (mean / sd) * Math.sqrt(barsPerYear) : 0;

  const wins = trades.filter(t => t.pnlPercent > 0).length;
  const avgPnl = trades.length ? trades.reduce((s, t) => s + t.pnlPercent, 0) / trades.length : 0;

  return {
    totalTrades: trades.length,
    winRate: trades.length ? wins / trades.length : 0,
    avgPnl,
    sharpeRatio: sharpe,
    maxDrawdown: maxDd * 100,
    totalReturn,
  };
}
