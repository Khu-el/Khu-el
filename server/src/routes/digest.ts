import { Router } from 'express';
import { db } from '../lib/db.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import { sendSelfEmail } from '../lib/email.js';
import { isSharedApp } from '../lib/roles.js';

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

const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

function recordLabel(appId: string, data: any): string {
  return data.address || data.entityName || data.obligorRef || data.familyName || 'Unlabeled record';
}

function computeDigest(rows: RecordRow[]): DigestItem[] {
  const items: DigestItem[] = [];

  for (const row of rows) {
    const body = JSON.parse(row.data_json);
    const data = body.data ?? {};
    const label = recordLabel(row.app_id, data);

    if (row.app_id === 'legacy-estate') {
      for (const b of data.beneficiaries ?? []) {
        const stale = !b.lastVerified || Date.now() - new Date(b.lastVerified).getTime() > TWO_YEARS_MS;
        if (stale) items.push({ appId: row.app_id, recordId: row.id, recordLabel: label, message: `Beneficiary designation "${b.accountOrPolicy || 'unnamed'}" hasn't been verified in 2+ years` });
      }
    }

    if (row.app_id === 'deal-architect') {
      const total = (data.diligence ?? []).length;
      const done = (data.diligence ?? []).filter((d: any) => d.done).length;
      if (total > 0 && done < total) items.push({ appId: row.app_id, recordId: row.id, recordLabel: label, message: `Diligence checklist ${done}/${total} complete` });
    }

    if (row.app_id === 'capital-readiness') {
      const total = (data.offeringReadiness ?? []).length;
      const verified = (data.offeringReadiness ?? []).filter((r: any) => r.status === 'VERIFIED').length;
      if (total > 0 && verified < total) items.push({ appId: row.app_id, recordId: row.id, recordLabel: label, message: `Offering readiness ${verified}/${total} professionally verified` });
    }

    if (row.app_id === 'notes-underwriting') {
      const total = (data.lienChecklist ?? []).length;
      const done = (data.lienChecklist ?? []).filter((d: any) => d.done).length;
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

digestRouter.post('/email', async (req: AuthedRequest, res) => {
  const items = computeDigest(rowsForUser(req.user!));
  const text =
    items.length === 0
      ? 'Nothing needs attention right now — all tracked checklists are complete and beneficiary designations are current.'
      : items.map((i) => `[${i.appId}] ${i.recordLabel} — ${i.message}`).join('\n');

  const result = await sendSelfEmail({ to: req.user!.email, subject: '[NTE] Attention digest', text });
  if (!result.sent) return res.status(501).json({ error: result.reason });
  res.json({ sent: true, to: req.user!.email, itemCount: items.length });
});
