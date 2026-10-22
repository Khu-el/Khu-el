import { DatabaseSync } from 'node:sqlite';
import { env } from './env.js';

export const db = new DatabaseSync(env.dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

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

  CREATE TABLE IF NOT EXISTS network_projects (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    lane TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    entity_id TEXT NOT NULL DEFAULT 'NETWORK',
    sample INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_network_projects_owner ON network_projects(owner_id);

  CREATE TABLE IF NOT EXISTS network_tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    assignee TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    depends_on TEXT NOT NULL,
    evidence_json TEXT NOT NULL,
    lane TEXT NOT NULL,
    entity_id TEXT NOT NULL DEFAULT 'NETWORK',
    sample INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES network_projects(id),
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS network_pipeline (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    lane TEXT NOT NULL,
    name TEXT NOT NULL,
    stage TEXT NOT NULL,
    artifact_note TEXT NOT NULL,
    qa_note TEXT NOT NULL,
    approved_hash TEXT,
    content_handoff TEXT,
    marketing_handoff TEXT,
    entity_id TEXT NOT NULL DEFAULT 'NETWORK',
    sample INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS network_approvals (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    pipeline_id TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    proposed_by TEXT NOT NULL,
    approved_by TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS network_leads (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    lane TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    consent INTEGER NOT NULL,
    consent_text TEXT NOT NULL,
    consent_at TEXT NOT NULL,
    entity_id TEXT NOT NULL DEFAULT 'NETWORK',
    sample INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_network_leads_email ON network_leads(owner_id, email);

  CREATE TABLE IF NOT EXISTS network_assets (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    lane TEXT NOT NULL,
    brand TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    entity_id TEXT NOT NULL DEFAULT 'NETWORK',
    sample INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS network_campaigns (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    lane TEXT NOT NULL,
    brand TEXT NOT NULL,
    title TEXT NOT NULL,
    scheduled_on TEXT NOT NULL,
    status TEXT NOT NULL,
    entity_id TEXT NOT NULL DEFAULT 'NETWORK',
    sample INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS network_integrations (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    state TEXT NOT NULL,
    detail TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (owner_id, provider),
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS network_queues (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    lane TEXT NOT NULL,
    domain TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    entity_id TEXT NOT NULL DEFAULT 'NETWORK',
    sample INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS network_events (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    event TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    org_entity TEXT,
    detail TEXT NOT NULL,
    prev_hash TEXT NOT NULL,
    hash TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_network_events_owner ON network_events(owner_id, seq);
`);

for (const [table, column] of [
  ['network_pipeline', 'content_handoff'],
  ['network_pipeline', 'marketing_handoff'],
] as const) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((col) => col.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT`);
  }
}

for (const table of [
  'network_projects',
  'network_tasks',
  'network_pipeline',
  'network_leads',
  'network_assets',
  'network_campaigns',
  'network_queues',
]) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((col) => col.name === 'entity_id')) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN entity_id TEXT NOT NULL DEFAULT 'NETWORK'`);
  }
}

{
  const cols = db.prepare('PRAGMA table_info(network_events)').all() as { name: string }[];
  if (!cols.some((col) => col.name === 'org_entity')) {
    db.exec('ALTER TABLE network_events ADD COLUMN org_entity TEXT');
  }
}

console.log(`[db] SQLite database ready at ${env.dbPath}`);
