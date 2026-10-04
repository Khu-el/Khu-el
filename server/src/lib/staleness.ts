/**
 * Mirror of packages/governance-core/src/verification.ts.
 *
 * The rule has to hold in both places: the estate app decides what to badge,
 * and this server decides what goes in the "Needs Attention" digest email. They
 * carried the same comparison and therefore the same defect -- an unparseable
 * date gives NaN, every comparison against NaN is false, and the designation
 * reported as current. "TBD", "unknown" and "31/12/2019" all read as verified
 * and stayed out of the digest.
 *
 * It is a copy rather than an import because server/ is not a consumer of
 * governance-core: that package is React-facing and the server has no
 * dependency on it. Keeping the two in step is a maintenance obligation, and
 * both sides are tested so a change to one without the other shows up as a
 * failure rather than a divergence.
 */

export const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

/** See verification.ts: a date input has no timezone, so "today" can read a few hours ahead. */
export const FUTURE_TOLERANCE_MS = 36 * 60 * 60 * 1000;

export type StaleReason = 'missing' | 'unparseable' | 'in-the-future' | 'expired' | null;

export function stalenessReason(
  dateStr: unknown,
  maxAgeMs: number = TWO_YEARS_MS,
  now: number = Date.now()
): StaleReason {
  if (typeof dateStr !== 'string' || dateStr.trim() === '') return 'missing';

  const last = new Date(dateStr).getTime();
  if (Number.isNaN(last)) return 'unparseable';

  if (last - now > FUTURE_TOLERANCE_MS) return 'in-the-future';
  if (now - last > maxAgeMs) return 'expired';
  return null;
}

export function isVerificationStale(dateStr: unknown, maxAgeMs: number = TWO_YEARS_MS, now: number = Date.now()): boolean {
  return stalenessReason(dateStr, maxAgeMs, now) !== null;
}

/** Digest wording, naming why rather than only that. */
export function stalenessMessage(reason: StaleReason): string {
  switch (reason) {
    case 'missing':
      return 'has never been verified';
    case 'unparseable':
      return 'has a verification date that cannot be read';
    case 'in-the-future':
      return 'has a verification date in the future';
    default:
      return "hasn't been verified in 2+ years";
  }
}
