import { stalenessMessage, stalenessReason } from './staleness.js';

export interface RecordRow {
  id: string;
  app_id: string;
  owner_id: string;
  record_type?: string;
  data_json: string;
}

export interface DigestItem {
  appId: string;
  recordId: string;
  recordLabel: string;
  message: string;
}

export const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

export function recordLabel(appId: string, data: Record<string, unknown>): string {
  return String(data.address || data.entityName || data.obligorRef || data.familyName || data.displayName || 'Unlabeled record');
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

function calendarDay(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return match[0];
}

const DAY_MS = 86_400_000;

export function ownerToday(claimed: unknown, now = Date.now()): string {
  const utc = new Date(now).toISOString().slice(0, 10);
  const day = calendarDay(claimed);
  if (!day) return utc;
  return Math.abs(Date.parse(`${day}T00:00:00Z`) - Date.parse(`${utc}T00:00:00Z`)) <= DAY_MS ? day : utc;
}

export function crmFollowUpReason(value: unknown, today: string): 'overdue' | 'unreadable' | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const day = calendarDay(value);
  if (!day) return 'unreadable';
  return day < today ? 'overdue' : null;
}

function crmOutreachBlocked(data: Record<string, unknown>): boolean {
  return (
    data.consentStatus === 'Do Not Contact' ||
    data.consentStatus === 'Withdrawn' ||
    data.operationalLane === 'Suppressed' ||
    data.contactStatus === 'Suppressed'
  );
}

export function computeDigest(rows: RecordRow[], todayOrNow: string | number = Date.now(), now = Date.now()): DigestItem[] {
  const timestamp = typeof todayOrNow === 'number' ? todayOrNow : now;
  const today = typeof todayOrNow === 'string' ? todayOrNow : new Date(timestamp).toISOString().slice(0, 10);
  const items: DigestItem[] = [];

  for (const row of rows) {
    const body = safeJsonObject(row.data_json);
    const data = objectValue(body.data);
    const label = recordLabel(row.app_id, data);

    if (row.app_id === 'legacy-estate') {
      for (const beneficiary of arrayValue(data.beneficiaries)) {
        const b = objectValue(beneficiary);
        const reason = stalenessReason(b.lastVerified, undefined, timestamp);
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
