import { useState } from 'react';
import { Button, Card, NumberInput, TextInput, fromInputValue, toInputValue } from '@nte/governance-core';
import { DAILY_TARGETS } from '../data';
import { activityTotals, firstBottleneck, inRange, parseDay, toDay, weekStartOf } from '../crm';
import { createRecord, patchRecord } from '../store';
import type { EntityRecord, WeeklyReviewData } from '../types';
import { emptyData } from '../defaults';

const DAY = 86_400_000;
const shift = (day: string, days: number) => toDay(parseDay(day) + days * DAY + 3_600_000);

interface Props {
  activities: EntityRecord<'activity'>[];
  appointments: EntityRecord<'appointment'>[];
  recruits: EntityRecord<'recruit'>[];
  licensing: EntityRecord<'licensing'>[];
  reviews: EntityRecord<'weekly'>[];
  now: number;
  onAdd: (r: EntityRecord<'weekly'>) => void;
  onUpdate: (r: EntityRecord<'weekly'>) => void;
}

const within = (date: string, from: string, to: string) => {
  const t = parseDay(date);
  return !Number.isNaN(t) && t >= parseDay(from) && t < parseDay(to);
};

/**
 * The workbook's Weekly Scoreboard. Dials, conversations, sets, held
 * appointments and referrals are computed from the logs -- never typed -- so the
 * review coaches what actually happened. Client apps, the bottleneck and the
 * coaching action are the human part, saved per rep per week.
 */
export function ScoreboardTab({ activities, appointments, recruits, licensing, reviews, now, onAdd, onUpdate }: Props) {
  const [week, setWeek] = useState(() => weekStartOf(now));
  const end = shift(week, 7);

  const acts = inRange(activities.map((a) => a.data), week, end).rows;
  const reps = [...new Set([...acts.map((a) => a.rep.trim()), ...appointments.filter((a) => within(a.data.appointmentDate, week, end)).map((a) => a.data.rep.trim()), ...reviews.filter((r) => r.data.weekStart === week).map((r) => r.data.rep.trim())])].sort();

  const team = {
    ibas: recruits.filter((r) => within(r.data.ibaDate, week, end)).length,
    licensingStarts: licensing.filter((l) => within(l.data.startDate, week, end)).length,
    licensed: licensing.filter((l) => within(l.data.passedDate, week, end)).length,
  };

  const reviewFor = (rep: string) => reviews.find((r) => r.data.weekStart === week && r.data.rep.trim() === rep);
  const saveReview = (rep: string, patch: Partial<WeeklyReviewData>) => {
    const existing = reviewFor(rep);
    if (existing) onUpdate(patchRecord(existing, patch));
    else onAdd(createRecord('weekly', { ...emptyData('weekly', week, week), rep, ...patch }));
  };

  return (
    <Card
      title="Weekly Scoreboard"
      subtitle="Review the team every week and coach the bottleneck. Weeks run Monday–Sunday."
      right={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setWeek(shift(week, -7))}>
            ‹
          </Button>
          <span className="text-sm tabular-nums">Week of {week}</span>
          <Button variant="secondary" onClick={() => setWeek(shift(week, 7))}>
            ›
          </Button>
        </div>
      }
    >
      <p className="text-sm text-neutral-600 mb-3">
        Team this week: <strong>{team.ibas}</strong> IBAs (Recruiting IBA dates) · <strong>{team.licensingStarts}</strong> licensing starts · <strong>{team.licensed}</strong> passed (Licensing passed dates)
      </p>
      {reps.length === 0 ? (
        <p className="text-sm text-neutral-400 py-6 text-center">No activity or appointments logged for this week.</p>
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200">
                {['Rep', 'Dials', 'Conv.', 'Sets', 'Held', 'Referrals', 'Client Apps', 'Biggest Bottleneck', 'Coach Action'].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reps.map((rep) => {
                const t = activityTotals(acts.filter((a) => a.rep.trim() === rep));
                const held = appointments.filter((a) => a.data.rep.trim() === rep && a.data.status === 'Held' && within(a.data.appointmentDate, week, end)).length;
                const weekly = { dials: DAILY_TARGETS.dials * 5, conversations: DAILY_TARGETS.conversations * 5, appointments: DAILY_TARGETS.appointments * 5 };
                const suggested = firstBottleneck(t, weekly);
                const review = reviewFor(rep)?.data;
                return (
                  <tr key={rep || '(none)'} className="border-b border-neutral-100 align-top">
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{rep || <span className="text-neutral-400">(no rep)</span>}</td>
                    <td className="px-3 py-2 tabular-nums">{t.attempts}</td>
                    <td className="px-3 py-2 tabular-nums">{t.conversations}</td>
                    <td className="px-3 py-2 tabular-nums">{t.appointmentsSet}</td>
                    <td className="px-3 py-2 tabular-nums">{held}</td>
                    <td className="px-3 py-2 tabular-nums">{t.referrals}</td>
                    <td className="px-3 py-2 w-24">
                      <NumberInput value={toInputValue(review?.clientApps)} onChange={(e) => saveReview(rep, { clientApps: fromInputValue(e.target.value) })} />
                    </td>
                    <td className="px-3 py-2 min-w-[12rem]">
                      <TextInput
                        value={review?.biggestBottleneck ?? ''}
                        placeholder={suggested ? `${suggested.stage} (${suggested.actual}/${suggested.target})` : ''}
                        onChange={(e) => saveReview(rep, { biggestBottleneck: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2 min-w-[14rem]">
                      <TextInput value={review?.coachAction ?? ''} onChange={(e) => saveReview(rep, { coachAction: e.target.value })} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-neutral-400 mt-3">
        Bottleneck placeholder compares the week against 5× the daily standard ({DAILY_TARGETS.dials * 5} dials, {DAILY_TARGETS.conversations * 5} conversations, {DAILY_TARGETS.appointments * 5} sets). It is a
        suggestion; the field holds what the coach decides.
      </p>
    </Card>
  );
}
