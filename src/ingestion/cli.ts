import { runPipeline } from './pipeline.js';

// Usage:
//   tsx src/ingestion/cli.ts                    → pages 1-5, LLM enabled
//   tsx src/ingestion/cli.ts --pages 1-10       → pages 1-10
//   tsx src/ingestion/cli.ts --dry-run          → no files written, just stats
//   tsx src/ingestion/cli.ts --no-llm           → static analysis only, no API calls

const args = process.argv.slice(2);

let startPage = 1;
let endPage = 5;
let dryRun = false;
let noLlm = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--pages' && args[i + 1]) {
    const [s, e] = args[i + 1].split('-').map(Number);
    if (!isNaN(s)) startPage = s;
    if (!isNaN(e)) endPage = e;
    i++;
  }
  if (args[i] === '--dry-run') dryRun = true;
  if (args[i] === '--no-llm') noLlm = true;
}

console.log(`TradingView Ingestion Pipeline`);
console.log(`Pages: ${startPage}–${endPage} | Dry run: ${dryRun} | LLM: ${!noLlm}`);
console.log('─'.repeat(50));

runPipeline({ startPage, endPage, dryRun, noLlm }).catch(err => {
  console.error('[cli] Fatal error:', err);
  process.exit(1);
});
