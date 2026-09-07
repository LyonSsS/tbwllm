# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev              # Run with hot reload (tsx watch)
yarn typecheck        # Type-check only (tsc --noEmit) — no build artifact
yarn test             # Run Jest tests
yarn test:watch       # Run tests in watch mode
yarn lint             # ESLint on src/

yarn ingest:url       # Scrape a URL and extract StrategySpec
yarn ingest:doc       # Parse a local document into StrategySpec

python python/backtest/runner.py --spec strategies/specs/<id>.json
python python/backtest/sweep.py --spec strategies/specs/<id>.json

yarn bot:paper        # Start paper trading bot
yarn bot:live         # Start live trading (requires ENABLE_LIVE_TRADING=true)
```

Run a single test file:
```bash
yarn test src/tests/strategies/smaRsi.test.ts
```

## The Central Contract: StrategySpec

**Everything flows through `StrategySpec`.** It is the output of the LLM parser, the input to the strategy assembler, and the input to the Python backtester. When in doubt about how a piece of the system should communicate, it uses a StrategySpec JSON.

```
URL/doc → scraper → Claude API → StrategySpec JSON → assembler → strategy fn → backtest/live
```

StrategySpec files live in `strategies/specs/`. Approved ones (passed backtest criteria) go in `strategies/approved/`.

## Architecture

**Pipeline stages:**
1. **Ingestion** (`src/ingestion/`) — Playwright scraper + Claude API parser → StrategySpec JSON
2. **Assembly** (`src/assembly/`) — StrategySpec → TS strategy function using `trading-signals` (Layer 1) + custom indicators (Layer 3)
3. **Backtest** (`python/backtest/`) — vectorbt runs 3-5yr history; Optuna does parameter sweeps
4. **Live** (`src/bot/`) — ccxt websocket feed (Binance CEX), paper trade first

**Key principle:** The strategy core is purely functional — `(candles, params) → signals`. No I/O, no side effects in strategy functions.

### Source layout

| Path | Purpose |
|------|---------|
| `src/core/types.ts` | All Zod schemas: `Candle`, `Signal`, `StrategySpec`, `IndicatorConfig`, etc. |
| `src/core/indicators/` | Layer 1: re-exports from `trading-signals`. Layer 3: custom indicators under `./custom`. See `docs/indicators.md` |
| `src/ingestion/scraper.ts` | Playwright scraper: URL or local file → raw text + image URLs |
| `src/ingestion/parser.ts` | Claude API call: ScrapeResult → StrategySpec (validated by Zod) |
| `src/assembly/assembler.ts` | StrategySpec → runnable TS strategy function |
| `src/data/fetcher.ts` | ccxt OHLCV fetcher with local JSON cache in `data/ohlcv/` |
| `src/bot/exchange.ts` | ccxt websocket live feed (Binance) |
| `src/bot/paper-trader.ts` | Paper trading executor |
| `python/backtest/runner.py` | vectorbt backtest: reads StrategySpec JSON, writes results JSON |
| `python/backtest/sweep.py` | Optuna parameter sweep across a StrategySpec |
| `strategies/specs/` | StrategySpec JSON files — source of truth for all strategies |
| `strategies/approved/` | Specs that passed: Sharpe > 1.0, drawdown < 20%, >= 50 trades |
| `strategies/results/` | Backtest result JSONs per spec |
| `data/ohlcv/` | Cached OHLCV data (format: `SYMBOL_TF_start_end.json`) |

### Indicator library

**Standard indicators come from `trading-signals` (Layer 1) — never reimplement one that exists there.** The assembler maps `StrategySpec.indicators[].type` to a function via `INDICATOR_MAP` in `src/assembly/assembler.ts`; add a row to support a new type. Indicators `trading-signals` lacks (SMC / ICT / bespoke) are hand-written under `src/core/indicators/custom/` (Layer 3). Full plan and the assemble/skip decision logic: `docs/indicators.md`.

### TypeScript config notes

- `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` are all enabled
- Test files (`*.test.ts`) are excluded from the build but included in Jest
- Module format is ESNext

### Key dependencies

- `zod` — all data validation and type inference
- `@anthropic-ai/sdk` — LLM parsing (Claude API)
- `playwright` — web scraping
- `ccxt` — exchange connectivity and websocket live feed
- `trading-signals` — standard indicator calculations (Layer 1)
- `pino` — structured logging
- `tsx` — runs TypeScript directly in dev/scripts

### Promotion criteria

A StrategySpec moves from `specs/pending/` to `approved/` only when:
1. Manual review passed
2. Sharpe ratio > 1.0
3. Max drawdown < 20%
4. At least 50 trades in the backtest period
5. Out-of-sample test also passes the above
