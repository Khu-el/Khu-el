/**
 * Pure "needs attention" digest computation.
 *
 * Kept free of any database or transport import so it can be unit-tested
 * directly: the route layer reads the rows, this decides what they mean.
 */

export interface RecordRow {
  id: string;
  app_id: string;
  owner_id: string;
  data_json: string;
}

export interface DigestItem {
  appId: string;
  recordId: string;
  recordLabel: string;
  message: string;
}

export const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

export function recordLabel(appId: string, data: any): string {
  return data.address || data.entityName || data.obligorRef || data.familyName || 'Unlabeled record';
}

/**
 * `now` is injectable so staleness thresholds can be tested deterministically;
 * callers in the app omit it and get the current time.
 */
export function computeDigest(rows: RecordRow[], now: number = Date.now()): DigestItem[] {
  const items: DigestItem[] = [];

  for (const row of rows) {
    const body = JSON.parse(row.data_json);
    const data = body.data ?? {};
    const label = recordLabel(row.app_id, data);

    if (row.app_id === 'legacy-estate') {
      for (const b of data.beneficiaries ?? []) {
        const stale = !b.lastVerified || now - new Date(b.lastVerified).getTime() > TWO_YEARS_MS;
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
