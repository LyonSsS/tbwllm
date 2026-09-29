import fs from 'fs';
import path from 'path';

// ============================================================================
//   yarn ingest:freqtrade:fetch
//
// Downloads every .py strategy file from the official freqtrade/freqtrade-
// strategies repo (GPL-3.0, no auth needed — public repo) into
// strategies/raw/freqtrade/, flattening subfolders into the filename
// (berlinguyinca/AdxSmas.py → berlinguyinca__AdxSmas.py) so `freqtradeCli.ts`
// can rebuild specs offline afterward, same two-step shape as the Pine
// scraper → `yarn reanalyze`.
// ============================================================================

const REPO = 'freqtrade/freqtrade-strategies';
const ROOT = 'user_data/strategies';
const SUBDIRS = ['', 'berlinguyinca', 'futures'];
const RAW_DIR = 'strategies/raw/freqtrade';

interface ContentEntry { name: string; type: string; download_url: string | null }

async function listDir(subdir: string): Promise<ContentEntry[]> {
  const apiPath = subdir ? `${ROOT}/${subdir}` : ROOT;
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${apiPath}`, {
    headers: { 'User-Agent': 'tbwllm', Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub contents API ${res.status} for ${apiPath}`);
  return res.json() as Promise<ContentEntry[]>;
}

async function main(): Promise<void> {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  let fetched = 0;
  let skipped = 0;

  for (const subdir of SUBDIRS) {
    const entries = await listDir(subdir);
    for (const e of entries) {
      if (e.type !== 'file' || !e.name.endsWith('.py') || !e.download_url) { skipped++; continue; }
      const flatName = subdir ? `${subdir}__${e.name}` : e.name;
      const res = await fetch(e.download_url);
      if (!res.ok) { console.warn(`[freqtrade:fetch] ${res.status} on ${e.download_url}`); skipped++; continue; }
      const body = await res.text();
      fs.writeFileSync(path.join(RAW_DIR, flatName), body);
      fs.writeFileSync(
        path.join(RAW_DIR, flatName.replace(/\.py$/, '.url')),
        `https://github.com/${REPO}/blob/main/${ROOT}/${subdir ? `${subdir}/` : ''}${e.name}`,
      );
      fetched++;
    }
  }
  console.log(`[freqtrade:fetch] ${fetched} strategy files → ${RAW_DIR} (${skipped} skipped)`);
}

main().catch(err => { console.error(err); process.exit(1); });
