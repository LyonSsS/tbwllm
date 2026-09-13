import crypto from 'crypto';
import { StrategySpec, IndicatorConfig } from '../core/types.js';
import { collectIdentifiers } from '../assembly/conditionEval.js';

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

// Input names that are chart-display cosmetics, not strategy tunables:
// a display-verb prefix, a label/table prefix, or a styling suffix
// (optionally with a trailing "Input", as many scripts name them).
const UI_PARAM_RE =
  /^(show|hide|draw|display|enable|disable|label|table)|(colou?r|style|width|transp(arency)?|size|pos(ition)?|offset|decimals|linewidth|textsize)(input)?$|_col$/i;

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

// Blank out the interior of "..."/'...' string literals (length-preserving,
// via an underscore filler) so paren/operator scans below don't get thrown
// off by punctuation quoted inside a title/message string.
function maskStrings(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      const q = c;
      out += '_';
      i++;
      while (i < s.length && s[i] !== q) {
        out += '_';
        if (s[i] === '\\' && i + 1 < s.length) { i++; out += '_'; }
        i++;
      }
      if (i < s.length) out += '_'; // closing quote
      continue;
    }
    out += c;
  }
  return out;
}

// Find `name = <expr>` (or `name := <expr>`, or `var name = <expr>`) in the
// source and return the right-hand side, single line only, comment stripped.
// A Pine boolean/arithmetic expression continues on the next line when it
// ends on a dangling and/or/not/operator or has unclosed parens — authors
// often wrap long conditions across lines with no line-continuation character.
function continuesOnNextLine(s: string): boolean {
  const masked = maskStrings(s);
  if (/\b(and|or|not)$/i.test(masked)) return true;
  if (/[-+*/%<>=!?:&|]$/.test(masked)) return true;
  const open = (masked.match(/\(/g) ?? []).length;
  const close = (masked.match(/\)/g) ?? []).length;
  return open > close;
}

function findAssignment(src: string, name: string): string | null {
  const re = new RegExp(`(?:^|\\n)\\s*(?:var\\s+|varip\\s+)?${name}\\s*(?::=|=)(?!=)\\s*([^\\n]+)`);
  const m = re.exec(src);
  if (!m || m.index === undefined) return null;
  let rhs = m[1].replace(/\/\/.*$/, '').trim();
  let rest = src.slice(m.index + m[0].length);
  for (let i = 0; i < 10 && continuesOnNextLine(rhs); i++) {
    const next = /^(?:[ \t]*\n)*[ \t]*([^\n]+)/.exec(rest);
    if (!next) break;
    const line = next[1].replace(/\/\/.*$/, '').trim();
    if (!line) break;
    rhs = `${rhs} ${line}`.trim();
    rest = rest.slice(next[0].length);
  }
  return rhs;
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

// ─── Auto-binding: condition identifier → indicator config ──────────────────
// Fills spec.bindings for the simple, common case where a condition references
// a variable that is a direct `X = ta.<fn>(source, length)` assignment.

type BindingCfg = { type: string; params?: Record<string, number | string> };

// Pine `ta.*` (and a few bare) fn names → INDICATOR_MAP type.
const TA_TO_TYPE: Record<string, string> = {
  rsi: 'RSI', ema: 'EMA', sma: 'SMA', wma: 'WMA', hma: 'HMA', rma: 'RMA',
  roc: 'ROC', mom: 'MOM', atr: 'ATR', tr: 'TR', cci: 'CCI', adx: 'ADX',
  vwap: 'VWAP', vwma: 'VWMA', stdev: 'STDDEV', supertrend: 'SUPERTREND',
};

// Try to read a right-hand side as an indicator call. Unwraps request.security
// (MTF) and `cond ? A : B` ternaries.
function bindExpr(rhs: string, params: Record<string, unknown>): BindingCfg | null {
  let s = rhs.trim();
  const sec = s.match(/^request\.security\s*\([^,]+,[^,]+,\s*(.+)\)\s*$/);
  if (sec) s = sec[1].trim();
  const tern = s.match(/^[^?]+\?\s*(.+?)\s*:\s*(.+)$/);
  if (tern) return bindExpr(tern[1], params) ?? bindExpr(tern[2], params);

  const call = s.match(/^(?:ta\.)?([A-Za-z_]\w*)\s*\(\s*[\w.[\]]+\s*(?:,\s*([\w.]+))?/);
  if (!call) return null;
  const type = TA_TO_TYPE[call[1].toLowerCase()];
  if (!type) return null;

  const lenArg = call[2];
  const p: Record<string, number | string> = {};
  if (lenArg) {
    if (/^\d+$/.test(lenArg)) p.period = Number(lenArg);
    else if (lenArg in params) p.period = lenArg; // reference a spec parameter
  }
  return Object.keys(p).length ? { type, params: p } : { type };
}

function extractBindings(
  src: string,
  conditions: string[],
  params: Record<string, unknown>,
): Record<string, BindingCfg> {
  const ids = new Set<string>();
  for (const c of conditions) {
    try {
      for (const id of collectIdentifiers(c)) ids.add(id);
    } catch { /* unparseable — nothing to bind */ }
  }

  const bindings: Record<string, BindingCfg> = {};
  for (const id of ids) {
    if (id.includes('.') || id in params) continue; // OHLC dotted / a parameter
    let name = id;
    let cfg: BindingCfg | null = null;
    for (let hop = 0; hop < 2 && !cfg; hop++) {
      const rhs = findAssignment(src, name);
      if (!rhs) break;
      cfg = bindExpr(rhs, params);
      if (!cfg && /^[A-Za-z_]\w*$/.test(rhs)) { name = rhs; continue; } // follow alias
      break;
    }
    if (cfg) bindings[id] = cfg;
  }
  return bindings;
}

// Best-effort intended timeframe. Most community scripts declare none (they run
// on the chart TF); we only return one when the title or an `timeframe=`/
// `resolution=` arg says so explicitly. undefined → test across timeframes.
function pineToTf(code: string): string | undefined {
  const c = code.trim().toUpperCase();
  if (/^\d+$/.test(c)) {
    const min = Number(c);
    if (min > 0 && min < 60) return `${min}m`;
    if (min % 60 === 0) return `${min / 60}h`;
  }
  if (c === 'D' || c === '1D') return '1d';
  if (c === 'W' || c === '1W') return '1w';
  if (c === 'M' || c === '1M') return '1M';
  return undefined;
}

function extractTimeframe(src: string, title: string): string | undefined {
  const arg = src.match(/(?:indicator|strategy)\s*\([^)]*?\b(?:timeframe|resolution)\s*=\s*["']([^"'\n]+)["']/i);
  if (arg && arg[1].trim()) return pineToTf(arg[1]);

  const tag = title.match(/[([]\s*(\d+\s*[mhdw]|1h|4h|15m|5m|30m|daily|hourly|weekly|monthly)\s*[)\]]/i);
  const kw = title.match(/\b(15m|5m|30m|1h|4h|hourly|daily|weekly|monthly)\b/i);
  const hit = (tag?.[1] ?? kw?.[1] ?? '').toLowerCase().replace(/\s+/g, '');
  if (!hit) return undefined;
  if (hit === 'hourly') return '1h';
  if (hit === 'daily') return '1d';
  if (hit === 'weekly') return '1w';
  if (hit === 'monthly') return '1M';
  if (/^\d+[mhdw]$/.test(hit)) return hit === '60m' ? '1h' : hit;
  return undefined;
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

// Scan from `start` (just past the call's opening paren) for the first
// top-level argument: the text up to the first paren/bracket-depth-0 comma,
// or the call's closing paren if there's no other argument. String literals
// are skipped whole so a quoted paren/comma (a title/message arg) can't
// desync the depth count.
function firstTopLevelArg(s: string, start: number): { text: string; endIndex: number } | null {
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < s.length && s[i] !== q) {
        if (s[i] === '\\' && i + 1 < s.length) i++;
        i++;
      }
      continue; // loop's i++ steps past the closing quote
    }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') {
      if (depth === 0) return { text: s.slice(start, i), endIndex: i };
      depth--;
    } else if (c === ',' && depth === 0) {
      return { text: s.slice(start, i), endIndex: i };
    }
  }
  return null;
}

// Many indicator-style scripts emit their entry signal only through a chart
// marker: `plotshape(longSig, "Buy", shape.triangleup, location.belowbar, …)`.
// Pull the series arg from those and label it bull/bear by the call's styling.
// The series arg is scanned paren-aware, since it's often itself a call with
// its own commas (`plotshape(ta.crossover(fast, slow) ? … : na, …)`).
function extractPlotSignals(src: string): { bull: string[]; bear: string[] } {
  const bull: string[] = [];
  const bear: string[] = [];
  const callRe = /plot(?:shape|char|arrow)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = callRe.exec(src)) !== null) {
    const argStart = m.index + m[0].length;
    const first = firstTopLevelArg(src, argStart);
    if (!first) continue;
    let series = first.text.trim();
    const tern = series.match(/^(.+?)\s*\?/); // `cond ? x : na` → cond
    if (tern) series = tern[1].trim();
    if (!/^[A-Za-z_]\w*$/.test(series) && !isEvaluableCondition(series)) continue;

    const lineEnd = src.indexOf('\n', first.endIndex);
    const rest = src.slice(first.endIndex, lineEnd === -1 ? src.length : lineEnd).toLowerCase();
    const isBull = /buy|long|bull|belowbar|triangleup|labelup|arrowup/.test(rest);
    const isBear = /sell|short|bear|abovebar|triangledown|labeldown|arrowdown/.test(rest);
    if (isBull && !isBear) bull.push(series);
    else if (isBear && !isBull) bear.push(series);
  }
  return { bull, bear };
}

// Paren-aware: the condition arg is often itself a call with its own commas
// (`alertcondition(ta.crossover(fast, slow), "title", "message")`), so a
// naive split on the first comma truncates it mid-call.
function extractAlertConditions(src: string): string[] {
  const conditions: string[] = [];
  const callRe = /alertcondition\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = callRe.exec(src)) !== null) {
    const first = firstTopLevelArg(src, m.index + m[0].length);
    if (first) conditions.push(first.text.trim());
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
  if (alerts.length === 0) return { direction: 'BOTH' };

  const bull = alerts.filter(a => /bull|long|buy|\bup\b|cross.*over/i.test(a));
  const bear = alerts.filter(a => /bear|short|sell|\bdown\b|cross.*under/i.test(a));

  if (bull.length && bear.length) {
    return { direction: 'BOTH', conditions: [...bull.slice(0, 2), ...bear.slice(0, 2)] };
  }
  if (bull.length) return { direction: 'BUY', conditions: bull.slice(0, 3) };
  if (bear.length) return { direction: 'SELL', conditions: bear.slice(0, 3) };
  // No directional keyword — keep the alert conditions anyway (direction unknown).
  return { direction: 'BOTH', conditions: alerts.slice(0, 3) };
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function analyzePineScript(src: string, url: string): AnalysisResult {
  const rawHash = hash(src);
  // Normalize line endings after hashing (rawHash keys curation.json, so it
  // must stay stable) — ~70% of scraped scripts are CRLF, which silently
  // breaks `//comment$`-style regexes and `[^\n]+` line captures downstream.
  src = src.replace(/\r\n?/g, '\n');
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
  // Title from indicator(...) / strategy(...) — first string arg, or an
  // explicit title=/shorttitle=. Handles single or double quotes.
  const titleMatch =
    src.match(/(?:indicator|strategy)\s*\(\s*(?:title\s*=\s*)?["']([^"'\n]{1,80})["']/i) ??
    src.match(/(?:indicator|strategy)\s*\([^)]*?shorttitle\s*=\s*["']([^"'\n]{1,80})["']/i);
  const name = titleMatch ? titleMatch[1].trim() : 'Unknown Strategy';

  const timeframe = extractTimeframe(src, name);

  // 4b. Auto-bind condition identifiers that are direct `X = ta.foo(src, len)`.
  const bindings = extractBindings(src, entry.conditions ?? [], parameters);

  // 5. Build partial spec
  const partial: Partial<StrategySpec> = {
    source: url,
    name,
    strategyType,
    timeframe,
    indicators: indicators.length > 0 ? indicators : undefined,
    bindings: Object.keys(bindings).length > 0 ? bindings : undefined,
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
