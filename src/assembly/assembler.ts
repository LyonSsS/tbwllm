import type { Candle, Signal, StrategySpec } from '../core/types.js';
import { computeIndicator, isKnownIndicator, type MultiSeries, type Series } from './indicatorMap.js';
import { collectIdentifiers, compileCondition, type Env } from './conditionEval.js';

// ============================================================================
// Assembler — StrategySpec → runnable, pure `(candles) => Signal[]`.
//
//   const a = assemble(spec);
//   if ('unassemblable' in a) { ... a.reason, a.missing }
//   else a.run(candles) => Signal[]
//
// 4a scope: OHLC + `parameters` + `indicators` + `bindings` resolve conditions;
// a flat→long/short state machine turns them into signals. Not yet: stop-loss /
// take-profit formulas, `source`-composed bindings, `scored` / `session` types.
// ============================================================================

export interface AssembledStrategy {
  spec: StrategySpec;
  run(candles: Candle[]): Signal[];
  warnings: string[];
}

export interface UnassemblableStrategy {
  unassemblable: true;
  reason: string;
  missing: string[];
}

const isMulti = (s: Series | MultiSeries): s is MultiSeries => !Array.isArray(s);

function numericParams(spec: StrategySpec): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(spec.parameters ?? {})) {
    if (typeof v === 'number') out[k] = v;
  }
  return out;
}

// Resolve an indicator/binding param map: string values may name a spec parameter.
function resolveParams(
  raw: Record<string, unknown> | undefined,
  params: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (typeof v === 'number') out[k] = v;
    else if (typeof v === 'string' && Number.isFinite(params[v])) out[k] = params[v];
  }
  return out;
}

// What series keys does a spec make available (before OHLC / builtins)?
function providedKeys(spec: StrategySpec): { flat: Set<string>; multi: Map<string, string[]> } {
  const flat = new Set<string>();
  const multi = new Map<string, string[]>();
  const params = numericParams(spec);
  Object.keys(params).forEach(k => flat.add(k));

  const register = (key: string, type: string) => {
    if (!isKnownIndicator(type)) return; // unknown → not provided; caught as "missing"
    const lines = MULTI_OUTPUT[type.toUpperCase()];
    if (lines) { multi.set(key, lines); lines.forEach(l => flat.add(`${key}.${l}`)); }
    else flat.add(key);
  };

  for (const ind of spec.indicators ?? []) register(ind.outputKey, ind.type);
  for (const [key, b] of Object.entries(spec.bindings ?? {})) register(key, b.type);
  return { flat, multi };
}

const MULTI_OUTPUT: Record<string, string[]> = {
  BB: ['upper', 'middle', 'lower'],
  SUPERTREND: ['value', 'dir'],
  MACD: ['macd', 'signal', 'histogram'],
  STOCH: ['stochK', 'stochD', 'stochJ'],
};

// ─── assemble ───────────────────────────────────────────────────────────────

export function assemble(spec: StrategySpec): AssembledStrategy | UnassemblableStrategy {
  const warnings: string[] = [];
  const entryConds = spec.entry.conditions ?? [];
  const exitConds = spec.exit?.conditions ?? [];
  const allConds = [...entryConds, ...exitConds, ...(spec.entry.trigger ? [spec.entry.trigger] : [])];

  if (allConds.length === 0) {
    return { unassemblable: true, reason: 'no entry conditions or trigger', missing: [] };
  }
  const stringCond = allConds.find(c => /['"]/.test(c));
  if (stringCond) {
    return { unassemblable: true, reason: `string comparison not supported yet ("${stringCond}")`, missing: [] };
  }

  // Static resolvability check.
  const { flat } = providedKeys(spec);
  const missing = new Set<string>();
  for (const c of allConds) {
    let ids: string[];
    try {
      ids = collectIdentifiers(c);
    } catch (err) {
      return { unassemblable: true, reason: `unparseable condition "${c}": ${String(err)}`, missing: [] };
    }
    for (const id of ids) {
      if (flat.has(id)) continue;
      const base = id.includes('.') ? id.slice(0, id.indexOf('.')) : id;
      if (flat.has(base)) continue;
      missing.add(id);
    }
  }
  for (const ind of spec.indicators ?? []) {
    if (!isKnownIndicator(ind.type)) missing.add(`indicator:${ind.type}`);
  }
  const OHLC = new Set(['open', 'high', 'low', 'close', 'volume', 'hl2', 'hlc3', 'ohlc4']);
  for (const [key, b] of Object.entries(spec.bindings ?? {})) {
    if (!isKnownIndicator(b.type)) missing.add(`indicator:${b.type}`);
    if (b.source && !OHLC.has(b.source) && !flat.has(b.source) && !flat.has(b.source.split('.')[0])) {
      missing.add(`binding:${key}.source(${b.source})`);
    }
  }
  if (missing.size > 0) {
    return {
      unassemblable: true,
      reason: `${missing.size} unresolved identifier(s)`,
      missing: [...missing].sort(),
    };
  }

  // Long / short split.
  const dir = spec.entry.direction;
  let longConds: string[] = [];
  let shortConds: string[] = [];
  if (dir === 'BUY') longConds = entryConds;
  else if (dir === 'SELL') shortConds = entryConds;
  else {
    longConds = entryConds.slice(0, 1);
    shortConds = entryConds.slice(1);
    if (entryConds.length === 1) warnings.push('direction BOTH with 1 condition — treated as long-only');
  }
  if (spec.exit?.stopLoss || spec.exit?.takeProfit) {
    warnings.push('exit stopLoss / takeProfit formulas are not evaluated yet (4a)');
  }

  const longFns = longConds.map(compileCondition);
  const shortFns = shortConds.map(compileCondition);
  const exitFns = exitConds.map(compileCondition);
  const params = numericParams(spec);

  const run = (candles: Candle[]): Signal[] => {
    if (candles.length === 0) return [];
    const env = buildEnv(spec, candles, params);
    const anyTrue = (fns: Array<(e: Env) => number[]>): number[] => {
      if (fns.length === 0) return new Array(candles.length).fill(0);
      const cols = fns.map(f => f(env));
      return cols[0].map((_, i) => (cols.some(col => col[i] === 1) ? 1 : 0));
    };
    const longSig = anyTrue(longFns);
    const shortSig = anyTrue(shortFns);
    const exitSig = anyTrue(exitFns);

    // Two-sided (a long AND a short condition) → stop-and-reverse: an opposite
    // signal flips the position, it doesn't just go flat. One-sided strategies
    // (or any with an explicit exit) close to flat and wait for re-entry.
    const twoSided = longFns.length > 0 && shortFns.length > 0;

    const signals: Signal[] = [];
    let pos: 'flat' | 'long' | 'short' = 'flat';
    for (let i = 0; i < candles.length; i++) {
      const bar = candles[i];
      if (pos === 'flat') {
        if (longSig[i]) { signals.push(mk('BUY', bar, 'entry long')); pos = 'long'; }
        else if (shortSig[i]) { signals.push(mk('SELL', bar, 'entry short')); pos = 'short'; }
      } else if (pos === 'long') {
        if (exitSig[i]) { signals.push(mk('CLOSE', bar, 'exit long')); pos = 'flat'; }
        else if (shortSig[i]) {
          if (twoSided) { signals.push(mk('SELL', bar, 'reverse to short')); pos = 'short'; }
          else { signals.push(mk('CLOSE', bar, 'exit long')); pos = 'flat'; }
        }
      } else {
        if (exitSig[i]) { signals.push(mk('CLOSE', bar, 'exit short')); pos = 'flat'; }
        else if (longSig[i]) {
          if (twoSided) { signals.push(mk('BUY', bar, 'reverse to long')); pos = 'long'; }
          else { signals.push(mk('CLOSE', bar, 'exit short')); pos = 'flat'; }
        }
      }
    }
    return signals;
  };

  return { spec, run, warnings };
}

function mk(type: Signal['type'], bar: Candle, reason: string): Signal {
  return { type, timestamp: bar.timestamp, price: bar.close, reason };
}

// ─── env construction ───────────────────────────────────────────────────────

function buildEnv(spec: StrategySpec, candles: Candle[], params: Record<string, number>): Env {
  const len = candles.length;
  const series: Record<string, number[]> = {
    open: candles.map(c => c.open),
    high: candles.map(c => c.high),
    low: candles.map(c => c.low),
    close: candles.map(c => c.close),
    volume: candles.map(c => c.volume),
  };
  for (const [k, v] of Object.entries(params)) series[k] = new Array(len).fill(v);

  const add = (key: string, type: string, raw: Record<string, unknown> | undefined, source?: number[]) => {
    const out = computeIndicator(type, candles, resolveParams(raw, params), source);
    if (isMulti(out)) for (const [line, arr] of Object.entries(out)) series[`${key}.${line}`] = arr;
    else series[key] = out;
  };
  for (const ind of spec.indicators ?? []) add(ind.outputKey, ind.type, ind.params);

  // Bindings, computed in dependency order (a `source` must exist first).
  const pending = Object.entries(spec.bindings ?? {});
  let guard = pending.length + 1;
  while (pending.length && guard-- > 0) {
    for (let i = pending.length - 1; i >= 0; i--) {
      const [key, b] = pending[i];
      if (b.source && !(b.source in series)) continue; // source not ready yet
      add(key, b.type, b.params, b.source ? series[b.source] : undefined);
      pending.splice(i, 1);
    }
  }

  return { length: len, series };
}
