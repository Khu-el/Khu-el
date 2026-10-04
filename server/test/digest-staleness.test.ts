/**
 * The digest's copy of the staleness rule, and proof it agrees with the client's.
 *
 * The estate app badges a beneficiary designation; this server decides what
 * lands in the "Needs Attention" email. Both carried the same NaN comparison,
 * so an unparseable date read as verified in the UI *and* was left out of the
 * digest -- the two places a person would have caught it.
 *
 * The rule is duplicated because server/ has no dependency on the React-facing
 * governance-core package. The last case here asserts the two copies agree, so
 * changing one without the other fails rather than silently diverging.
 */
import { configureTestEnv } from './helpers.ts';

const env = configureTestEnv();

const { test, after, describe } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { stalenessMessage, stalenessReason, TWO_YEARS_MS } = await import('../dist/lib/staleness.js');
const client = await import('../../packages/governance-core/src/verification.ts');

after(() => env.cleanup());

const NOW = Date.parse('2026-09-21T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

describe('the digest flags what it cannot read', () => {
  for (const bad of ['not a date', 'TBD', 'unknown', '31/12/2019', '2019-13-45']) {
    test(`${JSON.stringify(bad)} reaches the digest instead of passing as verified`, () => {
      assert.equal(stalenessReason(bad, TWO_YEARS_MS, NOW), 'unparseable');
    });
  }

  test('a missing date still reaches the digest, as it always did', () => {
    assert.equal(stalenessReason('', TWO_YEARS_MS, NOW), 'missing');
  });

  test('junk from stored JSON does not throw', () => {
    // data_json holds whatever a client sent; the digest walks it directly.
    for (const junk of [42, null, undefined, {}, []]) {
      assert.equal(stalenessReason(junk, TWO_YEARS_MS, NOW), 'missing');
    }
  });

  test('a recent date stays out of the digest', () => {
    assert.equal(stalenessReason(daysAgo(30), TWO_YEARS_MS, NOW), null);
  });

  test('a date past two years goes in', () => {
    assert.equal(stalenessReason(daysAgo(800), TWO_YEARS_MS, NOW), 'expired');
  });
});

describe('the message names the actual problem', () => {
  test('an unreadable date does not claim it is two years old', () => {
    const msg = stalenessMessage('unparseable');
    assert.match(msg, /cannot be read/);
    assert.doesNotMatch(msg, /2\+ years/, 'saying "2+ years" about an unreadable date would be inventing a fact');
  });

  test('each reason reads differently', () => {
    const all = (['missing', 'unparseable', 'in-the-future', 'expired'] as const).map(stalenessMessage);
    assert.equal(new Set(all).size, all.length);
  });
});

describe('the two copies of the rule agree', () => {
  const cases = [
    '', '   ', 'not a date', 'TBD', '31/12/2019', '2019-13-45',
    daysAgo(1), daysAgo(729), daysAgo(731), daysAgo(5000),
    '2026-09-01', '2020-01-01', '+020250-01-01T00:00:00Z',
    new Date(NOW + 30 * 86_400_000).toISOString(),
  ];

  for (const value of cases) {
    test(`${JSON.stringify(value)} is judged the same on both sides`, () => {
      assert.equal(
        stalenessReason(value, TWO_YEARS_MS, NOW),
        client.stalenessReason(value, client.TWO_YEARS_MS, NOW),
        'server/src/lib/staleness.ts and governance-core/src/verification.ts have diverged'
      );
    });
  }

  test('both share the same window and tolerance', () => {
    assert.equal(TWO_YEARS_MS, client.TWO_YEARS_MS);
  });
});
