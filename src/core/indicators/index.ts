/**
 * Indicator barrel — single import site for the assembler.
 *
 * Layer 1: standard indicators come from `trading-signals` (150+, maintained,
 *   zero-dep, streaming-first). Never reimplement one that exists there.
 * Layer 3: indicators `trading-signals` lacks (SMC / ICT / bespoke) are
 *   hand-written under ./custom and re-exported below. See docs/indicators.md.
 *
 * The `type` string in a StrategySpec indicator is mapped to one of these by
 * INDICATOR_MAP in the assembler (Phase I1) — this file only decides what is
 * in scope, not how conditions are evaluated.
 */

// ─── Layer 1: standard indicators (trading-signals) ──────────────────────────
// Curated to what the static analyzer currently detects, plus close neighbours.
export {
  SMA,
  EMA,
  WMA,
  HMA,
  MACD,
  RSI,
  TSI,
  MOM,
  ROC,
  CCI,
  ADX,
  ATR,
  BollingerBands,
  StochasticOscillator,
  StochasticRSI,
  VWAP,
  SuperTrend,
  PSAR,
  IchimokuCloud,
  KeltnerChannels,
  DonchianChannels,
  ZigZag,
  SwingHigh, // pivot high (lookback)
  SwingLow, // pivot low (lookback)
} from 'trading-signals';

// ─── Layer 3: custom indicators (Phase I4) ──────────────────────────────────
// export * from './custom'; // FVG, order block, market structure, PVSRA, ...

// Backtests need a full series from a streaming indicator: use the built-in
// `indicator.updates(inputs, replace?)` — every trading-signals indicator has
// it (on the `TechnicalIndicator` base class), returning `(Result | null)[]`
// with `null` for warm-up bars.
