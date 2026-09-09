import fs from 'fs';
import path from 'path';
import { analyzePineScript, isEvaluableCondition } from './analyzer.js';
import { buildSpecFromStatic } from './parser.js';
import { makeSpecId } from './specId.js';
import type { StrategySpec } from '../core/types.js';

// ============================================================================
// Offline re-analysis — rebuild StrategySpec JSONs from the cached raw Pine in
// strategies/raw/ without touching TradingView. The iteration loop for the
// static analyzer: edit analyzer.ts → `yarn reanalyze` → inspect specs.
//
//   yarn reanalyze              rebuild specs/pending from raw cache
//   yarn reanalyze --clean      wipe specs/pending first (drop stale ids)
//   yarn reanalyze --report     analyse only, write nothing
//
// strategies/curation.json is a manual overlay keyed by rawHash. Each entry is
// either { "skip": "reason" } — the script isn't a strategy — or a partial
// StrategySpec ({ entry, exit, notes, … }) deep-merged over the static result,
// which then counts as parsedBy: "manual".
// ============================================================================

const RAW_DIR = process.env.TV_RAW_DIR ?? 'strategies/raw';
const OUT_DIR = 'strategies/specs/pending';
const CURATION_FILE = 'strategies/curation.json';

const args = process.argv.slice(2);
const clean = args.includes('--clean');
const reportOnly = args.includes('--report');

// `skip` = keep this script out of the corpus; `category` records why.
// See docs/triage.md.
type SkipCategory = 'not-a-strategy' | 'too-custom' | 'no-edge' | 'duplicate';
type Curation = { skip?: string; category?: SkipCategory } & Partial<StrategySpec>;

function loadCuration(): Record<string, Curation> {
  try {
    return JSON.parse(fs.readFileSync(CURATION_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function applyCuration(spec: StrategySpec, cur: Curation): StrategySpec {
  const { skip: _skip, entry, exit, bindings, ...rest } = cur;
  return {
    ...spec,
    ...rest,
    entry: { ...spec.entry, ...entry },
    exit: exit ? { ...spec.exit, ...exit } : spec.exit,
    // Curated bindings merge over auto-derived ones (same key wins for curation).
    bindings: bindings || spec.bindings ? { ...spec.bindings, ...bindings } : undefined,
    parsedBy: 'manual',
    confidence: Math.max(spec.confidence, 0.85),
  };
}

function main(): void {
  if (!fs.existsSync(RAW_DIR)) {
    console.error(`[reanalyze] no raw cache at ${RAW_DIR} — run an ingest first`);
    process.exit(1);
  }
  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.pine')).sort();
  if (files.length === 0) {
    console.error(`[reanalyze] ${RAW_DIR} has no .pine files`);
    process.exit(1);
  }
  let unknownSeq = 0; // scripts with no extractable title → UnknownST1, UnknownST2, …

  const curation = loadCuration();

  // Snapshot existing createdAt values so regenerations (incl. --clean) don't
  // churn git with fresh timestamps.
  const createdAt = new Map<string, number>();
  if (fs.existsSync(OUT_DIR)) {
    for (const f of fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.json'))) {
      try {
        const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8'));
        if (typeof prev.createdAt === 'number') createdAt.set(f.replace(/\.json$/, ''), prev.createdAt);
      } catch { /* ignore */ }
    }
  }

  if (!reportOnly) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    if (clean) {
      for (const f of fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.json'))) {
        fs.unlinkSync(path.join(OUT_DIR, f));
      }
      console.log(`[reanalyze] cleaned ${OUT_DIR}`);
    }
  }

  let written = 0;
  let enriched = 0;
  let skippedViz = 0;
  let skippedParse = 0;
  let skippedCurated = 0;
  const skipByCategory: Record<string, number> = {};
  const cond = { evaluable: 0, bare: 0, none: 0 };
  const conf = { hi: 0, mid: 0, lo: 0 };
  const unknown: Record<string, number> = {};

  for (const f of files) {
    const src = fs.readFileSync(path.join(RAW_DIR, f), 'utf8');
    const urlFile = path.join(RAW_DIR, f.replace(/\.pine$/, '.url'));
    const source = fs.existsSync(urlFile) ? fs.readFileSync(urlFile, 'utf8').trim() : `raw:${f}`;
    const a = analyzePineScript(src, source);
    for (const u of a.unknownIndicators) unknown[u] = (unknown[u] ?? 0) + 1;

    const cur = curation[a.rawHash];
    if (cur?.skip) {
      skippedCurated++;
      const cat = cur.category ?? 'uncategorised';
      skipByCategory[cat] = (skipByCategory[cat] ?? 0) + 1;
      continue;
    }
    if (!a.isTradeable) { skippedViz++; continue; }

    if ((a.partial.name ?? '') === 'Unknown Strategy') a.partial.name = `UnknownST${++unknownSeq}`;
    const id = makeSpecId(a.partial.name ?? 'unknown', a.rawHash);
    let spec = buildSpecFromStatic(a, id);
    if (!spec) { skippedParse++; continue; }

    if (cur) { spec = applyCuration(spec, cur); enriched++; }

    const prevCreatedAt = createdAt.get(id);
    if (prevCreatedAt !== undefined) spec.createdAt = prevCreatedAt;

    const conds = spec.entry?.conditions ?? [];
    if (conds.length === 0) cond.none++;
    else if (conds.some(isEvaluableCondition)) cond.evaluable++;
    else cond.bare++;

    conf[spec.confidence >= 0.5 ? 'hi' : spec.confidence >= 0.4 ? 'mid' : 'lo']++;

    if (!reportOnly) {
      fs.writeFileSync(path.join(OUT_DIR, `${id}.json`), JSON.stringify(spec, null, 2));
    }
    written++;
  }

  const dest = reportOnly ? '(report only — nothing written)' : OUT_DIR;
  console.log(`\n[reanalyze] ${files.length} raw → ${written} specs  ${dest}`);
  console.log(`  ${enriched} manually enriched (curation.json)`);
  const catStr = Object.entries(skipByCategory).map(([k, v]) => `${v} ${k}`).join(', ');
  console.log(`  skipped:    ${skippedViz} non-tradeable, ${skippedCurated} curated-skip${catStr ? ` (${catStr})` : ''}, ${skippedParse} parse-failed`);
  console.log(`  entry:      ${cond.evaluable} evaluable · ${cond.bare} bare-identifier · ${cond.none} none`);
  console.log(`  confidence: ${conf.hi} >=0.50 · ${conf.mid} 0.40-0.49 · ${conf.lo} <0.40`);

  const topUnknown = Object.entries(unknown).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (topUnknown.length) {
    console.log(`  unknown ta.*: ${topUnknown.map(([k, v]) => `${k}x${v}`).join(', ')}`);
  }
}

main();
