import { Card, Stat } from '@nte/governance-core';
import { DAILY_TARGETS } from '../data';
import {
  activityTotals,
  countBy,
  firstBottleneck,
  fmtCount,
  fmtPct,
  followUpState,
  inRange,
  isContactable,
  needsFollowUp,
  outreachGate,
  parseDay,
  ratio,
  toDay,
  weekStartOf,
} from '../crm';
import {
  CONSENT_STATUSES,
  CONTACT_STATUSES,
  LICENSING_STATUSES,
  OPERATIONAL_LANES,
  RECRUITING_STATUSES,
  TRAINING_STAGES,
  type Contact,
  type EntityRecord,
} from '../types';
import { CountBars, FollowUpBadge, TargetMeter } from './common';

interface Props {
  contacts: Contact[];
  activities: EntityRecord<'activity'>[];
  appointments: EntityRecord<'appointment'>[];
  recruits: EntityRecord<'recruit'>[];
  licensing: EntityRecord<'licensing'>[];
  training: EntityRecord<'training'>[];
  referrals: EntityRecord<'referral'>[];
  duplicates: Set<string>;
  now: number;
  onOpenContact: (id: string) => void;
}

const DAY = 86_400_000;

export function CommandCenter({ contacts, activities, appointments, recruits, licensing, training, referrals, duplicates, now, onOpenContact }: Props) {
  const today = toDay(now);
  const tomorrow = toDay(now + DAY);
  const week = weekStartOf(now);
  // +1h absorbs a daylight-saving shift; toDay() reads the local calendar date.
  const nextWeek = toDay(parseDay(week) + 7 * DAY + 3_600_000);

  const acts = activities.map((a) => a.data);
  const todayRows = inRange(acts, today, tomorrow);
  const weekRows = inRange(acts, week, nextWeek);
  const t = activityTotals(todayRows.rows);
  const w = activityTotals(weekRows.rows);
  const all = activityTotals(acts);
  const bottleneck = firstBottleneck(t, DAILY_TARGETS);

  const cd = contacts.map((c) => c.data);
  const queue = contacts
    .map((c) => ({ c, state: followUpState(c.data.nextFollowUp, now) }))
    .filter(({ c, state }) => needsFollowUp(state) && outreachGate(c.data) !== 'blocked')
    .sort((a, b) => a.c.data.nextFollowUp.localeCompare(b.c.data.nextFollowUp));
  const unreadableFollowUps = cd.filter((d) => followUpState(d.nextFollowUp, now) === 'unreadable').length;
  const upcomingAppts = appointments.filter((a) => ['this-week', 'today'].includes(followUpState(a.data.appointmentDate, now)) && a.data.status !== 'Held' && a.data.status !== 'No Show');
  const referralFollowUps = referrals.filter((r) => needsFollowUp(followUpState(r.data.followUpDate, now)) && r.data.status !== 'Closed' && r.data.status !== 'Completed');

  return (
    <div className="space-y-4">
      <Card title="Today’s scoreboard" subtitle={`${today} · daily production standard: ${DAILY_TARGETS.dials} dials, ${DAILY_TARGETS.conversations} conversations, ${DAILY_TARGETS.appointments} appointments in a ${DAILY_TARGETS.sprint} sprint`}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <TargetMeter label="Dials / attempts" actual={t.attempts} target={DAILY_TARGETS.dials} />
          <TargetMeter label="Conversations" actual={t.conversations} target={DAILY_TARGETS.conversations} />
          <TargetMeter label="Appointments set" actual={t.appointmentsSet} target={DAILY_TARGETS.appointments} />
          <Stat label="Referrals captured" value={fmtCount(t.referrals)} sub="from today’s log" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-3">
          <Stat label="Dials → conversations" value={fmtPct(ratio(t.conversations, t.attempts))} sub={`week: ${fmtPct(ratio(w.conversations, w.attempts))}`} />
          <Stat label="Conversations → sets" value={fmtPct(ratio(t.appointmentsSet, t.conversations))} sub={`week: ${fmtPct(ratio(w.appointmentsSet, w.conversations))}`} />
          <Stat label="Dials → sets" value={fmtPct(ratio(t.appointmentsSet, t.attempts))} sub={`week: ${fmtPct(ratio(w.appointmentsSet, w.attempts))}`} />
        </div>
        <p className="text-sm mt-3 text-neutral-700">
          <span className="font-medium">Bottleneck check: </span>
          {t.attempts === 0
            ? 'Nothing logged today yet — no bottleneck to read.'
            : bottleneck
              ? `${bottleneck.stage} (${bottleneck.actual} of ${bottleneck.target}). Coach this stage first.`
              : 'Every stage is at or above target today.'}
        </p>
        <p className="text-xs text-neutral-400 mt-1">
          This week: {w.attempts} attempts · {w.conversations} conversations · {w.appointmentsSet} sets · {w.referrals} referrals. All time: {all.attempts} attempts logged.
          {todayRows.undated + weekRows.undated > 0 && ' Some rows have no readable date and are not counted in today/this week.'}
        </p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Follow-up queue" subtitle="Due today, overdue, or with a date nobody can read. Do-not-contact records are never listed.">
          {queue.length === 0 ? (
            <p className="text-sm text-neutral-400">No contact follow-ups due.</p>
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {queue.slice(0, 12).map(({ c, state }) => (
                <li key={c.id}>
                  <button className="w-full flex items-center justify-between gap-3 py-2 text-left hover:bg-neutral-50" onClick={() => onOpenContact(c.id)}>
                    <span className="min-w-0">
                      <span className="font-medium text-neutral-900">{c.data.displayName}</span>
                      <span className="block text-xs text-neutral-500 truncate">{c.data.nextAction || 'No next action written'}</span>
                    </span>
                    <FollowUpBadge state={state} date={c.data.nextFollowUp} />
                  </button>
                </li>
              ))}
              {queue.length > 12 && <li className="py-2 text-xs text-neutral-500">+{queue.length - 12} more — filter Contacts by “Follow-up due”.</li>}
            </ul>
          )}
          <p className="text-xs text-neutral-500 mt-3">
            {upcomingAppts.length} appointment{upcomingAppts.length === 1 ? '' : 's'} in the next 7 days · {referralFollowUps.length} referral follow-up{referralFollowUps.length === 1 ? '' : 's'} due
          </p>
        </Card>

        <Card title="Network" subtitle="What the contact master holds. Contactable means a number or email is on file — not permission to use it.">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Total contacts" value={fmtCount(cd.length)} />
            <Stat label="Contactable" value={fmtCount(cd.filter(isContactable).length)} />
            <Stat label="Consent confirmed" value={fmtCount(cd.filter((d) => d.consentStatus === 'Commercial Consent Confirmed').length)} />
            <Stat label="With email" value={fmtCount(cd.filter((d) => d.primaryEmail).length)} />
            <Stat label="With phone" value={fmtCount(cd.filter((d) => d.primaryPhone).length)} />
            <Stat label="With company" value={fmtCount(cd.filter((d) => d.company).length)} />
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card title="Qualification" subtitle="Operational lane">
          <CountBars rows={countBy(cd, (d) => d.operationalLane, OPERATIONAL_LANES)} empty="No contacts yet." />
        </Card>
        <Card title="Permission" subtitle="Consent status">
          <CountBars rows={countBy(cd, (d) => d.consentStatus, CONSENT_STATUSES)} empty="No contacts yet." />
        </Card>
        <Card title="Relationship workflow" subtitle="Contact status">
          <CountBars rows={countBy(cd, (d) => d.contactStatus, CONTACT_STATUSES)} empty="No contacts yet." />
        </Card>
      </div>

      <Card title="Data quality" subtitle="Items for a human to review. The CRM never merges or deletes on its own.">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Possible duplicates" value={fmtCount(duplicates.size)} sub="shared email/phone" />
          <Stat label="Missing email" value={fmtCount(cd.filter((d) => !d.primaryEmail).length)} />
          <Stat label="Missing phone" value={fmtCount(cd.filter((d) => !d.primaryPhone).length)} />
          <Stat label="Sensitive data flagged" value={fmtCount(cd.filter((d) => d.sensitiveDataPresent).length)} sub="should be 0" />
          <Stat label="Sync errors" value={fmtCount(cd.filter((d) => d.syncStatus === 'Error').length)} />
          <Stat label="Unreadable follow-ups" value={fmtCount(unreadableFollowUps)} />
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card title="Team funnel" subtitle="Recruiting status">
          <CountBars rows={countBy(recruits.map((r) => r.data), (d) => d.status, RECRUITING_STATUSES)} empty="No recruits tracked yet." />
        </Card>
        <Card title="Licensing pipeline" subtitle="Licensing status">
          <CountBars rows={countBy(licensing.map((r) => r.data), (d) => d.status, LICENSING_STATUSES)} empty="No associates in licensing yet." />
        </Card>
        <Card title="Field training" subtitle="Current stage">
          <CountBars rows={countBy(training.map((r) => r.data), (d) => d.currentStage, TRAINING_STAGES)} empty="No associates in field training yet." />
        </Card>
      </div>
    </div>
  );
}
