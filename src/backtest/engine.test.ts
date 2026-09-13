import { runBacktest } from './engine.js';
import type { Candle, Signal } from '../core/types.js';

function candle(i: number, close: number): Candle {
  return { timestamp: i, open: close, high: close, low: close, close, volume: 1 };
}

describe('runBacktest', () => {
  it('computes buy-and-hold return over the full range with no signals', () => {
    const candles = [candle(0, 100), candle(1, 110), candle(2, 121)];
    const result = runBacktest([], candles, { costBps: 0 });
    expect(result.trades).toHaveLength(0);
    expect(result.metrics.totalTrades).toBe(0);
    expect(result.metrics.buyHoldReturn).toBeCloseTo(21, 5);
  });

  it('opens a long on BUY and closes on CLOSE, at zero cost', () => {
    const candles = [candle(0, 100), candle(1, 110), candle(2, 120), candle(3, 130)];
    const signals: Signal[] = [
      { type: 'BUY', timestamp: 0, price: 100 },
      { type: 'CLOSE', timestamp: 2, price: 120 },
    ];
    const result = runBacktest(signals, candles, { costBps: 0 });
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({ type: 'LONG', entryPrice: 100, exitPrice: 120 });
    expect(result.trades[0].pnlPercent).toBeCloseTo(20, 5);
  });

  it('flips a long to short on an opposite signal (stop-and-reverse)', () => {
    const candles = [candle(0, 100), candle(1, 110), candle(2, 100), candle(3, 90)];
    const signals: Signal[] = [
      { type: 'BUY', timestamp: 0, price: 100 },
      { type: 'SELL', timestamp: 1, price: 110 },
    ];
    const result = runBacktest(signals, candles, { costBps: 0 });
    expect(result.trades).toHaveLength(2);
    expect(result.trades[0]).toMatchObject({ type: 'LONG', entryPrice: 100, exitPrice: 110 });
    expect(result.trades[1]).toMatchObject({ type: 'SHORT', entryPrice: 110, exitPrice: 90 });
  });

  it('ignores a same-direction signal while already in that position', () => {
    const candles = [candle(0, 100), candle(1, 110), candle(2, 120)];
    const signals: Signal[] = [
      { type: 'BUY', timestamp: 0, price: 100 },
      { type: 'BUY', timestamp: 1, price: 110 },
    ];
    const result = runBacktest(signals, candles, { costBps: 0 });
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].entryPrice).toBe(100);
  });

  it('closes any still-open position at the final bar', () => {
    const candles = [candle(0, 100), candle(1, 110)];
    const signals: Signal[] = [{ type: 'BUY', timestamp: 0, price: 100 }];
    const result = runBacktest(signals, candles, { costBps: 0 });
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].exitPrice).toBe(110);
  });

  it('charges round-trip cost in bps on entry and exit', () => {
    const candles = [candle(0, 100), candle(1, 100)];
    const signals: Signal[] = [
      { type: 'BUY', timestamp: 0, price: 100 },
      { type: 'CLOSE', timestamp: 1, price: 100 },
    ];
    const result = runBacktest(signals, candles, { costBps: 100 }); // 1% one-way
    expect(result.trades[0].pnlPercent).toBeCloseTo(-2, 5);
  });

  it('reports zero trades/drawdown on an all-flat run', () => {
    const candles = [candle(0, 100), candle(1, 105)];
    const result = runBacktest([], candles);
    expect(result.metrics.totalTrades).toBe(0);
    expect(result.metrics.winRate).toBe(0);
    expect(result.metrics.maxDrawdown).toBe(0);
  });
});
