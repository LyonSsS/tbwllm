# TBWLLM - Trading Bot with LLM Action Plan

**Project Goal**: Build a production-grade algorithmic trading system with TypeScript (production) + Python (research/backtesting), supporting multiple strategies, backtesting, and paper trading.

---

## 🎯 Architecture Overview

### Core Principles
1. **Pure Functional Core**: `(candles, params) → signals` - No I/O, no HTTP, no stateful globals
2. **Frozen Schemas**: Define all data structures with Zod (TS) and Pydantic (Python)
3. **Golden Fixtures**: JSON test cases ensuring TS/Python parity
4. **Python for Research**: Fast backtests, parameter optimization (vectorbt/backtrader)
5. **TypeScript for Production**: Live bot, webhooks, websockets, exchange integration (ccxt)
6. **Param Handoff**: Python finds optimal params → `params.json` → TS loads for live trading

### Data & Indicator Strategy
- **Primary**: Use standard indicator libraries (technicalindicators, ta-lib) - fast, reliable
- **Secondary**: TradingView webhooks for custom/community indicators
- **Data Source**: ccxt (60+ exchanges), Binance API, or Alpaca (stocks)

---

## 📋 Project Phases

## Phase 1: Foundation Setup (Week 1)

### 1.1 Repository & Project Structure
```
tbwllm/
├── src/                        # TypeScript source
│   ├── core/                   # Pure strategy logic
│   │   ├── types.ts           # Zod schemas (Candle, Signal, Params)
│   │   ├── indicators/        # Indicator implementations
│   │   │   ├── sma.ts
│   │   │   ├── ema.ts
│   │   │   ├── rsi.ts
│   │   │   └── macd.ts
│   │   ├── strategies/        # Strategy implementations
│   │   │   ├── base.ts        # Base strategy interface
│   │   │   └── smaRsi.ts      # Example: SMA crossover + RSI
│   │   └── backtest.ts        # Simple TS backtester
│   ├── data/
│   │   ├── fetcher.ts         # ccxt wrapper - fetch OHLCV
│   │   └── validator.ts       # Data validation
│   ├── bot/                    # Production bot (Phase 2)
│   │   ├── paper-trader.ts    # Paper trading executor
│   │   ├── webhook-server.ts  # Receive TradingView alerts
│   │   └── exchange.ts        # Exchange API wrapper
│   ├── utils/
│   │   ├── logger.ts          # Pino logger setup
│   │   └── config.ts          # Load params.json
│   └── tests/
│       ├── fixtures/          # JSON golden fixtures
│       │   └── smaRsi.json
│       └── strategies/        # Unit tests
│           └── smaRsi.test.ts
│
├── python/                     # Python research environment
│   ├── research/
│   │   ├── backtest.py        # vectorbt backtester
│   │   ├── optimize.py        # Hyperparameter optimization (Optuna)
│   │   └── analysis.py        # Performance analysis & visualization
│   ├── core/
│   │   ├── schemas.py         # Pydantic models (mirror TS types)
│   │   └── strategies/        # Strategy implementations (mirror TS)
│   │       └── sma_rsi.py
│   └── tests/
│       └── test_parity.py     # Load fixtures, assert TS/Python match
│
├── config/
│   ├── params.json            # Strategy parameters (from Python optimization)
│   ├── exchanges.json         # Exchange API configs
│   └── strategies.json        # Strategy registry
│
├── data/                       # Historical data cache
│   └── ohlcv/
│       └── BTCUSDT_1h.csv
│
├── logs/                       # Log files (gitignored)
├── docker/
│   ├── Dockerfile.bot         # Production bot container
│   └── docker-compose.yml     # Full stack (bot + DB + monitoring)
│
├── package.json
├── tsconfig.json
├── pyproject.toml             # Python dependencies (Poetry)
├── .env.example
├── .gitignore
└── README.md                  # Auto-generated project overview
```

**Actions:**
- [ ] Create GitHub repo (public)
- [ ] Initialize Node.js project: `yarn init -y`
- [ ] Install TS dependencies: `yarn add typescript @types/node tsx zod pino ccxt`
- [ ] Install dev dependencies: `yarn add -D @types/jest jest ts-jest`
- [ ] Create `tsconfig.json` with strict settings
- [ ] Initialize Python: `poetry init` (or `pip` if preferred)
- [ ] Add Python deps: `poetry add vectorbt pandas numpy optuna pydantic`
- [ ] Create folder structure as above
- [ ] Create `.gitignore` (node_modules, .env, logs, data)

---

### 1.2 Core Type Definitions (TypeScript)

**File**: `src/core/types.ts`

Define core data structures with Zod validation:

```typescript
import { z } from 'zod';

// Candle (OHLCV)
export const CandleSchema = z.object({
  timestamp: z.number(),           // Unix timestamp (ms)
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});
export type Candle = z.infer<typeof CandleSchema>;

// Signal (buy/sell)
export const SignalSchema = z.object({
  type: z.enum(['BUY', 'SELL', 'CLOSE']),
  timestamp: z.number(),
  price: z.number(),
  reason?: z.string(),             // Why this signal fired
  metadata?: z.record(z.unknown()), // Indicator values, etc.
});
export type Signal = z.infer<typeof SignalSchema>;

// Strategy Parameters
export const ParamsSchema = z.object({
  strategyName: z.string(),
  symbol: z.string(),
  timeframe: z.string(),
  parameters: z.record(z.unknown()), // Strategy-specific params
});
export type Params = z.infer<typeof ParamsSchema>;

// Trade Result (for backtesting)
export const TradeSchema = z.object({
  entryTimestamp: z.number(),
  entryPrice: z.number(),
  exitTimestamp: z.number(),
  exitPrice: z.number(),
  type: z.enum(['LONG', 'SHORT']),
  pnl: z.number(),                  // Profit/loss
  pnlPercent: z.number(),
});
export type Trade = z.infer<typeof TradeSchema>;

// Backtest Results
export const BacktestResultSchema = z.object({
  trades: z.array(TradeSchema),
  metrics: z.object({
    totalTrades: z.number(),
    winRate: z.number(),
    avgPnl: z.number(),
    sharpeRatio: z.number().optional(),
    maxDrawdown: z.number(),
    totalReturn: z.number(),
  }),
});
export type BacktestResult = z.infer<typeof BacktestResultSchema>;
```

**Actions:**
- [ ] Create `src/core/types.ts` with schemas above
- [ ] Export all schemas and types

---

### 1.3 Implement Basic Indicators

**Files**: `src/core/indicators/*.ts`

**Option A: Use Library** (Recommended for speed)
```typescript
// src/core/indicators/index.ts
import { SMA, EMA, RSI, MACD } from 'technicalindicators';
export { SMA, EMA, RSI, MACD };
```

**Option B: Implement from Scratch** (Better for learning & control)

```typescript
// src/core/indicators/sma.ts
export function SMA(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

// src/core/indicators/rsi.ts
export function RSI(values: number[], period: number): number[] {
  const result: number[] = [];
  let gains = 0;
  let losses = 0;

  // First RSI (simple average)
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgGain / avgLoss;
  result[period] = 100 - (100 / (1 + rs));

  // Subsequent RSI (smoothed)
  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rs = avgGain / avgLoss;
    result[i] = 100 - (100 / (1 + rs));
  }

  return result;
}
```

**Actions:**
- [ ] Decide: library vs custom implementation
- [ ] Implement: SMA, EMA, RSI, MACD (minimum)
- [ ] Write unit tests for each indicator
- [ ] Create `src/core/indicators/index.ts` barrel export

---

### 1.4 First Strategy: SMA Crossover + RSI Filter

**File**: `src/core/strategies/smaRsi.ts`

```typescript
import { Candle, Signal, Params } from '../types';
import { SMA } from '../indicators/sma';
import { RSI } from '../indicators/rsi';

export interface SmaRsiParams {
  fastPeriod: number;      // e.g., 50
  slowPeriod: number;      // e.g., 200
  rsiPeriod: number;       // e.g., 14
  rsiOverbought: number;   // e.g., 70
  rsiOversold: number;     // e.g., 30
}

/**
 * SMA Crossover Strategy with RSI Filter
 * 
 * BUY: Fast SMA crosses above Slow SMA AND RSI < overbought
 * SELL: Fast SMA crosses below Slow SMA AND RSI > oversold
 */
export function smaRsiStrategy(
  candles: Candle[],
  params: SmaRsiParams
): Signal[] {
  if (candles.length < params.slowPeriod) {
    throw new Error(`Need at least ${params.slowPeriod} candles`);
  }

  const closes = candles.map(c => c.close);
  const smaFast = SMA(closes, params.fastPeriod);
  const smaSlow = SMA(closes, params.slowPeriod);
  const rsi = RSI(closes, params.rsiPeriod);

  const signals: Signal[] = [];

  for (let i = 1; i < candles.length; i++) {
    const prevFast = smaFast[i - 1];
    const currFast = smaFast[i];
    const prevSlow = smaSlow[i - 1];
    const currSlow = smaSlow[i];
    const currRsi = rsi[i];

    // Skip if indicators not ready
    if (isNaN(prevFast) || isNaN(currFast) || isNaN(prevSlow) || isNaN(currSlow) || isNaN(currRsi)) {
      continue;
    }

    // BUY: Fast crosses above Slow + RSI filter
    if (prevFast <= prevSlow && currFast > currSlow && currRsi < params.rsiOverbought) {
      signals.push({
        type: 'BUY',
        timestamp: candles[i].timestamp,
        price: candles[i].close,
        reason: `SMA cross up (${currFast.toFixed(2)} > ${currSlow.toFixed(2)}), RSI=${currRsi.toFixed(2)}`,
        metadata: { smaFast: currFast, smaSlow: currSlow, rsi: currRsi },
      });
    }

    // SELL: Fast crosses below Slow + RSI filter
    if (prevFast >= prevSlow && currFast < currSlow && currRsi > params.rsiOversold) {
      signals.push({
        type: 'SELL',
        timestamp: candles[i].timestamp,
        price: candles[i].close,
        reason: `SMA cross down (${currFast.toFixed(2)} < ${currSlow.toFixed(2)}), RSI=${currRsi.toFixed(2)}`,
        metadata: { smaFast: currFast, smaSlow: currSlow, rsi: currRsi },
      });
    }
  }

  return signals;
}
```

**Actions:**
- [ ] Create `src/core/strategies/smaRsi.ts`
- [ ] Implement the strategy as above
- [ ] Create test with known data

---

### 1.5 Golden Fixtures (TS ↔ Python Parity)

**File**: `src/tests/fixtures/smaRsi.json`

```json
{
  "name": "SMA-RSI Strategy Test Case 1",
  "params": {
    "fastPeriod": 5,
    "slowPeriod": 10,
    "rsiPeriod": 14,
    "rsiOverbought": 70,
    "rsiOversold": 30
  },
  "candles": [
    { "timestamp": 1697500800000, "open": 100, "high": 105, "low": 99, "close": 102, "volume": 1000 },
    { "timestamp": 1697504400000, "open": 102, "high": 107, "low": 101, "close": 105, "volume": 1200 },
    ... (30-50 candles for meaningful test)
  ],
  "expectedSignals": [
    { "type": "BUY", "timestamp": 1697518800000, "price": 110.5 },
    { "type": "SELL", "timestamp": 1697536800000, "price": 108.2 }
  ]
}
```

**Actions:**
- [ ] Generate a fixture with real historical data (fetch from Binance)
- [ ] Run TS strategy → record output signals
- [ ] Store as JSON fixture
- [ ] Write test that loads fixture and asserts signals match

---

### 1.6 Simple TypeScript Backtester

**File**: `src/core/backtest.ts`

```typescript
import { Candle, Signal, Trade, BacktestResult } from './types';

export interface BacktestConfig {
  initialCapital: number;
  feePercent: number;        // e.g., 0.1 (0.1%)
  slippage: number;          // e.g., 0.05 (0.05%)
}

export function runBacktest(
  candles: Candle[],
  signals: Signal[],
  config: BacktestConfig
): BacktestResult {
  const trades: Trade[] = [];
  let position: 'LONG' | 'NONE' = 'NONE';
  let entryPrice = 0;
  let entryTimestamp = 0;
  let capital = config.initialCapital;

  for (const signal of signals) {
    if (signal.type === 'BUY' && position === 'NONE') {
      // Enter long
      entryPrice = signal.price * (1 + config.slippage / 100);
      entryTimestamp = signal.timestamp;
      position = 'LONG';
      capital *= (1 - config.feePercent / 100); // Entry fee
    } else if (signal.type === 'SELL' && position === 'LONG') {
      // Exit long
      const exitPrice = signal.price * (1 - config.slippage / 100);
      capital *= (1 - config.feePercent / 100); // Exit fee
      
      const pnl = exitPrice - entryPrice;
      const pnlPercent = (pnl / entryPrice) * 100;

      trades.push({
        entryTimestamp,
        entryPrice,
        exitTimestamp: signal.timestamp,
        exitPrice,
        type: 'LONG',
        pnl,
        pnlPercent,
      });

      capital += pnl;
      position = 'NONE';
    }
  }

  // Calculate metrics
  const winningTrades = trades.filter(t => t.pnl > 0);
  const winRate = (winningTrades.length / trades.length) * 100 || 0;
  const avgPnl = trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length || 0;
  const totalReturn = ((capital - config.initialCapital) / config.initialCapital) * 100;
  
  // Simple max drawdown calculation
  let peak = config.initialCapital;
  let maxDrawdown = 0;
  let runningCapital = config.initialCapital;
  
  for (const trade of trades) {
    runningCapital += trade.pnl;
    if (runningCapital > peak) peak = runningCapital;
    const drawdown = ((peak - runningCapital) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return {
    trades,
    metrics: {
      totalTrades: trades.length,
      winRate,
      avgPnl,
      maxDrawdown,
      totalReturn,
    },
  };
}
```

**Actions:**
- [ ] Implement basic backtester
- [ ] Test with fixture data
- [ ] Add metrics: Sharpe ratio, Sortino ratio (advanced)

---

### 1.7 Data Fetcher (ccxt)

**File**: `src/data/fetcher.ts`

```typescript
import ccxt from 'ccxt';
import { Candle, CandleSchema } from '../core/types';
import { z } from 'zod';

export class DataFetcher {
  private exchange: ccxt.Exchange;

  constructor(exchangeName: string = 'binance') {
    this.exchange = new ccxt[exchangeName]();
  }

  async fetchOHLCV(
    symbol: string,
    timeframe: string,
    since?: number,
    limit: number = 500
  ): Promise<Candle[]> {
    const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, since, limit);
    
    return ohlcv.map(([timestamp, open, high, low, close, volume]) => {
      const candle = {
        timestamp,
        open,
        high,
        low,
        close,
        volume,
      };
      // Validate with Zod
      return CandleSchema.parse(candle);
    });
  }

  async fetchHistorical(
    symbol: string,
    timeframe: string,
    startDate: Date,
    endDate: Date
  ): Promise<Candle[]> {
    const allCandles: Candle[] = [];
    let since = startDate.getTime();
    const end = endDate.getTime();

    while (since < end) {
      const candles = await this.fetchOHLCV(symbol, timeframe, since, 1000);
      if (candles.length === 0) break;
      
      allCandles.push(...candles);
      since = candles[candles.length - 1].timestamp + 1;
      
      // Rate limiting
      await this.sleep(this.exchange.rateLimit);
    }

    return allCandles.filter(c => c.timestamp <= end);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Actions:**
- [ ] Implement DataFetcher
- [ ] Test fetching BTC/USDT 1h data
- [ ] Add caching to `data/ohlcv/` folder
- [ ] Handle rate limits & errors gracefully

---

## Phase 2: Python Research Environment (Week 2)

### 2.1 Mirror Types in Python

**File**: `python/core/schemas.py`

```python
from pydantic import BaseModel
from typing import Literal, Optional, Dict, Any, List
from datetime import datetime

class Candle(BaseModel):
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float

class Signal(BaseModel):
    type: Literal['BUY', 'SELL', 'CLOSE']
    timestamp: int
    price: float
    reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class Trade(BaseModel):
    entry_timestamp: int
    entry_price: float
    exit_timestamp: int
    exit_price: float
    type: Literal['LONG', 'SHORT']
    pnl: float
    pnl_percent: float

class BacktestMetrics(BaseModel):
    total_trades: int
    win_rate: float
    avg_pnl: float
    sharpe_ratio: Optional[float] = None
    max_drawdown: float
    total_return: float
```

**Actions:**
- [ ] Create Pydantic models mirroring TS types
- [ ] Ensure field names match (snake_case in Python, camelCase in TS)

---

### 2.2 Python Strategy Implementation

**File**: `python/core/strategies/sma_rsi.py`

```python
import pandas as pd
import numpy as np
from typing import List
from ..schemas import Candle, Signal

def sma(values: pd.Series, period: int) -> pd.Series:
    return values.rolling(window=period).mean()

def rsi(values: pd.Series, period: int) -> pd.Series:
    delta = values.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def sma_rsi_strategy(
    candles: List[Candle],
    fast_period: int,
    slow_period: int,
    rsi_period: int,
    rsi_overbought: int,
    rsi_oversold: int
) -> List[Signal]:
    df = pd.DataFrame([c.dict() for c in candles])
    
    df['sma_fast'] = sma(df['close'], fast_period)
    df['sma_slow'] = sma(df['close'], slow_period)
    df['rsi'] = rsi(df['close'], rsi_period)
    
    signals = []
    
    for i in range(1, len(df)):
        prev = df.iloc[i-1]
        curr = df.iloc[i]
        
        # BUY signal
        if (prev['sma_fast'] <= prev['sma_slow'] and 
            curr['sma_fast'] > curr['sma_slow'] and 
            curr['rsi'] < rsi_overbought):
            signals.append(Signal(
                type='BUY',
                timestamp=int(curr['timestamp']),
                price=float(curr['close']),
                reason=f"SMA cross up, RSI={curr['rsi']:.2f}",
                metadata={'sma_fast': curr['sma_fast'], 'sma_slow': curr['sma_slow'], 'rsi': curr['rsi']}
            ))
        
        # SELL signal
        if (prev['sma_fast'] >= prev['sma_slow'] and 
            curr['sma_fast'] < curr['sma_slow'] and 
            curr['rsi'] > rsi_oversold):
            signals.append(Signal(
                type='SELL',
                timestamp=int(curr['timestamp']),
                price=float(curr['close']),
                reason=f"SMA cross down, RSI={curr['rsi']:.2f}",
                metadata={'sma_fast': curr['sma_fast'], 'sma_slow': curr['sma_slow'], 'rsi': curr['rsi']}
            ))
    
    return signals
```

**Actions:**
- [ ] Implement Python version of SMA-RSI strategy
- [ ] Ensure logic matches TS version exactly

---

### 2.3 Parity Tests

**File**: `python/tests/test_parity.py`

```python
import json
import pytest
from python.core.schemas import Candle, Signal
from python.core.strategies.sma_rsi import sma_rsi_strategy

def test_sma_rsi_parity():
    # Load fixture
    with open('src/tests/fixtures/smaRsi.json', 'r') as f:
        fixture = json.load(f)
    
    # Parse candles
    candles = [Candle(**c) for c in fixture['candles']]
    params = fixture['params']
    
    # Run strategy
    signals = sma_rsi_strategy(
        candles,
        fast_period=params['fastPeriod'],
        slow_period=params['slowPeriod'],
        rsi_period=params['rsiPeriod'],
        rsi_overbought=params['rsiOverbought'],
        rsi_oversold=params['rsiOversold']
    )
    
    # Assert matches expected
    expected = fixture['expectedSignals']
    assert len(signals) == len(expected), f"Expected {len(expected)} signals, got {len(signals)}"
    
    for i, (sig, exp) in enumerate(zip(signals, expected)):
        assert sig.type == exp['type'], f"Signal {i}: type mismatch"
        assert sig.timestamp == exp['timestamp'], f"Signal {i}: timestamp mismatch"
        assert abs(sig.price - exp['price']) < 0.01, f"Signal {i}: price mismatch"
```

**Actions:**
- [ ] Implement parity test
- [ ] Run and verify both TS and Python produce identical signals
- [ ] Fix any discrepancies

---

### 2.4 Vectorbt Backtester

**File**: `python/research/backtest.py`

```python
import vectorbt as vbt
import pandas as pd
from typing import Dict, Any

def backtest_strategy_vectorbt(
    symbol: str,
    start_date: str,
    end_date: str,
    fast_period: int,
    slow_period: int,
    rsi_period: int,
    rsi_overbought: int,
    rsi_oversold: int,
    initial_capital: float = 10000,
    fees: float = 0.001  # 0.1%
) -> Dict[str, Any]:
    """
    Run vectorized backtest using vectorbt
    """
    # Fetch data (using YFinance, or load from CSV)
    data = vbt.YFData.download(symbol, start=start_date, end=end_date)
    close = data.get('Close')
    
    # Calculate indicators
    fast_ma = vbt.MA.run(close, window=fast_period, short_name='fast')
    slow_ma = vbt.MA.run(close, window=slow_period, short_name='slow')
    rsi_ind = vbt.RSI.run(close, window=rsi_period)
    
    # Generate entry signals
    ma_cross_up = fast_ma.ma_above(slow_ma, crossed=True)
    rsi_filter_buy = rsi_ind.rsi < rsi_overbought
    entries = ma_cross_up & rsi_filter_buy
    
    # Generate exit signals
    ma_cross_down = fast_ma.ma_below(slow_ma, crossed=True)
    rsi_filter_sell = rsi_ind.rsi > rsi_oversold
    exits = ma_cross_down & rsi_filter_sell
    
    # Run portfolio simulation
    portfolio = vbt.Portfolio.from_signals(
        close,
        entries,
        exits,
        init_cash=initial_capital,
        fees=fees,
        freq='1D'
    )
    
    # Extract metrics
    stats = portfolio.stats()
    
    return {
        'total_return': portfolio.total_return(),
        'sharpe_ratio': portfolio.sharpe_ratio(),
        'max_drawdown': portfolio.max_drawdown(),
        'win_rate': portfolio.trades.win_rate(),
        'total_trades': portfolio.trades.count(),
        'stats': stats
    }

if __name__ == '__main__':
    result = backtest_strategy_vectorbt(
        symbol='BTC-USD',
        start_date='2020-01-01',
        end_date='2024-01-01',
        fast_period=50,
        slow_period=200,
        rsi_period=14,
        rsi_overbought=70,
        rsi_oversold=30
    )
    print(result)
```

**Actions:**
- [ ] Implement vectorbt backtester
- [ ] Run on 3+ years of BTC data
- [ ] Compare performance with TS backtester (should match closely)

---

### 2.5 Parameter Optimization

**File**: `python/research/optimize.py`

```python
import optuna
from .backtest import backtest_strategy_vectorbt

def objective(trial):
    # Define parameter search space
    fast_period = trial.suggest_int('fast_period', 10, 100)
    slow_period = trial.suggest_int('slow_period', 100, 300)
    rsi_period = trial.suggest_int('rsi_period', 10, 20)
    rsi_overbought = trial.suggest_int('rsi_overbought', 65, 80)
    rsi_oversold = trial.suggest_int('rsi_oversold', 20, 35)
    
    # Constraint: fast < slow
    if fast_period >= slow_period:
        return -999999
    
    # Run backtest
    result = backtest_strategy_vectorbt(
        symbol='BTC-USD',
        start_date='2020-01-01',
        end_date='2023-01-01',  # Training period
        fast_period=fast_period,
        slow_period=slow_period,
        rsi_period=rsi_period,
        rsi_overbought=rsi_overbought,
        rsi_oversold=rsi_oversold
    )
    
    # Optimize for Sharpe ratio (or total return, or custom metric)
    return result['sharpe_ratio']

def optimize_parameters(n_trials=100):
    study = optuna.create_study(direction='maximize')
    study.optimize(objective, n_trials=n_trials)
    
    print(f"Best parameters: {study.best_params}")
    print(f"Best Sharpe ratio: {study.best_value}")
    
    # Save to params.json
    import json
    best_params = study.best_params
    with open('config/params.json', 'w') as f:
        json.dump({
            'strategyName': 'smaRsi',
            'parameters': best_params
        }, f, indent=2)
    
    return study.best_params

if __name__ == '__main__':
    optimize_parameters(n_trials=200)
```

**Actions:**
- [ ] Implement Optuna optimization
- [ ] Run 200+ trials to find optimal params
- [ ] Validate on out-of-sample data (2023-2024)
- [ ] Save best params to `config/params.json`

---

## Phase 3: Production Bot (Week 3-4)

### 3.1 Paper Trading Engine

**File**: `src/bot/paper-trader.ts`

```typescript
import { DataFetcher } from '../data/fetcher';
import { smaRsiStrategy } from '../core/strategies/smaRsi';
import { logger } from '../utils/logger';
import fs from 'fs/promises';

export class PaperTrader {
  private fetcher: DataFetcher;
  private params: any;
  private position: 'LONG' | 'NONE' = 'NONE';
  private entryPrice = 0;

  constructor() {
    this.fetcher = new DataFetcher('binance');
  }

  async loadParams() {
    const data = await fs.readFile('config/params.json', 'utf-8');
    this.params = JSON.parse(data);
    logger.info('Loaded parameters', this.params);
  }

  async run(symbol: string, timeframe: string, intervalMs: number) {
    await this.loadParams();
    
    logger.info(`Starting paper trader: ${symbol} ${timeframe}`);
    
    setInterval(async () => {
      try {
        // Fetch latest candles
        const candles = await this.fetcher.fetchOHLCV(symbol, timeframe, undefined, 500);
        
        // Run strategy
        const signals = smaRsiStrategy(candles, this.params.parameters);
        
        // Get latest signal
        const latestSignal = signals[signals.length - 1];
        
        if (latestSignal) {
          logger.info('Signal detected', latestSignal);
          
          if (latestSignal.type === 'BUY' && this.position === 'NONE') {
            this.entryPrice = latestSignal.price;
            this.position = 'LONG';
            logger.info(`📈 OPENED LONG @ ${this.entryPrice}`);
            // TODO: Execute on exchange (testnet)
          } else if (latestSignal.type === 'SELL' && this.position === 'LONG') {
            const pnl = latestSignal.price - this.entryPrice;
            const pnlPercent = (pnl / this.entryPrice) * 100;
            logger.info(`📉 CLOSED LONG @ ${latestSignal.price} | PnL: ${pnlPercent.toFixed(2)}%`);
            this.position = 'NONE';
            // TODO: Execute on exchange (testnet)
          }
        }
      } catch (error) {
        logger.error('Error in paper trader loop', error);
      }
    }, intervalMs);
  }
}
```

**Actions:**
- [ ] Implement basic paper trader
- [ ] Add logging with Pino
- [ ] Store trades in SQLite/PostgreSQL
- [ ] Connect to exchange testnet (Binance, Bybit)

---

### 3.2 Webhook Server (TradingView Integration)

**File**: `src/bot/webhook-server.ts`

```typescript
import Fastify from 'fastify';
import { logger } from '../utils/logger';
import { z } from 'zod';

const WebhookPayloadSchema = z.object({
  action: z.enum(['BUY', 'SELL', 'CLOSE']),
  symbol: z.string(),
  price: z.number(),
  timestamp: z.string(),
  secret: z.string(),  // Verify it's from your TradingView
});

const fastify = Fastify({ logger: true });

fastify.post('/webhook', async (request, reply) => {
  try {
    const payload = WebhookPayloadSchema.parse(request.body);
    
    // Verify secret
    if (payload.secret !== process.env.WEBHOOK_SECRET) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    logger.info('Received TradingView webhook', payload);
    
    // TODO: Execute trade on exchange
    // await executeTradeOnExchange(payload);
    
    return { status: 'received', payload };
  } catch (error) {
    logger.error('Webhook error', error);
    return reply.code(400).send({ error: 'Invalid payload' });
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    logger.info('Webhook server listening on port 3000');
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();
```

**TradingView Pine Script Setup:**
```pine
//@version=5
strategy("My Strategy Webhook", overlay=true)

// Your strategy logic
longCondition = ta.crossover(ta.sma(close, 50), ta.sma(close, 200))
if (longCondition)
    strategy.entry("Long", strategy.long)
    alert('{"action":"BUY","symbol":"BTCUSDT","price":' + str.tostring(close) + ',"timestamp":"' + str.tostring(time) + '","secret":"YOUR_SECRET_HERE"}', alert.freq_once_per_bar)
```

**Actions:**
- [ ] Create webhook server with Fastify
- [ ] Add authentication (secret token)
- [ ] Set up TradingView alert → webhook
- [ ] Test end-to-end flow

---

### 3.3 Exchange Integration (Paper/Testnet)

**File**: `src/bot/exchange.ts`

```typescript
import ccxt from 'ccxt';
import { logger } from '../utils/logger';

export class ExchangeClient {
  private exchange: ccxt.Exchange;

  constructor(exchangeName: string, testnet: boolean = true) {
    const ExchangeClass = ccxt[exchangeName];
    this.exchange = new ExchangeClass({
      apiKey: process.env.API_KEY,
      secret: process.env.API_SECRET,
      enableRateLimit: true,
    });

    // Enable testnet
    if (testnet) {
      this.exchange.setSandboxMode(true);
    }
  }

  async placeMarketOrder(symbol: string, side: 'buy' | 'sell', amount: number) {
    try {
      const order = await this.exchange.createMarketOrder(symbol, side, amount);
      logger.info(`Order placed: ${side} ${amount} ${symbol}`, order);
      return order;
    } catch (error) {
      logger.error('Failed to place order', error);
      throw error;
    }
  }

  async getBalance() {
    return await this.exchange.fetchBalance();
  }

  async getPosition(symbol: string) {
    // For futures exchanges
    const positions = await this.exchange.fetchPositions([symbol]);
    return positions.find(p => p.symbol === symbol);
  }
}
```

**Actions:**
- [ ] Implement ExchangeClient with ccxt
- [ ] Test with Binance Testnet
- [ ] Add error handling & retries
- [ ] Log all trades to database

---

## Phase 4: Deployment & Monitoring (Week 5)

### 4.1 Dockerization

**File**: `docker/Dockerfile.bot`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

CMD ["node", "dist/bot/paper-trader.js"]
```

**File**: `docker/docker-compose.yml`

```yaml
version: '3.8'

services:
  bot:
    build:
      context: ..
      dockerfile: docker/Dockerfile.bot
    env_file:
      - ../.env
    volumes:
      - ../config:/app/config
      - ../logs:/app/logs
    restart: unless-stopped

  webhook:
    build:
      context: ..
      dockerfile: docker/Dockerfile.bot
    command: node dist/bot/webhook-server.js
    ports:
      - "3000:3000"
    env_file:
      - ../.env
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: trading_bot
      POSTGRES_USER: bot
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  postgres_data:
  grafana_data:
```

**Actions:**
- [ ] Create Dockerfiles
- [ ] Test local Docker build
- [ ] Set up docker-compose for full stack

---

### 4.2 Cloud Deployment

**Options:**
- **Railway**: Easy, free tier, auto-deploy from GitHub
- **Render**: Similar to Railway, good free tier
- **DigitalOcean App Platform**: $5/month, more control
- **AWS ECS Fargate**: Production-grade, more complex

**Actions:**
- [ ] Choose platform (recommend Railway for start)
- [ ] Connect GitHub repo
- [ ] Set environment variables
- [ ] Deploy and test

---

### 4.3 Monitoring & Alerts

**File**: `src/utils/logger.ts`

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        options: { colorize: true },
      },
      {
        target: 'pino/file',
        options: { destination: 'logs/app.log' },
      },
    ],
  },
});
```

**Metrics to Track:**
- Number of signals generated
- Number of trades executed
- Win rate
- Current PnL
- Exchange API latency
- Error rate

**Alerting:**
- Set up Discord/Telegram bot for trade notifications
- Email alerts for critical errors
- Grafana dashboards for visual monitoring

**Actions:**
- [ ] Set up Pino logging
- [ ] Create Grafana dashboard
- [ ] Add Discord/Telegram notifications
- [ ] Set up error alerting (Sentry optional)

---

## Phase 5: Iteration & New Strategies (Ongoing)

### 5.1 Adding New Strategies

**Process:**
1. Implement in `src/core/strategies/newStrategy.ts`
2. Create golden fixture
3. Implement Python version
4. Run parity tests
5. Backtest with vectorbt
6. Optimize parameters
7. Deploy to paper trading
8. Monitor for 2+ weeks
9. If profitable → consider live trading

### 5.2 Strategy Ideas to Implement

1. **Bollinger Bands + RSI**
2. **MACD + Volume**
3. **Mean Reversion (RSI extremes)**
4. **Breakout Strategy (ATR + Volume)**
5. **Multi-timeframe Strategy** (1h + 4h confirmation)
6. **LLM Sentiment Overlay** (news/Twitter sentiment as filter)

---

## 🔧 Tech Stack Summary

### TypeScript
- **Runtime**: Node.js 20+
- **Validation**: Zod
- **HTTP**: Fastify
- **Logging**: Pino
- **Testing**: Jest
- **Exchange**: ccxt
- **Indicators**: technicalindicators (or custom)

### Python
- **Backtesting**: vectorbt, backtrader
- **Data**: pandas, numpy
- **Optimization**: optuna
- **Validation**: pydantic
- **Indicators**: pandas-ta, ta-lib

### Infrastructure
- **Database**: PostgreSQL (or SQLite for simple)
- **Deployment**: Docker + Railway/Render
- **Monitoring**: Grafana + Prometheus
- **Alerts**: Discord/Telegram bot

---

## 📊 Success Metrics

### Development
- [ ] TS/Python strategies produce identical signals (parity tests pass)
- [ ] Backtest runs on 3+ years of data
- [ ] At least 2 strategies implemented
- [ ] 80%+ test coverage

### Performance
- [ ] Sharpe ratio > 1.0 on backtest
- [ ] Max drawdown < 20%
- [ ] Win rate > 50%
- [ ] Positive returns over 6+ months paper trading

### Production
- [ ] Bot runs 24/7 without crashes
- [ ] Latency < 1 second for signal → execution
- [ ] All trades logged to database
- [ ] Real-time monitoring dashboard

---

## 🚀 Next Steps

**Immediate (This Week):**
1. ✅ Create GitHub repo
2. ✅ Initialize TS/Python projects
3. ✅ Implement core types & schemas
4. ✅ Build first indicator (SMA)
5. ✅ Create SMA-RSI strategy

**Week 1:**
- Complete all basic indicators
- Implement TS backtester
- Create first golden fixture
- Fetch historical data from Binance

**Week 2:**
- Set up Python environment
- Implement vectorbt backtester
- Run parameter optimization
- Validate strategy on out-of-sample data

**Week 3:**
- Build paper trading bot
- Deploy to testnet
- Set up logging & monitoring

**Week 4:**
- Create webhook server
- Connect TradingView alerts
- Dockerize everything

**Week 5+:**
- Deploy to cloud
- Monitor performance
- Add new strategies
- Iterate based on results

---

## 📚 Resources

### Learning
- **Technical Analysis**: "Technical Analysis of Financial Markets" by John Murphy
- **Algorithmic Trading**: "Quantitative Trading" by Ernest Chan
- **Backtesting**: vectorbt documentation
- **ccxt**: Official docs (https://docs.ccxt.com)

### APIs & Data
- **Binance Testnet**: testnet.binance.vision
- **Alpaca**: alpaca.markets (free paper trading)
- **Polygon.io**: Free tier for market data
- **CoinGecko**: Free crypto prices API

### Communities
- r/algotrading
- QuantConnect forums
- ccxt Telegram/Discord

---

## ⚠️ Important Notes

1. **Start Small**: Don't trade real money until 6+ months of successful paper trading
2. **Risk Management**: Never risk > 1-2% of capital per trade
3. **Overfitting**: Always validate on out-of-sample data
4. **Market Regimes**: Strategies that work in bull markets may fail in bear markets
5. **Fees Matter**: 0.1% trading fees can turn profitable strategies unprofitable
6. **Slippage**: Backtest results !== live results (account for 0.05-0.1% slippage)
7. **Keep Learning**: Markets evolve, strategies decay, keep iterating

---

## 🎯 End Goal

A production-ready, modular algorithmic trading system that:
- ✅ Runs 24/7 in the cloud
- ✅ Supports multiple strategies
- ✅ Has comprehensive backtesting
- ✅ Logs all trades & performance
- ✅ Sends real-time alerts
- ✅ Can be easily extended with new strategies
- ✅ Is fully open-source on your GitHub

**Let's build this! 🚀**

