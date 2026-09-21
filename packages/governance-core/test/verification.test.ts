/**
 * An unknown must never present as a confirmation.
 *
 * The estate app flags a beneficiary designation not verified in two years. The
 * original check compared Date.now() against new Date(str).getTime(), which is
 * NaN for anything unparseable -- and every comparison against NaN is false, so
 * the designation reported as current. "TBD", "unknown" and "31/12/2019" all
 * read as verified and stayed out of the "Needs Attention" digest.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  FUTURE_TOLERANCE_MS,
  TWO_YEARS_MS,
  isVerificationStale,
  stalenessLabel,
  stalenessReason,
} from '../src/verification.ts';

const NOW = Date.parse('2026-09-21T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

describe('a value that is not a date is stale', () => {
  // Every one of these read as VERIFIED before.
  for (const bad of ['not a date', 'TBD', 'unknown', 'n/a', '31/12/2019', '2019-13-45', '--', 'soon']) {
    test(`${JSON.stringify(bad)} is unparseable, so it is stale`, () => {
      assert.equal(stalenessReason(bad, TWO_YEARS_MS, NOW), 'unparseable');
      assert.equal(isVerificationStale(bad, TWO_YEARS_MS, NOW), true);
    });
  }

  test('a missing value is stale, and says so distinctly', () => {
    for (const empty of ['', '   ', null, undefined]) {
      assert.equal(stalenessReason(empty, TWO_YEARS_MS, NOW), 'missing');
    }
  });

  test('a non-string is stale rather than throwing', () => {
    // The server reads these straight out of arbitrary stored JSON.
    for (const junk of [42, {}, [], true] as unknown[]) {
      assert.equal(stalenessReason(junk as string, TWO_YEARS_MS, NOW), 'missing');
    }
  });
});

describe('a real date is judged on its age', () => {
  test('verified yesterday is current', () => {
    assert.equal(stalenessReason(daysAgo(1), TWO_YEARS_MS, NOW), null);
  });

  test('verified just inside two years is current', () => {
    assert.equal(stalenessReason(daysAgo(729), TWO_YEARS_MS, NOW), null);
  });

  test('verified just outside two years is expired', () => {
    assert.equal(stalenessReason(daysAgo(731), TWO_YEARS_MS, NOW), 'expired');
  });

  test('a plain calendar date works, not just an ISO timestamp', () => {
    assert.equal(stalenessReason('2026-09-01', TWO_YEARS_MS, NOW), null);
    assert.equal(stalenessReason('2020-01-01', TWO_YEARS_MS, NOW), 'expired');
  });

  test('the window is configurable', () => {
    const oneYear = 365 * 86_400_000;
    assert.equal(stalenessReason(daysAgo(400), oneYear, NOW), 'expired');
    assert.equal(stalenessReason(daysAgo(400), TWO_YEARS_MS, NOW), null);
  });
});

describe('a date in the future', () => {
  test('a few hours ahead is tolerated as timezone skew', () => {
    // A date input records a calendar day with no timezone, so "today" can
    // parse to midnight UTC and read slightly ahead.
    const skewed = new Date(NOW + FUTURE_TOLERANCE_MS - 60_000).toISOString();
    assert.equal(stalenessReason(skewed, TWO_YEARS_MS, NOW), null);
  });

  test('a year typed as 20250 is not a verification that happened', () => {
    assert.equal(stalenessReason('+020250-01-01T00:00:00Z', TWO_YEARS_MS, NOW), 'in-the-future');
  });

  test('well beyond the tolerance is flagged', () => {
    const future = new Date(NOW + 30 * 86_400_000).toISOString();
    assert.equal(stalenessReason(future, TWO_YEARS_MS, NOW), 'in-the-future');
  });
});

describe('labels', () => {
  test('each reason has wording, and a current date has none', () => {
    assert.equal(stalenessLabel('missing'), 'never verified');
    assert.equal(stalenessLabel('unparseable'), 'verification date is not readable');
    assert.equal(stalenessLabel('in-the-future'), 'verification date is in the future');
    assert.equal(stalenessLabel('expired'), "hasn't been verified in 2+ years");
    assert.equal(stalenessLabel(null), null);
  });

  test('the wording distinguishes an unreadable date from an old one', () => {
    // Both need attention, but they need different attention: one is a data
    // problem, the other is a call to the custodian.
    assert.notEqual(stalenessLabel('unparseable'), stalenessLabel('expired'));
  });
});
