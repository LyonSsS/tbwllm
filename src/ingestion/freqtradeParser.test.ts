import { parseFreqtradeStrategy } from './freqtradeParser.js';

const ADX_SMAS = `
from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta
import freqtrade.vendor.qtpylib.indicators as qtpylib


class AdxSmas(IStrategy):
    stoploss = -0.25
    timeframe = '1h'

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe['adx'] = ta.ADX(dataframe, timeperiod=14)
        dataframe['short'] = ta.SMA(dataframe, timeperiod=3)
        dataframe['long'] = ta.SMA(dataframe, timeperiod=6)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                    (dataframe['adx'] > 25) &
                    (qtpylib.crossed_above(dataframe['short'], dataframe['long']))
            ),
            'enter_long'] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                    (dataframe['adx'] < 25) &
                    (qtpylib.crossed_above(dataframe['long'], dataframe['short']))
            ),
            'exit_long'] = 1
        return dataframe
`;

const MACD_CCI = `
from freqtrade.strategy import IStrategy
from freqtrade.strategy import IntParameter
from pandas import DataFrame
import talib.abstract as ta


class MACDStrategy(IStrategy):
    timeframe = '5m'
    buy_cci = IntParameter(low=-700, high=0, default=-50, space='buy', optimize=True)
    sell_cci = IntParameter(low=0, high=700, default=100, space='sell', optimize=True)

    buy_params = {
        "buy_cci": -48,
    }
    sell_params = {
        "sell_cci": 687,
    }

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        macd = ta.MACD(dataframe)
        dataframe['macd'] = macd['macd']
        dataframe['macdsignal'] = macd['macdsignal']
        dataframe['macdhist'] = macd['macdhist']
        dataframe['cci'] = ta.CCI(dataframe)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe['macd'] > dataframe['macdsignal']) &
                (dataframe['cci'] <= self.buy_cci.value) &
                (dataframe['volume'] > 0)
            ),
            'enter_long'] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe['macd'] < dataframe['macdsignal']) &
                (dataframe['cci'] >= self.sell_cci.value)
            ),
            'exit_long'] = 1
        return dataframe
`;

const BBAND_RSI = `
from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta
import freqtrade.vendor.qtpylib.indicators as qtpylib


class BbandRsi(IStrategy):
    timeframe = '1h'

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
        bollinger = qtpylib.bollinger_bands(qtpylib.typical_price(dataframe), window=20, stds=2)
        dataframe['bb_lowerband'] = bollinger['lower']
        dataframe['bb_middleband'] = bollinger['mid']
        dataframe['bb_upperband'] = bollinger['upper']
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                    (dataframe['rsi'] < 30) &
                    (dataframe['close'] < dataframe['bb_lowerband'])
            ),
            'enter_long'] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                    (dataframe['rsi'] > 70)
            ),
            'exit_long'] = 1
        return dataframe
`;

describe('parseFreqtradeStrategy', () => {
  it('translates single-output TA-Lib indicators and crossed_above into bindings + conditions', () => {
    const { spec, skip } = parseFreqtradeStrategy(ADX_SMAS, 'https://example.com/AdxSmas.py', 'freqtrade-adxsmas');
    expect(skip).toBeUndefined();
    expect(spec!.bindings).toEqual({
      adx: { type: 'ADX', params: { period: 14 } },
      short: { type: 'SMA', params: { period: 3 } },
      long: { type: 'SMA', params: { period: 6 } },
    });
    expect(spec!.entry.conditions).toEqual(['(adx > 25) and (ta.crossover(short, long))']);
    expect(spec!.exit!.conditions).toEqual(['(adx < 25) and (ta.crossover(long, short))']);
    expect(spec!.timeframe).toBe('1h');
  });

  it('translates multi-output MACD, hyperopt params, and the volume guard', () => {
    const { spec, skip } = parseFreqtradeStrategy(MACD_CCI, 'https://example.com/MACDStrategy.py', 'freqtrade-macdstrategy');
    expect(skip).toBeUndefined();
    expect(spec!.bindings!.macd).toEqual({ type: 'MACD' });
    expect(spec!.bindings!.cci).toEqual({ type: 'CCI', params: undefined });
    expect(spec!.entry.conditions).toEqual(['(macd.macd > macd.signal) and (cci <= buy_cci) and (volume > 0)']);
    expect(spec!.exit!.conditions).toEqual(['(macd.macd < macd.signal) and (cci >= sell_cci)']);
    // buy_params/sell_params dict entries override the IntParameter defaults (-50/100 → -48/687).
    expect(spec!.parameters).toEqual({ buy_cci: -48, sell_cci: 687 });
  });

  it('translates qtpylib Bollinger Bands and leaves close/volume as bare OHLC identifiers', () => {
    const { spec, skip } = parseFreqtradeStrategy(BBAND_RSI, 'https://example.com/BbandRsi.py', 'freqtrade-bbandrsi');
    expect(skip).toBeUndefined();
    expect(spec!.bindings!.bb).toEqual({ type: 'BB', params: { period: 20, stdDev: 2 } });
    expect(spec!.entry.conditions).toEqual(['(rsi < 30) and (close < bb.lower)']);
    expect(spec!.exit!.conditions).toEqual(['rsi > 70']);
  });

  it('skips a file with no IStrategy class', () => {
    const { spec, skip } = parseFreqtradeStrategy('def foo(): pass', 'x', 'x');
    expect(spec).toBeUndefined();
    expect(skip).toMatch(/no `class X\(IStrategy\)`/);
  });

  it('translates pandas .shift(n) into our [n] history-offset syntax', () => {
    const src = `
class ShiftUser(IStrategy):
    def populate_indicators(self, dataframe, metadata):
        dataframe['cci'] = ta.CCI(dataframe)
        return dataframe
    def populate_entry_trend(self, dataframe, metadata):
        dataframe.loc[
            ((dataframe['cci'] > 0) & (dataframe['cci'].shift(1) <= 0)),
            'enter_long'] = 1
        return dataframe
`;
    const { spec, skip } = parseFreqtradeStrategy(src, 'x', 'x');
    expect(skip).toBeUndefined();
    expect(spec!.entry.conditions).toEqual(['(cci > 0) and (cci[1] <= 0)']);
  });

  it('rejects (skips) a condition with an unsupported call left after translation, instead of emitting a spec that would crash the assembler', () => {
    const src = `
class Reducer(IStrategy):
    def populate_indicators(self, dataframe, metadata):
        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
        return dataframe
    def populate_entry_trend(self, dataframe, metadata):
        conditions = [(dataframe['rsi'] < 30)]
        dataframe.loc[
            (reduce(lambda x, y: x & y, conditions)),
            'enter_long'] = 1
        return dataframe
`;
    const { spec, skip } = parseFreqtradeStrategy(src, 'x', 'x');
    expect(spec).toBeUndefined();
    expect(skip).toMatch(/unsupported call "reduce\(\.\.\.\)"/);
  });

  it('skips an unconditional entry (dataframe.loc[:, ...] — always-on, nothing to translate)', () => {
    const src = `
class AlwaysOn(IStrategy):
    def populate_indicators(self, dataframe, metadata):
        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
        return dataframe
    def populate_entry_trend(self, dataframe, metadata):
        dataframe.loc[:, 'enter_long'] = 1
        return dataframe
`;
    const { spec, skip } = parseFreqtradeStrategy(src, 'x', 'x');
    expect(spec).toBeUndefined();
    expect(skip).toMatch(/unconditional or spans multiple/);
  });

  it('skips a hyphenated column name that the alias map cannot catch, instead of emitting a broken condition', () => {
    const src = `
class HyphenCol(IStrategy):
    def populate_indicators(self, dataframe, metadata):
        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
        dataframe['fastk-previous'] = dataframe['rsi'].shift(1)
        return dataframe
    def populate_entry_trend(self, dataframe, metadata):
        dataframe.loc[
            ((dataframe['rsi'] < 30) & (dataframe['fastk-previous'] < 20)),
            'enter_long'] = 1
        return dataframe
`;
    const { spec, skip } = parseFreqtradeStrategy(src, 'x', 'x');
    expect(spec).toBeUndefined();
    expect(skip).toMatch(/leftover untranslated "dataframe" reference/);
  });

  it('skips a file using the old populate_buy_trend interface', () => {
    const src = `
class OldStyle(IStrategy):
    def populate_indicators(self, dataframe, metadata):
        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
        return dataframe
    def populate_buy_trend(self, dataframe, metadata):
        dataframe.loc[(dataframe['rsi'] < 30), 'buy'] = 1
        return dataframe
`;
    const { spec, skip } = parseFreqtradeStrategy(src, 'x', 'x');
    expect(spec).toBeUndefined();
    expect(skip).toMatch(/populate_entry_trend/);
  });
});
