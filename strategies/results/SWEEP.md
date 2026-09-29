# Parameter sweep — walk-forward out-of-sample

_Generated 2026-09-29T12:16:44.319Z_

BTC/USDT · 200 trials per (spec × timeframe × fold) · min 5 train trades · 4 anchored walk-forward folds.
Each fold's best config is picked by **train** Sharpe on an expanding window; the **test** Sharpe is that config on the next untouched block. A strategy only counts as holding if it holds on most folds, not one.

| # | strategy | tf | folds held | avg te Shrp | verdict |
|---:|---|---:|---:|---:|---:|
| 1 | smart-buy-sell-indicator-v1-0… | 1h | 3/4 | 0.99 | holds |
| 2 | ema-rsi-vwap-targets-dcc640 | 4h | 1/4 | 0.70 | marginal |
| 3 | classic-supertrend-flip | 4h | 1/4 | 0.70 | marginal |
| 4 | ema-trend-signals-066536 | 1d | 1/4 | 0.69 | marginal |
| 5 | rsi-with-bollinger-bands-246a… | 4h | 1/4 | 0.58 | marginal |
| 6 | classic-supertrend-flip | 1h | 1/4 | 0.51 | marginal |
| 7 | ema-trend-signals-066536 | 1h | 1/4 | 0.45 | marginal |
| 8 | ema-trend-signals-066536 | 4h | 1/4 | 0.43 | marginal |
| 9 | rsi-with-bollinger-bands-246a… | 1h | 1/4 | 0.41 | marginal |
| 10 | classic-donchian-turtle-break… | 4h | 1/4 | 0.19 | marginal |
| 11 | classic-rsi2-mean-reversion | 4h | 1/4 | 0.13 | marginal |
| 12 | smart-buy-sell-indicator-v1-0… | 4h | 0/4 | 0.52 | marginal |
| 13 | ema-50-200-cross-trend-barome… | 1h | 0/4 | 0.50 | weak |
| 14 | ema-rsi-vwap-targets-dcc640 | 1h | 0/4 | 0.41 | weak |
| 15 | smart-buy-sell-indicator-v1-0… | 1d | 0/4 | 0.36 | marginal |
| 16 | ema-50-200-cross-trend-barome… | 4h | 0/4 | 0.31 | marginal |
| 17 | classic-macd-signal-cross | 1d | 0/4 | 0.31 | weak |
| 18 | ema-rsi-vwap-targets-dcc640 | 1d | 0/4 | 0.27 | weak |
| 19 | classic-donchian-turtle-break… | 1d | 0/4 | 0.26 | marginal |
| 20 | rsi-with-bollinger-bands-246a… | 1d | 0/4 | 0.24 | marginal |
| 21 | classic-macd-signal-cross | 4h | 0/4 | 0.23 | weak |
| 22 | classic-rsi2-mean-reversion | 1d | 0/4 | 0.19 | weak |
| 23 | classic-bollinger-bounce | 1d | 0/4 | 0.18 | weak |
| 24 | classic-bollinger-bounce | 1h | 0/4 | 0.13 | marginal |
| 25 | ema-50-200-cross-trend-barome… | 1d | 0/4 | 0.12 | weak |
| 26 | classic-rsi2-mean-reversion | 1h | 0/4 | 0.08 | weak |
| 27 | classic-bollinger-bounce | 4h | 0/4 | −0.01 | weak |
| 28 | classic-macd-signal-cross | 1h | 0/4 | −0.05 | weak |
| 29 | classic-supertrend-flip | 1d | 0/4 | −0.07 | weak |
| 30 | classic-donchian-turtle-break… | 1h | 0/4 | −0.56 | weak |
| 31 | ai-predictive-flow-zeiierman-… | 1h | 0/4 | — | no signal |
| 32 | combo-oscillator-macd-stoch-r… | 1h | 0/4 | — | no signal |
| 33 | freqtrade-berlinguyinca-adxsm… | 1h | 0/4 | — | no signal |
| 34 | freqtrade-berlinguyinca-asdts… | 1h | 0/4 | — | no signal |
| 35 | freqtrade-berlinguyinca-bband… | 1h | 0/4 | — | no signal |
| 36 | freqtrade-berlinguyinca-freqt… | 1h | 0/4 | — | no signal |
| 37 | freqtrade-berlinguyinca-macds… | 1h | 0/4 | — | no signal |
| 38 | freqtrade-berlinguyinca-macds… | 1h | 0/4 | — | no signal |
| 39 | gold-macro-fiat-valuation-bar… | 1h | 0/4 | — | no signal |
| 40 | tp-sl-signals-days-zones-bb48… | 1h | 0/4 | — | no signal |
| 41 | ai-predictive-flow-zeiierman-… | 4h | 0/4 | — | no signal |
| 42 | combo-oscillator-macd-stoch-r… | 4h | 0/4 | — | no signal |
| 43 | freqtrade-berlinguyinca-adxsm… | 4h | 0/4 | — | no signal |
| 44 | freqtrade-berlinguyinca-asdts… | 4h | 0/4 | — | no signal |
| 45 | freqtrade-berlinguyinca-bband… | 4h | 0/4 | — | no signal |
| 46 | freqtrade-berlinguyinca-freqt… | 4h | 0/4 | — | no signal |
| 47 | freqtrade-berlinguyinca-macds… | 4h | 0/4 | — | no signal |
| 48 | freqtrade-berlinguyinca-macds… | 4h | 0/4 | — | no signal |
| 49 | gold-macro-fiat-valuation-bar… | 4h | 0/4 | — | no signal |
| 50 | tp-sl-signals-days-zones-bb48… | 4h | 0/4 | — | no signal |
| 51 | ai-predictive-flow-zeiierman-… | 1d | 0/4 | — | no signal |
| 52 | combo-oscillator-macd-stoch-r… | 1d | 0/4 | — | no signal |
| 53 | freqtrade-berlinguyinca-adxsm… | 1d | 0/4 | — | no signal |
| 54 | freqtrade-berlinguyinca-asdts… | 1d | 0/4 | — | no signal |
| 55 | freqtrade-berlinguyinca-bband… | 1d | 0/4 | — | no signal |
| 56 | freqtrade-berlinguyinca-freqt… | 1d | 0/4 | — | no signal |
| 57 | freqtrade-berlinguyinca-macds… | 1d | 0/4 | — | no signal |
| 58 | freqtrade-berlinguyinca-macds… | 1d | 0/4 | — | no signal |
| 59 | gold-macro-fiat-valuation-bar… | 1d | 0/4 | — | no signal |
| 60 | tp-sl-signals-days-zones-bb48… | 1d | 0/4 | — | no signal |

## Legend

- Anchored walk-forward: history → folds+1 equal blocks; fold i trains on every block before it (expanding window), tests on the next untouched block.
- holds    = that fold's best-by-train config keeps Sharpe > 1 and a positive return on its test block
- marginal = test Sharpe 0.5–1
- overfit  = strong on train (Sharpe > 1) but test Sharpe < 0.5
- weak     = no sampled config even reached train Sharpe > 1
- thin     = would hold but too few test trades to trust
- verdict  = aggregated across folds — HOLDS needs ≥75% of folds to individually hold, not just one
