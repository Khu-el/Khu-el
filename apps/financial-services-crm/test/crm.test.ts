/**
 * The CRM's rules: who may be contacted, what counts as a duplicate, when a
 * follow-up is due, and the production ratios on the Command Center. Every
 * figure the dashboard shows comes from src/crm.ts.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  activityTotals,
  countBy,
  detectSensitive,
  duplicateIds,
  firstBottleneck,
  fmtPct,
  followUpState,
  inRange,
  isContactable,
  laneQualificationGap,
  machoAssessed,
  machoScore,
  needsFollowUp,
  normalizePhone,
  outreachGate,
  parseDay,
  ratio,
  weekStartOf,
} from '../src/crm.ts';
import { emptyContact } from '../src/defaults.ts';

const NOW = new Date(2026, 8, 26, 14, 30).getTime(); // Sat 26 Sep 2026, local

describe('a new contact starts neutral', () => {
  test('Unqualified, Not Established, Not Assessed — nothing presumed from an address book', () => {
    const c = emptyContact();
    assert.equal(c.operationalLane, 'Unqualified');
    assert.equal(c.consentStatus, 'Not Established');
    assert.equal(c.clientInterest, 'Not Assessed');
    assert.equal(c.opportunityInterest, 'Not Assessed');
    assert.equal(c.sensitiveDataPresent, false);
  });
});

describe('outreach permission', () => {
  const base = { consentStatus: 'Not Established', operationalLane: 'Unqualified', contactStatus: 'Active' } as const;

  test('Do Not Contact and Withdrawn block outreach', () => {
    assert.equal(outreachGate({ ...base, consentStatus: 'Do Not Contact' }), 'blocked');
    assert.equal(outreachGate({ ...base, consentStatus: 'Withdrawn' }), 'blocked');
  });

  test('suppression in either the lane or the status blocks, whatever the consent says', () => {
    assert.equal(outreachGate({ ...base, consentStatus: 'Commercial Consent Confirmed', operationalLane: 'Suppressed' }), 'blocked');
    assert.equal(outreachGate({ ...base, consentStatus: 'General Follow-Up OK', contactStatus: 'Suppressed' }), 'blocked');
  });

  test('consent never established is caution, not permission', () => {
    assert.equal(outreachGate(base), 'caution');
  });

  test('a consent status set on purpose is ok', () => {
    assert.equal(outreachGate({ ...base, consentStatus: 'General Follow-Up OK' }), 'ok');
  });

  test('having a phone number is contactable, which is not the same as permitted', () => {
    const c = { ...emptyContact(), primaryPhone: '(404) 555-0100', consentStatus: 'Do Not Contact' as const };
    assert.equal(isContactable(c), true);
    assert.equal(outreachGate(c), 'blocked');
  });
});

describe('commercial lanes need an expressed interest', () => {
  test('Licensed Prospect without client interest is flagged', () => {
    assert.match(laneQualificationGap({ operationalLane: 'Licensed Prospect', clientInterest: 'Not Assessed', opportunityInterest: 'Interested' }) ?? '', /Client Interest/);
  });
  test('Recruiting without opportunity interest is flagged', () => {
    assert.match(laneQualificationGap({ operationalLane: 'Recruiting', clientInterest: 'Interested', opportunityInterest: 'Not Assessed' }) ?? '', /Opportunity Interest/);
  });
  test('the matching interest clears it', () => {
    assert.equal(laneQualificationGap({ operationalLane: 'Recruiting', clientInterest: 'Not Assessed', opportunityInterest: 'Interested' }), null);
    assert.equal(laneQualificationGap({ operationalLane: 'General Network', clientInterest: 'Not Assessed', opportunityInterest: 'Not Assessed' }), null);
  });
});

describe('duplicates are flagged, never merged', () => {
  test('phones compare by digits, so formatting does not hide a duplicate', () => {
    assert.equal(normalizePhone('+1 (404) 555-0100'), normalizePhone('404.555.0100'));
    assert.equal(normalizePhone('ext 12'), '');
  });

  test('two contacts sharing a phone or email are both flagged', () => {
    const mk = (id: string, primaryEmail: string, primaryPhone: string) => ({ id, data: { primaryEmail, primaryPhone } });
    const ids = duplicateIds([mk('a', 'X@Example.com', ''), mk('b', 'x@example.com ', ''), mk('c', '', '+14045550100'), mk('d', '', '(404) 555-0100'), mk('e', 'solo@example.com', '7705550100')]);
    assert.deepEqual([...ids].sort(), ['a', 'b', 'c', 'd']);
  });

  test('two contacts with the same name and no shared identifier are not duplicates', () => {
    const ids = duplicateIds([
      { id: 'a', data: { primaryEmail: '', primaryPhone: '' } },
      { id: 'b', data: { primaryEmail: '', primaryPhone: '' } },
    ]);
    assert.equal(ids.size, 0);
  });
});

describe('sensitive data detection', () => {
  test('an SSN, a routing number and a policy number are caught', () => {
    assert.ok(detectSensitive('ssn is 123-45-6789').length > 0);
    assert.ok(detectSensitive('routing number 021000021').length > 0);
    assert.ok(detectSensitive('Policy # ABC12345').length > 0);
  });
  test('ordinary relationship notes are not', () => {
    assert.deepEqual(detectSensitive('Met at church, two kids, prefers evenings. Call after 6.'), []);
  });
});

describe('MACHO', () => {
  test('counts only Y', () => {
    assert.equal(machoScore({ m: 'Y', a: 'N', c: 'Y', h: '', o: 'Y' }), 3);
  });
  test('"not assessed" is distinguishable from a score of zero', () => {
    const blank = { m: '', a: '', c: '', h: '', o: '' } as const;
    const allNo = { m: 'N', a: 'N', c: 'N', h: 'N', o: 'N' } as const;
    assert.equal(machoScore(blank), machoScore(allNo));
    assert.equal(machoAssessed(blank), 0);
    assert.equal(machoAssessed(allNo), 5);
  });
});

describe('follow-up timing', () => {
  test('past, today, this week, later', () => {
    assert.equal(followUpState('2026-09-25', NOW), 'overdue');
    assert.equal(followUpState('2026-09-26', NOW), 'today');
    assert.equal(followUpState('2026-10-02', NOW), 'this-week');
    assert.equal(followUpState('2026-10-03', NOW), 'later');
    assert.equal(followUpState('', NOW), 'none');
  });

  for (const bad of ['TBD', '9/30/2026', '2026-02-30', '2026-13-01', 'next week']) {
    test(`${JSON.stringify(bad)} is unreadable, and unreadable needs attention`, () => {
      assert.equal(followUpState(bad, NOW), 'unreadable');
      assert.equal(needsFollowUp('unreadable'), true);
    });
  }

  test('the owner\'s local midnight is the boundary, on both sides of it', () => {
    const lastMinute = new Date(2026, 8, 26, 23, 59).getTime();
    const firstMinute = new Date(2026, 8, 27, 0, 1).getTime();
    assert.equal(followUpState('2026-09-26', lastMinute), 'today');
    assert.equal(followUpState('2026-09-26', firstMinute), 'overdue');
    assert.equal(followUpState('2026-09-27', lastMinute), 'this-week');
    assert.equal(followUpState('2026-09-27', firstMinute), 'today');
  });

  test('a follow-up later this week does not need attention yet', () => {
    assert.equal(needsFollowUp('this-week'), false);
  });

  test('weeks start on Monday', () => {
    assert.equal(weekStartOf(NOW), '2026-09-21');
    assert.equal(weekStartOf(new Date(2026, 8, 21, 0, 5).getTime()), '2026-09-21');
    assert.equal(weekStartOf(new Date(2026, 8, 27, 23, 55).getTime()), '2026-09-21');
  });
});

describe('production ratios', () => {
  const row = (conversation: 'Y' | 'N' | '', appointmentSet: 'Y' | 'N' | '', referralCount: number | null = null) => ({ conversation, appointmentSet, referralCount, date: '2026-09-26' });

  test('totals match the workbook scoreboard formulas', () => {
    const t = activityTotals([row('Y', 'Y', 2), row('Y', 'N'), row('N', 'N', 1), row('', '')]);
    assert.deepEqual(t, { attempts: 4, conversations: 2, appointmentsSet: 1, referrals: 3 });
  });

  test('a ratio with nothing to divide by is unknown, not 0%', () => {
    // The workbook showed IF(E5=0,0,…) — a 0% conversion rate on a day with no dials.
    assert.ok(Number.isNaN(ratio(0, 0)));
    assert.equal(fmtPct(ratio(0, 0)), '—');
    assert.equal(fmtPct(ratio(8, 25)), '32%');
    assert.equal(fmtPct(ratio(0, 25)), '0%');
  });

  test('the bottleneck is the first stage under target, in funnel order', () => {
    const targets = { dials: 25, conversations: 8, appointments: 2 };
    assert.equal(firstBottleneck({ attempts: 30, conversations: 5, appointmentsSet: 0, referrals: 0 }, targets)?.stage, 'Conversations');
    assert.equal(firstBottleneck({ attempts: 10, conversations: 9, appointmentsSet: 3, referrals: 0 }, targets)?.stage, 'Dials');
    assert.equal(firstBottleneck({ attempts: 25, conversations: 8, appointmentsSet: 2, referrals: 0 }, targets), null);
  });

  test('no activity is no data, not a bottleneck', () => {
    assert.equal(firstBottleneck({ attempts: 0, conversations: 0, appointmentsSet: 0, referrals: 0 }, { dials: 25, conversations: 8, appointments: 2 }), null);
  });

  test('date ranges are half-open and count what they cannot read', () => {
    const rows = [{ date: '2026-09-21' }, { date: '2026-09-27' }, { date: '2026-09-28' }, { date: 'yesterday' }];
    const r = inRange(rows, '2026-09-21', '2026-09-28');
    assert.equal(r.rows.length, 2);
    assert.equal(r.undated, 1);
  });

  test('parseDay rejects impossible dates', () => {
    assert.ok(Number.isNaN(parseDay('2026-02-29')));
    assert.ok(!Number.isNaN(parseDay('2028-02-29')));
  });
});

describe('funnel counts', () => {
  test('keep list order, include zeros, and surface off-list values', () => {
    const rows = [{ s: 'Invited' }, { s: 'Prospect' }, { s: 'Invited' }, { s: 'Mystery' }, { s: '' }];
    assert.deepEqual(countBy(rows, (r) => r.s, ['Prospect', 'Invited', 'Licensed']), [
      { label: 'Prospect', count: 1 },
      { label: 'Invited', count: 2 },
      { label: 'Licensed', count: 0 },
      { label: 'Mystery', count: 1 },
      { label: '(blank)', count: 1 },
    ]);
  });
});
