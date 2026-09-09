# Backtest ranking

BTC/USDT 1h · 2026-09-09 · 5 bps/side cost · data 2017-08-17 → 2025-08-31

Each table is the same strategies over a different trailing window. Sorted by total return; "vs hold" = strategy return minus buy-and-hold over those bars.

**Read across the windows, not down one.** A strategy whose rank/return swings wildly between the 3y, 5y and 8y tables is fragile — its result is a few outsized trades and warm-up luck, not an edge. Consistency across windows (and the sweep's "% of trials profitable") is the signal.

## 3 years  (26298 bars · buy & hold +440.2%)

| # | strategy | return | vs hold | Sharpe | maxDD | win% | trades |
|--:|----------|-------:|--------:|-------:|------:|-----:|-------:|
| 1 | EMA + RSI + VWAP Targets | +146.5% | -293.7% | 0.88 | 45.1% | 11% | 19 |
| 2 | EMA Trend Signals | +84.2% | -356.0% | 0.77 | 37.3% | 29% | 240 |
| 3 | Gold Macro & Fiat Valuation Barometer | +0.0% | -440.2% | 0.00 | 0.0% | 0% | 0 |
| 4 | Unknown Strategy | +0.0% | -440.2% | 0.00 | 0.0% | 0% | 0 |
| 5 | EMA 50×200 Cross — Trend Barometer | -63.8% | -504.0% | -0.86 | 70.2% | 25% | 77 |
| 6 | RSI with Bollinger Bands | -84.2% | -524.4% | -1.22 | 90.6% | 35% | 699 |

## 5 years  (43811 bars · buy & hold +824.4%)

| # | strategy | return | vs hold | Sharpe | maxDD | win% | trades |
|--:|----------|-------:|--------:|-------:|------:|-----:|-------:|
| 1 | EMA 50×200 Cross — Trend Barometer | +349.1% | -475.3% | 0.93 | 62.7% | 29% | 132 |
| 2 | EMA Trend Signals | +306.6% | -517.8% | 0.88 | 62.1% | 29% | 385 |
| 3 | Gold Macro & Fiat Valuation Barometer | +0.0% | -824.4% | 0.00 | 0.0% | 0% | 0 |
| 4 | Unknown Strategy | +0.0% | -824.4% | 0.00 | 0.0% | 0% | 0 |
| 5 | EMA + RSI + VWAP Targets | -34.0% | -858.4% | 0.16 | 96.5% | 5% | 77 |
| 6 | RSI with Bollinger Bands | -96.6% | -921.0% | -0.97 | 98.0% | 37% | 1150 |

## 8 years  (70001 bars · buy & hold +2191.0%)

| # | strategy | return | vs hold | Sharpe | maxDD | win% | trades |
|--:|----------|-------:|--------:|-------:|------:|-----:|-------:|
| 1 | EMA 50×200 Cross — Trend Barometer | +1744.6% | -446.4% | 1.00 | 62.7% | 29% | 199 |
| 2 | EMA + RSI + VWAP Targets | +270.2% | -1920.8% | 0.59 | 84.1% | 30% | 40 |
| 3 | Gold Macro & Fiat Valuation Barometer | +0.0% | -2191.0% | 0.00 | 0.0% | 0% | 0 |
| 4 | Unknown Strategy | +0.0% | -2191.0% | 0.00 | 0.0% | 0% | 0 |
| 5 | EMA Trend Signals | -88.8% | -2279.7% | -0.20 | 93.5% | 25% | 587 |
| 6 | RSI with Bollinger Bands | -99.2% | -2290.2% | -0.56 | 99.3% | 38% | 1817 |
