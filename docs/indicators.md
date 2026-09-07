# Indicator subsystem — plan

How the system acquires the technical indicators a scraped strategy needs, and
how it decides what it can and cannot assemble.

## Principle

Never reimplement an indicator that a maintained library already provides.

- **Layer 1 — library.** `trading-signals` (v8, 150+ indicators, zero runtime
  deps, streaming-first, TypeScript-native). The default source for every
  standard indicator. Chosen over `technicalindicators` (last published 2020,
  ~35 indicators, missing HMA / TSI / MOM / SuperTrend / pivots).
- **Layer 2 — `INDICATOR_MAP`.** A table in `src/assembly/assembler.ts` mapping
  a StrategySpec indicator `type` string to a function `(candles, params) =>
  number[]`. Most rows wrap a Layer 1 class. This is the extension point: a new
  standard indicator is one row.
- **Layer 3 — `src/core/indicators/custom/`.** Hand-written, pure functions for
  what Layer 1 lacks: SMC / ICT structure (fair value gaps, order blocks, market
  structure, liquidity sweeps), PVSRA, anchored-VWAP bands, bespoke formulas.
  Added by frequency across the scraped corpus. `INDICATOR_MAP` rows for these
  point here instead of the library.

`src/core/indicators/index.ts` is the single barrel the assembler imports from —
curated Layer 1 re-exports today, plus Layer 3 once it exists.

## The three cases for a scraped strategy

| Case | Analyzer output | Assembler behaviour | Resolution |
|---|---|---|---|
| **A — all indicators known** | `spec.indicators` fully populated, high confidence | every `type` found in `INDICATOR_MAP` → builds the strategy fn | assemblable → backtest |
| **B — standard indicator not wired** | `type` present in spec (analyzer knows the name), library has it | `INDICATOR_MAP` miss → spec flagged `unassemblable`, reason `unmapped indicator: X` | add one `INDICATOR_MAP` row → becomes Case A |
| **C — custom / bespoke math** | `ta.*` regexes mostly miss; low confidence → LLM enrichment describes the logic as condition strings | references an `outputKey` no indicator produces → `unassemblable`, reason `custom logic: needs X` | hand-write X in Layer 3, add `INDICATOR_MAP` row, extend the condition evaluator; or mark the strategy class out of scope |
| **D — silent miss** | analyzer has no regex for `ta.X(...)`; `spec.indicators` quietly incomplete, nothing flags it | may assemble wrongly | Phase I3 catch-all scan surfaces unknown `ta.*` calls |

## Phases

| Phase | Scope | Depends on |
|---|---|---|
| **I0 — Library baseline** | Swap `technicalindicators` → `trading-signals`. Delete hand-rolled `sma/ema/rsi`. Establish `src/core/indicators/index.ts` barrel + `batchSeries()` helper. | — |
| **I1 — `INDICATOR_MAP` skeleton** | In the assembler: `Record<string, (candles, params) => number[]>`. Seed a row for every `type` the analyzer emits that `trading-signals` provides (RSI, EMA, SMA, WMA, HMA, MACD, ATR, BB, STOCH, CCI, ADX, VWAP, MOM, TSI; `HIGHEST_HIGH`/`LOWEST_LOW` → `SwingHigh`/`SwingLow` or a rolling max/min). Unmapped `type` → spec marked `unassemblable` with reason. | Phase 4 (assembler) |
| **I2 — Coverage sweep** | Dry-run the assembler over every spec in `strategies/specs/pending/`. Bucket: `assemblable` / `unmapped-standard` / `needs-custom`. Batch-add `INDICATOR_MAP` rows for the `unmapped-standard` bucket. | I1 |
| **I3 — Analyzer catch-all** | Add a `ta\.(\w+)\s*\(` scan to `analyzer.ts` that records every `ta.*` call, diffs against the known-pattern list, and reports unknown calls per script. Produces a prioritized "indicators we keep seeing but don't detect" list. | — (cheap, do early) |
| **I4 — Custom indicator layer** | `src/core/indicators/custom/`: fair value gap, order block, market structure (BOS / CHoCH), liquidity sweep, PVSRA, anchored-VWAP bands, pivot with lookback + offset. Each pure; output shape per indicator (series vs zones vs events). Build order by frequency across the corpus. | I2 (to know what's needed) |
| **I5 — Condition evaluator** | Parse condition strings (`"rsi14 < 30"`, `"close > ema200"`, `"price in fvgBull"`) into boolean series over indicator outputs + OHLC. No `eval` — a small expression parser. Vocabulary is defined by the indicator outputs available. | I1, I4 |
| **I6 — Streaming parity** | Give Layer 3 custom indicators an incremental `.update()` path (matching `trading-signals`' interface) so the live bot reuses the same code as the backtester. Assembler emits both a batch form and a streaming form. | Layer 4 (bot) |

Near-term critical path to a backtestable strategy: **I0 → (assembler) → I1 → I2**.
I3 is independent and worth doing early. I4 is the large piece and is corpus-driven.
