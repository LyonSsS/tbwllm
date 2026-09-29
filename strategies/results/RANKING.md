# Backtest ranking

BTC/USDT · 2026-09-29 · 5 bps/side cost · 13 assemblable strategies

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
| 6 | RSI(2) Mean Reversion (Connors) | −15.6% | −455.7% | -0.28 | 21.6% | 541 |
| 7 | Bollinger Band Bounce | −25.7% | −465.9% | -0.24 | 41.9% | 503 |
| 8 | Smart Buy Sell Indicator V1 | −38.0% | −478.2% | -0.10 | 57.2% | 1172 |
| 9 | SuperTrend Flip | −52.1% | −492.3% | -0.28 | 62.1% | 570 |
| 10 | EMA Trend Signals | −54.9% | −495.0% | -0.32 | 73.0% | 480 |
| 11 | Donchian Channel Breakout (Turtle Rules) | −70.6% | −510.8% | -1.18 | 73.7% | 1216 |
| 12 | MACD Signal Line Crossover | −87.3% | −527.5% | -1.20 | 88.6% | 1990 |
| 13 | RSI with Bollinger Bands | −88.2% | −528.3% | -1.25 | 90.4% | 843 |

### 4h  ·  6575 bars  ·  buy & hold +444.1%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA + RSI + VWAP Targets | +251.2% | −192.8% | 1.13 | 33.0% | 18 |
| 2 | EMA 50×200 Cross — Trend Barometer | +97.5% | −346.5% | 0.73 | 45.0% | 32 |
| 3 | Donchian Channel Breakout (Turtle Rules) | +56.3% | −387.8% | 0.66 | 28.7% | 316 |
| 4 | Smart Buy Sell Indicator V1 | +38.0% | −406.0% | 0.46 | 38.8% | 274 |
| 5 | SuperTrend Flip | +31.5% | −412.6% | 0.43 | 44.0% | 150 |
| 6 | Bollinger Band Bounce | +12.5% | −431.6% | 0.28 | 31.1% | 118 |
| 7 | EMA Trend Signals | +6.3% | −437.8% | 0.28 | 48.2% | 114 |
| 8 | RSI(2) Mean Reversion (Connors) | +4.4% | −439.7% | 0.17 | 24.4% | 149 |
| 9 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −444.1% | 0.00 | 0.0% | 0 |
| 10 | Gold Macro & Fiat Valuation Barometer | +0.0% | −444.1% | 0.00 | 0.0% | 0 |
| 11 | TP/SL Signals + Days & Zones | +0.0% | −444.1% | 0.00 | 0.0% | 0 |
| 12 | RSI with Bollinger Bands | −14.1% | −458.1% | 0.13 | 53.3% | 198 |
| 13 | MACD Signal Line Crossover | −51.3% | −495.3% | -0.28 | 63.0% | 499 |

### 1d  ·  1096 bars  ·  buy & hold +437.7%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA + RSI + VWAP Targets | +341.4% | −96.3% | 1.28 | 28.1% | 6 |
| 2 | Bollinger Band Bounce | +87.4% | −350.3% | 1.00 | 20.0% | 18 |
| 3 | RSI(2) Mean Reversion (Connors) | +32.8% | −404.9% | 0.54 | 23.4% | 28 |
| 4 | Smart Buy Sell Indicator V1 | +20.9% | −416.8% | 0.37 | 48.4% | 49 |
| 5 | Donchian Channel Breakout (Turtle Rules) | +11.2% | −426.5% | 0.27 | 41.9% | 63 |
| 6 | RSI with Bollinger Bands | +0.5% | −437.2% | 0.24 | 60.0% | 28 |
| 7 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −437.7% | 0.00 | 0.0% | 0 |
| 8 | EMA 50×200 Cross — Trend Barometer | +0.0% | −437.7% | 0.00 | 0.0% | 0 |
| 9 | Gold Macro & Fiat Valuation Barometer | +0.0% | −437.7% | 0.00 | 0.0% | 0 |
| 10 | TP/SL Signals + Days & Zones | +0.0% | −437.7% | 0.00 | 0.0% | 0 |
| 11 | EMA Trend Signals | −17.4% | −455.1% | 0.11 | 61.9% | 21 |
| 12 | MACD Signal Line Crossover | −24.6% | −462.3% | 0.04 | 50.4% | 83 |
| 13 | SuperTrend Flip | −45.9% | −483.6% | -0.20 | 70.9% | 28 |

## 5 years

### 1h  ·  43811 bars  ·  buy & hold +824.4%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA + RSI + VWAP Targets | +14.2% | −810.2% | 0.35 | 95.1% | 89 |
| 2 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −824.4% | 0.00 | 0.0% | 0 |
| 3 | Gold Macro & Fiat Valuation Barometer | +0.0% | −824.4% | 0.00 | 0.0% | 0 |
| 4 | TP/SL Signals + Days & Zones | +0.0% | −824.4% | 0.00 | 0.0% | 0 |
| 5 | RSI(2) Mean Reversion (Connors) | −1.2% | −825.6% | 0.09 | 41.6% | 915 |
| 6 | EMA 50×200 Cross — Trend Barometer | −25.4% | −849.8% | 0.21 | 77.9% | 264 |
| 7 | EMA Trend Signals | −34.4% | −858.8% | 0.17 | 83.5% | 770 |
| 8 | Bollinger Band Bounce | −34.7% | −859.1% | -0.06 | 61.7% | 856 |
| 9 | Smart Buy Sell Indicator V1 | −84.0% | −908.4% | -0.30 | 91.7% | 1979 |
| 10 | SuperTrend Flip | −88.7% | −913.1% | -0.41 | 90.8% | 952 |
| 11 | Donchian Channel Breakout (Turtle Rules) | −93.3% | −917.6% | -1.16 | 94.9% | 2092 |
| 12 | MACD Signal Line Crossover | −97.0% | −921.3% | -0.84 | 97.9% | 3335 |
| 13 | RSI with Bollinger Bands | −97.5% | −921.8% | -0.90 | 98.0% | 1368 |

### 4h  ·  10958 bars  ·  buy & hold +823.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA 50×200 Cross — Trend Barometer | +761.1% | −62.1% | 1.02 | 65.9% | 48 |
| 2 | SuperTrend Flip | +278.2% | −545.0% | 0.74 | 65.6% | 238 |
| 3 | EMA + RSI + VWAP Targets | +114.2% | −709.0% | 0.55 | 89.3% | 36 |
| 4 | Smart Buy Sell Indicator V1 | +97.7% | −725.5% | 0.53 | 76.5% | 460 |
| 5 | EMA Trend Signals | +64.6% | −758.6% | 0.47 | 71.2% | 191 |
| 6 | RSI(2) Mean Reversion (Connors) | +18.9% | −804.3% | 0.27 | 45.1% | 232 |
| 7 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −823.2% | 0.00 | 0.0% | 0 |
| 8 | Gold Macro & Fiat Valuation Barometer | +0.0% | −823.2% | 0.00 | 0.0% | 0 |
| 9 | TP/SL Signals + Days & Zones | +0.0% | −823.2% | 0.00 | 0.0% | 0 |
| 10 | Donchian Channel Breakout (Turtle Rules) | −10.5% | −833.7% | 0.14 | 69.4% | 551 |
| 11 | Bollinger Band Bounce | −38.7% | −861.9% | -0.10 | 72.0% | 189 |
| 12 | RSI with Bollinger Bands | −84.4% | −907.6% | -0.31 | 90.4% | 327 |
| 13 | MACD Signal Line Crossover | −90.3% | −913.5% | -0.47 | 93.6% | 851 |

### 1d  ·  1827 bars  ·  buy & hold +829.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA Trend Signals | +379.9% | −449.3% | 0.82 | 59.0% | 28 |
| 2 | Smart Buy Sell Indicator V1 | +359.9% | −469.2% | 0.81 | 69.4% | 70 |
| 3 | EMA 50×200 Cross — Trend Barometer | +159.4% | −669.8% | 0.63 | 57.1% | 6 |
| 4 | EMA + RSI + VWAP Targets | +130.7% | −698.4% | 0.58 | 88.1% | 16 |
| 5 | Donchian Channel Breakout (Turtle Rules) | +86.3% | −742.9% | 0.51 | 41.9% | 108 |
| 6 | Bollinger Band Bounce | +47.7% | −781.4% | 0.40 | 52.4% | 29 |
| 7 | MACD Signal Line Crossover | +6.9% | −822.3% | 0.32 | 63.8% | 134 |
| 8 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −829.2% | 0.00 | 0.0% | 0 |
| 9 | Gold Macro & Fiat Valuation Barometer | +0.0% | −829.2% | 0.00 | 0.0% | 0 |
| 10 | TP/SL Signals + Days & Zones | +0.0% | −829.2% | 0.00 | 0.0% | 0 |
| 11 | RSI(2) Mean Reversion (Connors) | −9.3% | −838.5% | 0.03 | 40.4% | 36 |
| 12 | RSI with Bollinger Bands | −15.7% | −844.9% | 0.24 | 67.9% | 50 |
| 13 | SuperTrend Flip | −36.5% | −865.7% | 0.15 | 83.2% | 46 |

## 8 years

### 1h  ·  70001 bars  ·  buy & hold +2191.0%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA Trend Signals | +276.7% | −1914.3% | 0.60 | 83.5% | 1173 |
| 2 | EMA + RSI + VWAP Targets | +225.0% | −1966.0% | 0.57 | 90.0% | 45 |
| 3 | RSI(2) Mean Reversion (Connors) | +83.8% | −2107.2% | 0.44 | 41.6% | 1417 |
| 4 | EMA 50×200 Cross — Trend Barometer | +12.3% | −2178.6% | 0.38 | 81.1% | 398 |
| 5 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 6 | Gold Macro & Fiat Valuation Barometer | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 7 | TP/SL Signals + Days & Zones | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 8 | SuperTrend Flip | −32.6% | −2223.6% | 0.31 | 91.3% | 1390 |
| 9 | Bollinger Band Bounce | −70.1% | −2261.1% | -0.10 | 91.2% | 1336 |
| 10 | Smart Buy Sell Indicator V1 | −90.1% | −2281.1% | -0.02 | 94.6% | 3091 |
| 11 | Donchian Channel Breakout (Turtle Rules) | −96.9% | −2287.9% | -0.65 | 98.0% | 3222 |
| 12 | MACD Signal Line Crossover | −99.7% | −2290.7% | -0.63 | 99.8% | 5346 |
| 13 | RSI with Bollinger Bands | −99.8% | −2290.8% | -0.65 | 99.8% | 2155 |

### 4h  ·  17517 bars  ·  buy & hold +2191.0%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Smart Buy Sell Indicator V1 | +1337.8% | −853.2% | 0.83 | 76.5% | 712 |
| 2 | EMA 50×200 Cross — Trend Barometer | +1262.0% | −929.0% | 0.83 | 80.7% | 79 |
| 3 | EMA + RSI + VWAP Targets | +494.5% | −1696.4% | 0.67 | 81.0% | 30 |
| 4 | EMA Trend Signals | +322.5% | −1868.5% | 0.61 | 71.2% | 297 |
| 5 | SuperTrend Flip | +271.9% | −1919.1% | 0.59 | 65.6% | 384 |
| 6 | RSI(2) Mean Reversion (Connors) | +15.5% | −2175.5% | 0.20 | 45.1% | 347 |
| 7 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 8 | Gold Macro & Fiat Valuation Barometer | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 9 | TP/SL Signals + Days & Zones | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 10 | Donchian Channel Breakout (Turtle Rules) | −9.3% | −2200.3% | 0.20 | 75.8% | 895 |
| 11 | RSI with Bollinger Bands | −65.9% | −2256.9% | 0.16 | 92.7% | 510 |
| 12 | MACD Signal Line Crossover | −72.4% | −2263.4% | 0.13 | 93.9% | 1315 |
| 13 | Bollinger Band Bounce | −75.6% | −2266.6% | -0.17 | 90.2% | 304 |

### 1d  ·  2923 bars  ·  buy & hold +2191.0%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Smart Buy Sell Indicator V1 | +906.2% | −1284.7% | 0.76 | 80.8% | 114 |
| 2 | EMA Trend Signals | +806.2% | −1384.8% | 0.74 | 76.1% | 44 |
| 3 | MACD Signal Line Crossover | +263.8% | −1927.2% | 0.57 | 63.8% | 208 |
| 4 | Donchian Channel Breakout (Turtle Rules) | +234.2% | −1956.8% | 0.55 | 48.0% | 176 |
| 5 | EMA 50×200 Cross — Trend Barometer | +132.8% | −2058.2% | 0.49 | 88.9% | 12 |
| 6 | RSI with Bollinger Bands | +116.2% | −2074.8% | 0.48 | 67.9% | 78 |
| 7 | RSI(2) Mean Reversion (Connors) | +39.8% | −2151.2% | 0.30 | 40.4% | 55 |
| 8 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 9 | Gold Macro & Fiat Valuation Barometer | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 10 | TP/SL Signals + Days & Zones | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 11 | SuperTrend Flip | −14.8% | −2205.8% | 0.31 | 83.2% | 70 |
| 12 | Bollinger Band Bounce | −36.7% | −2227.7% | 0.07 | 76.3% | 45 |
| 13 | EMA + RSI + VWAP Targets | −38.2% | −2229.2% | 0.26 | 96.6% | 18 |

## S&P 500 (daily)

### 3y  ·  751 bars  ·  buy & hold +79.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA + RSI + VWAP Targets | +37.8% | −41.4% | 0.96 | 28.5% | 4 |
| 2 | EMA Trend Signals | +31.8% | −47.4% | 0.83 | 18.7% | 9 |
| 3 | Bollinger Band Bounce | +28.8% | −50.4% | 1.07 | 10.8% | 15 |
| 4 | RSI(2) Mean Reversion (Connors) | +18.4% | −60.8% | 1.06 | 8.3% | 25 |
| 5 | EMA 50×200 Cross — Trend Barometer | +15.2% | −64.0% | 0.69 | 16.2% | 2 |
| 6 | Smart Buy Sell Indicator V1 | +6.6% | −72.6% | 0.26 | 20.3% | 28 |
| 7 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −79.2% | 0.00 | 0.0% | 0 |
| 8 | Gold Macro & Fiat Valuation Barometer | +0.0% | −79.2% | 0.00 | 0.0% | 0 |
| 9 | TP/SL Signals + Days & Zones | +0.0% | −79.2% | 0.00 | 0.0% | 0 |
| 10 | SuperTrend Flip | −0.5% | −79.7% | 0.08 | 24.3% | 25 |
| 11 | Donchian Channel Breakout (Turtle Rules) | −11.5% | −90.7% | -0.39 | 19.3% | 75 |
| 12 | MACD Signal Line Crossover | −22.6% | −101.8% | -0.61 | 31.9% | 71 |
| 13 | RSI with Bollinger Bands | −52.3% | −131.4% | -1.96 | 53.5% | 12 |

### 5y  ·  1255 bars  ·  buy & hold +76.5%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA 50×200 Cross — Trend Barometer | +50.2% | −26.3% | 0.88 | 24.1% | 3 |
| 2 | Bollinger Band Bounce | +47.9% | −28.6% | 0.91 | 10.8% | 26 |
| 3 | EMA + RSI + VWAP Targets | +46.1% | −30.4% | 0.64 | 23.1% | 11 |
| 4 | RSI(2) Mean Reversion (Connors) | +22.2% | −54.3% | 0.83 | 8.3% | 38 |
| 5 | Smart Buy Sell Indicator V1 | +14.8% | −61.7% | 0.30 | 20.3% | 46 |
| 6 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −76.5% | 0.00 | 0.0% | 0 |
| 7 | Gold Macro & Fiat Valuation Barometer | +0.0% | −76.5% | 0.00 | 0.0% | 0 |
| 8 | TP/SL Signals + Days & Zones | +0.0% | −76.5% | 0.00 | 0.0% | 0 |
| 9 | EMA Trend Signals | −1.9% | −78.4% | 0.08 | 38.6% | 21 |
| 10 | Donchian Channel Breakout (Turtle Rules) | −15.9% | −92.4% | -0.29 | 19.5% | 119 |
| 11 | SuperTrend Flip | −18.6% | −95.1% | -0.19 | 26.4% | 43 |
| 12 | MACD Signal Line Crossover | −27.9% | −104.4% | -0.36 | 37.2% | 109 |
| 13 | RSI with Bollinger Bands | −47.8% | −124.3% | -0.83 | 60.5% | 25 |

### 8y  ·  2009 bars  ·  buy & hold +163.7%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | EMA + RSI + VWAP Targets | +101.2% | −62.5% | 0.66 | 34.4% | 6 |
| 2 | Smart Buy Sell Indicator V1 | +46.7% | −117.0% | 0.42 | 21.7% | 67 |
| 3 | Bollinger Band Bounce | +44.0% | −119.7% | 0.47 | 29.5% | 35 |
| 4 | EMA 50×200 Cross — Trend Barometer | +38.2% | −125.5% | 0.40 | 33.2% | 8 |
| 5 | RSI(2) Mean Reversion (Connors) | +35.4% | −128.2% | 0.70 | 8.5% | 59 |
| 6 | EMA Trend Signals | +17.4% | −146.3% | 0.24 | 38.7% | 29 |
| 7 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −163.7% | 0.00 | 0.0% | 0 |
| 8 | Gold Macro & Fiat Valuation Barometer | +0.0% | −163.7% | 0.00 | 0.0% | 0 |
| 9 | TP/SL Signals + Days & Zones | +0.0% | −163.7% | 0.00 | 0.0% | 0 |
| 10 | Donchian Channel Breakout (Turtle Rules) | −16.4% | −180.1% | -0.14 | 29.9% | 207 |
| 11 | MACD Signal Line Crossover | −29.4% | −193.0% | -0.15 | 52.1% | 177 |
| 12 | SuperTrend Flip | −45.5% | −209.2% | -0.36 | 55.2% | 75 |
| 13 | RSI with Bollinger Bands | −67.2% | −230.9% | -0.77 | 73.4% | 42 |

## EUR/USD (daily)

### 3y  ·  777 bars  ·  buy & hold +7.4%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Smart Buy Sell Indicator V1 | +7.5% | +0.1% | 0.46 | 7.1% | 28 |
| 2 | Bollinger Band Bounce | +1.4% | −6.0% | 0.19 | 3.8% | 16 |
| 3 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −7.4% | 0.00 | 0.0% | 0 |
| 4 | EMA + RSI + VWAP Targets | +0.0% | −7.4% | 0.00 | 0.0% | 0 |
| 5 | Gold Macro & Fiat Valuation Barometer | +0.0% | −7.4% | 0.00 | 0.0% | 0 |
| 6 | TP/SL Signals + Days & Zones | +0.0% | −7.4% | 0.00 | 0.0% | 0 |
| 7 | RSI(2) Mean Reversion (Connors) | −1.2% | −8.7% | -0.19 | 3.7% | 16 |
| 8 | EMA 50×200 Cross — Trend Barometer | −3.0% | −10.5% | -0.18 | 8.6% | 5 |
| 9 | EMA Trend Signals | −5.8% | −13.2% | -0.30 | 10.5% | 17 |
| 10 | Donchian Channel Breakout (Turtle Rules) | −9.1% | −16.5% | -0.97 | 10.2% | 23 |
| 11 | SuperTrend Flip | −9.6% | −17.1% | -0.56 | 16.7% | 20 |
| 12 | MACD Signal Line Crossover | −13.9% | −21.4% | -0.84 | 20.9% | 72 |
| 13 | RSI with Bollinger Bands | −16.2% | −23.6% | -1.02 | 20.3% | 23 |

### 5y  ·  1299 bars  ·  buy & hold −2.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Smart Buy Sell Indicator V1 | +19.1% | +21.2% | 0.59 | 7.1% | 48 |
| 2 | EMA Trend Signals | +1.9% | +4.1% | 0.10 | 14.3% | 25 |
| 3 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 4 | EMA + RSI + VWAP Targets | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 5 | Gold Macro & Fiat Valuation Barometer | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 6 | TP/SL Signals + Days & Zones | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 7 | Bollinger Band Bounce | −0.5% | +1.6% | -0.01 | 6.2% | 26 |
| 8 | RSI(2) Mean Reversion (Connors) | −4.7% | −2.6% | -0.48 | 5.9% | 25 |
| 9 | Donchian Channel Breakout (Turtle Rules) | −6.6% | −4.5% | -0.32 | 12.9% | 42 |
| 10 | SuperTrend Flip | −10.4% | −8.3% | -0.30 | 16.7% | 32 |
| 11 | RSI with Bollinger Bands | −15.1% | −12.9% | -0.47 | 24.4% | 37 |
| 12 | EMA 50×200 Cross — Trend Barometer | −18.9% | −16.7% | -0.79 | 26.6% | 10 |
| 13 | MACD Signal Line Crossover | −22.9% | −20.8% | -0.76 | 29.6% | 115 |

### 8y  ·  2081 bars  ·  buy & hold −2.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Smart Buy Sell Indicator V1 | +8.0% | +10.2% | 0.20 | 16.3% | 76 |
| 2 | Bollinger Band Bounce | +7.9% | +10.0% | 0.32 | 8.5% | 42 |
| 3 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 4 | EMA + RSI + VWAP Targets | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 5 | Gold Macro & Fiat Valuation Barometer | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 6 | TP/SL Signals + Days & Zones | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 7 | EMA 50×200 Cross — Trend Barometer | −6.4% | −4.2% | -0.11 | 29.8% | 12 |
| 8 | RSI(2) Mean Reversion (Connors) | −7.1% | −4.9% | -0.43 | 8.1% | 36 |
| 9 | EMA Trend Signals | −10.3% | −8.1% | -0.18 | 21.8% | 39 |
| 10 | RSI with Bollinger Bands | −17.1% | −14.9% | -0.35 | 24.4% | 54 |
| 11 | Donchian Channel Breakout (Turtle Rules) | −18.2% | −16.0% | -0.63 | 18.7% | 64 |
| 12 | SuperTrend Flip | −20.5% | −18.3% | -0.44 | 21.4% | 54 |
| 13 | MACD Signal Line Crossover | −36.5% | −34.3% | -0.90 | 40.0% | 182 |

## Declared timeframe

- BTCUSD Supertrend + EMA Trend Filter (1H) → 1h
- Daily Futures Wick Levels — Monthly Span V8 → 1d
