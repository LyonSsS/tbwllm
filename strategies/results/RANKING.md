# Backtest ranking

BTC/USDT · 2026-09-09 · 5 bps/side cost · 6 assemblable strategies

```
return  = strategy's total % gain/loss over the window
vs hold = that return minus buy-and-hold BTC over the same bars  (positive = beat just holding)
Sharpe  = mean bar-return / its std-dev, annualised  (>1 good · ~0 flat · <0 losing)
maxDD   = largest peak-to-trough drop in account value over the window  (lower = smoother)
trades  = round-trip positions; "—" = the strategy assembled but never met a condition
```

Grouped by window (3 / 5 / 8 years), then timeframe. Each strategy is run on every timeframe — most scripts don't declare one. Sorted by total return.

## 3 years

### 1h  ·  26298 bars  ·  buy & hold +440.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|--:|----------|-------:|--------:|-------:|------:|-------:|
| 1 | EMA + RSI + VWAP Targets | +233.3% | -206.9% | 1.08 | 33.4% | 24 |
| 2 | Gold Macro & Fiat Valuation Barometer | +0.0% | -440.2% | 0.00 | 0.0% | 0 |
| 3 | TP/SL Signals + Days & Zones | +0.0% | -440.2% | 0.00 | 0.0% | 0 |
| 4 | EMA 50×200 Cross — Trend Barometer | -0.7% | -440.9% | 0.23 | 55.5% | 153 |
| 5 | EMA Trend Signals | -54.9% | -495.0% | -0.32 | 73.0% | 480 |
| 6 | RSI with Bollinger Bands | -88.2% | -528.3% | -1.25 | 90.4% | 843 |

### 4h  ·  6575 bars  ·  buy & hold +444.1%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|--:|----------|-------:|--------:|-------:|------:|-------:|
| 1 | EMA + RSI + VWAP Targets | +251.2% | -192.8% | 1.13 | 33.0% | 18 |
| 2 | EMA 50×200 Cross — Trend Barometer | +97.5% | -346.5% | 0.73 | 45.0% | 32 |
| 3 | EMA Trend Signals | +6.3% | -437.8% | 0.28 | 48.2% | 114 |
| 4 | Gold Macro & Fiat Valuation Barometer | +0.0% | -444.1% | 0.00 | 0.0% | 0 |
| 5 | TP/SL Signals + Days & Zones | +0.0% | -444.1% | 0.00 | 0.0% | 0 |
| 6 | RSI with Bollinger Bands | -14.1% | -458.1% | 0.13 | 53.3% | 198 |

### 1d  ·  1096 bars  ·  buy & hold +437.7%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|--:|----------|-------:|--------:|-------:|------:|-------:|
| 1 | EMA + RSI + VWAP Targets | +341.4% | -96.3% | 1.28 | 28.1% | 6 |
| 2 | RSI with Bollinger Bands | +0.5% | -437.2% | 0.24 | 60.0% | 28 |
| 3 | EMA 50×200 Cross — Trend Barometer | +0.0% | -437.7% | 0.00 | 0.0% | 0 |
| 4 | Gold Macro & Fiat Valuation Barometer | +0.0% | -437.7% | 0.00 | 0.0% | 0 |
| 5 | TP/SL Signals + Days & Zones | +0.0% | -437.7% | 0.00 | 0.0% | 0 |
| 6 | EMA Trend Signals | -17.4% | -455.1% | 0.11 | 61.9% | 21 |

## 5 years

### 1h  ·  43811 bars  ·  buy & hold +824.4%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|--:|----------|-------:|--------:|-------:|------:|-------:|
| 1 | EMA + RSI + VWAP Targets | +14.2% | -810.2% | 0.35 | 95.1% | 89 |
| 2 | Gold Macro & Fiat Valuation Barometer | +0.0% | -824.4% | 0.00 | 0.0% | 0 |
| 3 | TP/SL Signals + Days & Zones | +0.0% | -824.4% | 0.00 | 0.0% | 0 |
| 4 | EMA 50×200 Cross — Trend Barometer | -25.4% | -849.8% | 0.21 | 77.9% | 264 |
| 5 | EMA Trend Signals | -34.4% | -858.8% | 0.17 | 83.5% | 770 |
| 6 | RSI with Bollinger Bands | -97.5% | -921.8% | -0.90 | 98.0% | 1368 |

### 4h  ·  10958 bars  ·  buy & hold +823.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|--:|----------|-------:|--------:|-------:|------:|-------:|
| 1 | EMA 50×200 Cross — Trend Barometer | +761.1% | -62.1% | 1.02 | 65.9% | 48 |
| 2 | EMA + RSI + VWAP Targets | +114.2% | -709.0% | 0.55 | 89.3% | 36 |
| 3 | EMA Trend Signals | +64.6% | -758.6% | 0.47 | 71.2% | 191 |
| 4 | Gold Macro & Fiat Valuation Barometer | +0.0% | -823.2% | 0.00 | 0.0% | 0 |
| 5 | TP/SL Signals + Days & Zones | +0.0% | -823.2% | 0.00 | 0.0% | 0 |
| 6 | RSI with Bollinger Bands | -84.4% | -907.6% | -0.31 | 90.4% | 327 |

### 1d  ·  1827 bars  ·  buy & hold +829.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|--:|----------|-------:|--------:|-------:|------:|-------:|
| 1 | EMA Trend Signals | +379.9% | -449.3% | 0.82 | 59.0% | 28 |
| 2 | EMA 50×200 Cross — Trend Barometer | +159.4% | -669.8% | 0.63 | 57.1% | 6 |
| 3 | EMA + RSI + VWAP Targets | +130.7% | -698.4% | 0.58 | 88.1% | 16 |
| 4 | Gold Macro & Fiat Valuation Barometer | +0.0% | -829.2% | 0.00 | 0.0% | 0 |
| 5 | TP/SL Signals + Days & Zones | +0.0% | -829.2% | 0.00 | 0.0% | 0 |
| 6 | RSI with Bollinger Bands | -15.7% | -844.9% | 0.24 | 67.9% | 50 |

## 8 years

### 1h  ·  70001 bars  ·  buy & hold +2191.0%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|--:|----------|-------:|--------:|-------:|------:|-------:|
| 1 | EMA Trend Signals | +276.7% | -1914.3% | 0.60 | 83.5% | 1173 |
| 2 | EMA + RSI + VWAP Targets | +225.0% | -1966.0% | 0.57 | 90.0% | 45 |
| 3 | EMA 50×200 Cross — Trend Barometer | +12.3% | -2178.6% | 0.38 | 81.1% | 398 |
| 4 | Gold Macro & Fiat Valuation Barometer | +0.0% | -2191.0% | 0.00 | 0.0% | 0 |
| 5 | TP/SL Signals + Days & Zones | +0.0% | -2191.0% | 0.00 | 0.0% | 0 |
| 6 | RSI with Bollinger Bands | -99.8% | -2290.8% | -0.65 | 99.8% | 2155 |

### 4h  ·  17517 bars  ·  buy & hold +2191.0%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|--:|----------|-------:|--------:|-------:|------:|-------:|
| 1 | EMA 50×200 Cross — Trend Barometer | +1262.0% | -929.0% | 0.83 | 80.7% | 79 |
| 2 | EMA + RSI + VWAP Targets | +494.5% | -1696.4% | 0.67 | 81.0% | 30 |
| 3 | EMA Trend Signals | +322.5% | -1868.5% | 0.61 | 71.2% | 297 |
| 4 | Gold Macro & Fiat Valuation Barometer | +0.0% | -2191.0% | 0.00 | 0.0% | 0 |
| 5 | TP/SL Signals + Days & Zones | +0.0% | -2191.0% | 0.00 | 0.0% | 0 |
| 6 | RSI with Bollinger Bands | -65.9% | -2256.9% | 0.16 | 92.7% | 510 |

### 1d  ·  2923 bars  ·  buy & hold +2191.0%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|--:|----------|-------:|--------:|-------:|------:|-------:|
| 1 | EMA Trend Signals | +806.2% | -1384.8% | 0.74 | 76.1% | 44 |
| 2 | EMA 50×200 Cross — Trend Barometer | +132.8% | -2058.2% | 0.49 | 88.9% | 12 |
| 3 | RSI with Bollinger Bands | +116.2% | -2074.8% | 0.48 | 67.9% | 78 |
| 4 | Gold Macro & Fiat Valuation Barometer | +0.0% | -2191.0% | 0.00 | 0.0% | 0 |
| 5 | TP/SL Signals + Days & Zones | +0.0% | -2191.0% | 0.00 | 0.0% | 0 |
| 6 | EMA + RSI + VWAP Targets | -38.2% | -2229.2% | 0.26 | 96.6% | 18 |

## Declared timeframe

- BTCUSD Supertrend + EMA Trend Filter (1H) → 1h
- Daily Futures Wick Levels — Monthly Span V8 → 1d
