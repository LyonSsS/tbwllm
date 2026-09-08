import crypto from 'crypto';
import { StrategySpec, IndicatorConfig } from '../core/types.js';

// ============================================================================
// Static Pine Script Analyzer
// Zero LLM tokens — pure regex + rule-based extraction
// ============================================================================

export interface AnalysisResult {
  isTradeable: boolean;
  skipReason?: string;
  confidence: number;        // 0-1: how complete the extracted spec is
  partial: Partial<StrategySpec>;
  rawHash: string;
  complexity: 'simple' | 'medium' | 'complex';
  unknownIndicators: string[]; // ta.* calls with no matching INDICATOR_PATTERN
}

// ─── Known indicator patterns ────────────────────────────────────────────────

const INDICATOR_PATTERNS: Array<{
  regex: RegExp;
  type: string;
  paramKeys: string[];
}> = [
  { regex: /ta\.rsi\s*\(\s*\w+\s*,\s*(\d+)/g,         type: 'RSI',           paramKeys: ['period'] },
  { regex: /ta\.ema\s*\(\s*\w+\s*,\s*(\d+)/g,         type: 'EMA',           paramKeys: ['period'] },
  { regex: /ta\.sma\s*\(\s*\w+\s*,\s*(\d+)/g,         type: 'SMA',           paramKeys: ['period'] },
  { regex: /ta\.atr\s*\(\s*(\d+)/g,                   type: 'ATR',           paramKeys: ['period'] },
  { regex: /ta\.macd\s*\(/g,                           type: 'MACD',          paramKeys: [] },
  { regex: /ta\.bb\s*\(|BollingerBands/g,              type: 'BB',            paramKeys: [] },
  { regex: /ta\.stoch\s*\(/g,                          type: 'STOCH',         paramKeys: [] },
  { regex: /ta\.mom\s*\(\s*\w+\s*,\s*(\d+)/g,         type: 'MOM',           paramKeys: ['period'] },
  { regex: /ta\.tsi\s*\(\s*\w+\s*,\s*(\d+)\s*,\s*(\d+)/g, type: 'TSI',      paramKeys: ['longPeriod', 'shortPeriod'] },
  { regex: /ta\.vwap\s*\(/g,                           type: 'VWAP',          paramKeys: [] },
  { regex: /ta\.pivothigh\s*\(\s*\w+\s*,\s*(\d+)/g,   type: 'PIVOT_HIGH',    paramKeys: ['period'] },
  { regex: /ta\.pivotlow\s*\(\s*\w+\s*,\s*(\d+)/g,    type: 'PIVOT_LOW',     paramKeys: ['period'] },
  { regex: /ta\.highest\s*\(\s*\w+\s*,\s*(\d+)/g,     type: 'HIGHEST_HIGH',  paramKeys: ['period'] },
  { regex: /ta\.lowest\s*\(\s*\w+\s*,\s*(\d+)/g,      type: 'LOWEST_LOW',    paramKeys: ['period'] },
  { regex: /ta\.adx\s*\(\s*(\d+)/g,                   type: 'ADX',           paramKeys: ['period'] },
  { regex: /ta\.cci\s*\(\s*\w+\s*,\s*(\d+)/g,         type: 'CCI',           paramKeys: ['period'] },
  { regex: /ta\.wma\s*\(\s*\w+\s*,\s*(\d+)/g,         type: 'WMA',           paramKeys: ['period'] },
  { regex: /ta\.hma\s*\(\s*\w+\s*,\s*(\d+)/g,         type: 'HMA',           paramKeys: ['period'] },
  { regex: /ta\.rma\s*\(\s*\w+\s*,\s*(\d+)/g,         type: 'RMA',           paramKeys: ['period'] },
  { regex: /ta\.roc\s*\(\s*\w+\s*,\s*(\d+)/g,         type: 'ROC',           paramKeys: ['period'] },
  { regex: /ta\.mfi\s*\(\s*\w+\s*,\s*(\d+)/g,         type: 'MFI',           paramKeys: ['period'] },
  { regex: /ta\.stdev\s*\(\s*\w+\s*,\s*(\d+)/g,       type: 'STDDEV',        paramKeys: ['period'] },
  { regex: /ta\.dmi\s*\(\s*(\d+)\s*,\s*(\d+)/g,       type: 'DMI',           paramKeys: ['diLength', 'adxSmoothing'] },
  { regex: /ta\.linreg\s*\(\s*\w+\s*,\s*(\d+)\s*,\s*(\d+)/g, type: 'LINREG',  paramKeys: ['period', 'offset'] },
];

// `ta.*` function names already covered by INDICATOR_PATTERNS above.
// Keep in sync when adding a pattern. `variance` / `correlation` are recognised
// (kept off the unknown report) but not extracted — variance is stdev², and
// correlation needs two series, which the spec model doesn't express yet.
const KNOWN_TA_FUNCTIONS = new Set([
  'rsi', 'ema', 'sma', 'atr', 'macd', 'bb', 'stoch', 'mom', 'tsi', 'vwap',
  'pivothigh', 'pivotlow', 'highest', 'lowest', 'adx', 'cci', 'wma', 'hma',
  'rma', 'roc', 'mfi', 'stdev', 'dmi', 'linreg', 'variance', 'correlation',
]);

// `ta.*` helpers that are comparison / series utilities, not indicators to
// implement — excluded from the unknown-indicator report as noise.
const TA_HELPERS = new Set([
  'crossover', 'crossunder', 'cross', 'change', 'barssince', 'valuewhen',
  'rising', 'falling', 'cum', 'highestbars', 'lowestbars', 'pivot_point_levels',
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hash(src: string): string {
  return crypto.createHash('sha256').update(src).digest('hex').slice(0, 16);
}

// Every `ta.<fn>(` call whose <fn> isn't in KNOWN_TA_FUNCTIONS — i.e. an
// indicator the static analyzer currently can't extract. Surfaced by the
// pipeline so the gap can be prioritised (see docs/indicators.md, Phase I3).
function extractUnknownIndicators(src: string): string[] {
  const re = /\bta\.([a-zA-Z_]\w*)\s*\(/g;
  const unknown = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const fn = m[1].toLowerCase();
    if (!KNOWN_TA_FUNCTIONS.has(fn) && !TA_HELPERS.has(fn)) unknown.add(fn);
  }
  return [...unknown].sort();
}

// Input names that are chart-display cosmetics, not strategy tunables.
const UI_PARAM_RE = /^(show|hide|draw|display|enable|disable)|colou?r$|_col$/i;

function extractInputs(src: string): Record<string, number | string | boolean> {
  const params: Record<string, number | string | boolean> = {};
  const re = /(\w+)\s*=\s*input\.(int|float|bool|string)\s*\(\s*([^,)]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const [, varName, type, rawVal] = m;
    if (UI_PARAM_RE.test(varName)) continue; // skip display toggles / colours
    const val = rawVal.trim();
    if (type === 'int' || type === 'float') {
      const n = parseFloat(val);
      if (!isNaN(n)) params[varName] = n;
    } else if (type === 'bool') {
      params[varName] = val === 'true';
    } else {
      params[varName] = val.replace(/['"]/g, '');
    }
  }
  return params;
}

function extractIndicators(src: string): IndicatorConfig[] {
  const seen = new Set<string>();
  const indicators: IndicatorConfig[] = [];

  for (const { regex, type, paramKeys } of INDICATOR_PATTERNS) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(src)) !== null) {
      const params: Record<string, number> = {};
      paramKeys.forEach((k, i) => {
        const v = parseFloat(m![i + 1]);
        if (!isNaN(v)) params[k] = v;
      });
      const key = `${type}_${JSON.stringify(params)}`;
      if (!seen.has(key)) {
        seen.add(key);
        const outputKey = type.toLowerCase() + (params['period'] ? params['period'] : '');
        indicators.push({ type, params, outputKey });
      }
    }
  }

  return indicators;
}

// Find `name = <expr>` (or `name := <expr>`, or `var name = <expr>`) in the
// source and return the right-hand side, single line only, comment stripped.
function findAssignment(src: string, name: string): string | null {
  const re = new RegExp(`(?:^|\\n)\\s*(?:var\\s+|varip\\s+)?${name}\\s*(?::=|=)(?!=)\\s*([^\\n]+)`);
  const m = src.match(re);
  if (!m) return null;
  return m[1].replace(/\/\/.*$/, '').trim();
}

// A condition string that is just a bare identifier carries no logic an
// assembler can evaluate. Expand it to its definition, up to `depth` hops,
// stopping once it's an expression (has an operator / ta. call / and-or).
function resolveCondition(src: string, cond: string, depth = 2): string {
  let cur = cond.trim();
  for (let i = 0; i < depth; i++) {
    if (!/^[A-Za-z_]\w*$/.test(cur)) break; // already an expression
    const rhs = findAssignment(src, cur);
    if (!rhs || rhs === cur) break;
    cur = rhs;
  }
  return cur;
}

// Does this condition carry evaluable logic (vs. an unresolved bare name)?
export function isEvaluableCondition(cond: string): boolean {
  return /[<>]=?|[!=]==?|\bta\.|\b(and|or|not)\b|\bcross/i.test(cond);
}

// Chart-marker signals are often gated on a display toggle:
// `showSignals and oversoldSignal`. Drop those toggle terms from an
// AND-chain so only the real logic remains.
function stripUiGates(cond: string): string {
  const parts = cond.split(/\s+and\s+/i);
  const kept = parts.filter(p => !/^(show|hide|draw|display|enable|disable)\w*$/i.test(p.trim()));
  return (kept.length ? kept.join(' and ') : cond).replace(/\s+/g, ' ').trim();
}

// Many indicator-style scripts emit their entry signal only through a chart
// marker: `plotshape(longSig, "Buy", shape.triangleup, location.belowbar, …)`.
// Pull the series arg from those and label it bull/bear by the call's styling.
function extractPlotSignals(src: string): { bull: string[]; bear: string[] } {
  const bull: string[] = [];
  const bear: string[] = [];
  const re = /plot(?:shape|char|arrow)\s*\(\s*([^,\n]+?)\s*,([^\n]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    let series = m[1].trim();
    const tern = series.match(/^(.+?)\s*\?/); // `cond ? x : na` → cond
    if (tern) series = tern[1].trim();
    if (!/^[A-Za-z_]\w*$/.test(series) && !isEvaluableCondition(series)) continue;

    const rest = m[2].toLowerCase();
    const isBull = /buy|long|bull|belowbar|triangleup|labelup|arrowup/.test(rest);
    const isBear = /sell|short|bear|abovebar|triangledown|labeldown|arrowdown/.test(rest);
    if (isBull && !isBear) bull.push(series);
    else if (isBear && !isBull) bear.push(series);
  }
  return { bull, bear };
}

function extractAlertConditions(src: string): string[] {
  const conditions: string[] = [];
  const re = /alertcondition\s*\(\s*([^,]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    conditions.push(m[1].trim());
  }
  return conditions;
}

function extractStrategyEntries(src: string): Array<{ direction: string; condition: string }> {
  const entries: Array<{ direction: string; condition: string }> = [];
  const re = /strategy\.entry\s*\(\s*"[^"]*"\s*,\s*strategy\.(long|short)[^)]*when\s*=\s*([^)]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    entries.push({
      direction: m[1].toUpperCase(),
      condition: m[2].trim(),
    });
  }
  return entries;
}

function detectStrategyType(src: string): StrategySpec['strategyType'] {
  const hasMTF = (src.match(/request\.security\s*\(/g) ?? []).length >= 2;
  const hasPivots = /ta\.pivothigh|ta\.pivotlow/.test(src);
  const hasScoring = /score\s*\+=|score\s*:=\s*\d|rawScore/.test(src);
  const hasSessionTime = /time\s*\(\s*timeframe\.period\s*,\s*"[\d:]+-[\d:]+/.test(src);
  const hasSessionLogic = /in_asia|in_lon|in_ny|isAsia|isLondon/.test(src);

  if (hasMTF) return 'mtf_scored';
  if (hasSessionTime || hasSessionLogic) return 'session';
  if (hasScoring) return 'scored';
  if (hasPivots) return 'pattern';
  return 'condition';
}

function isTradeable(src: string): { tradeable: boolean; reason?: string } {
  const hasAlerts = /alertcondition\s*\(/.test(src);
  const hasStrategyEntry = /strategy\.entry\s*\(/.test(src);
  const hasPlotshapeSignal = /plotshape\s*\(/.test(src);

  if (!hasAlerts && !hasStrategyEntry && !hasPlotshapeSignal) {
    return { tradeable: false, reason: 'no_signals: pure indicator/visualization' };
  }
  return { tradeable: true };
}

function computeComplexity(
  src: string,
  indicators: IndicatorConfig[],
  _params: Record<string, unknown>
): 'simple' | 'medium' | 'complex' {
  const hasMTF = /request\.security/.test(src);
  const hasCustomFn = /f_\w+\s*\(|calcTSI|f_t3/.test(src);
  const lineCount = src.split('\n').length;

  if (hasMTF || hasCustomFn || lineCount > 200) return 'complex';
  if (indicators.length > 4 || lineCount > 100) return 'medium';
  return 'simple';
}

function computeConfidence(
  partial: Partial<StrategySpec>,
  complexity: string
): number {
  let score = 0;
  if (partial.strategyType) score += 0.2;
  if (partial.indicators && partial.indicators.length > 0) score += 0.2;
  if (partial.entry?.direction) score += 0.2;
  // Only credit an entry we could actually resolve to evaluable logic —
  // a bare unresolved identifier ("bullCross") doesn't count.
  const hasEntryLogic =
    !!partial.entry?.trigger ||
    !!partial.entry?.conditions?.some(isEvaluableCondition);
  if (hasEntryLogic) score += 0.2;
  if (partial.parameters && Object.keys(partial.parameters).length > 0) score += 0.1;
  if (partial.exit) score += 0.1;

  // Penalize complex scripts — static analysis is less complete
  if (complexity === 'complex') score *= 0.6;
  if (complexity === 'medium') score *= 0.85;

  return Math.round(score * 100) / 100;
}

function buildEntryFromAlerts(
  alerts: string[],
  _strategyType: StrategySpec['strategyType']
): Partial<StrategySpec['entry']> {
  // Try to identify bull/bear signal variable names from alert conditions
  const bullPatterns = alerts.filter(a =>
    /bull|long|buy|up|cross.*over/i.test(a)
  );
  const bearPatterns = alerts.filter(a =>
    /bear|short|sell|down|cross.*under/i.test(a)
  );

  if (bullPatterns.length > 0 || bearPatterns.length > 0) {
    return {
      direction: bullPatterns.length > 0 && bearPatterns.length > 0 ? 'BOTH' : bullPatterns.length > 0 ? 'BUY' : 'SELL',
      conditions: bullPatterns.slice(0, 2),
    };
  }

  return { direction: 'BOTH' };
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function analyzePineScript(src: string, url: string): AnalysisResult {
  const rawHash = hash(src);
  const unknownIndicators = extractUnknownIndicators(src);

  // 1. Is this tradeable at all?
  const { tradeable, reason } = isTradeable(src);
  if (!tradeable) {
    return {
      isTradeable: false,
      skipReason: reason,
      confidence: 0,
      partial: {},
      rawHash,
      complexity: 'simple',
      unknownIndicators,
    };
  }

  // 2. Extract everything deterministically
  const parameters = extractInputs(src);
  const indicators = extractIndicators(src);
  const alerts = extractAlertConditions(src);
  const strategyEntries = extractStrategyEntries(src);
  const strategyType = detectStrategyType(src);

  // 3. Build entry
  let entry: Partial<StrategySpec['entry']>;
  if (strategyEntries.length > 0) {
    const buyEntry = strategyEntries.find(e => e.direction === 'LONG');
    entry = {
      direction: strategyEntries.length > 1 ? 'BOTH' : buyEntry ? 'BUY' : 'SELL',
      conditions: strategyEntries.map(e => e.condition).slice(0, 3),
    };
  } else {
    entry = buildEntryFromAlerts(alerts, strategyType);
  }

  // 3b. No conditions from alerts? Try chart-marker (plotshape) signals.
  if (!entry.conditions?.length) {
    const { bull, bear } = extractPlotSignals(src);
    if (bull.length || bear.length) {
      entry = {
        direction: bull.length && bear.length ? 'BOTH' : bull.length ? 'BUY' : 'SELL',
        conditions: [...bull, ...bear].slice(0, 3),
      };
    }
  }

  // 3c. Clean and expand conditions: strip display-toggle gates, expand
  // bare identifiers to their source definitions, strip gates again in case
  // the expansion introduced one, drop bare literals.
  if (entry.conditions?.length) {
    entry.conditions = entry.conditions
      .map(c => resolveCondition(src, stripUiGates(c)))
      .map(c => stripUiGates(c))
      .filter(c => c && !/^(true|false|na)$/i.test(c));
  }

  // 4. Infer name from indicator title
  const titleMatch = src.match(/indicator\s*\(\s*"([^"]+)"/);
  const name = titleMatch ? titleMatch[1] : 'Unknown Strategy';

  // 5. Build partial spec
  const partial: Partial<StrategySpec> = {
    source: url,
    name,
    strategyType,
    indicators: indicators.length > 0 ? indicators : undefined,
    entry: entry as StrategySpec['entry'],
    parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
    rawHash,
    parsedBy: 'static',
  };

  const complexity = computeComplexity(src, indicators, parameters);
  const confidence = computeConfidence(partial, complexity);

  return {
    isTradeable: true,
    confidence,
    partial,
    rawHash,
    complexity,
    unknownIndicators,
  };
}
