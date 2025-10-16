/**
 * Relative Strength Index (RSI)
 * 
 * Measures the magnitude of recent price changes to evaluate
 * overbought or oversold conditions (0-100 scale).
 * 
 * @param values - Array of numeric values (typically closing prices)
 * @param period - Number of periods for RSI calculation (default: 14)
 * @returns Array of RSI values (NaN for insufficient data)
 */
export function RSI(values: number[], period: number = 14): number[] {
  if (period <= 0) {
    throw new Error('Period must be greater than 0');
  }
  
  if (period >= values.length) {
    throw new Error(`Period (${period}) must be less than values length (${values.length})`);
  }

  const result: number[] = [];
  
  // Calculate initial gains and losses
  let gains = 0;
  let losses = 0;

  // Fill initial NaN values
  for (let i = 0; i < period; i++) {
    result.push(NaN);
    if (i > 0) {
      const change = values[i] - values[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change; // losses are positive
      }
    }
  }

  // First RSI value (simple average)
  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgGain / avgLoss;
  result.push(100 - (100 / (1 + rs)));

  // Subsequent RSI values (smoothed)
  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    // Smoothed averages
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgGain / avgLoss;
    result.push(100 - (100 / (1 + rs)));
  }

  return result;
}

