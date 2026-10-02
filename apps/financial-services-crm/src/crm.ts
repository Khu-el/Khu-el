/**
 * Pure CRM rules: contactability, consent, duplicates, follow-up timing,
 * MACHO scoring, production ratios and funnel counts.
 *
 * Every figure the Command Center shows is computed here, from recorded rows,
 * so that it is traceable to inputs (CLAUDE.md, output conventions). No React,
 * no network, and imports only by real `.ts` path, so `node --test` runs it
 * directly.
 */
import type { ActivityData, ContactData, MachoFlags, YesNo } from './types.ts';

// ── Identity & duplicates ────────────────────────────────────────────────────

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Compare phones by their last ten digits, so "+1 (404) 555-0100" and
 * "4045550100" are the same number. A string with fewer than seven digits is
 * not treated as a phone at all -- it cannot identify anyone.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/** Has at least one way to reach them on record. Not the same as permission to. */
export function isContactable(c: Pick<ContactData, 'primaryEmail' | 'primaryPhone'>): boolean {
  return c.primaryEmail.trim() !== '' || normalizePhone(c.primaryPhone) !== '';
}

/**
 * Ids of contacts sharing an email or phone with another contact. The workbook
 * flagged these "Review"; so does this. It never merges them: two people can
 * share a household number, and the Compliance Notes forbid fuzzy merging.
 */
export function duplicateIds(contacts: { id: string; data: Pick<ContactData, 'primaryEmail' | 'primaryPhone'> }[]): Set<string> {
  const byEmail = new Map<string, string[]>();
  const byPhone = new Map<string, string[]>();
  for (const c of contacts) {
    const e = normalizeEmail(c.data.primaryEmail);
    const p = normalizePhone(c.data.primaryPhone);
    if (e) byEmail.set(e, [...(byEmail.get(e) ?? []), c.id]);
    if (p) byPhone.set(p, [...(byPhone.get(p) ?? []), c.id]);
  }
  const out = new Set<string>();
  for (const group of [...byEmail.values(), ...byPhone.values()]) if (group.length > 1) group.forEach((id) => out.add(id));
  return out;
}

// ── Permission ───────────────────────────────────────────────────────────────

export type OutreachGate = 'blocked' | 'caution' | 'ok';

/**
 * Whether outreach to this contact is permitted by what is on record.
 *
 * - `blocked`: Do Not Contact, Withdrawn, or suppressed anywhere. Nothing in
 *   the app may present them as someone to call.
 * - `caution`: consent never established. Warm-market conversation is fine;
 *   commercial solicitation is not, because address-book presence is not consent.
 * - `ok`: a consent status that was set on purpose.
 */
export function outreachGate(c: Pick<ContactData, 'consentStatus' | 'operationalLane' | 'contactStatus'>): OutreachGate {
  if (c.consentStatus === 'Do Not Contact' || c.consentStatus === 'Withdrawn') return 'blocked';
  if (c.operationalLane === 'Suppressed' || c.contactStatus === 'Suppressed') return 'blocked';
  if (c.consentStatus === 'Not Established') return 'caution';
  return 'ok';
}

/**
 * Routing a contact into a commercial lane (Licensed Prospect, Recruiting)
 * requires intentional qualification: an expressed interest on the matching
 * side. Returns the reason it is not yet justified, or null.
 */
export function laneQualificationGap(c: Pick<ContactData, 'operationalLane' | 'clientInterest' | 'opportunityInterest'>): string | null {
  if (c.operationalLane === 'Licensed Prospect' && c.clientInterest !== 'Interested')
    return 'Licensed Prospect is a client lane — record Client Interest as "Interested" after a real conversation first.';
  if (c.operationalLane === 'Recruiting' && c.opportunityInterest !== 'Interested')
    return 'Recruiting is an opportunity lane — record Opportunity Interest as "Interested" after a real conversation first.';
  return null;
}

// ── Sensitive data ───────────────────────────────────────────────────────────

const SENSITIVE_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'a Social Security number', re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { label: 'an SSN reference', re: /\b(ssn|social security)\b/i },
  { label: 'a bank routing or account number', re: /\b(routing|acct|account)\s*(no\.?|number|#)?\s*:?\s*\d{6,}/i },
  { label: 'a policy number', re: /\bpolicy\s*(no\.?|number|#)\s*:?\s*[A-Z0-9-]{5,}/i },
  { label: 'a card number', re: /\b(?:\d[ -]?){15,16}\b/ },
  { label: 'medical or underwriting detail', re: /\b(diagnos\w*|prescription|medication|underwriting class|tobacco rating)\b/i },
];

/**
 * What this text appears to contain that the Compliance Notes say must not be
 * stored here. A heuristic that errs toward flagging: a false alarm costs a
 * glance, a miss leaves an SSN in a CRM that was never meant to hold one.
 */
export function detectSensitive(text: string): string[] {
  return SENSITIVE_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
}

// ── MACHO ────────────────────────────────────────────────────────────────────

/** 0–5, counting only "Y". Not a compliance or eligibility decision. */
export function machoScore(m: MachoFlags): number {
  return (['m', 'a', 'c', 'h', 'o'] as const).filter((k) => m[k] === 'Y').length;
}

/** How many of the five were actually assessed. A 0 out of 0 is "not assessed", not "0". */
export function machoAssessed(m: MachoFlags): number {
  return (['m', 'a', 'c', 'h', 'o'] as const).filter((k) => m[k] !== '').length;
}

// ── Dates ────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/**
 * A calendar date ("YYYY-MM-DD") as a local-midnight instant, or NaN.
 * Only that exact shape is accepted: "12/31/2025", "TBD" and "2025-13-40" are
 * unreadable, and an unreadable date is never treated as fine (CLAUDE.md).
 */
export function parseDay(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return NaN;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return NaN;
  return date.getTime();
}

export function toDay(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Monday of the week containing `ms`, as YYYY-MM-DD. */
export function weekStartOf(ms: number): string {
  const day = startOfDay(ms);
  const dow = (new Date(day).getDay() + 6) % 7;
  return toDay(new Date(day).setDate(new Date(day).getDate() - dow));
}

export type FollowUpState = 'none' | 'unreadable' | 'overdue' | 'today' | 'this-week' | 'later';

/**
 * A follow-up date is a day on the owner's calendar, so it is read in the
 * time zone of the browser the owner is using. The server's digest uses the
 * same rule with the date this browser reports (server/src/routes/digest.ts,
 * ownerToday), so the two cannot disagree across midnight.
 */
export function followUpState(date: string, now: number): FollowUpState {
  if (!date.trim()) return 'none';
  const t = parseDay(date);
  if (Number.isNaN(t)) return 'unreadable';
  const today = startOfDay(now);
  if (t < today) return 'overdue';
  if (t === today) return 'today';
  if (t < today + 7 * DAY_MS) return 'this-week';
  return 'later';
}

/** Something needs doing: overdue, due, or a date nobody can read. */
export function needsFollowUp(state: FollowUpState): boolean {
  return state === 'overdue' || state === 'today' || state === 'unreadable';
}

// ── Production ratios ────────────────────────────────────────────────────────

/** A ratio with no denominator is unknown, not zero (CLAUDE.md: NaN, rendered "—"). */
export function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : NaN;
}

export interface ActivityTotals {
  attempts: number;
  conversations: number;
  appointmentsSet: number;
  referrals: number;
}

/** The workbook's "Today's Scoreboard", over whichever rows are passed in. */
export function activityTotals(rows: Pick<ActivityData, 'conversation' | 'appointmentSet' | 'referralCount'>[]): ActivityTotals {
  let conversations = 0;
  let appointmentsSet = 0;
  let referrals = 0;
  for (const r of rows) {
    if (r.conversation === 'Y') conversations++;
    if (r.appointmentSet === 'Y') appointmentsSet++;
    if (typeof r.referralCount === 'number' && Number.isFinite(r.referralCount)) referrals += r.referralCount;
  }
  return { attempts: rows.length, conversations, appointmentsSet, referrals };
}

/** Rows dated within [from, to), both YYYY-MM-DD. Rows with an unreadable date are excluded and counted. */
export function inRange<T extends { date: string }>(rows: T[], from: string, to: string): { rows: T[]; undated: number } {
  const lo = parseDay(from);
  const hi = parseDay(to);
  let undated = 0;
  const out: T[] = [];
  for (const r of rows) {
    const t = parseDay(r.date);
    if (Number.isNaN(t)) undated++;
    else if (t >= lo && t < hi) out.push(r);
  }
  return { rows: out, undated };
}

export interface Bottleneck {
  stage: string;
  actual: number;
  target: number;
}

/**
 * The first production stage below its target, in funnel order -- the one to
 * coach. Null when every stage meets target, or when nothing has been logged
 * (no data is not a bottleneck, it is no data).
 */
export function firstBottleneck(t: ActivityTotals, targets: { dials: number; conversations: number; appointments: number }): Bottleneck | null {
  if (t.attempts === 0) return null;
  const stages: Bottleneck[] = [
    { stage: 'Dials', actual: t.attempts, target: targets.dials },
    { stage: 'Conversations', actual: t.conversations, target: targets.conversations },
    { stage: 'Appointments Set', actual: t.appointmentsSet, target: targets.appointments },
  ];
  return stages.find((s) => s.actual < s.target) ?? null;
}

/** Count rows per value of `key`, in the order of `values`, plus anything off-list. */
export function countBy<T>(rows: T[], key: (r: T) => string, values: readonly string[]): { label: string; count: number }[] {
  const counts = new Map<string, number>(values.map((v) => [v, 0]));
  for (const r of rows) {
    const k = key(r) || '(blank)';
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

// ── Formatting ───────────────────────────────────────────────────────────────

export function fmtPct(n: number): string {
  return Number.isFinite(n) ? `${Math.round(n * 100)}%` : '—';
}

export function fmtCount(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

export function yn(v: YesNo): string {
  return v === '' ? '—' : v;
}
