import { parseYahooChart } from './fetcher.js';

describe('parseYahooChart', () => {
  it('maps timestamps to ms and passes through OHLCV', () => {
    const body = {
      chart: {
        result: [{
          timestamp: [1000, 2000],
          indicators: { quote: [{
            open: [1, 2], high: [1.5, 2.5], low: [0.5, 1.5], close: [1.2, 2.2], volume: [100, 200],
          }] },
        }],
        error: null,
      },
    };
    expect(parseYahooChart(body)).toEqual([
      { timestamp: 1_000_000, open: 1, high: 1.5, low: 0.5, close: 1.2, volume: 100 },
      { timestamp: 2_000_000, open: 2, high: 2.5, low: 1.5, close: 2.2, volume: 200 },
    ]);
  });

  it('drops bars with a null OHLC field (holidays / gaps)', () => {
    const body = {
      chart: {
        result: [{
          timestamp: [1000, 2000, 3000],
          indicators: { quote: [{
            open: [1, null, 3], high: [1, 2, 3], low: [1, 2, 3], close: [1, 2, 3], volume: [10, 20, 30],
          }] },
        }],
        error: null,
      },
    };
    expect(parseYahooChart(body)).toEqual([
      { timestamp: 1_000_000, open: 1, high: 1, low: 1, close: 1, volume: 10 },
      { timestamp: 3_000_000, open: 3, high: 3, low: 3, close: 3, volume: 30 },
    ]);
  });

  it('defaults missing volume to 0 (Yahoo forex crosses report null/0 volume)', () => {
    const body = {
      chart: {
        result: [{
          timestamp: [1000],
          indicators: { quote: [{ open: [1], high: [1], low: [1], close: [1], volume: [null] }] },
        }],
        error: null,
      },
    };
    expect(parseYahooChart(body)).toEqual([
      { timestamp: 1_000_000, open: 1, high: 1, low: 1, close: 1, volume: 0 },
    ]);
  });

  it('throws with Yahoo\'s own error description on an empty result', () => {
    const body = { chart: { result: null, error: { description: 'No data found, symbol may be delisted' } } };
    expect(() => parseYahooChart(body)).toThrow('No data found, symbol may be delisted');
  });
});
