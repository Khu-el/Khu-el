// 30-day action plans: four weekly actions. Pure functions only.
import type { ActionPlanWeek } from '../types.ts';

export interface WeekDraft {
  week_number: 1 | 2 | 3 | 4;
  title: string;
  action_text: string;
}

/**
 * A starting structure for a four-week plan. These are prompts the member
 * edits into their own actions -- not instructions or advice.
 */
export function defaultWeeks(goal: string, pathwayTitle?: string | null): WeekDraft[] {
  const focus = pathwayTitle ? ` in ${pathwayTitle}` : '';
  const g = goal.trim() || 'your goal';
  return [
    { week_number: 1, title: 'Week 1 — Get clear', action_text: `Write down what "${g}" looks like when it is done, and list what you already have to start${focus}.` },
    { week_number: 2, title: 'Week 2 — Learn', action_text: `Complete one learning module${focus} and note one thing to try this month.` },
    { week_number: 3, title: 'Week 3 — Practice', action_text: 'Put one thing you learned into practice and record what happened.' },
    { week_number: 4, title: 'Week 4 — Review', action_text: 'Review the month: what moved, what did not, and the next step you will take.' },
  ];
}

const DAY = 86_400_000;

/** Parse YYYY-MM-DD as a calendar date (UTC noon avoids DST edges). */
export function parseDay(day: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const d = new Date(`${day}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== day ? null : d;
}

export function formatDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The inclusive date range of week n (1-4) of a plan starting on `start`. */
export function weekRange(start: string, week: number): { from: string; to: string } | null {
  const s = parseDay(start);
  if (!s || week < 1 || week > 4) return null;
  const from = new Date(s.getTime() + (week - 1) * 7 * DAY);
  const to = new Date(from.getTime() + (week === 4 ? 8 : 6) * DAY); // week 4 runs to day 30
  return { from: formatDay(from), to: formatDay(to) };
}

/** Which week (1-4) `today` falls in, 0 before the start, 5 after day 30. */
export function currentWeek(start: string, today: string): number {
  const s = parseDay(start);
  const t = parseDay(today);
  if (!s || !t) return 0;
  const days = Math.round((t.getTime() - s.getTime()) / DAY);
  if (days < 0) return 0;
  if (days >= 30) return 5;
  return Math.min(4, Math.floor(days / 7) + 1);
}

export function planProgress(weeks: Pick<ActionPlanWeek, 'completed'>[]): { done: number; total: number; percent: number } {
  const total = weeks.length;
  const done = weeks.filter((w) => w.completed).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** A local calendar day for "today" in the member's own timezone. */
export function todayIn(timeZone: string | null | undefined, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return formatDay(now);
  }
}
