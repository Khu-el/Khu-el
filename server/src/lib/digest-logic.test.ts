import { describe, it, expect } from 'vitest';
import { computeDigest, recordLabel, TWO_YEARS_MS, type RecordRow } from './digest-logic.js';

const NOW = Date.parse('2026-06-15T12:00:00.000Z');

function row(app_id: string, data: unknown, id = 'rec_1'): RecordRow {
  return { id, app_id, owner_id: 'usr_1', data_json: JSON.stringify({ data }) };
}

describe('recordLabel', () => {
  it('picks the first identifying field each app provides', () => {
    expect(recordLabel('deal-architect', { address: '12 Oak St' })).toBe('12 Oak St');
    expect(recordLabel('capital-readiness', { entityName: 'Acme LLC' })).toBe('Acme LLC');
    expect(recordLabel('notes-underwriting', { obligorRef: 'NOTE-004' })).toBe('NOTE-004');
    expect(recordLabel('legacy-estate', { familyName: 'House of Ransom' })).toBe('House of Ransom');
  });

  it('falls back to a placeholder rather than rendering undefined', () => {
    expect(recordLabel('deal-architect', {})).toBe('Unlabeled record');
    expect(recordLabel('deal-architect', { address: '' })).toBe('Unlabeled record');
  });
});

describe('computeDigest - beneficiary staleness (legacy-estate)', () => {
  it('flags a designation never verified', () => {
    const items = computeDigest(
      [row('legacy-estate', { familyName: 'Ransom', beneficiaries: [{ accountOrPolicy: 'Term life' }] })],
      NOW
    );
    expect(items).toHaveLength(1);
    expect(items[0].message).toContain('Term life');
    expect(items[0].message).toContain("hasn't been verified in 2+ years");
    expect(items[0].recordLabel).toBe('Ransom');
  });

  it('does not flag a designation verified within two years', () => {
    const recent = new Date(NOW - TWO_YEARS_MS + 24 * 60 * 60 * 1000).toISOString();
    const items = computeDigest(
      [row('legacy-estate', { beneficiaries: [{ accountOrPolicy: 'IRA', lastVerified: recent }] })],
      NOW
    );
    expect(items).toEqual([]);
  });

  it('flags a designation verified just over two years ago', () => {
    const old = new Date(NOW - TWO_YEARS_MS - 24 * 60 * 60 * 1000).toISOString();
    const items = computeDigest(
      [row('legacy-estate', { beneficiaries: [{ accountOrPolicy: 'IRA', lastVerified: old }] })],
      NOW
    );
    expect(items).toHaveLength(1);
  });

  it('treats the two-year mark itself as still current', () => {
    // Boundary is strictly greater-than, so exactly 2 years old does not flag.
    const exact = new Date(NOW - TWO_YEARS_MS).toISOString();
    expect(
      computeDigest([row('legacy-estate', { beneficiaries: [{ accountOrPolicy: 'IRA', lastVerified: exact }] })], NOW)
    ).toEqual([]);
  });

  it('names an unlabeled designation rather than printing undefined', () => {
    const items = computeDigest([row('legacy-estate', { beneficiaries: [{}] })], NOW);
    expect(items[0].message).toContain('"unnamed"');
  });

  it('emits one item per stale beneficiary', () => {
    const items = computeDigest(
      [row('legacy-estate', { beneficiaries: [{ accountOrPolicy: 'A' }, { accountOrPolicy: 'B' }, { accountOrPolicy: 'C' }] })],
      NOW
    );
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.message.match(/"([^"]+)"/)![1])).toEqual(['A', 'B', 'C']);
  });

  it('returns nothing for an estate with no beneficiaries recorded', () => {
    expect(computeDigest([row('legacy-estate', { familyName: 'Ransom' })], NOW)).toEqual([]);
  });
});

describe('computeDigest - checklist completeness', () => {
  it('flags an incomplete diligence checklist with its count', () => {
    const items = computeDigest(
      [row('deal-architect', { address: '12 Oak St', diligence: [{ done: true }, { done: false }, { done: false }] })],
      NOW
    );
    expect(items).toHaveLength(1);
    expect(items[0].message).toBe('Diligence checklist 1/3 complete');
  });

  it('stays silent on a complete diligence checklist', () => {
    expect(
      computeDigest([row('deal-architect', { diligence: [{ done: true }, { done: true }] })], NOW)
    ).toEqual([]);
  });

  it('stays silent when a checklist is empty rather than reporting 0/0', () => {
    expect(computeDigest([row('deal-architect', { diligence: [] })], NOW)).toEqual([]);
    expect(computeDigest([row('notes-underwriting', { lienChecklist: [] })], NOW)).toEqual([]);
    expect(computeDigest([row('capital-readiness', { offeringReadiness: [] })], NOW)).toEqual([]);
  });

  it('counts only VERIFIED items as done for offering readiness', () => {
    const items = computeDigest(
      [
        row('capital-readiness', {
          entityName: 'Acme LLC',
          offeringReadiness: [{ status: 'VERIFIED' }, { status: 'PENDING' }, { status: 'DOCUMENT_CLAIM' }],
        }),
      ],
      NOW
    );
    expect(items[0].message).toBe('Offering readiness 1/3 professionally verified');
  });

  it('flags an incomplete lien/perfection checklist', () => {
    const items = computeDigest(
      [row('notes-underwriting', { obligorRef: 'NOTE-004', lienChecklist: [{ done: false }, { done: true }] })],
      NOW
    );
    expect(items[0].message).toBe('Lien/perfection checklist 1/2 complete');
    expect(items[0].recordLabel).toBe('NOTE-004');
  });
});

describe('computeDigest - aggregation', () => {
  it('returns nothing for no records', () => {
    expect(computeDigest([], NOW)).toEqual([]);
  });

  it('collects items across every app in one pass', () => {
    const items = computeDigest(
      [
        row('deal-architect', { address: '12 Oak St', diligence: [{ done: false }] }, 'rec_a'),
        row('capital-readiness', { entityName: 'Acme', offeringReadiness: [{ status: 'PENDING' }] }, 'rec_b'),
        row('notes-underwriting', { obligorRef: 'N-1', lienChecklist: [{ done: false }] }, 'rec_c'),
        row('legacy-estate', { familyName: 'Ransom', beneficiaries: [{ accountOrPolicy: 'IRA' }] }, 'rec_d'),
      ],
      NOW
    );
    expect(items).toHaveLength(4);
    expect(items.map((i) => i.appId)).toEqual([
      'deal-architect',
      'capital-readiness',
      'notes-underwriting',
      'legacy-estate',
    ]);
    expect(items.map((i) => i.recordId)).toEqual(['rec_a', 'rec_b', 'rec_c', 'rec_d']);
  });

  it('ignores an unknown app id instead of throwing', () => {
    expect(computeDigest([row('some-future-app', { diligence: [{ done: false }] })], NOW)).toEqual([]);
  });

  it('tolerates a record whose data payload is missing entirely', () => {
    const bare: RecordRow = { id: 'rec_x', app_id: 'deal-architect', owner_id: 'usr_1', data_json: '{}' };
    expect(computeDigest([bare], NOW)).toEqual([]);
  });
});
