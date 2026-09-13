# TBWLLM — Trading Bot with LLM

**Turns open-source TradingView Pine scripts into backtested trading strategies.**
TypeScript, no build step.

---

## Pipeline

```
TradingView /scripts/ (open-source, paginated)
  ↓  Playwright scraper → raw .pine cache (+ source URL)
  ↓  static analyzer: regex indicators, condition resolution, plotshape signals,
     title / timeframe / auto-binding                    (zero LLM tokens)
  ↓  StrategySpec JSON  +  curation.json manual overlay
  ↓  assembler: INDICATOR_MAP (trading-signals) + a no-eval condition evaluator
  ↓  (candles) → Signal[]
  ↓  backtest engine: vectorised sim, next-bar fills, fees, buy-&-hold benchmark
  ↓  RANKING.md — 9 tables (3 windows × 1h/4h/1d)
```

Everything flows through one Zod-validated `StrategySpec` (`src/core/types.ts`).

## Status

| Component | State |
|---|---|
| TradingView scraper | ✅ pagination, latest revision, raw cache, stealth, block-abort |
| Static analyzer | ✅ indicators, condition resolution, auto-binding, timeframe hints |
| `yarn reanalyze` (offline rebuild + curation overlay) | ✅ |
| Assembler (`StrategySpec` → `Signal[]`) | ✅ |
| OHLCV fetcher (ccxt/Binance, cached) | ✅ |
| Backtest engine + windows × timeframes ranking | ✅ |
| Parameter sweep + out-of-sample train/test split | ✅ (`yarn sweep:all` → `SWEEP.md`) |
| Analyser clean-up · multi-asset data · custom SMC indicators | ⬜ next |
| Live bot (`src/bot/`) | ⬜ not started |

**Corpus:** 134 strategy specs; 7 assemble from standard indicators; the rest
lean on custom market-structure logic (confirmed by an analyser clean-up pass,
not just assumed).

**Finding so far:** on BTC/USDT across 1h/4h/1d and 3/5/8-year windows, no
strategy beats buy-and-hold BTC — and none holds an edge under an out-of-sample
parameter sweep. See `docs/STATUS.md`.

## Commands

```bash
# Ingestion
yarn ingest:static --pages 1-10        # scrape 10 listing pages, static analysis
yarn reanalyze --clean                 # rebuild all specs from the raw cache (offline, ~0.5s)

# Assembly
yarn assemble --all                    # which specs assemble, and why the rest don't
yarn assemble <specId>                 # one spec → signals on synthetic candles

# Backtest
yarn data:fetch BTC/USDT 1h 2017-01-01 2025-09-01   # once; also 4h and 1d
yarn backtest --all                    # 9 tables → console + strategies/results/RANKING.md + reports/
yarn sweep <specId> --tf 1d            # param search on one spec, train/test split
yarn sweep:all                        # every assemblable spec → strategies/results/SWEEP.md

# Dev
yarn typecheck                         # tsc --noEmit (no build artifact)
```

Binance public market data needs no API key. The LLM enrichment path
(`yarn ingest`) needs `ANTHROPIC_API_KEY` and is currently unused.

## Layout

```
src/
  core/types.ts          Zod schemas — StrategySpec is the contract
  core/indicators/       barrel; Layer-3 custom indicators go here (none yet)
  ingestion/             scraper, analyzer, db, pipeline, reanalyze, curation
  assembly/              indicatorMap, conditionEval, assembler, cli
  data/                  ccxt OHLCV fetcher + cli
  backtest/              engine, run (ranking), sweep
strategies/
  specs/pending/         134 StrategySpec JSONs (tracked)
  curation.json          manual overlay: skips + bindings (tracked)
  raw/                   cached .pine sources (gitignored)
  results/RANKING.md     latest backtest leaderboard (tracked)
data/ohlcv/              cached candle data (gitignored)
reports/                 timestamped backtest reports (gitignored)
docs/
  STATUS.md              current state + next steps — read first
  indicators.md          the 3-layer indicator model
  triage.md              when to pursue / shelve a custom strategy
```

## Promotion criteria

`specs/pending/` → `strategies/approved/`: manual review · Sharpe > 1.0 · max
drawdown < 20% · ≥ 50 trades · out-of-sample also passes. (Gate not yet built.)
