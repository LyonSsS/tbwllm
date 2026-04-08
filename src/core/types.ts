import { z } from 'zod';

// ============================================================================
// Core OHLCV / Trading Types
// ============================================================================

export const CandleSchema = z.object({
  timestamp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});
export type Candle = z.infer<typeof CandleSchema>;

export const SignalSchema = z.object({
  type: z.enum(['BUY', 'SELL', 'CLOSE']),
  timestamp: z.number(),
  price: z.number(),
  reason: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type Signal = z.infer<typeof SignalSchema>;

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

export const BacktestMetricsSchema = z.object({
  totalTrades: z.number(),
  winRate: z.number(),
  avgPnl: z.number(),
  sharpeRatio: z.number().optional(),
  maxDrawdown: z.number(),
  totalReturn: z.number(),
});
export type BacktestMetrics = z.infer<typeof BacktestMetricsSchema>;

export const BacktestResultSchema = z.object({
  trades: z.array(TradeSchema),
  metrics: BacktestMetricsSchema,
});
export type BacktestResult = z.infer<typeof BacktestResultSchema>;

export interface Strategy<T = unknown> {
  name: string;
  run(candles: Candle[], params: T): Signal[];
}

// ============================================================================
// StrategySpec — central contract between ingestion, assembly, and backtest
// ============================================================================

export const StrategyTypeSchema = z.enum([
  'condition',   // boolean AND of indicator conditions (most common)
  'pattern',     // pivot detection + offset entry
  'scored',      // weighted/tiered score >= threshold
  'mtf_scored',  // per-TF score → weighted aggregate
  'session',     // inter-session range logic
]);
export type StrategyType = z.infer<typeof StrategyTypeSchema>;

// ─── Indicator config ───────────────────────────────────────────────────────

export const IndicatorConfigSchema = z.object({
  type: z.string(),                              // e.g. "RSI", "EMA", "VWAP", "COMPRESSION_RATIO"
  params: z.record(z.union([z.number(), z.string(), z.boolean()])).optional(),
  input: z.string().optional(),                  // outputKey of another indicator (chaining)
  outputKey: z.string(),                         // how conditions reference this indicator
});
export type IndicatorConfig = z.infer<typeof IndicatorConfigSchema>;

// ─── Entry / Exit ────────────────────────────────────────────────────────────

export const EntrySchema = z.object({
  direction: z.enum(['BUY', 'SELL', 'BOTH']),
  trigger: z.string().optional(),                // price level crossover e.g. "close > compHigh[1]"
  conditions: z.array(z.string()).optional(),    // AND-joined condition strings
  gate: z.string().optional(),                   // score filter e.g. "score >= 70"
  offset: z.string().optional(),                 // bars back for entry price e.g. "pivotPeriod"
});
export type Entry = z.infer<typeof EntrySchema>;

export const ExitSchema = z.object({
  conditions: z.array(z.string()).optional(),
  stopLoss: z.string().optional(),               // formula e.g. "entry - atr * 1.5"
  takeProfit: z.string().optional(),             // formula e.g. "entry + (entry - stopLoss) * 2"
  takeProfit2: z.string().optional(),
  triggerTime: z.string().optional(),            // for session strategies e.g. "14:00"
});
export type Exit = z.infer<typeof ExitSchema>;

// ─── Score system (for 'scored' type) ───────────────────────────────────────

export const ScoreTierSchema = z.object({
  condition: z.string().optional(),
  default: z.boolean().optional(),
  score: z.number(),
});

export const ScoreComponentSchema = z.object({
  name: z.string(),
  maxScore: z.number().optional(),
  weight: z.number().optional(),                 // for flat-weight scoring
  condition: z.string().optional(),              // for simple boolean components
  tiers: z.array(ScoreTierSchema).optional(),    // for tiered scoring
});

export const ScoreSystemSchema = z.object({
  minScore: z.number(),
  components: z.array(ScoreComponentSchema),
  penalties: z.array(ScoreComponentSchema).optional(),
  multipliers: z.array(z.object({
    name: z.string(),
    type: z.string(),
  })).optional(),
});
export type ScoreSystem = z.infer<typeof ScoreSystemSchema>;

// ─── MTF config (for 'mtf_scored' type) ─────────────────────────────────────

export const RegimeWeightsSchema = z.record(z.number()); // { "3m": 3, "1h": 5, ... }

export const RegimeDetectionSchema = z.object({
  timeframe: z.string(),
  indicators: z.array(IndicatorConfigSchema),
  regimes: z.record(z.object({
    weights: RegimeWeightsSchema,
  })),
});

export const PerTFScoringSchema = z.object({
  components: z.array(ScoreComponentSchema),
});

// ─── Session config (for 'session' type) ────────────────────────────────────

export const SessionConfigSchema = z.object({
  start: z.string(),     // e.g. "18:00"
  end: z.string(),       // e.g. "01:00"
  tz: z.string(),        // e.g. "America/New_York"
});

// ─── Full StrategySpec ───────────────────────────────────────────────────────

export const StrategySpecSchema = z.object({
  // Identity
  id: z.string(),
  name: z.string(),
  source: z.string().optional(),        // URL or filename
  version: z.string().default('1'),

  // Type determines which execution engine handles this spec
  strategyType: StrategyTypeSchema,

  // Constraints
  timeframeMin: z.string().optional(),  // e.g. "60" = 1H minimum
  assetClass: z.enum(['crypto', 'forex', 'stocks', 'any']).default('any'),

  // Indicators (for condition / pattern / scored types)
  indicators: z.array(IndicatorConfigSchema).optional(),

  // Entry / Exit
  entry: EntrySchema,
  exit: ExitSchema.optional(),

  // For 'scored' type
  scoreSystem: ScoreSystemSchema.optional(),

  // For 'mtf_scored' type
  regimeDetection: RegimeDetectionSchema.optional(),
  perTFScoring: PerTFScoringSchema.optional(),

  // For 'session' type
  sessions: z.record(SessionConfigSchema).optional(),

  // Sweepable parameters
  parameters: z.record(z.union([z.number(), z.string(), z.boolean()])).optional(),

  // Metadata
  parsedBy: z.enum(['static', 'llm', 'manual']).default('static'),
  confidence: z.number().min(0).max(1).default(1),
  rawHash: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.number().default(() => Date.now()),
});

export type StrategySpec = z.infer<typeof StrategySpecSchema>;
