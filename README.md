# TBWLLM - Trading Bot with LLM

**Automated trading strategy discovery, backtesting, and live execution | TypeScript + Python**

---

## What it does

Scrapes TradingView open-source Pine Script strategies → extracts structured `StrategySpec` JSON via static analysis (zero LLM tokens for most scripts) → backtests with Python/vectorbt → runs approved strategies live on Binance.

---

## Pipeline

```
TradingView /scripts/ pages (sorted by popularity, open-source only)
  ↓  Playwright loads each page, reads PUB ID from window.initData
  ↓  Fetches source from pine-facade.tradingview.com API (no login required)
  ↓  Static Pine Script analyzer → partial StrategySpec (regex, zero tokens)
  ↓  If confidence < 0.50 and --no-llm not set → LLM enrichment (Claude Haiku)
  ↓  StrategySpec JSON saved to strategies/specs/pending/
  ↓  SQLite tracks state (resume-safe, deduplication by URL)
  ↓
[manual review]
  ↓  promoted to strategies/approved/
  ↓
Python vectorbt backtest → strategies/results/<id>.json
  ↓  if Sharpe > 1.0, drawdown < 20%, >= 50 trades
  ↓
Live bot (ccxt, Binance) → paper first, then real execution
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Scraping | Playwright (Chromium headless) |
| Pine source API | `pine-facade.tradingview.com` (public, no auth) |
| Static analysis | Regex analyzer — zero LLM tokens |
| LLM enrichment | Claude Haiku (fallback only, `--no-llm` to skip) |
| Strategy contract | Zod `StrategySpec` schema |
| State tracking | SQLite via `better-sqlite3` |
| Backtesting | Python + vectorbt |
| Indicators | `technicalindicators` library |
| Live data | ccxt websocket (Binance) |

---

## Commands

```bash
# Ingestion
yarn ingest                          # Run pages 1-5, LLM enrichment enabled
yarn ingest --pages 1-2              # Scrape only pages 1-2
yarn ingest:static --pages 1-2      # Static analysis only — zero LLM tokens
yarn ingest:dry --pages 1-1         # Dry run: no files written, no DB changes

# Backtesting (Python)
python python/backtest/runner.py --spec strategies/specs/pending/<id>.json
python python/backtest/sweep.py --spec strategies/specs/pending/<id>.json

# Live trading
yarn bot:paper    # Paper trading with approved strategies
yarn bot:live     # Live trading (requires ENABLE_LIVE_TRADING=true)

# Development
yarn dev          # Hot reload
yarn build        # Compile to dist/
yarn test         # Jest
yarn lint         # ESLint
```

---

## Project Structure

```
tbwllm/
├── src/
│   ├── core/
│   │   ├── types.ts              # Zod schemas: StrategySpec, IndicatorConfig, etc.
│   │   └── indicators/           # Re-exports from technicalindicators
│   ├── ingestion/
│   │   ├── cli.ts                # Entry point: --pages, --dry-run, --no-llm flags
│   │   ├── pipeline.ts           # Orchestrates scrape → analyze → parse → save
│   │   ├── scraper.ts            # Playwright: listing pages + pine-facade API
│   │   ├── analyzer.ts           # Static Pine Script analysis (zero LLM)
│   │   ├── parser.ts             # LLM enrichment (Claude Haiku, fallback only)
│   │   └── db.ts                 # SQLite state: scripts + pages tables
│   ├── assembly/
│   │   └── assembler.ts          # StrategySpec → TS strategy function
│   ├── data/
│   │   └── fetcher.ts            # ccxt OHLCV fetcher + JSON cache
│   └── bot/
│       ├── paper-trader.ts       # Paper trading executor
│       └── exchange.ts           # ccxt websocket live feed (Binance)
├── python/
│   ├── backtest/
│   │   ├── runner.py             # vectorbt backtest runner
│   │   └── sweep.py              # Optuna parameter sweep
│   └── schemas/
│       └── models.py             # Pydantic models mirroring TS types
├── strategies/
│   ├── specs/pending/            # StrategySpec JSONs awaiting review
│   ├── approved/                 # Passed backtest thresholds
│   └── results/                  # Backtest result JSONs
└── data/
    ├── pipeline.db               # SQLite scrape state
    └── ohlcv/                    # Cached historical candle data
```

---

## Status

| Component | Status |
|-----------|--------|
| TradingView scraper (pine-facade API) | Done |
| Static Pine Script analyzer | Done |
| SQLite state tracker | Done |
| LLM enrichment (Claude Haiku fallback) | Done |
| Ingestion CLI | Done |
| Strategy assembler | Planned |
| Python vectorbt backtest | Planned |
| Optuna parameter sweep | Planned |
| Live bot (Binance) | Planned |

---

## Promotion Criteria

`pending/` → `approved/` requires:
1. Manual review (spec makes logical sense)
2. Sharpe ratio > 1.0
3. Max drawdown < 20%
4. At least 50 trades in backtest period
5. Out-of-sample test also passes the above

---

## Environment

```bash
ANTHROPIC_API_KEY=    # Only needed if LLM enrichment is enabled (no --no-llm)
BINANCE_API_KEY=
BINANCE_SECRET=
ENABLE_LIVE_TRADING=false
```
