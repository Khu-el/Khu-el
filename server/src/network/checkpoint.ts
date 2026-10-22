/**
 * Append-only anchor for one account's network ledger. The file lives beside
 * the SQLite database and stores only a count, the chain head, and a timestamp.
 * It does not copy record bodies.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { db } from '../lib/db.js';
import { env } from '../lib/env.js';
import { verifyChain } from './logic.js';

export interface CheckpointLine {
  v: 1;
  ownerId: string;
  count: number;
  headHash: string;
  ts: string;
}

export function checkpointPath() {
  return process.env.NTE_LEDGER_CHECKPOINT_PATH ?? path.join(env.dataDir, 'network-ledger-checkpoints.jsonl');
}

interface StoredEvent {
  prevHash: string;
  hash: string;
  body: { event: string; entityType: string; entityId: string; detail: unknown };
}

export function readOwnerEvents(ownerId: string): StoredEvent[] {
  const rows = db.prepare(
    'SELECT prev_hash, hash, event, entity_type, entity_id, detail FROM network_events WHERE owner_id = ? ORDER BY seq ASC',
  ).all(ownerId) as {
    prev_hash: string;
    hash: string;
    event: string;
    entity_type: string;
    entity_id: string;
    detail: string;
  }[];
  return rows.map((row) => ({
    prevHash: row.prev_hash,
    hash: row.hash,
    body: {
      event: row.event,
      entityType: row.entity_type,
      entityId: row.entity_id,
      detail: JSON.parse(row.detail),
    },
  }));
}

export function readCheckpoints(): CheckpointLine[] {
  const file = checkpointPath();
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as CheckpointLine);
}

export function appendCheckpoint(ownerId: string, ts = new Date().toISOString()): CheckpointLine {
  const events = readOwnerEvents(ownerId);
  if (!verifyChain(events)) {
    throw new Error('Refusing to anchor a ledger chain that does not verify');
  }
  const line: CheckpointLine = {
    v: 1,
    ownerId,
    count: events.length,
    headHash: events.at(-1)?.hash ?? 'GENESIS',
    ts,
  };
  const file = checkpointPath();
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify(line)}\n`, { flag: 'a', mode: 0o600 });
  return line;
}

export function verifyOwner(ownerId: string) {
  const events = readOwnerEvents(ownerId);
  const chainIntact = verifyChain(events);
  const mine = readCheckpoints().filter((row) => row.ownerId === ownerId);
  if (mine.length === 0) {
    return {
      chainIntact,
      anchored: false,
      matches: false,
      reason: 'No checkpoint has been written for this account.',
      count: events.length,
      checkpoints: 0,
    };
  }
  for (const row of mine) {
    if (row.count > events.length) {
      return {
        chainIntact,
        anchored: true,
        matches: false,
        reason: 'A checkpoint counts more events than the stored chain.',
        count: events.length,
        checkpoints: mine.length,
      };
    }
    const head = row.count === 0 ? 'GENESIS' : events[row.count - 1]?.hash;
    if (head !== row.headHash) {
      return {
        chainIntact,
        anchored: true,
        matches: false,
        reason: 'A checkpoint head does not match the stored chain.',
        count: events.length,
        checkpoints: mine.length,
      };
    }
  }
  return {
    chainIntact,
    anchored: true,
    matches: chainIntact,
    reason: chainIntact ? 'Checkpoints match this account chain.' : 'The stored chain does not verify.',
    count: events.length,
    checkpoints: mine.length,
    headHash: events.at(-1)?.hash ?? 'GENESIS',
  };
}
