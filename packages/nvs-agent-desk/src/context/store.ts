import { DatabaseSync } from 'node:sqlite';

// Clean-room implementation of an idea, not a port: keep bulky tool output OUT of the model's context,
// index it locally, and let the model pull back only the passages it asks for. The reference project is
// licensed under the Elastic License 2.0, so no code was copied; this is built from the public description
// of the behaviour and from SQLite's documented FTS5 + bm25().

export interface Hit {
  label: string;
  snippet: string;
  rank: number; // bm25: more negative = better match
}

export interface StoreStats {
  bytesIndexed: number;
  bytesReturned: number;
  queries: number;
  /** Fraction of indexed bytes the model never had to read. NaN until something has been indexed. */
  avoided: number;
}

export function chunkText(text: string, maxChars: number): string[] {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = '';
  const flush = () => {
    if (cur) out.push(cur);
    cur = '';
  };
  for (const p of paras) {
    if (p.length > maxChars) {
      flush();
      for (let i = 0; i < p.length; i += maxChars) out.push(p.slice(i, i + maxChars));
    } else if (cur.length + p.length + 2 > maxChars) {
      flush();
      cur = p;
    } else cur = cur ? `${cur}\n\n${p}` : p;
  }
  flush();
  return out;
}

/** Turn free text into a safe FTS5 query: quoted word tokens joined by OR. Returns null if nothing searchable. */
export function toFtsQuery(q: string): string | null {
  const toks = q.match(/[\p{L}\p{N}_]+/gu);
  return toks?.length ? toks.map((t) => `"${t}"`).join(' OR ') : null;
}

export class ContextStore {
  private db: DatabaseSync;
  private bytesIndexed = 0;
  private bytesReturned = 0;
  private queries = 0;

  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS chunks USING fts5(label UNINDEXED, content, tokenize='porter unicode61')`);
  }

  /** Replaces any earlier content under the same label. */
  index(label: string, text: string, opts: { chunkChars?: number } = {}): { chunks: number; bytes: number } {
    const chunks = chunkText(text, opts.chunkChars ?? 1200);
    this.db.prepare(`DELETE FROM chunks WHERE label = ?`).run(label);
    const ins = this.db.prepare(`INSERT INTO chunks (label, content) VALUES (?, ?)`);
    for (const c of chunks) ins.run(label, c);
    const bytes = Buffer.byteLength(text);
    this.bytesIndexed += bytes;
    return { chunks: chunks.length, bytes };
  }

  search(query: string, opts: { limit?: number; label?: string } = {}): Hit[] {
    const fts = toFtsQuery(query);
    this.queries++;
    if (!fts) return [];
    const where = opts.label ? `chunks MATCH ? AND label = ?` : `chunks MATCH ?`;
    const args = opts.label ? [fts, opts.label] : [fts];
    const rows = this.db
      .prepare(
        `SELECT label, snippet(chunks, 1, '«', '»', ' … ', 32) AS snippet, bm25(chunks) AS rank
         FROM chunks WHERE ${where} ORDER BY rank LIMIT ?`,
      )
      .all(...args, opts.limit ?? 5) as unknown as Hit[];
    this.bytesReturned += rows.reduce((a, r) => a + Buffer.byteLength(r.snippet), 0);
    return rows;
  }

  noteReturned(bytes: number) {
    this.bytesReturned += bytes;
  }

  purge(label?: string) {
    if (label) this.db.prepare(`DELETE FROM chunks WHERE label = ?`).run(label);
    else this.db.exec(`DELETE FROM chunks`);
  }

  stats(): StoreStats {
    return {
      bytesIndexed: this.bytesIndexed,
      bytesReturned: this.bytesReturned,
      queries: this.queries,
      avoided: this.bytesIndexed > 0 ? 1 - this.bytesReturned / this.bytesIndexed : NaN,
    };
  }
}
