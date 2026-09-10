# Status — where the project is (2026-09)

Read this first. It's the current state, the key finding, and what to do next.

## What the system does

Scrapes open-source TradingView Pine scripts → extracts a `StrategySpec` JSON per
script (static analysis, no LLM) → assembles the spec into runnable buy/sell
signals → backtests those signals on real price history over multiple windows and
timeframes.

```
TradingView /scripts/  →  scraper  →  raw .pine cache
                                          │
                          static analyzer (regex + condition resolution)
                                          │
                       StrategySpec JSON  +  curation.json overlay
                                          │
                             assembler (INDICATOR_MAP + condition evaluator)
                                          │
                        (candles) → Signal[]  →  backtest engine  →  RANKING.md
```

## Pipeline stages (all built, all TypeScript)

| Stage | Where | State |
|---|---|---|
| **Ingestion** | `src/ingestion/` | Working. `/scripts/page-N/` pagination, latest revision, raw `.pine` + `.url` cache, open-source only, persistent-context stealth, block detection. Static analyzer: indicator regexes, `ta.*` catch-all, bare-identifier condition resolution, plotshape signals, UI-param filter, title + timeframe extraction, auto-binding of `X = ta.foo(src, len)`. SQLite resume state. LLM enrichment path exists but is unused (no API key). |
| **Re-analysis** | `yarn reanalyze` | Rebuild every spec from the raw cache in ~0.5s, no scraping. `curation.json` overlay per rawHash: `skip` + `category`, or manual `bindings` / `entry` merged over the static result. `--clean` / `--report`. |
| **Assembly** | `src/assembly/` | `INDICATOR_MAP` (`indicatorMap.ts`) wraps `trading-signals` (~18 indicators) + source-composition (`BB of RSI`). `conditionEval.ts` — parser + vectorised evaluator for the condition mini-language, no `eval`. `assembler.ts` — spec → `(candles) => Signal[]`; two-sided strategies stop-and-reverse; unresolved identifiers → `{ unassemblable, missing }`. `yarn assemble <id> | --all`. |
| **Data** | `src/data/fetcher.ts` | ccxt / Binance public OHLCV, no API key, provider-abstracted (forex/stocks later), cached to `data/ohlcv/`. `yarn data:fetch BTC/USDT <tf> <from> <to>`. Warns when the exchange has less history than requested. |
| **Backtest** | `src/backtest/` | `engine.ts` — one-position vectorised sim, next-bar fills, bps cost, buy-&-hold benchmark. `yarn backtest --all` → 9 tables (3 windows × 3 timeframes) to console + `strategies/results/RANKING.md` + a timestamped `reports/*.txt`. `yarn sweep <id>` — random parameter search. |

## The corpus

- **134 `StrategySpec` JSONs** in `strategies/specs/pending/` (from a 10-page crawl).
- **6 assemble with zero hand-work**; ~4 of those produce real signals (the EMA/RSI ones), 2 assemble but never trigger (bespoke score, MTF binding gap).
- `strategies/curation.json` — 14 entries: 6 curated-skip (`not-a-strategy`), 5 manual bindings/rewrites, plus 2 dead-but-kept.
- The other ~120 reference **custom market-structure logic** (FVGs, order blocks, bespoke scores) that standard indicators can't express. See `docs/triage.md`.

## Key finding

On BTC/USDT, across 1h / 4h / 1d and 3 / 5 / 8-year windows: **no strategy beats
buy-and-hold BTC.** Buy-and-hold returned +2191% over 8 years; the best strategy
(EMA Trend Signals on 1d) did +806%. Each strategy has a "home" timeframe —
RSI+Bollinger swings from −100% on 1h to +116% on 1d — but none clears the bar.

This is a real result, not a bug: the backtester was validated (the earlier
+3562% figure was an assembler flaw, since fixed). It means chasing more assembler
coverage is only worth it once a strategy *family* shows edge under a proper
parameter sweep.

## Next steps (priority order)

1. **Parameter sweep + out-of-sample.** Sweep the ~6 assemblable strategies on
   their home timeframe; split the data (tune on the first 2/3, score on the last
   1/3) to catch overfitting. Only after this do we know if any idea has edge.
2. **Analyser clean-up ("a′").** ~33 specs fail on *our* bugs, not on being
   custom: 16 have truncated conditions, 17 have no conditions. Fixing those +
   adding `HIGHEST_HIGH` / `LOWEST_LOW` / `MACD` / `STOCH` to `INDICATOR_MAP`
   would raise assemblable from 6 to ~15-25.
3. **Multi-asset data.** Add a forex/stock OHLCV provider so the non-crypto
   strategies (gold barometer, etc.) get a fair test.
4. **Custom-primitive layer (`docs/indicators.md` Phase I4).** Build FVG /
   order-block / market-structure detectors — but only for a primitive that
   unlocks *many* scripts, and only if step 1 shows its family is worth it.
5. **MTF binding.** `request.security(sym, "D", …)` drops the timeframe today, so
   multi-timeframe strategies collapse to identical series (e.g. `tp-sl-signals`).
6. **Promotion flow.** `strategies/approved/` and the promotion gate (Sharpe > 1,
   drawdown < 20%, ≥ 50 trades, out-of-sample) are defined but unbuilt.

## Commands

```bash
yarn ingest:static --pages 1-N          # scrape N pages, no LLM
yarn reanalyze [--clean|--report]       # rebuild specs from the raw cache
yarn assemble <specId> | --all          # spec → signals; coverage table
yarn data:fetch BTC/USDT 1h 2017-01-01 2025-09-01
yarn backtest <specId> | --all          # 9-table ranking + RANKING.md + reports/
yarn sweep <specId> [--trials 300]      # random parameter search
yarn typecheck                          # tsc --noEmit (there is no build step)
```

## Docs

- `docs/indicators.md` — the 3-layer indicator model and the assemble/skip decision logic
- `docs/triage.md` — when a custom strategy is worth building vs shelving
- `strategies/curation.json` — the manual overlay (skips + bindings)
