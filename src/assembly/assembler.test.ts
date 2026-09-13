import { assemble } from './assembler.js';
import type { StrategySpec, Candle, Entry } from '../core/types.js';

function baseSpec(entry: Entry, overrides: Partial<StrategySpec> = {}): StrategySpec {
  return {
    id: 'test-spec',
    name: 'Test',
    version: '1',
    strategyType: 'condition',
    assetClass: 'any',
    entry,
    parsedBy: 'static',
    confidence: 1,
    createdAt: 0,
    ...overrides,
  };
}

function candle(i: number, close: number): Candle {
  return { timestamp: i, open: close, high: close, low: close, close, volume: 1 };
}

describe('assemble', () => {
  it('is unassemblable with no entry conditions or trigger', () => {
    const result = assemble(baseSpec({ direction: 'BUY' }));
    expect('unassemblable' in result).toBe(true);
    if ('unassemblable' in result) expect(result.reason).toMatch(/no entry conditions/);
  });

  it('is unassemblable on an unresolved identifier', () => {
    const result = assemble(baseSpec({ direction: 'BUY', conditions: ['foo > 1'] }));
    expect('unassemblable' in result).toBe(true);
    if ('unassemblable' in result) expect(result.missing).toContain('foo');
  });

  it('is unassemblable on a string comparison', () => {
    const result = assemble(baseSpec({ direction: 'BUY', conditions: ['state == "long"'] }));
    expect('unassemblable' in result).toBe(true);
    if ('unassemblable' in result) expect(result.reason).toMatch(/string comparison/);
  });

  it('generates BUY/CLOSE signals from OHLC-only conditions', () => {
    const spec = baseSpec(
      { direction: 'BUY', conditions: ['close > 100'] },
      { exit: { conditions: ['close < 100'] } },
    );
    const result = assemble(spec);
    if ('unassemblable' in result) throw new Error(`expected assemblable: ${result.reason}`);
    const candles = [candle(0, 90), candle(1, 101), candle(2, 99), candle(3, 105)];
    const signals = result.run(candles);
    expect(signals.map(s => [s.type, s.timestamp])).toEqual([
      ['BUY', 1], ['CLOSE', 2], ['BUY', 3],
    ]);
  });

  it('stop-and-reverses a two-sided BOTH strategy', () => {
    const spec = baseSpec({ direction: 'BOTH', conditions: ['close > 100', 'close < 90'] });
    const result = assemble(spec);
    if ('unassemblable' in result) throw new Error(`expected assemblable: ${result.reason}`);
    const candles = [candle(0, 95), candle(1, 105), candle(2, 80), candle(3, 95)];
    const signals = result.run(candles);
    expect(signals.map(s => [s.type, s.timestamp])).toEqual([
      ['BUY', 1], ['SELL', 2],
    ]);
  });

  it('treats a single-condition BOTH direction as long-only, with a warning', () => {
    const spec = baseSpec({ direction: 'BOTH', conditions: ['close > 100'] });
    const result = assemble(spec);
    if ('unassemblable' in result) throw new Error(`expected assemblable: ${result.reason}`);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('long-only')]),
    );
  });

  it('regression: a bare multi-output binding key (e.g. MACD) is reported as unresolved, not left to crash at runtime', () => {
    const spec = baseSpec(
      { direction: 'BUY', conditions: ['macd > 0'] },
      { bindings: { macd: { type: 'MACD' } } },
    );
    const result = assemble(spec);
    expect('unassemblable' in result).toBe(true);
    if ('unassemblable' in result) expect(result.missing).toContain('macd');
  });

  it('resolves a dotted multi-output line (macd.histogram) and runs without throwing', () => {
    const spec = baseSpec(
      { direction: 'BUY', conditions: ['macd.histogram > 0'] },
      { bindings: { macd: { type: 'MACD' } } },
    );
    const result = assemble(spec);
    if ('unassemblable' in result) throw new Error(`expected assemblable: ${result.reason}`);
    const candles = Array.from({ length: 40 }, (_, i) => candle(i, 100 + i));
    expect(() => result.run(candles)).not.toThrow();
  });
});
