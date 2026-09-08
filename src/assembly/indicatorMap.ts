import {
  RSI, EMA, SMA, WMA, HMA, ATR, VWAP, ROC, MOM, RMA, CCI, ADX,
  BollingerBands, SuperTrend, TR, VWMA,
} from 'trading-signals';
import type { Candle } from '../core/types.js';

// ============================================================================
// INDICATOR_MAP — StrategySpec indicator `type` → a function producing series
// over a candle set. Single-output indicators return number[]; multi-output
// ones return { line: number[] } and conditions reference them as `key.line`.
//
// All output is aligned to candles.length, with NaN on warm-up bars.
// Extend by adding a row; see docs/indicators.md.
// ============================================================================

export type Series = number[];
export type MultiSeries = Record<string, Series>;
export type IndicatorFn = (candles: Candle[], params: Record<string, number>) => Series | MultiSeries;

const closes = (c: Candle[]): number[] => c.map(x => x.close);
const hlc = (c: Candle[]) => c.map(x => ({ high: x.high, low: x.low, close: x.close }));
const hlcv = (c: Candle[]) => c.map(x => ({ high: x.high, low: x.low, close: x.close, volume: x.volume }));

// trading-signals `.updates()` yields (Result | null)[]; null on warm-up.
const num = (arr: Array<number | null>): Series => arr.map(v => (v == null ? NaN : v));

// Resolve a numeric param with a fallback.
const P = (params: Record<string, number>, key: string, dflt: number): number =>
  Number.isFinite(params[key]) ? params[key] : dflt;

// Rolling population standard deviation (trading-signals exports no SD class).
function rollingStdDev(values: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { out.push(NaN); continue; }
    const win = values.slice(i - period + 1, i + 1);
    const mean = win.reduce((s, v) => s + v, 0) / period;
    const variance = win.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    out.push(Math.sqrt(variance));
  }
  return out;
}

export const INDICATOR_MAP: Record<string, IndicatorFn> = {
  RSI: (c, p) => num(new RSI(P(p, 'period', 14)).updates(closes(c), false)),
  EMA: (c, p) => num(new EMA(P(p, 'period', 20)).updates(closes(c), false)),
  SMA: (c, p) => num(new SMA(P(p, 'period', 20)).updates(closes(c), false)),
  WMA: (c, p) => num(new WMA(P(p, 'period', 20)).updates(closes(c), false)),
  HMA: (c, p) => num(new HMA(P(p, 'period', 20)).updates(closes(c), false)),
  ROC: (c, p) => num(new ROC(P(p, 'period', 12)).updates(closes(c), false)),
  MOM: (c, p) => num(new MOM(P(p, 'period', 10)).updates(closes(c), false)),
  RMA: (c, p) => num(new RMA(P(p, 'period', 14)).updates(closes(c), false)),
  STDDEV: (c, p) => rollingStdDev(closes(c), P(p, 'period', 20)),
  ATR: (c, p) => num(new ATR(P(p, 'period', 14)).updates(hlc(c), false)),
  TR: (c) => num(new TR().updates(hlc(c), false)),
  CCI: (c, p) => num(new CCI(P(p, 'period', 20)).updates(hlc(c), false)),
  ADX: (c, p) => num(new ADX(P(p, 'period', 14)).updates(hlc(c), false)),
  VWAP: (c) => num(new VWAP().updates(hlcv(c), false)),
  VWMA: (c, p) => num(new VWMA(P(p, 'period', 20)).updates(hlcv(c), false)),

  BB: (c, p) => {
    const out = new BollingerBands(P(p, 'period', 20), P(p, 'stdDev', 2)).updates(closes(c), false);
    return {
      upper: out.map(v => (v == null ? NaN : v.upper)),
      middle: out.map(v => (v == null ? NaN : v.middle)),
      lower: out.map(v => (v == null ? NaN : v.lower)),
    };
  },

  SUPERTREND: (c, p) => {
    const out = new SuperTrend({ interval: P(p, 'period', 10), multiplier: P(p, 'multiplier', 3) }).updates(hlc(c), false);
    return {
      value: out.map(v => (v == null ? NaN : v.supertrend)),
      dir: out.map(v => (v == null ? NaN : v.trend === 'BULLISH' ? 1 : -1)),
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
): Series | MultiSeries {
  const fn = INDICATOR_MAP[type.toUpperCase()];
  if (!fn) throw new Error(`INDICATOR_MAP has no entry for "${type}"`);
  return fn(candles, params);
}
