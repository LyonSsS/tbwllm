import { compileCondition, collectIdentifiers, type Env } from './conditionEval.js';

function env(overrides: Partial<Env['series']> = {}): Env {
  const series: Env['series'] = {
    open: [1, 2, 3, 4, 5],
    high: [1, 2, 3, 4, 5],
    low: [1, 2, 3, 4, 5],
    close: [1, 2, 3, 4, 5],
    volume: [1, 1, 1, 1, 1],
    ...overrides,
  };
  return { length: series.close.length, series };
}

describe('compileCondition', () => {
  it('evaluates simple comparisons', () => {
    const fn = compileCondition('close > 3');
    expect(fn(env())).toEqual([0, 0, 0, 1, 1]);
  });

  it('supports the history offset operator', () => {
    const fn = compileCondition('close > close[1]');
    expect(fn(env())).toEqual([0, 1, 1, 1, 1]);
  });

  it('applies and/or/not with and binding tighter than or', () => {
    const fn = compileCondition('close > 4 or close < 2 and not (close == 3)');
    expect(fn(env())).toEqual([1, 0, 0, 0, 1]);
  });

  it('detects a crossover', () => {
    const fn = compileCondition('ta.crossover(close, open)');
    const e = env({ close: [1, 2, 5, 4, 3], open: [3, 3, 3, 3, 3] });
    expect(fn(e)).toEqual([0, 0, 1, 0, 0]);
  });

  it('detects a crossunder', () => {
    const fn = compileCondition('ta.crossunder(close, open)');
    const e = env({ close: [5, 4, 1, 2, 3], open: [3, 3, 3, 3, 3] });
    expect(fn(e)).toEqual([0, 0, 1, 0, 0]);
  });

  it('nz substitutes the default for NaN', () => {
    const fn = compileCondition('nz(close[2], -1) > 0');
    expect(fn(env())).toEqual([0, 0, 1, 1, 1]);
  });

  it('resolves hl2/hlc3/ohlc4 built-ins', () => {
    const e = env({ open: [0, 0], high: [4, 4], low: [2, 2], close: [3, 3] });
    expect(compileCondition('hl2 == 3')(e)).toEqual([1, 1]);
    expect(compileCondition('hlc3 == 3')(e)).toEqual([1, 1]);
  });

  it('throws on a malformed expression', () => {
    expect(() => compileCondition('close >')).toThrow();
    expect(() => compileCondition('(close > 1')).toThrow();
    expect(() => compileCondition('close $ 1')).toThrow();
  });
});

describe('collectIdentifiers', () => {
  it('collects non-builtin identifiers', () => {
    expect(collectIdentifiers('rsi > 70 and close > sma')).toEqual(
      expect.arrayContaining(['rsi', 'sma']),
    );
  });

  it('excludes OHLC and barstate.* built-ins', () => {
    expect(collectIdentifiers('close > open and barstate.isconfirmed')).toEqual([]);
  });

  it('keeps a dotted identifier as a single id', () => {
    expect(collectIdentifiers('bb.upper > close')).toEqual(['bb.upper']);
  });
});
