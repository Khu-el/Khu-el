import { Router } from 'express';
import { db } from '../lib/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import { sendSelfEmail } from '../lib/email.js';
import { computeDigest, crmFollowUpReason, ownerToday, type RecordRow } from '../lib/digest-logic.js';

export { crmFollowUpReason, ownerToday };

export const digestRouter = Router();
digestRouter.use(requireAuth);

function rowsForUser(user: { sub: string; role: string }): RecordRow[] {
  const shared = db.prepare(`SELECT id, app_id, owner_id, record_type, data_json FROM records WHERE app_id = 'legacy-estate'`).all() as unknown as RecordRow[];
  const owned = db.prepare(`SELECT id, app_id, owner_id, record_type, data_json FROM records WHERE app_id != 'legacy-estate' AND owner_id = ?`).all(user.sub) as unknown as RecordRow[];
  return [...shared, ...owned];
}

digestRouter.get('/', (req: AuthedRequest, res) => {
  const items = computeDigest(rowsForUser(req.user!), ownerToday(req.query.today));
  res.json({ items });
});

digestRouter.post('/email', asyncHandler(async (req: AuthedRequest, res) => {
  const items = computeDigest(rowsForUser(req.user!), ownerToday(req.body?.today));
  const text =
    items.length === 0
      ? 'Nothing needs attention right now — all tracked checklists are complete and beneficiary designations are current.'
      : items.map((i) => `[${i.appId}] ${i.recordLabel} — ${i.message}`).join('\n');

  const result = await sendSelfEmail({ to: req.user!.email, subject: '[NTE] Attention digest', text });
  if (!result.sent) return res.status(result.status).json({ error: result.reason });
  res.json({ sent: true, to: req.user!.email, itemCount: items.length });
}));
