import { CandleSchema, SignalSchema, StrategySpecSchema } from './types.js';

describe('CandleSchema', () => {
  it('accepts a valid candle', () => {
    expect(() =>
      CandleSchema.parse({ timestamp: 1, open: 1, high: 2, low: 0, close: 1, volume: 10 }),
    ).not.toThrow();
  });

  it('rejects a candle missing a required field', () => {
    expect(() =>
      CandleSchema.parse({ timestamp: 1, open: 1, high: 2, low: 0, volume: 10 }),
    ).toThrow();
  });
});

describe('SignalSchema', () => {
  it('rejects an invalid signal type', () => {
    expect(() => SignalSchema.parse({ type: 'HOLD', timestamp: 1, price: 100 })).toThrow();
  });

  it('accepts a signal without optional fields', () => {
    const s = SignalSchema.parse({ type: 'BUY', timestamp: 1, price: 100 });
    expect(s.reason).toBeUndefined();
  });
});

describe('StrategySpecSchema', () => {
  const minimal = {
    id: 'x',
    name: 'X',
    strategyType: 'condition',
    entry: { direction: 'BUY', conditions: ['close > 1'] },
  };

  it('fills in defaults for a minimal valid spec', () => {
    const spec = StrategySpecSchema.parse(minimal);
    expect(spec.version).toBe('1');
    expect(spec.assetClass).toBe('any');
    expect(spec.parsedBy).toBe('static');
    expect(spec.confidence).toBe(1);
    expect(typeof spec.createdAt).toBe('number');
  });

  it('rejects an invalid strategyType', () => {
    expect(() => StrategySpecSchema.parse({ ...minimal, strategyType: 'nonsense' })).toThrow();
  });

  it('rejects an entry missing direction', () => {
    expect(() =>
      StrategySpecSchema.parse({ ...minimal, entry: { conditions: ['x'] } }),
    ).toThrow();
  });
});
