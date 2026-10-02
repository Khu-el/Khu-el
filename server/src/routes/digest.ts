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
  record_type: string;
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
  return String(data.address || data.entityName || data.obligorRef || data.familyName || data.displayName || 'Unlabeled record');
}

/** A real calendar day written exactly as YYYY-MM-DD, or null. Pure date arithmetic: no time zone involved. */
function calendarDay(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return m[0];
}

const DAY_MS = 86_400_000;

/**
 * "Today" for the CRM digest, as a calendar day in the owner's time zone.
 *
 * A follow-up date is a day on the owner's calendar, and the CRM's own
 * followUpState() reads it in the owner's browser. The server runs in UTC, so
 * near midnight its own date can be a day off theirs. The client therefore
 * sends its local date; it is accepted only if it is a real day within one
 * day of the server's UTC date (every time zone on Earth is), and without it
 * the server falls back to the UTC date.
 */
export function ownerToday(claimed: unknown, now = Date.now()): string {
  const utc = new Date(now).toISOString().slice(0, 10);
  const day = calendarDay(claimed);
  if (!day) return utc;
  return Math.abs(Date.parse(`${day}T00:00:00Z`) - Date.parse(`${utc}T00:00:00Z`)) <= DAY_MS ? day : utc;
}

/**
 * A CRM follow-up that needs a human today: past due, or a date nobody can
 * read. Mirrors followUpState() in apps/financial-services-crm/src/crm.ts --
 * only an exact YYYY-MM-DD is a date, and an unreadable one is never "fine".
 * Both sides compare calendar days, so the answer does not depend on the
 * server's clock zone: `today` is the owner's date (see ownerToday).
 */
export function crmFollowUpReason(value: unknown, today: string): 'overdue' | 'unreadable' | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const day = calendarDay(value);
  if (!day) return 'unreadable';
  return day < today ? 'overdue' : null;
}

/** Do Not Contact, Withdrawn or suppressed: never put in front of anyone as a call to make. */
function crmOutreachBlocked(data: Record<string, unknown>): boolean {
  return (
    data.consentStatus === 'Do Not Contact' ||
    data.consentStatus === 'Withdrawn' ||
    data.operationalLane === 'Suppressed' ||
    data.contactStatus === 'Suppressed'
  );
}

function computeDigest(rows: RecordRow[], today: string): DigestItem[] {
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

    if (row.app_id === 'financial-services-crm' && row.record_type === 'FS_CONTACT') {
      if (data.sensitiveDataPresent === true)
        items.push({ appId: row.app_id, recordId: row.id, recordLabel: label, message: 'Flagged as holding sensitive data — move it to a company-approved system' });
      const reason = crmOutreachBlocked(data) ? null : crmFollowUpReason(data.nextFollowUp, today);
      if (reason === 'overdue') items.push({ appId: row.app_id, recordId: row.id, recordLabel: label, message: `Follow-up overdue (${String(data.nextFollowUp)})` });
      if (reason === 'unreadable') items.push({ appId: row.app_id, recordId: row.id, recordLabel: label, message: 'Follow-up date cannot be read — set a real date' });
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
