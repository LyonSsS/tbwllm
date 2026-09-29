// ============================================================================
// Shared console/markdown table rendering for run.ts and sweep.ts reports.
// ============================================================================

/** Signed percentage, one decimal, unicode minus (e.g. "+12.3%" / "−4.5%"). */
export const pct = (x: number): string => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}%`;

/** Signed percentage, rounded to an integer — for the compact box table. */
export const ipct = (x: number): string => `${x >= 0 ? '+' : '−'}${Math.abs(Math.round(x))}%`;

/**
 * Bordered console table: box-drawing borders, centered headers, a rule
 * between every data row. Column index 1 (the name/strategy column) is
 * left-padded; every other column is right-aligned.
 */
export function boxTable(headers: string[], rows: string[][]): string {
  const w = headers.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
  const center = (s: string, width: number) => {
    const l = Math.floor((width - s.length) / 2);
    return ' '.repeat(l) + s + ' '.repeat(width - s.length - l);
  };
  const rule = (l: string, m: string, r: string) => l + w.map(x => '─'.repeat(x + 2)).join(m) + r;
  const headLine = '│ ' + headers.map((h, i) => center(h, w[i])).join(' │ ') + ' │';
  const dataLine = (c: string[]) => '│ ' + c.map((v, i) => (i === 1 ? v.padEnd(w[i]) : v.padStart(w[i]))).join(' │ ') + ' │';

  const out = [rule('┌', '┬', '┐'), headLine, rule('├', '┼', '┤')];
  rows.forEach(r => { out.push(dataLine(r)); out.push(rule('├', '┼', '┤')); });
  out[out.length - 1] = rule('└', '┴', '┘');
  return out.join('\n');
}

/** Markdown table; every column right-aligned except column 1 (name/strategy). */
export function mdTable(headers: string[], rows: string[][]): string {
  const aligns = headers.map((_, i) => (i === 1 ? '---' : '---:'));
  return [
    `| ${headers.join(' | ')} |`,
    `|${aligns.join('|')}|`,
    ...rows.map(r => `| ${r.join(' | ')} |`),
  ].join('\n');
}
