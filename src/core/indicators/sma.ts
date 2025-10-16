/**
 * Simple Moving Average (SMA)
 * 
 * Calculates the arithmetic mean of the last N values.
 * 
 * @param values - Array of numeric values (typically closing prices)
 * @param period - Number of periods to average
 * @returns Array of SMA values (NaN for insufficient data)
 */
export function SMA(values: number[], period: number): number[] {
  if (period <= 0) {
    throw new Error('Period must be greater than 0');
  }
  
  if (period > values.length) {
    throw new Error(`Period (${period}) cannot be greater than values length (${values.length})`);
  }

  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      // Not enough data yet
      result.push(NaN);
    } else {
      // Calculate average of last 'period' values
      const sum = values.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
      result.push(sum / period);
    }
  }

  return result;
}

