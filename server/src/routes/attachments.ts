import { Router } from 'express';
import multer from 'multer';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { db } from '../lib/db.js';
import { env } from '../lib/env.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import { newId, nowIso } from '../lib/id.js';
import { canWrite, isSharedApp } from '../lib/roles.js';

export const attachmentsRouter = Router();
attachmentsRouter.use(requireAuth);

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB — generous for scanned documents, still bounded

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(env.uploadsDir)) mkdirSync(env.uploadsDir, { recursive: true });
    cb(null, env.uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 20);
    cb(null, `${randomUUID()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: MAX_FILE_BYTES } });

interface RecordRow {
  id: string;
  app_id: string;
  owner_id: string;
}

interface AttachmentRow {
  id: string;
  record_id: string;
  owner_id: string;
  stored_filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
}

function getRecordOr404(recordId: string) {
  return db.prepare('SELECT id, app_id, owner_id FROM records WHERE id = ?').get(recordId) as unknown as RecordRow | undefined;
}

function canAccessRecord(row: RecordRow, user: { sub: string; role: string }) {
  if (row.owner_id === user.sub) return true;
  if (user.role === 'SYSTEM_ADMIN') return true;
  return isSharedApp(row.app_id);
}

attachmentsRouter.post('/records/:recordId/attachments', upload.single('file'), (req: AuthedRequest, res) => {
  const record = getRecordOr404(req.params.recordId);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  if (!canAccessRecord(record, req.user!) || !canWrite(req.user!.role as any)) {
    if (req.file) unlinkSync(req.file.path);
    return res.status(403).json({ error: 'Not permitted to attach files to this record' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (expected multipart field "file")' });

  const id = newId('att');
  const uploadedAt = nowIso();
  db.prepare(
    `INSERT INTO attachments (id, record_id, owner_id, stored_filename, original_name, mime_type, size_bytes, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, record.id, req.user!.sub, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, uploadedAt);

  res.status(201).json({
    attachment: { id, recordId: record.id, originalName: req.file.originalname, mimeType: req.file.mimetype, sizeBytes: req.file.size, uploadedAt },
  });
});

attachmentsRouter.get('/records/:recordId/attachments', (req: AuthedRequest, res) => {
  const record = getRecordOr404(req.params.recordId);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  if (!canAccessRecord(record, req.user!)) return res.status(403).json({ error: 'Not permitted to view this record' });

  const rows = db.prepare('SELECT * FROM attachments WHERE record_id = ? ORDER BY uploaded_at DESC').all(record.id) as unknown as AttachmentRow[];
  res.json({
    attachments: rows.map((r) => ({ id: r.id, recordId: r.record_id, originalName: r.original_name, mimeType: r.mime_type, sizeBytes: r.size_bytes, uploadedAt: r.uploaded_at })),
  });
});

attachmentsRouter.get('/attachments/:id/download', (req: AuthedRequest, res) => {
  const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id) as unknown as AttachmentRow | undefined;
  if (!att) return res.status(404).json({ error: 'Attachment not found' });
  const record = getRecordOr404(att.record_id);
  if (!record || !canAccessRecord(record, req.user!)) return res.status(403).json({ error: 'Not permitted to download this file' });

  res.download(path.join(env.uploadsDir, att.stored_filename), att.original_name);
});

attachmentsRouter.delete('/attachments/:id', (req: AuthedRequest, res) => {
  const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id) as unknown as AttachmentRow | undefined;
  if (!att) return res.status(404).json({ error: 'Attachment not found' });
  const record = getRecordOr404(att.record_id);
  if (!record || !canAccessRecord(record, req.user!) || !canWrite(req.user!.role as any)) {
    return res.status(403).json({ error: 'Not permitted to delete this file' });
  }

  const filePath = path.join(env.uploadsDir, att.stored_filename);
  if (existsSync(filePath)) unlinkSync(filePath);
  db.prepare('DELETE FROM attachments WHERE id = ?').run(att.id);
  res.status(204).end();
});

/** Used by records.ts on cascade delete so orphaned files don't pile up on disk. */
export function deleteAttachmentFilesForRecord(recordId: string) {
  const rows = db.prepare('SELECT stored_filename FROM attachments WHERE record_id = ?').all(recordId) as { stored_filename: string }[];
  for (const row of rows) {
    const filePath = path.join(env.uploadsDir, row.stored_filename);
    if (existsSync(filePath)) unlinkSync(filePath);
  }
}
