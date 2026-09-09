import fs from 'fs';
import path from 'path';
import { StrategySpecSchema, type Candle } from '../core/types.js';
import { assemble } from './assembler.js';

// ============================================================================
//   yarn assemble <specId>     assemble one spec, run it on synthetic candles
//   yarn assemble --all        coverage table over strategies/specs/pending/
// ============================================================================

const SPECS_DIR = 'strategies/specs/pending';
const args = process.argv.slice(2);

// Deterministic synthetic candles: trend + cycle + noise. Enough bars to warm
// up any indicator; just for a smoke run, not a backtest.
function syntheticCandles(n = 400): Candle[] {
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const out: Candle[] = [];
  let price = 100;
  for (let i = 0; i < n; i++) {
    price += Math.sin(i / 17) * 0.8 + (rnd() - 0.5) * 1.5 + 0.02;
    const close = Math.max(1, price);
    const high = close + rnd() * 1.2;
    const low = close - rnd() * 1.2;
    const open = low + rnd() * (high - low);
    out.push({ timestamp: 1_600_000_000_000 + i * 3_600_000, open, high, low, close, volume: 1000 + rnd() * 500 });
  }
  return out;
}

function loadSpec(file: string) {
  return StrategySpecSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')));
}

function one(specId: string): void {
  const file = path.join(SPECS_DIR, specId.endsWith('.json') ? specId : `${specId}.json`);
  if (!fs.existsSync(file)) { console.error(`no spec at ${file}`); process.exit(1); }
  const spec = loadSpec(file);
  const a = assemble(spec);
  console.log(`\n${spec.id}  [${spec.strategyType}]  ${spec.name}`);
  console.log(`  entry.conditions: ${JSON.stringify(spec.entry.conditions ?? [])}`);
  if ('unassemblable' in a) {
    console.log(`  ✗ unassemblable — ${a.reason}`);
    console.log(`    missing: ${a.missing.join(', ') || '(none)'}`);
    return;
  }
  a.warnings.forEach(w => console.log(`  ! ${w}`));
  const candles = syntheticCandles();
  const signals = a.run(candles);
  const by = signals.reduce<Record<string, number>>((m, s) => ((m[s.type] = (m[s.type] ?? 0) + 1), m), {});
  console.log(`  ✓ assembled — ${signals.length} signals on ${candles.length} synthetic bars  ${JSON.stringify(by)}`);
  if (signals.length) console.log(`    first: ${JSON.stringify(signals[0])}`);
}

function all(): void {
  const files = fs.readdirSync(SPECS_DIR).filter(f => f.endsWith('.json')).sort();
  let ok = 0;
  const missTally: Record<string, number> = {};
  for (const f of files) {
    const spec = loadSpec(path.join(SPECS_DIR, f));
    const a = assemble(spec);
    if ('unassemblable' in a) {
      a.missing.forEach(m => (missTally[m] = (missTally[m] ?? 0) + 1));
      console.log(`  ✗ ${spec.id.padEnd(52)} ${a.reason}`);
    } else {
      ok++;
      const n = a.run(syntheticCandles()).length;
      console.log(`  ✓ ${spec.id.padEnd(52)} ${n} signals${a.warnings.length ? '  (' + a.warnings.length + ' warn)' : ''}`);
    }
  }
  console.log(`\n${ok}/${files.length} assemblable`);
  const top = Object.entries(missTally).sort((a, b) => b[1] - a[1]).slice(0, 15);
  if (top.length) console.log('top missing:', top.map(([k, v]) => `${k}×${v}`).join(', '));
}

if (args.includes('--all')) all();
else if (args[0]) one(args[0]);
else { console.error('usage: yarn assemble <specId> | --all'); process.exit(1); }
