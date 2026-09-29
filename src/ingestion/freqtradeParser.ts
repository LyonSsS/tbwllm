import type { StrategySpec } from '../core/types.js';
import { CALL_NAMES } from '../assembly/conditionEval.js';

// ============================================================================
// Freqtrade strategy parser — Python `IStrategy` subclasses (the
// freqtrade/freqtrade-strategies repo's standard shape) → StrategySpec.
//
// Deliberately narrow, same philosophy as the Pine analyzer: handles the
// mechanical, common patterns (TA-Lib single/multi-output indicators,
// qtpylib crossovers/Bollinger Bands, hyperopt-style named params) and
// reports anything else as a skip with a reason, rather than guessing.
// ============================================================================

export interface FreqtradeParseResult {
  spec?: StrategySpec;
  skip?: string;
}

// TA-Lib function name → our INDICATOR_MAP type (1:1 name matches only —
// freqtrade's single-output `ta.FOO(dataframe, timeperiod=N)` calls).
const SINGLE_OUTPUT_TALIB: Record<string, string> = {
  RSI: 'RSI', SMA: 'SMA', EMA: 'EMA', WMA: 'WMA', HMA: 'HMA',
  ADX: 'ADX', CCI: 'CCI', ATR: 'ATR', MOM: 'MOM', ROC: 'ROC',
};

const MACD_FIELD: Record<string, string> = { macd: 'macd', macdsignal: 'signal', macdhist: 'histogram' };
const BB_FIELD: Record<string, string> = { lower: 'lower', mid: 'middle', upper: 'upper' };

function extractMethodBody(src: string, methodName: string): string | null {
  const re = new RegExp(`def ${methodName}\\([^)]*\\)[^:]*:`, 'm');
  const m = re.exec(src);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = src.slice(start);
  // Ends at the next method def at the same (4-space) indentation, or EOF.
  const next = /\n    def /.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

interface Indicators {
  bindings: NonNullable<StrategySpec['bindings']>;
  colAlias: Map<string, string>; // freqtrade dataframe column → our identifier (bare or "key.field")
}

function parseIndicators(body: string): Indicators {
  const bindings: NonNullable<StrategySpec['bindings']> = {};
  const colAlias = new Map<string, string>();

  // Single-output: dataframe['col'] = ta.FUNC(dataframe[, timeperiod=N])
  const singleRe = /dataframe\['(\w+)'\]\s*=\s*ta\.(\w+)\(dataframe(?:,\s*timeperiod\s*=\s*(\d+))?\s*\)/g;
  for (const m of body.matchAll(singleRe)) {
    const [, col, fn, period] = m;
    const type = SINGLE_OUTPUT_TALIB[fn];
    if (!type) continue; // unsupported single-output fn — leave unaliased, surfaces as unresolved later
    bindings[col] = { type, params: period ? { period: Number(period) } : undefined };
    colAlias.set(col, col);
  }

  // Multi-output MACD: var = ta.MACD(dataframe) ... dataframe['col'] = var['field']
  const macdVarRe = /(\w+)\s*=\s*ta\.MACD\(dataframe\)/.exec(body);
  if (macdVarRe) {
    const varName = macdVarRe[1];
    bindings.macd = { type: 'MACD' };
    const destructureRe = new RegExp(`dataframe\\['(\\w+)'\\]\\s*=\\s*${varName}\\['(\\w+)'\\]`, 'g');
    for (const m of body.matchAll(destructureRe)) {
      const [, col, field] = m;
      const ourField = MACD_FIELD[field];
      if (ourField) colAlias.set(col, `macd.${ourField}`);
    }
  }

  // qtpylib Bollinger Bands: var = qtpylib.bollinger_bands(qtpylib.typical_price(dataframe), window=N, stds=S)
  const bbRe = /(\w+)\s*=\s*qtpylib\.bollinger_bands\(qtpylib\.typical_price\(dataframe\),\s*window\s*=\s*(\d+),\s*stds\s*=\s*(\d+)\)/.exec(body);
  if (bbRe) {
    const [, varName, window, stds] = bbRe;
    bindings.bb = { type: 'BB', params: { period: Number(window), stdDev: Number(stds) } };
    const destructureRe = new RegExp(`dataframe\\['(\\w+)'\\]\\s*=\\s*${varName}\\['(\\w+)'\\]`, 'g');
    for (const m of body.matchAll(destructureRe)) {
      const [, col, field] = m;
      const ourField = BB_FIELD[field];
      if (ourField) colAlias.set(col, `bb.${ourField}`);
    }
  }

  return { bindings, colAlias };
}

// Named hyperopt-style params: `X = IntParameter(..., default=D, ...)` for
// defaults, overridden by a `buy_params` / `sell_params` dict entry if present.
function parseNamedParams(src: string): Record<string, number> {
  const params: Record<string, number> = {};
  const paramDeclRe = /(\w+)\s*=\s*(?:Int|Decimal|Categorical)Parameter\([^)]*default\s*=\s*(-?[\d.]+)/g;
  for (const m of src.matchAll(paramDeclRe)) params[m[1]] = Number(m[2]);

  for (const dictName of ['buy_params', 'sell_params']) {
    const dictRe = new RegExp(`${dictName}\\s*=\\s*\\{([^}]*)\\}`, 's').exec(src);
    if (!dictRe) continue;
    const entryRe = /"(\w+)"\s*:\s*(-?[\d.]+)/g;
    for (const m of dictRe[1].matchAll(entryRe)) params[m[1]] = Number(m[2]);
  }
  return params;
}

// Strip a fully-wrapping outer paren pair (repeatedly) — not a naive
// leading/trailing regex, which over-strips when the outer paren sits
// directly adjacent to a clause's own paren (e.g. "((a) & (b))"). Only
// removes a `(` whose *matching* `)` is the very last character.
function stripOuterParens(s: string): string {
  while (s.startsWith('(') && s.endsWith(')')) {
    let depth = 0;
    let wrapsWhole = true;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '(') depth++;
      else if (s[i] === ')') {
        depth--;
        if (depth === 0 && i !== s.length - 1) { wrapsWhole = false; break; }
      }
    }
    if (!wrapsWhole) break;
    s = s.slice(1, -1).trim();
  }
  return s;
}

// Translate one freqtrade condition tuple's Python source into our mini-language.
function translateCondition(raw: string, colAlias: Map<string, string>): string {
  let s = raw;
  s = s.replace(/#[^\n]*/g, ''); // strip line comments
  s = s.replace(/\n/g, ' ').trim();
  s = stripOuterParens(s); // strip the tuple's own wrapping parens — inner clause grouping stays
  s = s.replace(/dataframe\['(\w+)'\]/g, (_, col: string) => colAlias.get(col) ?? col);
  s = s.replace(/self\.(\w+)\.value/g, '$1');
  s = s.replace(/qtpylib\.crossed_above/g, 'ta.crossover');
  s = s.replace(/qtpylib\.crossed_below/g, 'ta.crossunder');
  // pandas' lag operator — x.shift(n), or x.shift() defaulting to 1 — is
  // exactly our history-offset syntax x[n]. A non-literal shift amount (e.g.
  // a hyperopt param) can't translate: our grammar only allows a literal
  // integer inside [ ], so that's left alone and caught as an unsupported
  // call below rather than silently mistranslated.
  s = s.replace(/([\w.]+)\.shift\((\d*)\)/g, (_, base: string, n: string) => `${base}[${n || '1'}]`);
  s = s.replace(/&/g, ' and ');
  s = s.replace(/\|/g, ' or ');
  s = s.replace(/~\s*/g, 'not ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// After translation, anything still calling a function we don't support
// (leftover pandas method chains, `reduce(lambda ...)`, etc.) must be
// rejected rather than handed to the assembler — an unrecognised call name
// throws uncaught during signal evaluation instead of failing gracefully.
function findUnsupportedCall(s: string): string | null {
  const callRe = /([A-Za-z_][\w.]*)\(/g;
  for (const m of s.matchAll(callRe)) {
    if (!CALL_NAMES.has(m[1])) return m[1];
  }
  return null;
}

// null = not found; 'unsupported' = found but not a translatable shape
// (unconditional `dataframe.loc[:, ...]`, or the lazy match spanned past an
// unrelated earlier `dataframe.loc[...]` block — e.g. a two-sided/futures
// strategy with a separate enter_short block ahead of enter_long).
function extractCondition(body: string, col: 'enter_long' | 'exit_long'): string | null | 'unsupported' {
  const re = new RegExp(`dataframe\\.loc\\[([\\s\\S]*?),\\s*'${col}'\\s*\\]\\s*=\\s*1`);
  const m = re.exec(body);
  if (!m) return null;
  const raw = m[1];
  if (raw.trim() === ':') return 'unsupported'; // always-on entry, nothing to translate
  if (raw.includes('dataframe.loc[')) return 'unsupported'; // spanned multiple loc[] blocks
  return raw;
}

export function parseFreqtradeStrategy(src: string, source: string, id: string): FreqtradeParseResult {
  const classMatch = /class (\w+)\(IStrategy\):/.exec(src);
  if (!classMatch) return { skip: 'no `class X(IStrategy)` found' };
  const name = classMatch[1];

  const indicatorsBody = extractMethodBody(src, 'populate_indicators');
  const entryBody = extractMethodBody(src, 'populate_entry_trend');
  const exitBody = extractMethodBody(src, 'populate_exit_trend');
  if (!indicatorsBody || !entryBody) {
    return { skip: 'missing populate_indicators / populate_entry_trend (old interface or non-standard)' };
  }

  const { bindings, colAlias } = parseIndicators(indicatorsBody);
  if (Object.keys(bindings).length === 0) {
    return { skip: 'no recognised TA-Lib/qtpylib indicator calls in populate_indicators' };
  }

  // Validate one translated condition: no leftover `dataframe[...]` (e.g. a
  // hyphenated or f-string column name our alias map couldn't catch) and no
  // call name outside our supported set (leftover pandas chains, `reduce`, …).
  function validate(cond: string): string | null {
    if (/dataframe[.[]/.test(cond)) return `leftover untranslated "dataframe" reference: "${cond}"`;
    const badCall = findUnsupportedCall(cond);
    if (badCall) return `unsupported call "${badCall}(...)" after translation`;
    return null;
  }

  const entryRaw = extractCondition(entryBody, 'enter_long');
  if (entryRaw === null) return { skip: `no 'enter_long' assignment found in populate_entry_trend` };
  if (entryRaw === 'unsupported') return { skip: 'entry condition is unconditional or spans multiple dataframe.loc[] blocks (two-sided/futures strategy not supported)' };
  const entryCond = translateCondition(entryRaw, colAlias);
  const entryError = validate(entryCond);
  if (entryError) return { skip: `entry condition: ${entryError}` };

  let exitCond: string | undefined;
  if (exitBody) {
    const exitRaw = extractCondition(exitBody, 'exit_long');
    if (exitRaw && exitRaw !== 'unsupported') {
      exitCond = translateCondition(exitRaw, colAlias);
      const exitError = validate(exitCond);
      if (exitError) return { skip: `exit condition: ${exitError}` };
    }
  }

  const namedParams = parseNamedParams(src);
  const timeframeMatch = /^\s*timeframe\s*=\s*['"]([^'"]+)['"]/m.exec(src);
  const stoplossMatch = /^\s*stoploss\s*=\s*(-?[\d.]+)/m.exec(src);

  const spec: StrategySpec = {
    id,
    name,
    source,
    version: '1',
    strategyType: 'condition',
    assetClass: 'crypto',
    timeframe: timeframeMatch?.[1],
    bindings,
    entry: { direction: 'BUY', conditions: [entryCond] },
    exit: {
      conditions: exitCond ? [exitCond] : undefined,
      stopLoss: stoplossMatch ? `entry * (1 + ${stoplossMatch[1]})` : undefined,
    },
    parameters: Object.keys(namedParams).length ? namedParams : undefined,
    parsedBy: 'static',
    confidence: 0.7,
    notes: `Auto-translated from a freqtrade IStrategy (long-only — freqtrade's enter_long/exit_long; short side not translated).`,
    createdAt: 0, // the CLI sets this (snapshotting an existing spec's value, or Date.now() for a new one)
  };
  return { spec };
}
