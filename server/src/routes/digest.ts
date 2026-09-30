import { Router } from 'express';
import { db } from '../lib/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import { sendSelfEmail } from '../lib/email.js';
import { isSharedApp } from '../lib/roles.js';
import { stalenessMessage, stalenessReason } from '../lib/staleness.js';

export const digestRouter = Router();
digestRouter.use(requireAuth);

interface RecordRow {
  id: string;
  app_id: string;
  owner_id: string;
  data_json: string;
}

interface DigestItem {
  appId: string;
  recordId: string;
  recordLabel: string;
  message: string;
}

function safeJsonObject(json: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function recordLabel(appId: string, data: Record<string, unknown>): string {
  return String(data.address || data.entityName || data.obligorRef || data.familyName || 'Unlabeled record');
}

function computeDigest(rows: RecordRow[]): DigestItem[] {
  const items: DigestItem[] = [];

  for (const row of rows) {
    const body = safeJsonObject(row.data_json);
    const data = objectValue(body.data);
    const label = recordLabel(row.app_id, data);

    if (row.app_id === 'legacy-estate') {
      for (const beneficiary of arrayValue(data.beneficiaries)) {
        const b = objectValue(beneficiary);
        const reason = stalenessReason(b.lastVerified);
        if (reason) {
          items.push({
            appId: row.app_id,
            recordId: row.id,
            recordLabel: label,
            message: `Beneficiary designation "${b.accountOrPolicy || 'unnamed'}" ${stalenessMessage(reason)}`,
          });
        }
      }
    }

    if (row.app_id === 'deal-architect') {
      const diligence = arrayValue(data.diligence);
      const total = diligence.length;
      const done = diligence.filter((d) => objectValue(d).done).length;
      if (total > 0 && done < total) items.push({ appId: row.app_id, recordId: row.id, recordLabel: label, message: `Diligence checklist ${done}/${total} complete` });
    }

    if (row.app_id === 'capital-readiness') {
      const readiness = arrayValue(data.offeringReadiness);
      const total = readiness.length;
      const verified = readiness.filter((r) => objectValue(r).status === 'VERIFIED').length;
      if (total > 0 && verified < total) items.push({ appId: row.app_id, recordId: row.id, recordLabel: label, message: `Offering readiness ${verified}/${total} professionally verified` });
    }

    if (row.app_id === 'notes-underwriting') {
      const lienChecklist = arrayValue(data.lienChecklist);
      const total = lienChecklist.length;
      const done = lienChecklist.filter((d) => objectValue(d).done).length;
      if (total > 0 && done < total) items.push({ appId: row.app_id, recordId: row.id, recordLabel: label, message: `Lien/perfection checklist ${done}/${total} complete` });
    }
  }

  return items;
}

function rowsForUser(user: { sub: string; role: string }): RecordRow[] {
  const shared = db.prepare(`SELECT id, app_id, owner_id, data_json FROM records WHERE app_id = 'legacy-estate'`).all() as unknown as RecordRow[];
  const owned = db.prepare(`SELECT id, app_id, owner_id, data_json FROM records WHERE app_id != 'legacy-estate' AND owner_id = ?`).all(user.sub) as unknown as RecordRow[];
  return [...shared, ...owned];
}

digestRouter.get('/', (req: AuthedRequest, res) => {
  const items = computeDigest(rowsForUser(req.user!));
  res.json({ items });
});

digestRouter.post('/email', asyncHandler(async (req: AuthedRequest, res) => {
  const items = computeDigest(rowsForUser(req.user!));
  const text =
    items.length === 0
      ? 'Nothing needs attention right now — all tracked checklists are complete and beneficiary designations are current.'
      : items.map((i) => `[${i.appId}] ${i.recordLabel} — ${i.message}`).join('\n');

  const result = await sendSelfEmail({ to: req.user!.email, subject: '[NTE] Attention digest', text });
  if (!result.sent) return res.status(result.status).json({ error: result.reason });
  res.json({ sent: true, to: req.user!.email, itemCount: items.length });
}));
