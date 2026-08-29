import { Router } from 'express';
import { db } from '../lib/db.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import { sendSelfEmail } from '../lib/email.js';
import { computeDigest, type RecordRow } from '../lib/digest-logic.js';

export const digestRouter = Router();
digestRouter.use(requireAuth);

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
