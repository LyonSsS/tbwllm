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

- **198 `StrategySpec` JSONs** in `strategies/specs/pending/`, from four sources
  (2026-09 sourcing expansion — see "Strategy sourcing" below): a 10-page
  unfiltered TradingView crawl + 5 pages of the quality-filtered
  `/scripts/editors-picks/` listing (134 + 35), 5 hand-authored classic
  systematic strategies, and 24 translated from freqtrade's official strategy
  repo.
- **20 assemble with zero hand-work** (up from 8 pre-sourcing-expansion).
- `strategies/curation.json` — 14 entries: 6 curated-skip (`not-a-strategy`), 5 manual bindings/rewrites, plus 2 dead-but-kept.
- Most of the rest reference **custom market-structure logic** (FVGs, order blocks, bespoke scores) that standard indicators can't express — confirmed by the analyser clean-up below, not just assumed. See `docs/triage.md`. The freqtrade slice's gap is different: mostly indicators we don't support yet (MFI, STOCHF, SAR, TEMA), not custom logic — see "Strategy sourcing" below.

### Strategy sourcing (2026-09)

Rethought from "scrape more Pine scripts" to three deliberate sources, since
well-known strategies alone are likely arbitrage-decayed and random scraped
scripts are unvetted noise:
1. **Hand-authored classics** — 5 well-documented systematic strategies (Donchian/Turtle
   breakout, RSI(2) mean reversion, MACD cross, Bollinger bounce, SuperTrend flip)
   written straight into `StrategySpec`, bypassing Pine parsing entirely.
2. **Quality-filtered TradingView scraping** — `TV_SCRIPTS_PATH=/scripts/editors-picks/`
   (the scraper already supported this via env var) replaces the unfiltered
   `/scripts/` default going forward. Surfaced and fixed a real bug: the page-resume
   DB tracked "page N scraped" globally with no awareness of which listing it came
   from — fixed with a migration to a `(page_num, listing_path)` key.
3. **freqtrade's official strategy repo** — a new parser
   (`src/ingestion/freqtradeParser.ts`) translates `IStrategy` Python strategies
   (TA-Lib indicators, qtpylib crossovers, pandas `.shift(n)`) into `StrategySpec`.
   24/64 files translate; 6 assemble — the rest mostly need indicators we don't
   support yet, not parser work. Surfaced and fixed a real `assembler.ts` gap: an
   unrecognised function name in a condition threw uncaught during signal
   evaluation, crashing the whole `--all` run instead of failing that one spec
   gracefully — the parser now validates every translated condition before
   writing it, but the underlying assembler gap is still there for any other
   source (small hardening item, not yet done).

## Key finding

On BTC/USDT, across 1h / 4h / 1d and 3 / 5 / 8-year windows: **no strategy beats
buy-and-hold BTC.** Buy-and-hold returned +2191% over 8 years; the best strategy
(EMA Trend Signals on 1d) did +806%. Each strategy has a "home" timeframe —
RSI+Bollinger swings from −100% on 1h to +116% on 1d — but none clears the bar.

This is a real result, not a bug: the backtester was validated (the earlier
+3562% figure was an assembler flaw, since fixed). It means chasing more assembler
coverage is only worth it once a strategy *family* shows edge under a proper
parameter sweep.

### Parameter sweep — walk-forward out-of-sample (2026-09, rebuilt)

`yarn sweep --all` random-searches each assemblable spec's parameters, scored
across an **anchored walk-forward split**, not one static train/test cut: history
divides into `folds+1` (default 4+1) equal chronological blocks, and fold *i*
trains on every block before it (expanding window), testing on the next block it
has never seen. A strategy only counts as `holds` if it holds on **≥75% of
folds**, not one lucky split. Result → `strategies/results/SWEEP.md`.

This replaced a single static 67/33 split, which was itself a form of
overfitting once you consider that one cut was arbitrarily chosen among many
possible ones — confirmed by the rebuild: `ema-50-200-cross`, the old method's
best case (train 1.08 → test 0.86, *marginal*), drops to *weak*/*marginal* across
every timeframe under walk-forward, meaning that result was a lucky split, not a
real edge.

**One strategy holds up: `smart-buy-sell-indicator-v1-0` on BTC/USDT 1h — 3/4
folds hold, avg test Sharpe 0.99.** Everything else (30 spec×timeframe
combinations tested) lands marginal, weak, overfit, or no-signal. Two EUR/USD
daily leads that looked promising under the old single-split backtest
(`smart-buy-sell-indicator-v1-0` and `classic-bollinger-bounce`, both showed
"beats buy-and-hold" in `RANKING.md`) were run through this same walk-forward
sweep and **both came back WEAK (0/4 folds hold)** — confirming those were
single-split noise, not real edge. The one crypto result above is the first
strategy to clear the strict bar anywhere in the project so far, and is the
natural next candidate for a promotion gate / paper-trading validation.

## Next steps (priority order)

0. **Promotion gate + paper trading for `smart-buy-sell-indicator-v1-0` @ 1h.**
   The first strategy to clear the walk-forward bar (see above). `strategies/approved/`
   and the gate itself are still unbuilt (item 6 below) — build the gate on the
   walk-forward method directly, then a paper-trading shadow period before anything
   resembling live execution. `src/bot/` doesn't exist yet.
1. ~~**Parameter sweep + out-of-sample.**~~ Done, then **rebuilt as walk-forward**
   (2026-09) — `yarn sweep --all`, results in `strategies/results/SWEEP.md`. See
   "Parameter sweep" above for the current methodology and finding.
2. ~~**Analyser clean-up ("a′").**~~ Done, with a lower yield than hoped: assemblable
   went 6 → 7, not to ~15-25. Real root causes fixed: (a) **68% of scraped raw
   `.pine` files use CRLF line endings**, which silently broke every
   `//comment$`-anchored regex and `[^\n]+` line capture in the analyser —
   normalized once in `analyzePineScript`; (b) multi-line boolean expressions
   (`x = a and\n b`) were truncated at the first newline — `findAssignment` now
   pulls in continuation lines while the expression ends on a dangling
   `and/or/not` or has unclosed parens; (c) `alertcondition(...)` / `plotshape(...)`
   argument extraction split on the first comma, truncating calls with their own
   nested commas (`ta.crossover(a, b)`) — now paren-aware. Together these took
   unparseable-condition failures from 16 → 0 and fixed several more silently-
   garbled (but not error-throwing) conditions. Added `HIGHEST_HIGH` / `LOWEST_LOW`
   / `MACD` / `STOCH` to `INDICATOR_MAP` (only `combo-oscillator-macd-stoch-rsi-ema`
   newly assembles, 0 signals). **Conclusion: the ~127 non-assembling specs are
   genuinely custom market-structure logic, not analyser bugs** — confirmed, not
   assumed. One more analyser gap found but *not* fixed (new scope): many
   scripts set a signal flag via `if <real condition>\n    flag := true` rather
   than `flag = <expression>` — `resolveCondition` currently resolves the flag to
   the literal `true` (and drops it) instead of the guarding `if`'s condition.
   Affects several of the 17 no-condition specs; worth a future PR with its own
   review (needs indentation-aware block scanning, more failure-prone than the
   fixes above).
3. ~~**Multi-asset data.**~~ Done (2026-09) — `yahoo` provider in
   `src/data/fetcher.ts` (no key, covers both indices/stocks and FX crosses
   through one endpoint). S&P 500 and EUR/USD run daily alongside crypto in
   `yarn backtest --all`, reusing crypto's own 3/5/8-year window list. Known
   gap: Yahoo's FX data always reports volume 0, so any strategy (mostly
   freqtrade-sourced ones) gating on `volume > 0` will never fire on EUR/USD.
4. **Indicator gaps found via freqtrade sourcing.** Add MFI/STOCHF/SAR/TEMA to
   `INDICATOR_MAP` — smaller and more targeted than the custom-primitive layer
   below, and would likely unlock several more of the 24 already-parsed
   freqtrade specs without touching the parser.
5. **Custom-primitive layer (`docs/indicators.md` Phase I4).** Build FVG /
   order-block / market-structure detectors — but only for a primitive that
   unlocks *many* scripts, and only if step 1 shows its family is worth it.
6. **MTF binding.** `request.security(sym, "D", …)` drops the timeframe today, so
   multi-timeframe strategies collapse to identical series (e.g. `tp-sl-signals`).
7. **Promotion flow.** `strategies/approved/` and the promotion gate (Sharpe > 1,
   drawdown < 20%, ≥ 50 trades, holds ≥75% of walk-forward folds) are defined
   but unbuilt — see item 0 above, now has a real first candidate.

## Commands

```bash
yarn ingest:static --pages 1-N          # scrape N pages, no LLM (default listing)
TV_SCRIPTS_PATH=/scripts/editors-picks/ yarn ingest:static --pages 1-N   # quality-filtered listing
yarn ingest:freqtrade:fetch             # cache freqtrade's official strategy repo
yarn ingest:freqtrade [--report]        # translate the cache into StrategySpecs
yarn reanalyze [--clean|--report]       # rebuild Pine specs from the raw cache
yarn assemble <specId> | --all          # spec → signals; coverage table
yarn data:fetch BTC/USDT 1h 2017-01-01 2025-09-01           # source defaults to binance
yarn data:fetch '^GSPC' 1d 2016-09-29 2026-09-29 yahoo      # or EURUSD=X — indices/FX, no key
yarn backtest <specId> | --all          # 9-table ranking + RANKING.md + reports/
yarn sweep <specId> [--tf 1d] [--trials 300] [--folds 4]   # walk-forward param search
yarn sweep:all [--tf 1h,4h,1d] [--trials 200] [--folds 4]  # every assemblable spec → SWEEP.md
yarn typecheck                          # tsc --noEmit (there is no build step)
```

## Docs

- `docs/indicators.md` — the 3-layer indicator model and the assemble/skip decision logic
- `docs/triage.md` — when a custom strategy is worth building vs shelving
- `strategies/curation.json` — the manual overlay (skips + bindings)
- `strategies/results/SWEEP.md` — latest out-of-sample parameter sweep (tracked)
