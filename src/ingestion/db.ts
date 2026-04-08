import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve('data/pipeline.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db: DatabaseType = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS scripts (
    url         TEXT PRIMARY KEY,
    raw_hash    TEXT,
    spec_id     TEXT,
    status      TEXT NOT NULL DEFAULT 'pending',
    strategy_type TEXT,
    parsed_by   TEXT,
    confidence  REAL,
    is_tradeable INTEGER DEFAULT 0,
    skip_reason TEXT,
    scraped_at  INTEGER,
    parsed_at   INTEGER,
    error       TEXT
  );

  CREATE TABLE IF NOT EXISTS pages (
    page_num    INTEGER PRIMARY KEY,
    scraped_at  INTEGER,
    url_count   INTEGER
  );
`);

export type ScriptStatus =
  | 'pending'
  | 'scraped'
  | 'parsed'
  | 'skipped'
  | 'error';

export interface ScriptRow {
  url: string;
  raw_hash: string | null;
  spec_id: string | null;
  status: ScriptStatus;
  strategy_type: string | null;
  parsed_by: string | null;
  confidence: number | null;
  is_tradeable: number;
  skip_reason: string | null;
  scraped_at: number | null;
  parsed_at: number | null;
  error: string | null;
}

// ─── Pages ───────────────────────────────────────────────────────────────────

export function markPageScraped(pageNum: number, urlCount: number): void {
  db.prepare(`
    INSERT OR REPLACE INTO pages (page_num, scraped_at, url_count)
    VALUES (?, ?, ?)
  `).run(pageNum, Date.now(), urlCount);
}

export function isPageScraped(pageNum: number): boolean {
  const row = db.prepare('SELECT page_num FROM pages WHERE page_num = ?').get(pageNum);
  return row !== undefined;
}

// ─── Scripts ─────────────────────────────────────────────────────────────────

export function upsertScript(url: string): void {
  db.prepare(`
    INSERT OR IGNORE INTO scripts (url, status) VALUES (?, 'pending')
  `).run(url);
}

export function isScriptProcessed(url: string): boolean {
  const row = db.prepare(
    `SELECT status FROM scripts WHERE url = ? AND status NOT IN ('pending', 'error')`
  ).get(url);
  return row !== undefined;
}

export function markScraped(url: string, rawHash: string): void {
  db.prepare(`
    UPDATE scripts SET status = 'scraped', raw_hash = ?, scraped_at = ?
    WHERE url = ?
  `).run(rawHash, Date.now(), url);
}

export function markParsed(
  url: string,
  specId: string,
  strategyType: string,
  parsedBy: string,
  confidence: number,
): void {
  db.prepare(`
    UPDATE scripts
    SET status = 'parsed', spec_id = ?, strategy_type = ?,
        parsed_by = ?, confidence = ?, is_tradeable = 1, parsed_at = ?
    WHERE url = ?
  `).run(specId, strategyType, parsedBy, confidence, Date.now(), url);
}

export function markSkipped(url: string, reason: string): void {
  db.prepare(`
    UPDATE scripts SET status = 'skipped', skip_reason = ?, scraped_at = ?
    WHERE url = ?
  `).run(reason, Date.now(), url);
}

export function markError(url: string, error: string): void {
  db.prepare(`
    UPDATE scripts SET status = 'error', error = ? WHERE url = ?
  `).run(error, url);
}

export function getStats(): Record<string, number> {
  const rows = db.prepare(
    `SELECT status, COUNT(*) as count FROM scripts GROUP BY status`
  ).all() as Array<{ status: string; count: number }>;
  return Object.fromEntries(rows.map(r => [r.status, r.count]));
}

export default db;
