# CLAUDE.md

Guidance for Claude Code working in this repo. **For current state and what to do
next, read `docs/STATUS.md` first.**

## What this is

A pipeline that turns open-source TradingView Pine scripts into backtested trading
strategies: scrape → static-analyse into a `StrategySpec` → assemble into buy/sell
signals → backtest on real OHLCV. All TypeScript, run via `tsx` (no build step).

## Commands

```bash
yarn typecheck                          # tsc --noEmit — the only "build"
yarn lint                               # eslint (no config yet — errors, ignore)
yarn test                               # jest (no config/tests yet — errors, ignore)

yarn ingest:static --pages 1-N          # scrape N listing pages, static analysis only
yarn ingest:dry --pages 1-1             # scrape, write nothing
yarn reanalyze [--clean] [--report]     # rebuild every spec from strategies/raw/ cache, offline

yarn assemble <specId> | --all          # StrategySpec → Signal[]; --all = coverage table
yarn data:fetch BTC/USDT 1h 2017-01-01 2025-09-01   # cache OHLCV (ccxt/Binance, no key)
yarn backtest <specId> | --all          # --all = 9 tables (3 windows × 1h/4h/1d) + RANKING.md + reports/
yarn sweep <specId> [--tf 1d] [--trials 300]   # param search on one spec, train/test split
yarn sweep:all [--tf 1h,4h,1d]                 # sweep every assemblable spec → strategies/results/SWEEP.md
```

`yarn ingest` (with LLM enrichment) needs `ANTHROPIC_API_KEY` and is not currently
used — every run so far is `ingest:static`.

## The central contract: `StrategySpec`

Everything flows through one Zod-validated JSON (`src/core/types.ts`). It is the
output of the analyser, the input to the assembler, and the input to the
backtester.

```
raw .pine → analyzer → StrategySpec + curation.json overlay → assembler → (candles) => Signal[] → backtest
```

Specs live in `strategies/specs/pending/`. `curation.json` is a manual overlay
keyed by `rawHash`: either `{ skip, category }` to keep a script out of the
corpus, or a partial spec (`bindings`, `entry`) deep-merged over the static
result (then `parsedBy: "manual"`).

## Architecture

| Stage | Path | Notes |
|---|---|---|
| Ingestion | `src/ingestion/` | `scraper.ts` (Playwright, `/scripts/page-N/`, `/last`, raw `.pine` + `.url` cache, persistent-context stealth), `analyzer.ts` (regex indicators, condition resolution, plotshape signals, title + timeframe + auto-binding), `db.ts` (SQLite resume), `pipeline.ts`, `parser.ts` (LLM enrichment — unused), `reanalyze.ts` (offline rebuild + curation). |
| Assembly | `src/assembly/` | `indicatorMap.ts` (`INDICATOR_MAP` over `trading-signals` + source-composition), `conditionEval.ts` (mini-language parser + vectorised evaluator, **no `eval`**), `assembler.ts` (spec → `Signal[]`, stop-and-reverse for two-sided strategies, `unassemblable` reporting), `cli.ts`. |
| Data | `src/data/fetcher.ts` | ccxt/Binance public OHLCV, provider-abstracted, cached to `data/ohlcv/`, warns on short history. |
| Backtest | `src/backtest/` | `engine.ts` (one-position sim, next-bar fills, bps cost, buy-&-hold benchmark), `run.ts` (windows × timeframes → `RANKING.md` + `reports/`), `sweep.ts` (random param search on a chronological train/test split → `SWEEP.md`). |

**Purity:** `assembler.run(candles) => Signal[]` and the backtest engine are pure —
no I/O, no side effects.

## Indicators — three layers

1. **Library** — `trading-signals` (maintained, 150+ indicators, zero-dep). Never
   reimplement one that exists there.
2. **`INDICATOR_MAP`** in `src/assembly/indicatorMap.ts` — maps a spec's indicator
   `type` string to `(ctx) => number[] | Record<string, number[]>`. Add a row to
   support a new type. A `source` on a binding computes an indicator on another
   binding's series (`BB of RSI`).
3. **Custom** (`src/core/indicators/`, not yet needed) — hand-written for what the
   library lacks: FVG, order blocks, market structure. Build only when a primitive
   unlocks *many* scripts. See `docs/indicators.md`.

## Key facts

- **Corpus:** 134 specs, **6 assemble**, ~4 produce signals. The rest use custom
  market-structure logic standard indicators can't express.
- **Backtest verdict:** on BTC/USDT, no strategy beats buy-and-hold on any
  timeframe or window, and none holds an edge under an out-of-sample parameter
  sweep (`strategies/results/SWEEP.md`). See `docs/STATUS.md`.
- `data/` and `strategies/raw/` and `reports/` are gitignored (local caches).
  `strategies/specs/pending/`, `curation.json`, `strategies/results/RANKING.md`,
  `strategies/results/SWEEP.md` are tracked.

## Config

- `tsconfig.json`: `strict`, `noUnusedLocals/Parameters`, `noImplicitReturns`,
  `noEmit`. ESNext modules. `*.test.ts` excluded.
- `.env` (only for the unused LLM path): `ANTHROPIC_API_KEY`, `BINANCE_*`
  (not needed — public market data), `ENABLE_LIVE_TRADING=false`.

## Promotion criteria (defined, gate not built)

`specs/pending/` → `strategies/approved/` when: manual review passed · Sharpe > 1.0
· max drawdown < 20% · ≥ 50 trades · out-of-sample also passes.
