import { Router } from 'express';
import { db } from '../lib/db.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import { newId, nowIso } from '../lib/id.js';
import { APP_IDS, canWrite, isSharedApp } from '../lib/roles.js';
import { deleteAttachmentFilesForRecord } from './attachments.js';

export const recordsRouter = Router();
recordsRouter.use(requireAuth);

interface RecordRow {
  id: string;
  app_id: string;
  owner_id: string;
  record_type: string;
  lane: string;
  assertion_status: string;
  reconciliation_status: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

function toApiRecord(row: RecordRow) {
  const body = JSON.parse(row.data_json);
  return {
    id: row.id,
    type: row.record_type,
    authority: body.authority,
    data: body.data,
    evidenceRefs: body.evidenceRefs ?? [],
    reconciliationStatus: row.reconciliation_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reconciledAt: body.reconciledAt,
    ownerId: row.owner_id,
  };
}

function canAccess(row: RecordRow, user: { sub: string; role: string }) {
  if (row.owner_id === user.sub) return true;
  if (user.role === 'SYSTEM_ADMIN') return true;
  if (isSharedApp(row.app_id)) return true;
  return false;
}

function canMutate(row: RecordRow, user: { sub: string; role: string }) {
  if (!canAccess(row, user)) return false;
  return canWrite(user.role as any);
}

recordsRouter.get('/', (req: AuthedRequest, res) => {
  const appId = String(req.query.appId ?? '');
  if (!APP_IDS.includes(appId as any)) return res.status(400).json({ error: `appId must be one of ${APP_IDS.join(', ')}` });

  const rows = isSharedApp(appId)
    ? (db.prepare('SELECT * FROM records WHERE app_id = ? ORDER BY updated_at DESC').all(appId) as unknown as RecordRow[])
    : req.user!.role === 'SYSTEM_ADMIN'
      ? (db.prepare('SELECT * FROM records WHERE app_id = ? ORDER BY updated_at DESC').all(appId) as unknown as RecordRow[])
      : (db.prepare('SELECT * FROM records WHERE app_id = ? AND owner_id = ? ORDER BY updated_at DESC').all(appId, req.user!.sub) as unknown as RecordRow[]);

  res.json({ records: rows.map(toApiRecord) });
});

recordsRouter.post('/', (req: AuthedRequest, res) => {
  const { appId, id, type, authority, data, evidenceRefs, reconciliationStatus } = req.body ?? {};
  if (!APP_IDS.includes(appId)) return res.status(400).json({ error: `appId must be one of ${APP_IDS.join(', ')}` });
  if (!type || !authority || data === undefined) return res.status(400).json({ error: 'type, authority, and data are required' });
  if (!canWrite(req.user!.role as any)) return res.status(403).json({ error: 'Your role is read-only' });

  const recordId = typeof id === 'string' && id ? id : newId('rec');
  const existing = db.prepare('SELECT id FROM records WHERE id = ?').get(recordId);
  if (existing) return res.status(409).json({ error: 'A record with that id already exists — use PUT to update it' });

  const now = nowIso();
  const bodyJson = JSON.stringify({ authority, data, evidenceRefs: evidenceRefs ?? [] });

  db.prepare(
    `INSERT INTO records (id, app_id, owner_id, record_type, lane, assertion_status, reconciliation_status, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    recordId,
    appId,
    req.user!.sub,
    String(type),
    String(authority.lane ?? 'UNCLASSIFIED'),
    String(authority.assertionStatus ?? 'CURRENT_INTERNAL_MODEL'),
    String(reconciliationStatus ?? 'STAGED'),
    bodyJson,
    now,
    now
  );

  const row = db.prepare('SELECT * FROM records WHERE id = ?').get(recordId) as unknown as RecordRow;
  res.status(201).json({ record: toApiRecord(row) });
});

recordsRouter.put('/:id', (req: AuthedRequest, res) => {
  const row = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id) as unknown as RecordRow | undefined;
  if (!row) return res.status(404).json({ error: 'Record not found' });
  if (!canMutate(row, req.user!)) return res.status(403).json({ error: 'Not permitted to edit this record' });

  const { type, authority, data, evidenceRefs, reconciliationStatus } = req.body ?? {};
  const bodyJson = JSON.stringify({
    authority: authority ?? JSON.parse(row.data_json).authority,
    data: data !== undefined ? data : JSON.parse(row.data_json).data,
    evidenceRefs: evidenceRefs ?? JSON.parse(row.data_json).evidenceRefs ?? [],
  });
  const now = nowIso();

  db.prepare(
    `UPDATE records SET record_type = ?, lane = ?, assertion_status = ?, reconciliation_status = ?, data_json = ?, updated_at = ? WHERE id = ?`
  ).run(
    String(type ?? row.record_type),
    String(authority?.lane ?? row.lane),
    String(authority?.assertionStatus ?? row.assertion_status),
    String(reconciliationStatus ?? row.reconciliation_status),
    bodyJson,
    now,
    row.id
  );

  const updated = db.prepare('SELECT * FROM records WHERE id = ?').get(row.id) as unknown as RecordRow;
  res.json({ record: toApiRecord(updated) });
});

recordsRouter.delete('/:id', (req: AuthedRequest, res) => {
  const row = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id) as unknown as RecordRow | undefined;
  if (!row) return res.status(404).json({ error: 'Record not found' });
  if (!canMutate(row, req.user!)) return res.status(403).json({ error: 'Not permitted to delete this record' });

  deleteAttachmentFilesForRecord(row.id);
  db.prepare('DELETE FROM attachments WHERE record_id = ?').run(row.id);
  db.prepare('DELETE FROM records WHERE id = ?').run(row.id);
  res.status(204).end();
});
