import { getOHLCV } from './fetcher.js';

// yarn data:fetch <SYMBOL> <TIMEFRAME> <FROM> <TO> [source]
//   yarn data:fetch BTC/USDT 1h 2022-01-01 2025-01-01
const [symbol, timeframe, from, to, source = 'binance'] = process.argv.slice(2);

if (!symbol || !timeframe || !from || !to) {
  console.error('usage: yarn data:fetch <SYMBOL> <TIMEFRAME> <FROM> <TO> [source]');
  process.exit(1);
}

const since = Date.parse(from);
const until = Date.parse(to);
if (Number.isNaN(since) || Number.isNaN(until)) {
  console.error('FROM / TO must be ISO dates, e.g. 2022-01-01');
  process.exit(1);
}

await getOHLCV({ source, symbol, timeframe, since, until });
