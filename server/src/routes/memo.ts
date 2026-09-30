import { Router } from 'express';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { renderMemoPdf, type MemoLine, type MemoPayload } from '../lib/pdf.js';
import { sendSelfEmail } from '../lib/email.js';

export const memoRouter = Router();
memoRouter.use(requireAuth);

/**
 * A line is `{ label, value }`. Anything else -- null, a bare string, a number
 * -- is refused here rather than reaching PDFKit, where reading `.label` off
 * `null` threw inside the renderer. A missing value renders as the em dash the
 * apps use for "not entered", never as the word "undefined".
 */
function parseLines(items: unknown): MemoLine[] | null {
  if (!Array.isArray(items)) return null;
  const lines: MemoLine[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') return null;
    const { label, value } = item as Record<string, unknown>;
    if (label === undefined || label === null) return null;
    lines.push({ label: String(label), value: value === undefined || value === null ? '—' : String(value) });
  }
  return lines;
}

function parseMemoPayload(body: any): MemoPayload | null {
  if (!body?.title) return null;
  const assumptions = parseLines(body.assumptions);
  const lines = parseLines(body.lines);
  if (!assumptions || !lines) return null;
  const notes = Array.isArray(body.notes) ? body.notes.filter((n: unknown) => n !== null && n !== undefined).map(String) : [];
  return { title: String(body.title), assumptions, lines, notes };
}

memoRouter.post('/memo/pdf', asyncHandler(async (req: AuthedRequest, res) => {
  const memo = parseMemoPayload(req.body);
  if (!memo) return res.status(400).json({ error: 'Expected { title, assumptions: [{ label, value }], lines: [{ label, value }], notes?: [] }' });

  const pdf = await renderMemoPdf(memo);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${memo.title.replace(/[^a-z0-9-_ ]/gi, '').slice(0, 60) || 'memo'}.pdf"`);
  res.send(pdf);
}));

memoRouter.post('/memo/email', asyncHandler(async (req: AuthedRequest, res) => {
  const memo = parseMemoPayload(req.body);
  if (!memo) return res.status(400).json({ error: 'Expected { title, assumptions: [{ label, value }], lines: [{ label, value }], notes?: [] }' });

  const pdf = await renderMemoPdf(memo);
  const summary = [memo.title, '', ...memo.assumptions.map((a) => `${a.label}: ${a.value}`), '', ...memo.lines.map((l) => `${l.label}: ${l.value}`)].join('\n');

  const result = await sendSelfEmail({
    to: req.user!.email,
    subject: `[NTE] ${memo.title}`,
    text: `${summary}\n\nFull memo attached as PDF.\n\nThis was sent only to your own account email — this app cannot email anyone else.`,
    attachment: { filename: 'memo.pdf', content: pdf, contentType: 'application/pdf' },
  });

  if (!result.sent) return res.status(result.status).json({ error: result.reason });
  res.json({ sent: true, to: req.user!.email });
}));
