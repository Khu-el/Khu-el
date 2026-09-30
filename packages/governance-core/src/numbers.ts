/**
 * "Not entered" and "zero" are different answers.
 *
 * Every number field in the apps used to be wired as
 *
 *     value={x || ''}   onChange={(e) => set({ x: Number(e.target.value) })}
 *
 * which conflates the two in both directions: clearing a field stored 0
 * (Number('') is 0), and a 0 the user typed rendered as an empty box. Once
 * stored, a field nobody filled in and a field someone set to zero were the
 * same value, and every calculation downstream treated "not entered" as a real
 * zero -- a blank ARV produced a negative maximum offer, a blank rate an
 * interest-free loan.
 *
 * A number field now stores `null` when empty. `known()` turns that into NaN at
 * the point of calculation, so the NaN convention in CLAUDE.md carries it
 * through to a dash instead of a number nobody entered.
 */

/** A stored numeric field: `null` means the user has not entered it. */
export type MaybeNumber = number | null;

/** What an `<input type="number">` should display for a stored value. */
export function toInputValue(value: MaybeNumber | undefined): number | '' {
  return typeof value === 'number' && Number.isFinite(value) ? value : '';
}

/** What to store for the text an `<input type="number">` reports. */
export function fromInputValue(text: string): MaybeNumber {
  if (text.trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** The value for arithmetic: a real number, or NaN when not entered. */
export function known(value: MaybeNumber | undefined): number {
  return typeof value === 'number' ? value : NaN;
}

/**
 * The total of a list of line items (a capital stack, a use-of-proceeds table),
 * skipping rows whose amount has not been entered. A list with no rows really
 * does total zero -- nothing has been sourced or allocated yet -- so this is 0,
 * not NaN; what it must not do is let one blank row blank the whole total.
 */
export function sumKnown(values: (MaybeNumber | undefined)[]): number {
  let total = 0;
  for (const v of values) if (typeof v === 'number' && Number.isFinite(v)) total += v;
  return total;
}

/** A record's number fields, with every one not entered as NaN. Other fields pass through. */
export type KnownFields<T> = { [K in keyof T]: T[K] extends MaybeNumber | undefined ? (null extends T[K] ? number : T[K]) : T[K] };

/**
 * The values to calculate with. Read inputs and write patches through the
 * record itself; do the arithmetic through this, so a blank field is NaN in
 * every formula without wrapping each use.
 */
export function knownFields<T extends object>(record: T): KnownFields<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) out[k] = v === null ? NaN : v;
  return out as KnownFields<T>;
}

/** A plain number for a sentence ("7.5% / 360mo"): the dash when it was not entered. */
export function fmtPlain(value: MaybeNumber | undefined, suffix = ''): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}${suffix}` : '—';
}
