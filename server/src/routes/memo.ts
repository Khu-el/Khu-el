import { Router } from 'express';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import { renderMemoPdf, type MemoPayload } from '../lib/pdf.js';
import { sendSelfEmail } from '../lib/email.js';

export const memoRouter = Router();
memoRouter.use(requireAuth);

function parseMemoPayload(body: any): MemoPayload | null {
  if (!body?.title || !Array.isArray(body?.assumptions) || !Array.isArray(body?.lines)) return null;
  return { title: String(body.title), assumptions: body.assumptions, lines: body.lines, notes: Array.isArray(body.notes) ? body.notes : [] };
}

memoRouter.post('/memo/pdf', async (req: AuthedRequest, res) => {
  const memo = parseMemoPayload(req.body);
  if (!memo) return res.status(400).json({ error: 'Expected { title, assumptions: [], lines: [], notes?: [] }' });

  const pdf = await renderMemoPdf(memo);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${memo.title.replace(/[^a-z0-9-_ ]/gi, '').slice(0, 60) || 'memo'}.pdf"`);
  res.send(pdf);
});

memoRouter.post('/memo/email', async (req: AuthedRequest, res) => {
  const memo = parseMemoPayload(req.body);
  if (!memo) return res.status(400).json({ error: 'Expected { title, assumptions: [], lines: [], notes?: [] }' });

  const pdf = await renderMemoPdf(memo);
  const summary = [memo.title, '', ...memo.assumptions.map((a) => `${a.label}: ${a.value}`), '', ...memo.lines.map((l) => `${l.label}: ${l.value}`)].join('\n');

  const result = await sendSelfEmail({
    to: req.user!.email,
    subject: `[NTE] ${memo.title}`,
    text: `${summary}\n\nFull memo attached as PDF.\n\nThis was sent only to your own account email — this app cannot email anyone else.`,
    attachment: { filename: 'memo.pdf', content: pdf, contentType: 'application/pdf' },
  });

  if (!result.sent) return res.status(501).json({ error: result.reason });
  res.json({ sent: true, to: req.user!.email });
});
