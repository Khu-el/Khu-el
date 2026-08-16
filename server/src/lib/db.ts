import { DatabaseSync } from 'node:sqlite';
import { env } from './env.js';

export const db = new DatabaseSync(env.dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'FAMILY_COUNCIL_MEMBER',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    record_type TEXT NOT NULL,
    lane TEXT NOT NULL DEFAULT 'UNCLASSIFIED',
    assertion_status TEXT NOT NULL DEFAULT 'CURRENT_INTERNAL_MODEL',
    reconciliation_status TEXT NOT NULL DEFAULT 'STAGED',
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_records_app_owner ON records(app_id, owner_id);

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL,
    FOREIGN KEY (record_id) REFERENCES records(id),
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_attachments_record ON attachments(record_id);
`);

console.log(`[db] SQLite database ready at ${env.dbPath}`);
