import { z } from 'zod';

// ============================================================================
// Core Data Types
// ============================================================================

/**
 * Candle (OHLCV) data structure
 */
export const CandleSchema = z.object({
  timestamp: z.number(),           // Unix timestamp in milliseconds
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});
export type Candle = z.infer<typeof CandleSchema>;

/**
 * Trading signal (BUY/SELL/CLOSE)
 */
export const SignalSchema = z.object({
  type: z.enum(['BUY', 'SELL', 'CLOSE']),
  timestamp: z.number(),
  price: z.number(),
  reason: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type Signal = z.infer<typeof SignalSchema>;

/**
 * Strategy parameters configuration
 */
export const ParamsSchema = z.object({
  strategyName: z.string(),
  symbol: z.string(),
  timeframe: z.string(),
  parameters: z.record(z.unknown()),
});
export type Params = z.infer<typeof ParamsSchema>;

/**
 * Trade result (for backtesting)
 */
export const TradeSchema = z.object({
  entryTimestamp: z.number(),
  entryPrice: z.number(),
  exitTimestamp: z.number(),
  exitPrice: z.number(),
  type: z.enum(['LONG', 'SHORT']),
  pnl: z.number(),
  pnlPercent: z.number(),
});
export type Trade = z.infer<typeof TradeSchema>;

/**
 * Backtest performance metrics
 */
export const BacktestMetricsSchema = z.object({
  totalTrades: z.number(),
  winRate: z.number(),
  avgPnl: z.number(),
  sharpeRatio: z.number().optional(),
  maxDrawdown: z.number(),
  totalReturn: z.number(),
});
export type BacktestMetrics = z.infer<typeof BacktestMetricsSchema>;

/**
 * Complete backtest result
 */
export const BacktestResultSchema = z.object({
  trades: z.array(TradeSchema),
  metrics: BacktestMetricsSchema,
});
export type BacktestResult = z.infer<typeof BacktestResultSchema>;

// ============================================================================
// Strategy Interface
// ============================================================================

/**
 * Base interface that all strategies must implement
 */
export interface Strategy<T = any> {
  name: string;
  run(candles: Candle[], params: T): Signal[];
}

