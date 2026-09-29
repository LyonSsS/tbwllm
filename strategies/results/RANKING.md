# Backtest ranking

BTC/USDT · 2026-09-29 · 5 bps/side cost · 19 assemblable strategies

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
| 1 | MACDStrategy | +447.2% | +7.0% | 1.43 | 32.3% | 1 |
| 2 | MACDStrategy_crossed | +253.3% | −186.9% | 1.16 | 31.0% | 9 |
| 3 | EMA + RSI + VWAP Targets | +233.3% | −206.9% | 1.08 | 33.4% | 24 |
| 4 | Freqtrade_backtest_validation_freqtrade1 | +70.6% | −369.5% | 0.70 | 38.5% | 538 |
| 5 | BbandRsi | +31.8% | −408.4% | 0.44 | 29.5% | 95 |
| 6 | ASDTSRockwellTrading | +11.8% | −428.4% | 0.27 | 34.4% | 749 |
| 7 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −440.2% | 0.00 | 0.0% | 0 |
| 8 | Gold Macro & Fiat Valuation Barometer | +0.0% | −440.2% | 0.00 | 0.0% | 0 |
| 9 | TP/SL Signals + Days & Zones | +0.0% | −440.2% | 0.00 | 0.0% | 0 |
| 10 | EMA 50×200 Cross — Trend Barometer | −0.7% | −440.9% | 0.23 | 55.5% | 153 |
| 11 | AdxSmas | −9.3% | −449.5% | 0.09 | 38.1% | 318 |
| 12 | RSI(2) Mean Reversion (Connors) | −15.6% | −455.7% | -0.28 | 21.6% | 541 |
| 13 | Bollinger Band Bounce | −25.7% | −465.9% | -0.24 | 41.9% | 503 |
| 14 | Smart Buy Sell Indicator V1 | −38.0% | −478.2% | -0.10 | 57.2% | 1172 |
| 15 | SuperTrend Flip | −52.1% | −492.3% | -0.28 | 62.1% | 570 |
| 16 | EMA Trend Signals | −54.9% | −495.0% | -0.32 | 73.0% | 480 |
| 17 | Donchian Channel Breakout (Turtle Rules) | −70.6% | −510.8% | -1.18 | 73.7% | 1216 |
| 18 | MACD Signal Line Crossover | −87.3% | −527.5% | -1.20 | 88.6% | 1990 |
| 19 | RSI with Bollinger Bands | −88.2% | −528.3% | -1.25 | 90.4% | 843 |

### 4h  ·  6575 bars  ·  buy & hold +444.1%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | MACDStrategy_crossed | +487.8% | +43.8% | 1.58 | 30.6% | 2 |
| 2 | MACDStrategy | +448.5% | +4.4% | 1.46 | 30.6% | 1 |
| 3 | EMA + RSI + VWAP Targets | +251.2% | −192.8% | 1.13 | 33.0% | 18 |
| 4 | Freqtrade_backtest_validation_freqtrade1 | +219.3% | −224.8% | 1.33 | 34.8% | 136 |
| 5 | BbandRsi | +209.8% | −234.3% | 1.34 | 25.1% | 35 |
| 6 | AdxSmas | +109.6% | −334.4% | 0.87 | 32.9% | 83 |
| 7 | EMA 50×200 Cross — Trend Barometer | +97.5% | −346.5% | 0.73 | 45.0% | 32 |
| 8 | ASDTSRockwellTrading | +70.9% | −373.1% | 0.82 | 28.4% | 186 |
| 9 | Donchian Channel Breakout (Turtle Rules) | +56.3% | −387.8% | 0.66 | 28.7% | 316 |
| 10 | Smart Buy Sell Indicator V1 | +38.0% | −406.0% | 0.46 | 38.8% | 274 |
| 11 | SuperTrend Flip | +31.5% | −412.6% | 0.43 | 44.0% | 150 |
| 12 | Bollinger Band Bounce | +12.5% | −431.6% | 0.28 | 31.1% | 118 |
| 13 | EMA Trend Signals | +6.3% | −437.8% | 0.28 | 48.2% | 114 |
| 14 | RSI(2) Mean Reversion (Connors) | +4.4% | −439.7% | 0.17 | 24.4% | 149 |
| 15 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −444.1% | 0.00 | 0.0% | 0 |
| 16 | Gold Macro & Fiat Valuation Barometer | +0.0% | −444.1% | 0.00 | 0.0% | 0 |
| 17 | TP/SL Signals + Days & Zones | +0.0% | −444.1% | 0.00 | 0.0% | 0 |
| 18 | RSI with Bollinger Bands | −14.1% | −458.1% | 0.13 | 53.3% | 198 |
| 19 | MACD Signal Line Crossover | −51.3% | −495.3% | -0.28 | 63.0% | 499 |

### 1d  ·  1096 bars  ·  buy & hold +437.7%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | MACDStrategy | +462.7% | +25.0% | 1.46 | 28.1% | 1 |
| 2 | EMA + RSI + VWAP Targets | +341.4% | −96.3% | 1.28 | 28.1% | 6 |
| 3 | MACDStrategy_crossed | +137.5% | −300.2% | 1.04 | 28.1% | 2 |
| 4 | Freqtrade_backtest_validation_freqtrade1 | +122.3% | −315.4% | 0.91 | 41.0% | 22 |
| 5 | ASDTSRockwellTrading | +115.3% | −322.4% | 1.08 | 19.7% | 32 |
| 6 | BbandRsi | +110.3% | −327.4% | 1.05 | 20.9% | 5 |
| 7 | Bollinger Band Bounce | +87.4% | −350.3% | 1.00 | 20.0% | 18 |
| 8 | AdxSmas | +84.4% | −353.3% | 0.78 | 28.8% | 14 |
| 9 | RSI(2) Mean Reversion (Connors) | +32.8% | −404.9% | 0.54 | 23.4% | 28 |
| 10 | Smart Buy Sell Indicator V1 | +20.9% | −416.8% | 0.37 | 48.4% | 49 |
| 11 | Donchian Channel Breakout (Turtle Rules) | +11.2% | −426.5% | 0.27 | 41.9% | 63 |
| 12 | RSI with Bollinger Bands | +0.5% | −437.2% | 0.24 | 60.0% | 28 |
| 13 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −437.7% | 0.00 | 0.0% | 0 |
| 14 | EMA 50×200 Cross — Trend Barometer | +0.0% | −437.7% | 0.00 | 0.0% | 0 |
| 15 | Gold Macro & Fiat Valuation Barometer | +0.0% | −437.7% | 0.00 | 0.0% | 0 |
| 16 | TP/SL Signals + Days & Zones | +0.0% | −437.7% | 0.00 | 0.0% | 0 |
| 17 | EMA Trend Signals | −17.4% | −455.1% | 0.11 | 61.9% | 21 |
| 18 | MACD Signal Line Crossover | −24.6% | −462.3% | 0.04 | 50.4% | 83 |
| 19 | SuperTrend Flip | −45.9% | −483.6% | -0.20 | 70.9% | 28 |

## 5 years

### 1h  ·  43811 bars  ·  buy & hold +824.4%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | MACDStrategy | +859.4% | +35.0% | 1.05 | 77.2% | 1 |
| 2 | MACDStrategy_crossed | +851.2% | +26.8% | 1.07 | 73.0% | 16 |
| 3 | Freqtrade_backtest_validation_freqtrade1 | +60.0% | −764.4% | 0.43 | 70.9% | 896 |
| 4 | ASDTSRockwellTrading | +22.5% | −801.8% | 0.29 | 66.9% | 1239 |
| 5 | EMA + RSI + VWAP Targets | +14.2% | −810.2% | 0.35 | 95.1% | 89 |
| 6 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −824.4% | 0.00 | 0.0% | 0 |
| 7 | Gold Macro & Fiat Valuation Barometer | +0.0% | −824.4% | 0.00 | 0.0% | 0 |
| 8 | TP/SL Signals + Days & Zones | +0.0% | −824.4% | 0.00 | 0.0% | 0 |
| 9 | RSI(2) Mean Reversion (Connors) | −1.2% | −825.6% | 0.09 | 41.6% | 915 |
| 10 | EMA 50×200 Cross — Trend Barometer | −25.4% | −849.8% | 0.21 | 77.9% | 264 |
| 11 | BbandRsi | −30.0% | −854.4% | 0.07 | 76.9% | 154 |
| 12 | EMA Trend Signals | −34.4% | −858.8% | 0.17 | 83.5% | 770 |
| 13 | Bollinger Band Bounce | −34.7% | −859.1% | -0.06 | 61.7% | 856 |
| 14 | AdxSmas | −48.6% | −873.0% | -0.06 | 79.2% | 549 |
| 15 | Smart Buy Sell Indicator V1 | −84.0% | −908.4% | -0.30 | 91.7% | 1979 |
| 16 | SuperTrend Flip | −88.7% | −913.1% | -0.41 | 90.8% | 952 |
| 17 | Donchian Channel Breakout (Turtle Rules) | −93.3% | −917.6% | -1.16 | 94.9% | 2092 |
| 18 | MACD Signal Line Crossover | −97.0% | −921.3% | -0.84 | 97.9% | 3335 |
| 19 | RSI with Bollinger Bands | −97.5% | −921.8% | -0.90 | 98.0% | 1368 |

### 4h  ·  10958 bars  ·  buy & hold +823.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | MACDStrategy | +939.5% | +116.3% | 1.08 | 77.0% | 1 |
| 2 | EMA 50×200 Cross — Trend Barometer | +761.1% | −62.1% | 1.02 | 65.9% | 48 |
| 3 | AdxSmas | +434.0% | −389.2% | 0.97 | 46.2% | 142 |
| 4 | MACDStrategy_crossed | +391.8% | −431.4% | 0.86 | 73.6% | 4 |
| 5 | Freqtrade_backtest_validation_freqtrade1 | +346.9% | −476.3% | 0.93 | 64.1% | 221 |
| 6 | SuperTrend Flip | +278.2% | −545.0% | 0.74 | 65.6% | 238 |
| 7 | BbandRsi | +148.1% | −675.1% | 0.63 | 69.0% | 52 |
| 8 | EMA + RSI + VWAP Targets | +114.2% | −709.0% | 0.55 | 89.3% | 36 |
| 9 | ASDTSRockwellTrading | +111.5% | −711.7% | 0.63 | 55.3% | 311 |
| 10 | Smart Buy Sell Indicator V1 | +97.7% | −725.5% | 0.53 | 76.5% | 460 |
| 11 | EMA Trend Signals | +64.6% | −758.6% | 0.47 | 71.2% | 191 |
| 12 | RSI(2) Mean Reversion (Connors) | +18.9% | −804.3% | 0.27 | 45.1% | 232 |
| 13 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −823.2% | 0.00 | 0.0% | 0 |
| 14 | Gold Macro & Fiat Valuation Barometer | +0.0% | −823.2% | 0.00 | 0.0% | 0 |
| 15 | TP/SL Signals + Days & Zones | +0.0% | −823.2% | 0.00 | 0.0% | 0 |
| 16 | Donchian Channel Breakout (Turtle Rules) | −10.5% | −833.7% | 0.14 | 69.4% | 551 |
| 17 | Bollinger Band Bounce | −38.7% | −861.9% | -0.10 | 72.0% | 189 |
| 18 | RSI with Bollinger Bands | −84.4% | −907.6% | -0.31 | 90.4% | 327 |
| 19 | MACD Signal Line Crossover | −90.3% | −913.5% | -0.47 | 93.6% | 851 |

### 1d  ·  1827 bars  ·  buy & hold +829.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | MACDStrategy | +923.5% | +94.3% | 1.08 | 76.6% | 1 |
| 2 | AdxSmas | +607.1% | −222.1% | 1.09 | 54.7% | 24 |
| 3 | ASDTSRockwellTrading | +472.0% | −357.2% | 1.22 | 42.0% | 50 |
| 4 | EMA Trend Signals | +379.9% | −449.3% | 0.82 | 59.0% | 28 |
| 5 | Smart Buy Sell Indicator V1 | +359.9% | −469.2% | 0.81 | 69.4% | 70 |
| 6 | Freqtrade_backtest_validation_freqtrade1 | +242.1% | −587.1% | 0.79 | 68.5% | 37 |
| 7 | EMA 50×200 Cross — Trend Barometer | +159.4% | −669.8% | 0.63 | 57.1% | 6 |
| 8 | EMA + RSI + VWAP Targets | +130.7% | −698.4% | 0.58 | 88.1% | 16 |
| 9 | Donchian Channel Breakout (Turtle Rules) | +86.3% | −742.9% | 0.51 | 41.9% | 108 |
| 10 | MACDStrategy_crossed | +71.2% | −758.0% | 0.46 | 76.6% | 2 |
| 11 | Bollinger Band Bounce | +47.7% | −781.4% | 0.40 | 52.4% | 29 |
| 12 | BbandRsi | +16.5% | −812.6% | 0.27 | 50.4% | 7 |
| 13 | MACD Signal Line Crossover | +6.9% | −822.3% | 0.32 | 63.8% | 134 |
| 14 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −829.2% | 0.00 | 0.0% | 0 |
| 15 | Gold Macro & Fiat Valuation Barometer | +0.0% | −829.2% | 0.00 | 0.0% | 0 |
| 16 | TP/SL Signals + Days & Zones | +0.0% | −829.2% | 0.00 | 0.0% | 0 |
| 17 | RSI(2) Mean Reversion (Connors) | −9.3% | −838.5% | 0.03 | 40.4% | 36 |
| 18 | RSI with Bollinger Bands | −15.7% | −844.9% | 0.24 | 67.9% | 50 |
| 19 | SuperTrend Flip | −36.5% | −865.7% | 0.15 | 83.2% | 46 |

## 8 years

### 1h  ·  70001 bars  ·  buy & hold +2191.0%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | MACDStrategy | +2337.8% | +146.8% | 0.91 | 83.9% | 1 |
| 2 | Freqtrade_backtest_validation_freqtrade1 | +2081.9% | −109.1% | 1.03 | 70.9% | 1424 |
| 3 | MACDStrategy_crossed | +1107.3% | −1083.7% | 0.80 | 84.2% | 27 |
| 4 | EMA Trend Signals | +276.7% | −1914.3% | 0.60 | 83.5% | 1173 |
| 5 | EMA + RSI + VWAP Targets | +225.0% | −1966.0% | 0.57 | 90.0% | 45 |
| 6 | ASDTSRockwellTrading | +174.4% | −2016.6% | 0.52 | 66.9% | 1974 |
| 7 | RSI(2) Mean Reversion (Connors) | +83.8% | −2107.2% | 0.44 | 41.6% | 1417 |
| 8 | EMA 50×200 Cross — Trend Barometer | +12.3% | −2178.6% | 0.38 | 81.1% | 398 |
| 9 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 10 | Gold Macro & Fiat Valuation Barometer | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 11 | TP/SL Signals + Days & Zones | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 12 | SuperTrend Flip | −32.6% | −2223.6% | 0.31 | 91.3% | 1390 |
| 13 | BbandRsi | −68.8% | −2259.8% | 0.03 | 89.6% | 248 |
| 14 | AdxSmas | −69.7% | −2260.7% | 0.03 | 84.5% | 885 |
| 15 | Bollinger Band Bounce | −70.1% | −2261.1% | -0.10 | 91.2% | 1336 |
| 16 | Smart Buy Sell Indicator V1 | −90.1% | −2281.1% | -0.02 | 94.6% | 3091 |
| 17 | Donchian Channel Breakout (Turtle Rules) | −96.9% | −2287.9% | -0.65 | 98.0% | 3222 |
| 18 | MACD Signal Line Crossover | −99.7% | −2290.7% | -0.63 | 99.8% | 5346 |
| 19 | RSI with Bollinger Bands | −99.8% | −2290.8% | -0.65 | 99.8% | 2155 |

### 4h  ·  17517 bars  ·  buy & hold +2191.0%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | MACDStrategy | +2481.9% | +290.9% | 0.93 | 83.9% | 1 |
| 2 | Freqtrade_backtest_validation_freqtrade1 | +2352.9% | +161.9% | 1.09 | 64.1% | 346 |
| 3 | AdxSmas | +1498.1% | −692.8% | 0.90 | 72.2% | 218 |
| 4 | Smart Buy Sell Indicator V1 | +1337.8% | −853.2% | 0.83 | 76.5% | 712 |
| 5 | EMA 50×200 Cross — Trend Barometer | +1262.0% | −929.0% | 0.83 | 80.7% | 79 |
| 6 | MACDStrategy_crossed | +957.9% | −1233.1% | 0.78 | 83.9% | 5 |
| 7 | ASDTSRockwellTrading | +813.1% | −1377.9% | 0.95 | 55.3% | 488 |
| 8 | EMA + RSI + VWAP Targets | +494.5% | −1696.4% | 0.67 | 81.0% | 30 |
| 9 | EMA Trend Signals | +322.5% | −1868.5% | 0.61 | 71.2% | 297 |
| 10 | SuperTrend Flip | +271.9% | −1919.1% | 0.59 | 65.6% | 384 |
| 11 | RSI(2) Mean Reversion (Connors) | +15.5% | −2175.5% | 0.20 | 45.1% | 347 |
| 12 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 13 | Gold Macro & Fiat Valuation Barometer | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 14 | TP/SL Signals + Days & Zones | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 15 | Donchian Channel Breakout (Turtle Rules) | −9.3% | −2200.3% | 0.20 | 75.8% | 895 |
| 16 | BbandRsi | −12.9% | −2203.9% | 0.23 | 87.6% | 79 |
| 17 | RSI with Bollinger Bands | −65.9% | −2256.9% | 0.16 | 92.7% | 510 |
| 18 | MACD Signal Line Crossover | −72.4% | −2263.4% | 0.13 | 93.9% | 1315 |
| 19 | Bollinger Band Bounce | −75.6% | −2266.6% | -0.17 | 90.2% | 304 |

### 1d  ·  2923 bars  ·  buy & hold +2191.0%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | AdxSmas | +2372.2% | +181.2% | 1.02 | 62.7% | 39 |
| 2 | ASDTSRockwellTrading | +2217.5% | +26.5% | 1.22 | 43.5% | 76 |
| 3 | Freqtrade_backtest_validation_freqtrade1 | +1785.1% | −405.9% | 0.99 | 68.5% | 56 |
| 4 | MACDStrategy | +1241.8% | −949.2% | 0.83 | 76.6% | 1 |
| 5 | Smart Buy Sell Indicator V1 | +906.2% | −1284.7% | 0.76 | 80.8% | 114 |
| 6 | EMA Trend Signals | +806.2% | −1384.8% | 0.74 | 76.1% | 44 |
| 7 | MACDStrategy_crossed | +691.0% | −1500.0% | 0.73 | 76.6% | 2 |
| 8 | MACD Signal Line Crossover | +263.8% | −1927.2% | 0.57 | 63.8% | 208 |
| 9 | Donchian Channel Breakout (Turtle Rules) | +234.2% | −1956.8% | 0.55 | 48.0% | 176 |
| 10 | EMA 50×200 Cross — Trend Barometer | +132.8% | −2058.2% | 0.49 | 88.9% | 12 |
| 11 | RSI with Bollinger Bands | +116.2% | −2074.8% | 0.48 | 67.9% | 78 |
| 12 | BbandRsi | +61.3% | −2129.7% | 0.35 | 65.6% | 11 |
| 13 | RSI(2) Mean Reversion (Connors) | +39.8% | −2151.2% | 0.30 | 40.4% | 55 |
| 14 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 15 | Gold Macro & Fiat Valuation Barometer | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 16 | TP/SL Signals + Days & Zones | +0.0% | −2191.0% | 0.00 | 0.0% | 0 |
| 17 | SuperTrend Flip | −14.8% | −2205.8% | 0.31 | 83.2% | 70 |
| 18 | Bollinger Band Bounce | −36.7% | −2227.7% | 0.07 | 76.3% | 45 |
| 19 | EMA + RSI + VWAP Targets | −38.2% | −2229.2% | 0.26 | 96.6% | 18 |

## S&P 500 (daily)

### 3y  ·  751 bars  ·  buy & hold +79.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Freqtrade_backtest_validation_freqtrade1 | +39.1% | −40.1% | 1.42 | 7.8% | 11 |
| 2 | EMA + RSI + VWAP Targets | +37.8% | −41.4% | 0.96 | 28.5% | 4 |
| 3 | AdxSmas | +36.2% | −43.0% | 1.19 | 13.7% | 6 |
| 4 | MACDStrategy | +35.5% | −43.7% | 1.10 | 13.7% | 1 |
| 5 | EMA Trend Signals | +31.8% | −47.4% | 0.83 | 18.7% | 9 |
| 6 | Bollinger Band Bounce | +28.8% | −50.4% | 1.07 | 10.8% | 15 |
| 7 | BbandRsi | +18.7% | −60.4% | 0.79 | 13.7% | 2 |
| 8 | RSI(2) Mean Reversion (Connors) | +18.4% | −60.8% | 1.06 | 8.3% | 25 |
| 9 | EMA 50×200 Cross — Trend Barometer | +15.2% | −64.0% | 0.69 | 16.2% | 2 |
| 10 | ASDTSRockwellTrading | +12.9% | −66.3% | 0.79 | 6.9% | 33 |
| 11 | MACDStrategy_crossed | +12.3% | −66.9% | 0.58 | 13.7% | 1 |
| 12 | Smart Buy Sell Indicator V1 | +6.6% | −72.6% | 0.26 | 20.3% | 28 |
| 13 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −79.2% | 0.00 | 0.0% | 0 |
| 14 | Gold Macro & Fiat Valuation Barometer | +0.0% | −79.2% | 0.00 | 0.0% | 0 |
| 15 | TP/SL Signals + Days & Zones | +0.0% | −79.2% | 0.00 | 0.0% | 0 |
| 16 | SuperTrend Flip | −0.5% | −79.7% | 0.08 | 24.3% | 25 |
| 17 | Donchian Channel Breakout (Turtle Rules) | −11.5% | −90.7% | -0.39 | 19.3% | 75 |
| 18 | MACD Signal Line Crossover | −22.6% | −101.8% | -0.61 | 31.9% | 71 |
| 19 | RSI with Bollinger Bands | −52.3% | −131.4% | -1.96 | 53.5% | 12 |

### 5y  ·  1255 bars  ·  buy & hold +76.5%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | MACDStrategy | +74.5% | −2.1% | 0.92 | 22.8% | 1 |
| 2 | AdxSmas | +54.8% | −21.8% | 1.01 | 13.7% | 13 |
| 3 | BbandRsi | +50.5% | −26.0% | 0.82 | 20.8% | 5 |
| 4 | EMA 50×200 Cross — Trend Barometer | +50.2% | −26.3% | 0.88 | 24.1% | 3 |
| 5 | Bollinger Band Bounce | +47.9% | −28.6% | 0.91 | 10.8% | 26 |
| 6 | EMA + RSI + VWAP Targets | +46.1% | −30.4% | 0.64 | 23.1% | 11 |
| 7 | MACDStrategy_crossed | +41.1% | −35.4% | 0.74 | 16.9% | 2 |
| 8 | RSI(2) Mean Reversion (Connors) | +22.2% | −54.3% | 0.83 | 8.3% | 38 |
| 9 | Freqtrade_backtest_validation_freqtrade1 | +17.7% | −58.8% | 0.43 | 22.5% | 21 |
| 10 | Smart Buy Sell Indicator V1 | +14.8% | −61.7% | 0.30 | 20.3% | 46 |
| 11 | ASDTSRockwellTrading | +14.3% | −62.3% | 0.46 | 8.4% | 47 |
| 12 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −76.5% | 0.00 | 0.0% | 0 |
| 13 | Gold Macro & Fiat Valuation Barometer | +0.0% | −76.5% | 0.00 | 0.0% | 0 |
| 14 | TP/SL Signals + Days & Zones | +0.0% | −76.5% | 0.00 | 0.0% | 0 |
| 15 | EMA Trend Signals | −1.9% | −78.4% | 0.08 | 38.6% | 21 |
| 16 | Donchian Channel Breakout (Turtle Rules) | −15.9% | −92.4% | -0.29 | 19.5% | 119 |
| 17 | SuperTrend Flip | −18.6% | −95.1% | -0.19 | 26.4% | 43 |
| 18 | MACD Signal Line Crossover | −27.9% | −104.4% | -0.36 | 37.2% | 109 |
| 19 | RSI with Bollinger Bands | −47.8% | −124.3% | -0.83 | 60.5% | 25 |

### 8y  ·  2009 bars  ·  buy & hold +163.7%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | MACDStrategy | +184.9% | +21.2% | 0.94 | 33.9% | 1 |
| 2 | BbandRsi | +101.8% | −61.9% | 0.77 | 28.5% | 9 |
| 3 | EMA + RSI + VWAP Targets | +101.2% | −62.5% | 0.66 | 34.4% | 6 |
| 4 | Freqtrade_backtest_validation_freqtrade1 | +46.9% | −116.8% | 0.57 | 23.2% | 33 |
| 5 | Smart Buy Sell Indicator V1 | +46.7% | −117.0% | 0.42 | 21.7% | 67 |
| 6 | ASDTSRockwellTrading | +45.0% | −118.7% | 0.73 | 8.4% | 78 |
| 7 | Bollinger Band Bounce | +44.0% | −119.7% | 0.47 | 29.5% | 35 |
| 8 | MACDStrategy_crossed | +41.1% | −122.5% | 0.59 | 16.9% | 2 |
| 9 | AdxSmas | +41.1% | −122.6% | 0.45 | 30.5% | 21 |
| 10 | EMA 50×200 Cross — Trend Barometer | +38.2% | −125.5% | 0.40 | 33.2% | 8 |
| 11 | RSI(2) Mean Reversion (Connors) | +35.4% | −128.2% | 0.70 | 8.5% | 59 |
| 12 | EMA Trend Signals | +17.4% | −146.3% | 0.24 | 38.7% | 29 |
| 13 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −163.7% | 0.00 | 0.0% | 0 |
| 14 | Gold Macro & Fiat Valuation Barometer | +0.0% | −163.7% | 0.00 | 0.0% | 0 |
| 15 | TP/SL Signals + Days & Zones | +0.0% | −163.7% | 0.00 | 0.0% | 0 |
| 16 | Donchian Channel Breakout (Turtle Rules) | −16.4% | −180.1% | -0.14 | 29.9% | 207 |
| 17 | MACD Signal Line Crossover | −29.4% | −193.0% | -0.15 | 52.1% | 177 |
| 18 | SuperTrend Flip | −45.5% | −209.2% | -0.36 | 55.2% | 75 |
| 19 | RSI with Bollinger Bands | −67.2% | −230.9% | -0.77 | 73.4% | 42 |

## EUR/USD (daily)

### 3y  ·  777 bars  ·  buy & hold +7.4%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Smart Buy Sell Indicator V1 | +7.5% | +0.1% | 0.46 | 7.1% | 28 |
| 2 | Freqtrade_backtest_validation_freqtrade1 | +7.4% | −0.1% | 0.58 | 5.2% | 13 |
| 3 | BbandRsi | +6.0% | −1.5% | 0.62 | 3.9% | 4 |
| 4 | MACDStrategy_crossed | +5.0% | −2.5% | 0.72 | 2.1% | 1 |
| 5 | Bollinger Band Bounce | +1.4% | −6.0% | 0.19 | 3.8% | 16 |
| 6 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | −7.4% | 0.00 | 0.0% | 0 |
| 7 | EMA + RSI + VWAP Targets | +0.0% | −7.4% | 0.00 | 0.0% | 0 |
| 8 | MACDStrategy | +0.0% | −7.4% | 0.00 | 0.0% | 0 |
| 9 | Gold Macro & Fiat Valuation Barometer | +0.0% | −7.4% | 0.00 | 0.0% | 0 |
| 10 | TP/SL Signals + Days & Zones | +0.0% | −7.4% | 0.00 | 0.0% | 0 |
| 11 | RSI(2) Mean Reversion (Connors) | −1.2% | −8.7% | -0.19 | 3.7% | 16 |
| 12 | AdxSmas | −1.5% | −8.9% | -0.10 | 7.8% | 8 |
| 13 | ASDTSRockwellTrading | −2.4% | −9.9% | -0.21 | 5.5% | 28 |
| 14 | EMA 50×200 Cross — Trend Barometer | −3.0% | −10.5% | -0.18 | 8.6% | 5 |
| 15 | EMA Trend Signals | −5.8% | −13.2% | -0.30 | 10.5% | 17 |
| 16 | Donchian Channel Breakout (Turtle Rules) | −9.1% | −16.5% | -0.97 | 10.2% | 23 |
| 17 | SuperTrend Flip | −9.6% | −17.1% | -0.56 | 16.7% | 20 |
| 18 | MACD Signal Line Crossover | −13.9% | −21.4% | -0.84 | 20.9% | 72 |
| 19 | RSI with Bollinger Bands | −16.2% | −23.6% | -1.02 | 20.3% | 23 |

### 5y  ·  1299 bars  ·  buy & hold −2.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Smart Buy Sell Indicator V1 | +19.1% | +21.2% | 0.59 | 7.1% | 48 |
| 2 | Freqtrade_backtest_validation_freqtrade1 | +6.2% | +8.4% | 0.30 | 11.6% | 22 |
| 3 | MACDStrategy_crossed | +3.3% | +5.5% | 0.18 | 10.9% | 2 |
| 4 | BbandRsi | +2.9% | +5.0% | 0.15 | 16.2% | 6 |
| 5 | AdxSmas | +2.0% | +4.1% | 0.13 | 8.6% | 15 |
| 6 | EMA Trend Signals | +1.9% | +4.1% | 0.10 | 14.3% | 25 |
| 7 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 8 | EMA + RSI + VWAP Targets | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 9 | MACDStrategy | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 10 | Gold Macro & Fiat Valuation Barometer | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 11 | TP/SL Signals + Days & Zones | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 12 | Bollinger Band Bounce | −0.5% | +1.6% | -0.01 | 6.2% | 26 |
| 13 | RSI(2) Mean Reversion (Connors) | −4.7% | −2.6% | -0.48 | 5.9% | 25 |
| 14 | Donchian Channel Breakout (Turtle Rules) | −6.6% | −4.5% | -0.32 | 12.9% | 42 |
| 15 | ASDTSRockwellTrading | −7.5% | −5.4% | -0.44 | 8.8% | 41 |
| 16 | SuperTrend Flip | −10.4% | −8.3% | -0.30 | 16.7% | 32 |
| 17 | RSI with Bollinger Bands | −15.1% | −12.9% | -0.47 | 24.4% | 37 |
| 18 | EMA 50×200 Cross — Trend Barometer | −18.9% | −16.7% | -0.79 | 26.6% | 10 |
| 19 | MACD Signal Line Crossover | −22.9% | −20.8% | -0.76 | 29.6% | 115 |

### 8y  ·  2081 bars  ·  buy & hold −2.2%

| # | strategy | return | vs hold | Sharpe | maxDD | trades |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Freqtrade_backtest_validation_freqtrade1 | +8.1% | +10.2% | 0.26 | 16.1% | 35 |
| 2 | Smart Buy Sell Indicator V1 | +8.0% | +10.2% | 0.20 | 16.3% | 76 |
| 3 | Bollinger Band Bounce | +7.9% | +10.0% | 0.32 | 8.5% | 42 |
| 4 | AdxSmas | +6.5% | +8.7% | 0.24 | 8.6% | 24 |
| 5 | BbandRsi | +1.8% | +4.0% | 0.08 | 21.7% | 8 |
| 6 | Combo Oscillator - MACD + Stoch + RSI + EMA | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 7 | EMA + RSI + VWAP Targets | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 8 | MACDStrategy | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 9 | Gold Macro & Fiat Valuation Barometer | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 10 | TP/SL Signals + Days & Zones | +0.0% | +2.2% | 0.00 | 0.0% | 0 |
| 11 | EMA 50×200 Cross — Trend Barometer | −6.4% | −4.2% | -0.11 | 29.8% | 12 |
| 12 | RSI(2) Mean Reversion (Connors) | −7.1% | −4.9% | -0.43 | 8.1% | 36 |
| 13 | MACDStrategy_crossed | −8.3% | −6.1% | -0.24 | 19.3% | 2 |
| 14 | EMA Trend Signals | −10.3% | −8.1% | -0.18 | 21.8% | 39 |
| 15 | ASDTSRockwellTrading | −12.9% | −10.8% | -0.52 | 14.2% | 60 |
| 16 | RSI with Bollinger Bands | −17.1% | −14.9% | -0.35 | 24.4% | 54 |
| 17 | Donchian Channel Breakout (Turtle Rules) | −18.2% | −16.0% | -0.63 | 18.7% | 64 |
| 18 | SuperTrend Flip | −20.5% | −18.3% | -0.44 | 21.4% | 54 |
| 19 | MACD Signal Line Crossover | −36.5% | −34.3% | -0.90 | 40.0% | 182 |

## Declared timeframe

- BTCUSD Supertrend + EMA Trend Filter (1H) → 1h
- Daily Futures Wick Levels — Monthly Span V8 → 1d
- ADXMomentum → 1h
- AdxSmas → 1h
- ASDTSRockwellTrading → 5m
- AwesomeMacd → 1h
- BbandRsi → 1h
- CCIStrategy → 1m
- CMCWinner → 15m
- CofiBitStrategy → 5m
- Freqtrade_backtest_validation_freqtrade1 → 1h
- Low_BB → 1m
- MACDStrategy_crossed → 5m
- MACDStrategy → 5m
- Quickie → 5m
- Scalp → 1m
- Simple → 5m
- SmoothScalp → 1m
- CustomStoplossWithPSAR → 1h
- VolatilitySystem → 1h
- hlhb → 4h
- InformativeSample → 5m
- Strategy001_custom_exit → 5m
- Strategy001 → 5m
- Strategy002 → 5m
- Strategy003 → 5m
