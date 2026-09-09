# Backtest ranking

BTC/USDT 1h · 2026-09-09 · 5 bps/side cost · data 2017-08-17 → 2025-08-31

Each table is the same strategies over a different trailing window. Sorted by total return; "vs hold" = strategy return minus buy-and-hold over those bars.

**Read across the windows, not down one.** A strategy whose rank/return swings wildly between the 3y, 5y and 8y tables is fragile — its result is a few outsized trades and warm-up luck, not an edge. Consistency across windows (and the sweep's "% of trials profitable") is the signal.

## 3 years  (26298 bars · buy & hold +440.2%)

| # | strategy | return | vs hold | Sharpe | maxDD | win% | trades |
|--:|----------|-------:|--------:|-------:|------:|-----:|-------:|
| 1 | EMA + RSI + VWAP Targets | +233.3% | -206.9% | 1.08 | 33.4% | 21% | 24 |
| 2 | Gold Macro & Fiat Valuation Barometer | +0.0% | -440.2% | 0.00 | 0.0% | 0% | 0 |
| 3 | Unknown Strategy | +0.0% | -440.2% | 0.00 | 0.0% | 0% | 0 |
| 4 | EMA 50×200 Cross — Trend Barometer | -0.7% | -440.9% | 0.23 | 55.5% | 29% | 153 |
| 5 | EMA Trend Signals | -54.9% | -495.0% | -0.32 | 73.0% | 26% | 480 |
| 6 | RSI with Bollinger Bands | -88.2% | -528.3% | -1.25 | 90.4% | 37% | 843 |

## 5 years  (43811 bars · buy & hold +824.4%)

| # | strategy | return | vs hold | Sharpe | maxDD | win% | trades |
|--:|----------|-------:|--------:|-------:|------:|-----:|-------:|
| 1 | EMA + RSI + VWAP Targets | +14.2% | -810.2% | 0.35 | 95.1% | 7% | 89 |
| 2 | Gold Macro & Fiat Valuation Barometer | +0.0% | -824.4% | 0.00 | 0.0% | 0% | 0 |
| 3 | Unknown Strategy | +0.0% | -824.4% | 0.00 | 0.0% | 0% | 0 |
| 4 | EMA 50×200 Cross — Trend Barometer | -25.4% | -849.8% | 0.21 | 77.9% | 27% | 264 |
| 5 | EMA Trend Signals | -34.4% | -858.8% | 0.17 | 83.5% | 27% | 770 |
| 6 | RSI with Bollinger Bands | -97.5% | -921.8% | -0.90 | 98.0% | 39% | 1368 |

## 8 years  (70001 bars · buy & hold +2191.0%)

| # | strategy | return | vs hold | Sharpe | maxDD | win% | trades |
|--:|----------|-------:|--------:|-------:|------:|-----:|-------:|
| 1 | EMA Trend Signals | +276.7% | -1914.3% | 0.60 | 83.5% | 28% | 1173 |
| 2 | EMA + RSI + VWAP Targets | +225.0% | -1966.0% | 0.57 | 90.0% | 27% | 45 |
| 3 | EMA 50×200 Cross — Trend Barometer | +12.3% | -2178.6% | 0.38 | 81.1% | 28% | 398 |
| 4 | Gold Macro & Fiat Valuation Barometer | +0.0% | -2191.0% | 0.00 | 0.0% | 0% | 0 |
| 5 | Unknown Strategy | +0.0% | -2191.0% | 0.00 | 0.0% | 0% | 0 |
| 6 | RSI with Bollinger Bands | -99.8% | -2290.8% | -0.65 | 99.8% | 39% | 2155 |
