import {
  RSI, EMA, SMA, WMA, HMA, ATR, VWAP, ROC, MOM, RMA, CCI, ADX,
  BollingerBands, SuperTrend, TR, VWMA, MACD, StochasticOscillator,
  getMaximum, getMinimum,
} from 'trading-signals';
import type { Candle } from '../core/types.js';

// ============================================================================
// INDICATOR_MAP — StrategySpec indicator `type` → a function producing series.
//
// Each fn gets { values, candles, params }:
//   - `values` is the input series (candle closes by default, or a binding's
//     `source` series for composed indicators like Bollinger-on-RSI)
//   - `candles` is there for indicators that genuinely need OHLC(V)
// Single-output → number[]; multi-output → { line: number[] }, referenced in
// conditions as `key.line`. All output aligned to length, NaN on warm-up.
// ============================================================================

export type Series = number[];
export type MultiSeries = Record<string, Series>;

export interface IndCtx {
  values: number[];
  candles: Candle[];
  params: Record<string, number>;
}
export type IndicatorFn = (ctx: IndCtx) => Series | MultiSeries;

const hlc = (c: Candle[]) => c.map(x => ({ high: x.high, low: x.low, close: x.close }));
const hlcv = (c: Candle[]) => c.map(x => ({ high: x.high, low: x.low, close: x.close, volume: x.volume }));
const num = (arr: Array<number | null>): Series => arr.map(v => (v == null ? NaN : v));
const P = (p: Record<string, number>, key: string, dflt: number): number =>
  Number.isFinite(p[key]) ? p[key] : dflt;

// Apply `fn` over each trailing `period`-length window of `values`, NaN during
// warm-up (shared skeleton for rollingStdDev / rollingExtreme below).
function rollingWindow(values: number[], period: number, fn: (win: number[]) => number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { out.push(NaN); continue; }
    out.push(fn(values.slice(i - period + 1, i + 1)));
  }
  return out;
}

// Rolling population standard deviation (trading-signals exports no SD class).
function rollingStdDev(values: number[], period: number): number[] {
  return rollingWindow(values, period, win => {
    const mean = win.reduce((s, v) => s + v, 0) / win.length;
    return Math.sqrt(win.reduce((s, v) => s + (v - mean) ** 2, 0) / win.length);
  });
}

// Rolling max/min over a window — Pine's `ta.highest(series, len)` / `ta.lowest`.
function rollingExtreme(values: number[], period: number, fn: (v: number[]) => number): number[] {
  return rollingWindow(values, period, fn);
}

// Indicators that only make sense on OHLC candles, not an arbitrary series.
export const OHLC_INDICATORS = new Set(['ATR', 'TR', 'ADX', 'VWAP', 'VWMA', 'SUPERTREND', 'CCI', 'STOCH']);

export const INDICATOR_MAP: Record<string, IndicatorFn> = {
  RSI: ({ values, params: p }) => num(new RSI(P(p, 'period', 14)).updates(values, false)),
  EMA: ({ values, params: p }) => num(new EMA(P(p, 'period', 20)).updates(values, false)),
  SMA: ({ values, params: p }) => num(new SMA(P(p, 'period', 20)).updates(values, false)),
  WMA: ({ values, params: p }) => num(new WMA(P(p, 'period', 20)).updates(values, false)),
  HMA: ({ values, params: p }) => num(new HMA(P(p, 'period', 20)).updates(values, false)),
  ROC: ({ values, params: p }) => num(new ROC(P(p, 'period', 12)).updates(values, false)),
  MOM: ({ values, params: p }) => num(new MOM(P(p, 'period', 10)).updates(values, false)),
  RMA: ({ values, params: p }) => num(new RMA(P(p, 'period', 14)).updates(values, false)),
  STDDEV: ({ values, params: p }) => rollingStdDev(values, P(p, 'period', 20)),

  ATR: ({ candles, params: p }) => num(new ATR(P(p, 'period', 14)).updates(hlc(candles), false)),
  TR: ({ candles }) => num(new TR().updates(hlc(candles), false)),
  CCI: ({ candles, params: p }) => num(new CCI(P(p, 'period', 20)).updates(hlc(candles), false)),
  ADX: ({ candles, params: p }) => num(new ADX(P(p, 'period', 14)).updates(hlc(candles), false)),
  VWAP: ({ candles }) => num(new VWAP().updates(hlcv(candles), false)),
  VWMA: ({ candles, params: p }) => num(new VWMA(P(p, 'period', 20)).updates(hlcv(candles), false)),

  BB: ({ values, params: p }) => {
    const out = new BollingerBands(P(p, 'period', 20), P(p, 'stdDev', 2)).updates(values, false);
    return {
      upper: out.map(v => (v == null ? NaN : v.upper)),
      middle: out.map(v => (v == null ? NaN : v.middle)),
      lower: out.map(v => (v == null ? NaN : v.lower)),
    };
  },

  SUPERTREND: ({ candles, params: p }) => {
    const out = new SuperTrend({ interval: P(p, 'period', 10), multiplier: P(p, 'multiplier', 3) }).updates(hlc(candles), false);
    return {
      value: out.map(v => (v == null ? NaN : v.supertrend)),
      dir: out.map(v => (v == null ? NaN : v.trend === 'BULLISH' ? 1 : -1)),
    };
  },

  HIGHEST_HIGH: ({ values, params: p }) => rollingExtreme(values, P(p, 'period', 14), getMaximum),
  LOWEST_LOW: ({ values, params: p }) => rollingExtreme(values, P(p, 'period', 14), getMinimum),

  MACD: ({ values, params: p }) => {
    const fast = P(p, 'fastPeriod', 12);
    const slow = P(p, 'slowPeriod', 26);
    const signal = P(p, 'signalPeriod', 9);
    const out = new MACD(new EMA(fast), new EMA(slow), new EMA(signal)).updates(values, false);
    return {
      macd: out.map(v => (v == null ? NaN : v.macd)),
      signal: out.map(v => (v == null ? NaN : v.signal)),
      histogram: out.map(v => (v == null ? NaN : v.histogram)),
    };
  },

  STOCH: ({ candles, params: p }) => {
    const cfg = {
      kPeriod: P(p, 'kPeriod', 14),
      kSlowingPeriod: P(p, 'kSlowingPeriod', 3),
      dPeriod: P(p, 'dPeriod', 3),
    };
    const out = new StochasticOscillator(cfg).updates(hlc(candles), false);
    return {
      stochK: out.map(v => (v == null ? NaN : v.stochK)),
      stochD: out.map(v => (v == null ? NaN : v.stochD)),
      stochJ: out.map(v => (v == null ? NaN : v.stochJ)),
    };
  },
};

export function isKnownIndicator(type: string): boolean {
  return type.toUpperCase() in INDICATOR_MAP;
}

export function computeIndicator(
  type: string,
  candles: Candle[],
  params: Record<string, number>,
  sourceValues?: number[],
): Series | MultiSeries {
  const fn = INDICATOR_MAP[type.toUpperCase()];
  if (!fn) throw new Error(`INDICATOR_MAP has no entry for "${type}"`);
  const values = sourceValues ?? candles.map(c => c.close);
  return fn({ values, candles, params });
}
