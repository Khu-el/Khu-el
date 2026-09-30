/**
 * "When was this last confirmed?" -- and what to do when the answer is not a
 * date.
 *
 * The estate app flags a beneficiary designation that has not been verified in
 * two years. That check used to read:
 *
 *     Date.now() - new Date(dateStr).getTime() > twoYearsMs
 *
 * which fails open. An unparseable value gives NaN, every comparison against
 * NaN is false, and the designation therefore reported as *current*. "TBD",
 * "unknown" and "31/12/2019" -- a plausible thing for a person to type -- all
 * read as verified and stayed out of the "Needs Attention" digest. The empty
 * string was handled; everything else that is not a date was not.
 *
 * A value we cannot read is an unknown, and an unknown must never present as a
 * confirmation. Every branch here resolves to stale unless a real instant says
 * otherwise.
 */

export const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

/**
 * Tolerance for a verification date that sits slightly ahead of now. A date
 * input records a calendar day with no timezone, so "today" can parse as
 * midnight UTC and look a few hours future to a viewer west of it. Beyond this
 * window a date is not skew -- it is a typo like the year 20250, and a
 * verification that has not happened yet cannot be evidence that it has.
 */
export const FUTURE_TOLERANCE_MS = 36 * 60 * 60 * 1000;

export type StaleReason = 'missing' | 'unparseable' | 'in-the-future' | 'expired' | null;

/**
 * Why this date does not count as a recent verification, or null if it does.
 * Separate from the boolean so a UI can say which, rather than only that.
 */
export function stalenessReason(
  dateStr: string | null | undefined,
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

/** True when the date does not evidence a verification inside the window. */
export function isVerificationStale(
  dateStr: string | null | undefined,
  maxAgeMs: number = TWO_YEARS_MS,
  now: number = Date.now()
): boolean {
  return stalenessReason(dateStr, maxAgeMs, now) !== null;
}

/** Wording for the reason, for a badge or a digest line. */
export function stalenessLabel(reason: StaleReason): string | null {
  switch (reason) {
    case 'missing':
      return 'never verified';
    case 'unparseable':
      return 'verification date is not readable';
    case 'in-the-future':
      return 'verification date is in the future';
    case 'expired':
      return "hasn't been verified in 2+ years";
    default:
      return null;
  }
}
