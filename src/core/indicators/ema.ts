/**
 * Exponential Moving Average (EMA)
 * 
 * Calculates a weighted moving average that gives more weight to recent prices.
 * 
 * @param values - Array of numeric values (typically closing prices)
 * @param period - Number of periods for the EMA
 * @returns Array of EMA values (NaN for insufficient data)
 */
export function EMA(values: number[], period: number): number[] {
  if (period <= 0) {
    throw new Error('Period must be greater than 0');
  }
  
  if (period > values.length) {
    throw new Error(`Period (${period}) cannot be greater than values length (${values.length})`);
  }

  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  // First EMA is a simple average
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
    if (i < period - 1) {
      result.push(NaN);
    }
  }
  
  result.push(sum / period);

  // Subsequent EMAs use the formula: EMA = (Close - EMA(previous)) * multiplier + EMA(previous)
  for (let i = period; i < values.length; i++) {
    const ema = (values[i] - result[i - 1]) * multiplier + result[i - 1];
    result.push(ema);
  }

  return result;
}

