# TBWLLM - Action Plan

**Goal**: Scrape TradingView open-source Pine Script strategies → extract structured StrategySpec JSON → backtest → run live on Binance.

---

## Current state (2026-09) — see `docs/STATUS.md` for detail

- **Phases 1–4 are done**, all in TypeScript. Phase 3 was built as a TS
  vectorised backtester, **not** Python/vectorbt/Optuna as originally planned
  (the repo stayed single-language).
- Corpus: **134 StrategySpecs**; **6 assemble** from standard indicators.
- Backtested on BTC/USDT across 1h/4h/1d and 3/5/8-year windows: **no strategy
  beats buy-and-hold BTC**. The backtester is validated.
- Parameter sweep + out-of-sample train/test split (`yarn sweep:all` →
  `strategies/results/SWEEP.md`): **no assemblable strategy holds an edge** on
  the unseen last third — best is *marginal*, the strong-on-train configs are
  *overfit*.
- **Next:** analyser clean-up (raise assemblable to ~15-25) → multi-asset data →
  custom SMC indicators (only if a family shows edge) → live bot (Phase 5, not
  started).

The phase sections below are the original plan, kept for reference. Status tags
updated; the Python specifics in Phase 3 were superseded by the TS implementation.

---

## The Central Contract: `StrategySpec`

Everything flows through a single Zod-validated JSON. It is the output of the ingestion pipeline, the input to the backtester, and the input to the live bot.

Five strategy types: `condition` | `pattern` | `scored` | `mtf_scored` | `session`

Key fields:
```json
{
  "id": "vwap-volatility-bands-abc123",
  "name": "VWAP Volatility Bands",
  "source": "https://www.tradingview.com/script/...",
  "strategyType": "condition",
  "indicators": [
    { "type": "VWAP", "params": {}, "outputKey": "vwap" },
    { "type": "ATR",  "params": { "period": 14 }, "outputKey": "atr14" }
  ],
  "entry": {
    "direction": "BUY",
    "conditions": ["close > vwap", "close > upperBand"]
  },
  "exit": {
    "stopLossPercent": 1.5
  },
  "parameters": {
    "atrMult": 2.0
  },
  "parsedBy": "static",
  "confidence": 0.51,
  "rawHash": "abc123def456"
}
```

---

## Data Flow

```
TradingView /scripts/ (sorted by popularity)
  ↓  Playwright: listing page → extract script URLs
  ↓  Playwright: script page → read PUB ID from window.initData
  ↓  fetch pine-facade.tradingview.com/pine-facade/get/PUB;{id}/1
     (public API, no login, returns raw Pine Script for open-source scripts)
  ↓  Static analyzer: regex extraction of indicators, inputs, entry signals
     → StrategySpec partial (zero LLM tokens)
  ↓  If confidence < 0.50: Claude Haiku enrichment (skipped with --no-llm)
  ↓  strategies/specs/pending/{id}.json
  ↓  SQLite: scripts + pages tables (dedup, resume)

[manual review] → strategies/approved/{id}.json

python/backtest/runner.py  ← strategies/approved/{id}.json
  ↓  vectorbt: 3-5yr OHLCV → Sharpe, drawdown, trade count
  ↓  strategies/results/{id}.json

python/backtest/sweep.py (Optuna)
  ↓  parameter sweep → best variant promoted

src/bot/ (ccxt, Binance)
  ↓  paper → live
```

---

## Confidence Scoring

Static analyzer fills StrategySpec fields and scores confidence 0-1:

| Field present | Score |
|--------------|-------|
| strategyType | +0.20 |
| indicators | +0.20 |
| entry.direction | +0.20 |
| entry.conditions or trigger | +0.20 |
| parameters | +0.10 |
| exit | +0.10 |

Complexity penalty: `complex` ×0.6, `medium` ×0.85

Max achievable by complexity:
- `simple`: 1.0
- `medium`: 0.85
- `complex`: 0.60

LLM enrichment threshold: **0.50** — scripts above it are saved as-is from static analysis.
Use `--no-llm` flag to skip LLM entirely (zero API cost).

---

## Phase 1: Foundation (DONE)

- [x] TypeScript project + `tsconfig.json`
- [x] Core Zod schemas in `src/core/types.ts`
  - `Candle`, `Signal`, `StrategySpec`, `IndicatorConfig`, `EntrySchema`, `ExitSchema`
  - 5 strategy types: `condition`, `pattern`, `scored`, `mtf_scored`, `session`
  - Tiered score system schema
- [x] Basic indicators in `src/core/indicators/` (re-exports from `technicalindicators`)

---

## Phase 2: Ingestion Pipeline (DONE)

### Scraper: `src/ingestion/scraper.ts`

- [x] `scrapeScriptUrls(page, pageNum)` — extracts clean script URLs from listing pages
  - Strips fragment/query duplicates
  - Pagination via `?page=N`
- [x] `scrapeScriptSource(page, url)` — fetches Pine Script source
  - Reads PUB ID from `window.initData` (embedded JSON)
  - Calls `pine-facade.tradingview.com` API directly
  - Returns `null` for non-open-source scripts (`scriptAccess !== 'open_no_auth'`)

### Static Analyzer: `src/ingestion/analyzer.ts`

- [x] 17 indicator patterns (RSI, EMA, SMA, ATR, MACD, BB, STOCH, VWAP, ADX, CCI, WMA, HMA, MOM, TSI, PIVOT_HIGH, PIVOT_LOW, HIGHEST_HIGH, LOWEST_LOW)
- [x] `extractInputs()` — Pine `input.int/float/bool/string` → parameters map
- [x] `extractAlertConditions()`, `extractStrategyEntries()` — entry signal detection
- [x] `detectStrategyType()` — rules-based classification
- [x] `isTradeable()` — skip pure indicator/visualization scripts
- [x] `computeConfidence()` — 0-1 score with complexity penalty

### LLM Parser: `src/ingestion/parser.ts`

- [x] `enrichWithLLM()` — Claude Haiku, sends condensed partial spec + first 60 lines of Pine
- [x] `buildSpecFromStatic()` — constructs full StrategySpec from static analysis alone

### SQLite State: `src/ingestion/db.ts`

- [x] `scripts` table: url, status, spec_id, raw_hash, confidence, etc.
- [x] `pages` table: tracks which listing pages have been scraped
- [x] Resume-safe: `isPageScraped()`, `isScriptProcessed()` — skip already-done work

### Pipeline: `src/ingestion/pipeline.ts`

- [x] Orchestrates full flow across pages
- [x] Dry-run mode: no file writes, no DB changes
- [x] `--no-llm` support: saves static-only specs for all scripts

### CLI: `src/ingestion/cli.ts`

- [x] `--pages 1-5`, `--dry-run`, `--no-llm` flags
- [x] `yarn ingest`, `yarn ingest:dry`, `yarn ingest:static` scripts

### Validated results (dry run, page 1)

- 24 unique open-source script URLs found per page
- Pine Script source extraction: working (pine-facade API)
- Static analysis: ~16 tradeable out of 24 (8 skipped — pure indicators)
- Confidence range: 0.30–0.77 (mostly complex scripts)

---

## Phase 3: Backtest Engine (DONE — TypeScript, not Python)

### 3.1 Python vectorbt runner

**File**: `python/backtest/runner.py`

```bash
python python/backtest/runner.py --spec strategies/specs/pending/<id>.json
```

- [ ] Read StrategySpec JSON
- [ ] Load OHLCV from `data/ohlcv/` cache or fetch via ccxt
- [ ] Build entry/exit signals from `spec.entry.conditions` and `spec.exit`
- [ ] Run `vbt.Portfolio.from_signals()`
- [ ] Write results to `strategies/results/<id>.json`

Condition evaluation approach: map `"RSI < 30"`, `"close > EMA(200)"` to vectorbt boolean series.

### 3.2 Optuna sweep runner

**File**: `python/backtest/sweep.py`

```bash
python python/backtest/sweep.py --spec strategies/specs/pending/<id>.json
```

- [ ] For each `parameters` key in spec, define a search range
- [ ] Optuna maximize Sharpe over N trials
- [ ] Save top 50 variants to `strategies/results/<id>_sweep.json`

### 3.3 Data fetcher: `src/data/fetcher.ts`

- [ ] ccxt OHLCV fetcher with JSON cache in `data/ohlcv/`
- [ ] Format: `SYMBOL_TF_start_end.json`

---

## Phase 4: Strategy Assembler (DONE)

**File**: `src/assembly/assembler.ts`

Converts StrategySpec → runnable TypeScript strategy function: `(candles, params) → Signal[]`

- [ ] Map `StrategySpec.indicators[].type` → `technicalindicators` calls via `INDICATOR_MAP`
- [ ] Evaluate entry/exit conditions (no `eval` — parse to comparisons)
- [ ] The function must be pure: no I/O, no side effects

Supported indicator types: RSI, SMA, EMA, ATR, MACD, BollingerBands, Stochastic
Add new types by extending `INDICATOR_MAP` in the assembler.

---

## Phase 5: Live Trading (NOT STARTED)

- [ ] `src/bot/exchange.ts` — ccxt websocket, Binance, candle close events
- [ ] `src/bot/paper-trader.ts` — log signals, no real orders
- [ ] `src/bot/live-trader.ts` — real execution, gated by `ENABLE_LIVE_TRADING=true`

---

## Promotion Criteria

`strategies/specs/pending/` → `strategies/approved/` when:

1. Manual review passed
2. Sharpe ratio > 1.0
3. Max drawdown < 20%
4. At least 50 trades in backtest period
5. Out-of-sample test also passes the above

---

## Environment Variables

```bash
ANTHROPIC_API_KEY=    # Only needed without --no-llm flag
BINANCE_API_KEY=
BINANCE_SECRET=
ENABLE_LIVE_TRADING=false
```
