# Backtest ranking

BTC/USDT · 2026-09-29 · 5 bps/side cost · 8 assemblable strategies

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
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA + RSI + VWAP Targets | +233.3% | −206.9% | 1.08 | 33.4% | 24 |
| 2 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −440.2% | 0.00 | 0.0% | 0 |
| 3 | Gold Macro & Fiat Valuation Barometer | +0.0% | −440.2% | 0.00 | 0.0% | 0 |
| 4 | TP/SL Signals + Days & Zones | +0.0% | −440.2% | 0.00 | 0.0% | 0 |
| 5 | EMA 50×200 Cross — Trend Barometer | −0.7% | −440.9% | 0.23 | 55.5% | 153 |
| 6 | Smart Buy Sell Indicator V1 | −38.0% | −478.2% | -0.10 | 57.2% | 1172 |
| 7 | EMA Trend Signals | −54.9% | −495.0% | -0.32 | 73.0% | 480 |
| 8 | RSI with Bollinger Bands | −88.2% | −528.3% | -1.25 | 90.4% | 843 |

### 4h  ·  6575 bars  ·  buy & hold +444.1%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA + RSI + VWAP Targets | +251.2% | −192.8% | 1.13 | 33.0% | 18 |
| 2 | EMA 50×200 Cross — Trend Barometer | +97.5% | −346.5% | 0.73 | 45.0% | 32 |
| 3 | Smart Buy Sell Indicator V1 | +38.0% | −406.0% | 0.46 | 38.8% | 274 |
| 4 | EMA Trend Signals | +6.3% | −437.8% | 0.28 | 48.2% | 114 |
| 5 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −444.1% | 0.00 | 0.0% | 0 |
| 6 | Gold Macro & Fiat Valuation Barometer | +0.0% | −444.1% | 0.00 | 0.0% | 0 |
| 7 | TP/SL Signals + Days & Zones | +0.0% | −444.1% | 0.00 | 0.0% | 0 |
| 8 | RSI with Bollinger Bands | −14.1% | −458.1% | 0.13 | 53.3% | 198 |

### 1d  ·  1096 bars  ·  buy & hold +437.7%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA + RSI + VWAP Targets | +341.4% | −96.3% | 1.28 | 28.1% | 6 |
| 2 | Smart Buy Sell Indicator V1 | +20.9% | −416.8% | 0.37 | 48.4% | 49 |
| 3 | RSI with Bollinger Bands | +0.5% | −437.2% | 0.24 | 60.0% | 28 |
| 4 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −437.7% | 0.00 | 0.0% | 0 |
| 5 | EMA 50×200 Cross — Trend Barometer | +0.0% | −437.7% | 0.00 | 0.0% | 0 |
| 6 | Gold Macro & Fiat Valuation Barometer | +0.0% | −437.7% | 0.00 | 0.0% | 0 |
| 7 | TP/SL Signals + Days & Zones | +0.0% | −437.7% | 0.00 | 0.0% | 0 |
| 8 | EMA Trend Signals | −17.4% | −455.1% | 0.11 | 61.9% | 21 |

## 5 years

### 1h  ·  43811 bars  ·  buy & hold +824.4%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA + RSI + VWAP Targets | +14.2% | −810.2% | 0.35 | 95.1% | 89 |
| 2 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −824.4% | 0.00 | 0.0% | 0 |
| 3 | Gold Macro & Fiat Valuation Barometer | +0.0% | −824.4% | 0.00 | 0.0% | 0 |
| 4 | TP/SL Signals + Days & Zones | +0.0% | −824.4% | 0.00 | 0.0% | 0 |
| 5 | EMA 50×200 Cross — Trend Barometer | −25.4% | −849.8% | 0.21 | 77.9% | 264 |
| 6 | EMA Trend Signals | −34.4% | −858.8% | 0.17 | 83.5% | 770 |
| 7 | Smart Buy Sell Indicator V1 | −84.0% | −908.4% | -0.30 | 91.7% | 1979 |
| 8 | RSI with Bollinger Bands | −97.5% | −921.8% | -0.90 | 98.0% | 1368 |

### 4h  ·  10958 bars  ·  buy & hold +823.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA 50×200 Cross — Trend Barometer | +761.1% | −62.1% | 1.02 | 65.9% | 48 |
| 2 | EMA + RSI + VWAP Targets | +114.2% | −709.0% | 0.55 | 89.3% | 36 |
| 3 | Smart Buy Sell Indicator V1 | +97.7% | −725.5% | 0.53 | 76.5% | 460 |
| 4 | EMA Trend Signals | +64.6% | −758.6% | 0.47 | 71.2% | 191 |
| 5 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −823.2% | 0.00 | 0.0% | 0 |
| 6 | Gold Macro & Fiat Valuation Barometer | +0.0% | −823.2% | 0.00 | 0.0% | 0 |
| 7 | TP/SL Signals + Days & Zones | +0.0% | −823.2% | 0.00 | 0.0% | 0 |
| 8 | RSI with Bollinger Bands | −84.4% | −907.6% | -0.31 | 90.4% | 327 |

### 1d  ·  1827 bars  ·  buy & hold +829.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA Trend Signals | +379.9% | −449.3% | 0.82 | 59.0% | 28 |
| 2 | Smart Buy Sell Indicator V1 | +359.9% | −469.2% | 0.81 | 69.4% | 70 |
| 3 | EMA 50×200 Cross — Trend Barometer | +159.4% | −669.8% | 0.63 | 57.1% | 6 |
| 4 | EMA + RSI + VWAP Targets | +130.7% | −698.4% | 0.58 | 88.1% | 16 |
| 5 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −829.2% | 0.00 | 0.0% | 0 |
| 6 | Gold Macro & Fiat Valuation Barometer | +0.0% | −829.2% | 0.00 | 0.0% | 0 |
| 7 | TP/SL Signals + Days & Zones | +0.0% | −829.2% | 0.00 | 0.0% | 0 |
| 8 | RSI with Bollinger Bands | −15.7% | −844.9% | 0.24 | 67.9% | 50 |

## 8 years

### 1h  ·  70001 bars  ·  buy & hold +2191.0%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA Trend Signals | +276.7% | −1914.3% | 0.60 | 83.5% | 1173 |
| 2 | EMA + RSI + VWAP Targets | +225.0% | −1966.0% | 0.57 | 90.0% | 45 |
| 3 | EMA 50×200 Cross — Trend Barometer | +12.3% | −2178.6% | 0.38 | 81.1% | 398 |
| 4 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 5 | Gold Macro & Fiat Valuation Barometer | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 6 | TP/SL Signals + Days & Zones | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 7 | Smart Buy Sell Indicator V1 | −90.1% | −2281.1% | -0.02 | 94.6% | 3091 |
| 8 | RSI with Bollinger Bands | −99.8% | −2290.8% | -0.65 | 99.8% | 2155 |

### 4h  ·  17517 bars  ·  buy & hold +2191.0%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Smart Buy Sell Indicator V1 | +1337.8% | −853.2% | 0.83 | 76.5% | 712 |
| 2 | EMA 50×200 Cross — Trend Barometer | +1262.0% | −929.0% | 0.83 | 80.7% | 79 |
| 3 | EMA + RSI + VWAP Targets | +494.5% | −1696.4% | 0.67 | 81.0% | 30 |
| 4 | EMA Trend Signals | +322.5% | −1868.5% | 0.61 | 71.2% | 297 |
| 5 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 6 | Gold Macro & Fiat Valuation Barometer | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 7 | TP/SL Signals + Days & Zones | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 8 | RSI with Bollinger Bands | −65.9% | −2256.9% | 0.16 | 92.7% | 510 |

### 1d  ·  2923 bars  ·  buy & hold +2191.0%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Smart Buy Sell Indicator V1 | +906.2% | −1284.7% | 0.76 | 80.8% | 114 |
| 2 | EMA Trend Signals | +806.2% | −1384.8% | 0.74 | 76.1% | 44 |
| 3 | EMA 50×200 Cross — Trend Barometer | +132.8% | −2058.2% | 0.49 | 88.9% | 12 |
| 4 | RSI with Bollinger Bands | +116.2% | −2074.8% | 0.48 | 67.9% | 78 |
| 5 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 6 | Gold Macro & Fiat Valuation Barometer | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 7 | TP/SL Signals + Days & Zones | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 8 | EMA + RSI + VWAP Targets | −38.2% | −2229.2% | 0.26 | 96.6% | 18 |

## S&P 500 (daily)

### 3y  ·  751 bars  ·  buy & hold +79.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA + RSI + VWAP Targets | +37.8% | −41.4% | 0.96 | 28.5% | 4 |
| 2 | EMA Trend Signals | +31.8% | −47.4% | 0.83 | 18.7% | 9 |
| 3 | EMA 50×200 Cross — Trend Barometer | +15.2% | −64.0% | 0.69 | 16.2% | 2 |
| 4 | Smart Buy Sell Indicator V1 | +6.6% | −72.6% | 0.26 | 20.3% | 28 |
| 5 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −79.2% | 0.00 | 0.0% | 0 |
| 6 | Gold Macro & Fiat Valuation Barometer | +0.0% | −79.2% | 0.00 | 0.0% | 0 |
| 7 | TP/SL Signals + Days & Zones | +0.0% | −79.2% | 0.00 | 0.0% | 0 |
| 8 | RSI with Bollinger Bands | −52.3% | −131.4% | -1.96 | 53.5% | 12 |

### 5y  ·  1255 bars  ·  buy & hold +76.5%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA 50×200 Cross — Trend Barometer | +50.2% | −26.3% | 0.88 | 24.1% | 3 |
| 2 | EMA + RSI + VWAP Targets | +46.1% | −30.4% | 0.64 | 23.1% | 11 |
| 3 | Smart Buy Sell Indicator V1 | +14.8% | −61.7% | 0.30 | 20.3% | 46 |
| 4 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −76.5% | 0.00 | 0.0% | 0 |
| 5 | Gold Macro & Fiat Valuation Barometer | +0.0% | −76.5% | 0.00 | 0.0% | 0 |
| 6 | TP/SL Signals + Days & Zones | +0.0% | −76.5% | 0.00 | 0.0% | 0 |
| 7 | EMA Trend Signals | −1.9% | −78.4% | 0.08 | 38.6% | 21 |
| 8 | RSI with Bollinger Bands | −47.8% | −124.3% | -0.83 | 60.5% | 25 |

### 8y  ·  2009 bars  ·  buy & hold +163.7%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA + RSI + VWAP Targets | +101.2% | −62.5% | 0.66 | 34.4% | 6 |
| 2 | Smart Buy Sell Indicator V1 | +46.7% | −117.0% | 0.42 | 21.7% | 67 |
| 3 | EMA 50×200 Cross — Trend Barometer | +38.2% | −125.5% | 0.40 | 33.2% | 8 |
| 4 | EMA Trend Signals | +17.4% | −146.3% | 0.24 | 38.7% | 29 |
| 5 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −163.7% | 0.00 | 0.0% | 0 |
| 6 | Gold Macro & Fiat Valuation Barometer | +0.0% | −163.7% | 0.00 | 0.0% | 0 |
| 7 | TP/SL Signals + Days & Zones | +0.0% | −163.7% | 0.00 | 0.0% | 0 |
| 8 | RSI with Bollinger Bands | −67.2% | −230.9% | -0.77 | 73.4% | 42 |

## EUR/USD (daily)

### 3y  ·  777 bars  ·  buy & hold +7.4%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Smart Buy Sell Indicator V1 | +7.5% | +0.1% | 0.46 | 7.1% | 28 |
| 2 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −7.4% | 0.00 | 0.0% | 0 |
| 3 | EMA + RSI + VWAP Targets | +0.0% | −7.4% | 0.00 | 0.0% | 0 |
| 4 | Gold Macro & Fiat Valuation Barometer | +0.0% | −7.4% | 0.00 | 0.0% | 0 |
| 5 | TP/SL Signals + Days & Zones | +0.0% | −7.4% | 0.00 | 0.0% | 0 |
| 6 | EMA 50×200 Cross — Trend Barometer | −3.0% | −10.5% | -0.18 | 8.6% | 5 |
| 7 | EMA Trend Signals | −5.8% | −13.2% | -0.30 | 10.5% | 17 |
| 8 | RSI with Bollinger Bands | −16.2% | −23.6% | -1.02 | 20.3% | 23 |

### 5y  ·  1299 bars  ·  buy & hold −2.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Smart Buy Sell Indicator V1 | +19.1% | +21.2% | 0.59 | 7.1% | 48 |
| 2 | EMA Trend Signals | +1.9% | +4.1% | 0.10 | 14.3% | 25 |
| 3 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 4 | EMA + RSI + VWAP Targets | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 5 | Gold Macro & Fiat Valuation Barometer | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 6 | TP/SL Signals + Days & Zones | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 7 | RSI with Bollinger Bands | −15.1% | −12.9% | -0.47 | 24.4% | 37 |
| 8 | EMA 50×200 Cross — Trend Barometer | −18.9% | −16.7% | -0.79 | 26.6% | 10 |

### 8y  ·  2081 bars  ·  buy & hold −2.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Smart Buy Sell Indicator V1 | +8.0% | +10.2% | 0.20 | 16.3% | 76 |
| 2 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 3 | EMA + RSI + VWAP Targets | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 4 | Gold Macro & Fiat Valuation Barometer | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 5 | TP/SL Signals + Days & Zones | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 6 | EMA 50×200 Cross — Trend Barometer | −6.4% | −4.2% | -0.11 | 29.8% | 12 |
| 7 | EMA Trend Signals | −10.3% | −8.1% | -0.18 | 21.8% | 39 |
| 8 | RSI with Bollinger Bands | −17.1% | −14.9% | -0.35 | 24.4% | 54 |

## Declared timeframe

- BTCUSD Supertrend + EMA Trend Filter (1H) → 1h
- Daily Futures Wick Levels — Monthly Span V8 → 1d
