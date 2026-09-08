// ============================================================================
// Condition mini-language — parse & vectorised-evaluate the strings in
// StrategySpec.entry/exit.conditions. No `eval`.
//
// Supported:
//   numbers, identifiers (incl. dotted: bb.lower, ta.crossover)
//   + - * /        arithmetic (elementwise, NaN-propagating)
//   < <= > >= == != comparison (→ 1 / 0, NaN → 0)
//   and or not      logic (on 1 / 0)
//   x[n]            history offset (x shifted n bars back)
//   f(a, b)         calls: ta.crossover, ta.crossunder, ta.cross, nz, abs,
//                   min, max, math.abs, math.min, math.max
//   ( )             grouping
//
// Every value is a number[] of env length. Booleans are 1 / 0.
// ============================================================================

export interface Env {
  length: number;
  series: Record<string, number[]>; // OHLC, params (constant), indicators, builtins
}

type Node =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'id'; name: string }
  | { k: 'hist'; base: Node; offset: number }
  | { k: 'unary'; op: 'not' | 'neg'; x: Node }
  | { k: 'bin'; op: string; a: Node; b: Node }
  | { k: 'call'; name: string; args: Node[] };

// ─── Tokeniser ──────────────────────────────────────────────────────────────

type Tok = { t: string; v: string };

const KEYWORDS = new Set(['and', 'or', 'not']);

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const two = ['==', '!=', '<=', '>='];
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j++;
      toks.push({ t: 'str', v: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      toks.push({ t: 'num', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_.]/.test(src[j])) j++;
      const word = src.slice(i, j);
      toks.push({ t: KEYWORDS.has(word) ? word : 'id', v: word });
      i = j;
      continue;
    }
    const pair = src.slice(i, i + 2);
    if (two.includes(pair)) { toks.push({ t: 'op', v: pair }); i += 2; continue; }
    if ('+-*/<>()[],'.includes(c)) { toks.push({ t: c === '(' || c === ')' || c === '[' || c === ']' || c === ',' ? c : 'op', v: c }); i++; continue; }
    throw new Error(`condition: unexpected char '${c}' in "${src}"`);
  }
  return toks;
}

// ─── Parser (recursive descent, precedence climbing) ────────────────────────

const PREC: Record<string, number> = {
  or: 1, and: 2,
  '==': 3, '!=': 3, '<': 3, '<=': 3, '>': 3, '>=': 3,
  '+': 4, '-': 4, '*': 5, '/': 5,
};

function parse(src: string): Node {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const next = () => toks[pos++];
  const expect = (t: string) => {
    const tk = next();
    if (!tk || (tk.t !== t && tk.v !== t)) throw new Error(`condition: expected '${t}' in "${src}"`);
    return tk;
  };

  function parsePrimary(): Node {
    const tk = peek();
    if (!tk) throw new Error(`condition: unexpected end of "${src}"`);
    if (tk.t === 'num') { next(); return { k: 'num', v: parseFloat(tk.v) }; }
    if (tk.t === 'str') { next(); return { k: 'str', v: tk.v }; }
    if (tk.t === 'not') { next(); return { k: 'unary', op: 'not', x: parseUnary() }; }
    if (tk.t === 'op' && tk.v === '-') { next(); return { k: 'unary', op: 'neg', x: parseUnary() }; }
    if (tk.t === '(') { next(); const e = parseExpr(0); expect(')'); return withPostfix(e); }
    if (tk.t === 'id') {
      next();
      if (peek()?.t === '(') {
        next();
        const args: Node[] = [];
        if (peek()?.t !== ')') {
          args.push(parseExpr(0));
          while (peek()?.t === ',') { next(); args.push(parseExpr(0)); }
        }
        expect(')');
        return withPostfix({ k: 'call', name: tk.v, args });
      }
      return withPostfix({ k: 'id', name: tk.v });
    }
    throw new Error(`condition: unexpected '${tk.v}' in "${src}"`);
  }

  function withPostfix(node: Node): Node {
    let n = node;
    while (peek()?.t === '[') {
      next();
      const off = expect('num');
      expect(']');
      n = { k: 'hist', base: n, offset: parseInt(off.v, 10) };
    }
    return n;
  }

  function parseUnary(): Node {
    return parsePrimary();
  }

  function parseExpr(minPrec: number): Node {
    let left = parseUnary();
    for (;;) {
      const tk = peek();
      if (!tk) break;
      const op = tk.t === 'and' || tk.t === 'or' ? tk.t : tk.t === 'op' ? tk.v : null;
      if (op == null || PREC[op] == null || PREC[op] < minPrec) break;
      next();
      const right = parseExpr(PREC[op] + 1);
      left = { k: 'bin', op, a: left, b: right };
    }
    return left;
  }

  const node = parseExpr(0);
  if (pos < toks.length) throw new Error(`condition: trailing tokens in "${src}"`);
  return node;
}

// ─── Identifier collection (for the assembler's resolvability check) ────────

const BUILTIN_IDS = new Set(['open', 'high', 'low', 'close', 'volume', 'hl2', 'hlc3', 'ohlc4', 'bar_index', 'na']);
const CALL_NAMES = new Set([
  'ta.crossover', 'ta.crossunder', 'ta.cross', 'nz', 'abs', 'min', 'max',
  'math.abs', 'math.min', 'math.max', 'math.sign', 'barstate.isconfirmed',
]);

export function collectIdentifiers(src: string): string[] {
  const ids = new Set<string>();
  const walk = (n: Node): void => {
    switch (n.k) {
      case 'id':
        if (!BUILTIN_IDS.has(n.name) && !n.name.startsWith('barstate.')) ids.add(n.name);
        break;
      case 'num': case 'str': break;
      case 'hist': walk(n.base); break;
      case 'unary': walk(n.x); break;
      case 'bin': walk(n.a); walk(n.b); break;
      case 'call': n.args.forEach(walk); break;
    }
  };
  walk(parse(src));
  return [...ids];
}

// ─── Evaluation ─────────────────────────────────────────────────────────────

const fill = (len: number, v: number): number[] => new Array(len).fill(v);

function series(name: string, env: Env): number[] {
  if (name in env.series) return env.series[name];
  if (name === 'hl2') return zipCandle(env, (h, l) => (h + l) / 2);
  if (name === 'hlc3') return zip3(env, 'high', 'low', 'close', (a, b, c) => (a + b + c) / 3);
  if (name === 'ohlc4') return zip4(env, (o, h, l, c) => (o + h + l + c) / 4);
  if (name === 'bar_index') return env.series.close.map((_, i) => i);
  if (name === 'na') return fill(env.length, NaN);
  if (name.startsWith('barstate.')) return fill(env.length, 1);
  throw new Error(`condition: unresolved identifier "${name}"`);
}

const zipCandle = (env: Env, f: (h: number, l: number) => number) =>
  env.series.high.map((h, i) => f(h, env.series.low[i]));
const zip3 = (env: Env, a: string, b: string, c: string, f: (x: number, y: number, z: number) => number) =>
  env.series[a].map((x, i) => f(x, env.series[b][i], env.series[c][i]));
const zip4 = (env: Env, f: (o: number, h: number, l: number, c: number) => number) =>
  env.series.open.map((o, i) => f(o, env.series.high[i], env.series.low[i], env.series.close[i]));

function shift(arr: number[], n: number): number[] {
  if (n <= 0) return arr;
  const out = fill(arr.length, NaN);
  for (let i = n; i < arr.length; i++) out[i] = arr[i - n];
  return out;
}

const bool = (v: number): number => (Number.isNaN(v) ? 0 : v > 0.5 ? 1 : 0);

function evalNode(n: Node, env: Env): number[] {
  switch (n.k) {
    case 'num': return fill(env.length, n.v);
    case 'str': return fill(env.length, NaN); // string literals unsupported; assemble() rejects earlier
    case 'id': return series(n.name, env);
    case 'hist': return shift(evalNode(n.base, env), n.offset);
    case 'unary': {
      const x = evalNode(n.x, env);
      return x.map(v => (n.op === 'neg' ? -v : Number.isNaN(v) ? 0 : v > 0.5 ? 0 : 1));
    }
    case 'bin': {
      const a = evalNode(n.a, env);
      const b = evalNode(n.b, env);
      return a.map((av, i) => applyBin(n.op, av, b[i]));
    }
    case 'call': return evalCall(n, env);
  }
}

function applyBin(op: string, a: number, b: number): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return a / b;
    case '<': return Number.isNaN(a) || Number.isNaN(b) ? 0 : a < b ? 1 : 0;
    case '<=': return Number.isNaN(a) || Number.isNaN(b) ? 0 : a <= b ? 1 : 0;
    case '>': return Number.isNaN(a) || Number.isNaN(b) ? 0 : a > b ? 1 : 0;
    case '>=': return Number.isNaN(a) || Number.isNaN(b) ? 0 : a >= b ? 1 : 0;
    case '==': return Number.isNaN(a) || Number.isNaN(b) ? 0 : a === b ? 1 : 0;
    case '!=': return Number.isNaN(a) || Number.isNaN(b) ? 0 : a !== b ? 1 : 0;
    case 'and': return bool(a) && bool(b) ? 1 : 0;
    case 'or': return bool(a) || bool(b) ? 1 : 0;
    default: throw new Error(`condition: unknown operator '${op}'`);
  }
}

function evalCall(n: Node & { k: 'call' }, env: Env): number[] {
  const a = () => evalNode(n.args[0], env);
  const b = () => evalNode(n.args[1], env);
  switch (n.name) {
    case 'ta.crossover': {
      const x = a(); const y = b();
      return x.map((xv, i) => (i > 0 && xv > y[i] && x[i - 1] <= y[i - 1] ? 1 : 0));
    }
    case 'ta.crossunder': {
      const x = a(); const y = b();
      return x.map((xv, i) => (i > 0 && xv < y[i] && x[i - 1] >= y[i - 1] ? 1 : 0));
    }
    case 'ta.cross': {
      const x = a(); const y = b();
      return x.map((xv, i) => (i > 0 && ((xv > y[i]) !== (x[i - 1] > y[i - 1])) ? 1 : 0));
    }
    case 'nz': {
      const x = a();
      const d = n.args[1] ? b() : fill(env.length, 0);
      return x.map((v, i) => (Number.isNaN(v) ? d[i] : v));
    }
    case 'abs': case 'math.abs': return a().map(Math.abs);
    case 'math.sign': return a().map(Math.sign);
    case 'min': case 'math.min': { const x = a(); const y = b(); return x.map((v, i) => Math.min(v, y[i])); }
    case 'max': case 'math.max': { const x = a(); const y = b(); return x.map((v, i) => Math.max(v, y[i])); }
    case 'barstate.isconfirmed': return fill(env.length, 1);
    default: throw new Error(`condition: unknown function '${n.name}'`);
  }
}

export { CALL_NAMES, BUILTIN_IDS };

/** Compile a condition string to `(env) => number[]` (1 / 0 per bar). */
export function compileCondition(src: string): (env: Env) => number[] {
  const node = parse(src);
  return (env: Env) => evalNode(node, env).map(bool);
}
