# Parameter sweep — out-of-sample

_Generated 2026-09-10T09:35:44.061Z_

BTC/USDT · 150 trials per (spec × timeframe) · min 5 train trades · split train 67% / test 33% (chronological).
The best config is picked by **train** Sharpe; the **test** columns are that same config on the held-out last third.

| # | strategy | tf | tr Shrp | te Shrp | tr ret | te ret | te maxDD | te trd | verdict |
|---|---|---|---|---|---|---|---|---|---|
| 1 | ema-rsi-vwap-targets-dcc640 | 4h | 0.58 | 1.68 | +114.7% | +510.0% | 31% | 4 | weak |
| 2 | ema-rsi-vwap-targets-dcc640 | 1h | 0.66 | 1.58 | +195.6% | +447.2% | 32% | 3 | weak |
| 3 | ema-rsi-vwap-targets-dcc640 | 1d | 0.37 | 1.53 | −6.0% | +413.5% | 28% | 1 | weak |
| 4 | ema-trend-signals-066536 | 1d | 0.96 | 0.99 | +1009.5% | +158.8% | 63% | 15 | weak |
| 5 | ema-50-200-cross-trend-barome… | 4h | 1.08 | 0.86 | +1669.1% | +114.1% | 45% | 25 | marginal |
| 6 | ema-50-200-cross-trend-barome… | 1h | 0.82 | 0.65 | +505.3% | +67.2% | 46% | 89 | weak |
| 7 | rsi-with-bollinger-bands-246a… | 1h | 0.75 | 0.55 | +332.1% | +49.5% | 39% | 521 | weak |
| 8 | ema-trend-signals-066536 | 4h | 0.91 | 0.41 | +778.9% | +24.0% | 53% | 55 | weak |
| 9 | rsi-with-bollinger-bands-246a… | 4h | 1.26 | 0.30 | +3919.9% | +8.7% | 59% | 129 | overfit |
| 10 | ema-50-200-cross-trend-barome… | 1d | 0.74 | 0.00 | +301.4% | +0.0% | 0% | 0 | weak |
| 11 | rsi-with-bollinger-bands-246a… | 1d | 1.16 | −0.02 | +2338.8% | −27.2% | 63% | 43 | overfit |
| 12 | ema-trend-signals-066536 | 1h | 1.04 | −0.37 | +1511.7% | −53.7% | 73% | 528 | overfit |
| 13 | gold-macro-fiat-valuation-bar… | 1h | — | — | — | — | — | — | no signal |
| 14 | tp-sl-signals-days-zones-bb48… | 1h | — | — | — | — | — | — | no signal |
| 15 | gold-macro-fiat-valuation-bar… | 4h | — | — | — | — | — | — | no signal |
| 16 | tp-sl-signals-days-zones-bb48… | 4h | — | — | — | — | — | — | no signal |
| 17 | gold-macro-fiat-valuation-bar… | 1d | — | — | — | — | — | — | no signal |
| 18 | tp-sl-signals-days-zones-bb48… | 1d | — | — | — | — | — | — | no signal |

## Legend

- tr = train slice (first 67%, tuned on) · te = test slice (last 33%, unseen during search)
- holds    = best-by-train config keeps Sharpe > 1 and a positive return on the test slice
- marginal = test Sharpe 0.5–1
- overfit  = strong on train (Sharpe > 1) but test Sharpe < 0.5
- weak     = no sampled config even reached train Sharpe > 1
- thin     = would hold but too few test trades to trust
- no signal= nothing met the min-trades bar on train

## Best-by-train parameters

- `ema-rsi-vwap-targets-dcc640` @ 4h — `{"emaLength":110,"rsiLength":9,"rsiBuyLevel":52.681,"rsiSellLevel":52.9831,"target1Percent":1.8931,"target2Percent":5.6046,"target3Percent":8.8104,"stopLossPercent":2.4266}`
- `ema-rsi-vwap-targets-dcc640` @ 1h — `{"emaLength":417,"rsiLength":32,"rsiBuyLevel":69.9684,"rsiSellLevel":29.8405,"target1Percent":1.8418,"target2Percent":3.6167,"target3Percent":3.5492,"stopLossPercent":2.6167}`
- `ema-rsi-vwap-targets-dcc640` @ 1d — `{"emaLength":465,"rsiLength":23,"rsiBuyLevel":49.9087,"rsiSellLevel":30.49,"target1Percent":2.6075,"target2Percent":5.6212,"target3Percent":6.4209,"stopLossPercent":1.6673}`
- `ema-trend-signals-066536` @ 1d — `{"fastLen":26,"slowLen":38}`
- `ema-50-200-cross-trend-barometer-80e8e5` @ 4h — `{"fastLen":42,"slowLen":225}`
- `ema-50-200-cross-trend-barometer-80e8e5` @ 1h — `{"fastLen":22,"slowLen":494}`
- `rsi-with-bollinger-bands-246ad5` @ 1h — `{"rsiLength":16,"bbLength":47,"bbUp":1,"bbDown":2}`
- `ema-trend-signals-066536` @ 4h — `{"fastLen":46,"slowLen":95}`
- `rsi-with-bollinger-bands-246ad5` @ 4h — `{"rsiLength":13,"bbLength":50,"bbUp":1,"bbDown":2}`
- `ema-50-200-cross-trend-barometer-80e8e5` @ 1d — `{"fastLen":82,"slowLen":405}`
- `rsi-with-bollinger-bands-246ad5` @ 1d — `{"rsiLength":14,"bbLength":30,"bbUp":1,"bbDown":1}`
- `ema-trend-signals-066536` @ 1h — `{"fastLen":11,"slowLen":63}`
