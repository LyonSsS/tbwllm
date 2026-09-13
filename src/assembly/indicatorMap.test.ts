import { computeIndicator, isKnownIndicator } from './indicatorMap.js';
import type { Candle } from '../core/types.js';

function candles(closes: number[]): Candle[] {
  return closes.map((c, i) => ({ timestamp: i, open: c, high: c + 1, low: c - 1, close: c, volume: 100 }));
}

describe('isKnownIndicator', () => {
  it('matches case-insensitively', () => {
    expect(isKnownIndicator('rsi')).toBe(true);
    expect(isKnownIndicator('RSI')).toBe(true);
  });

  it('rejects an unknown type', () => {
    expect(isKnownIndicator('not-a-thing')).toBe(false);
  });
});

describe('computeIndicator', () => {
  const cs = candles(Array.from({ length: 30 }, (_, i) => 100 + i));

  it('returns a series aligned to candle length, NaN during warm-up then real values', () => {
    const rsi = computeIndicator('RSI', cs, { period: 14 }) as number[];
    expect(rsi).toHaveLength(cs.length);
    expect(Number.isNaN(rsi[0])).toBe(true);
    expect(Number.isNaN(rsi[rsi.length - 1])).toBe(false);
  });

  it('computes over a supplied source series instead of candle close', () => {
    const source = cs.map(c => c.close * 2);
    const emaOnSource = computeIndicator('EMA', cs, { period: 5 }, source) as number[];
    const emaOnClose = computeIndicator('EMA', cs, { period: 5 }) as number[];
    expect(emaOnSource[emaOnSource.length - 1]).toBeCloseTo(emaOnClose[emaOnClose.length - 1] * 2, 5);
  });

  it('returns the expected named lines for multi-output indicators', () => {
    const bb = computeIndicator('BB', cs, { period: 10, stdDev: 2 }) as Record<string, number[]>;
    expect(Object.keys(bb).sort()).toEqual(['lower', 'middle', 'upper']);
    expect(bb.upper).toHaveLength(cs.length);

    const macd = computeIndicator('MACD', cs, {}) as Record<string, number[]>;
    expect(Object.keys(macd).sort()).toEqual(['histogram', 'macd', 'signal']);

    const stoch = computeIndicator('STOCH', cs, {}) as Record<string, number[]>;
    expect(Object.keys(stoch).sort()).toEqual(['stochD', 'stochJ', 'stochK']);
  });

  it('throws for an unknown indicator type', () => {
    expect(() => computeIndicator('NOT_REAL', cs, {})).toThrow(/no entry/);
  });
});
