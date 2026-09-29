import fs from 'fs';
import path from 'path';
import { parseFreqtradeStrategy } from './freqtradeParser.js';
import { slugify } from './specId.js';

// ============================================================================
//   yarn ingest:freqtrade              rebuild specs/pending from the raw cache
//   yarn ingest:freqtrade --report     parse only, write nothing
//
// Offline, like `yarn reanalyze` — run `yarn ingest:freqtrade:fetch` first to
// populate strategies/raw/freqtrade/.
// ============================================================================

const RAW_DIR = 'strategies/raw/freqtrade';
const OUT_DIR = 'strategies/specs/pending';
const reportOnly = process.argv.includes('--report');

function main(): void {
  if (!fs.existsSync(RAW_DIR)) {
    console.error(`[ingest:freqtrade] no raw cache at ${RAW_DIR} — run: yarn ingest:freqtrade:fetch`);
    process.exit(1);
  }
  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.py')).sort();
  if (files.length === 0) {
    console.error(`[ingest:freqtrade] ${RAW_DIR} has no .py files`);
    process.exit(1);
  }

  const createdAt = new Map<string, number>();
  if (fs.existsSync(OUT_DIR)) {
    for (const f of fs.readdirSync(OUT_DIR).filter(f => f.startsWith('freqtrade-') && f.endsWith('.json'))) {
      try {
        const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8'));
        if (typeof prev.createdAt === 'number') createdAt.set(f.replace(/\.json$/, ''), prev.createdAt);
      } catch { /* ignore */ }
    }
  }
  if (!reportOnly) fs.mkdirSync(OUT_DIR, { recursive: true });

  let written = 0;
  const skipReasons: Record<string, number> = {};

  for (const f of files) {
    const src = fs.readFileSync(path.join(RAW_DIR, f), 'utf8');
    const urlFile = path.join(RAW_DIR, f.replace(/\.py$/, '.url'));
    const source = fs.existsSync(urlFile) ? fs.readFileSync(urlFile, 'utf8').trim() : `raw:${f}`;

    let result;
    try {
      const id = `freqtrade-${slugify(f.replace(/\.py$/, ''))}`;
      result = parseFreqtradeStrategy(src, source, id);
    } catch (err) {
      result = { skip: `parse error: ${String(err)}` };
    }

    if (result.skip) {
      skipReasons[result.skip] = (skipReasons[result.skip] ?? 0) + 1;
      continue;
    }
    const spec = result.spec!;
    spec.createdAt = createdAt.get(spec.id) ?? Date.now();
    if (!reportOnly) fs.writeFileSync(path.join(OUT_DIR, `${spec.id}.json`), JSON.stringify(spec, null, 2));
    written++;
  }

  const dest = reportOnly ? '(report only — nothing written)' : OUT_DIR;
  console.log(`\n[ingest:freqtrade] ${files.length} raw → ${written} specs  ${dest}`);
  const skipped = files.length - written;
  console.log(`  skipped: ${skipped}`);
  for (const [reason, count] of Object.entries(skipReasons).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${count}x  ${reason}`);
  }
}

main();
