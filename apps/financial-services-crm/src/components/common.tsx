import { useId } from 'react';
import { Select, TextInput } from '@nte/governance-core';
import type { FollowUpState, OutreachGate } from '../crm';
import type { Contact, YesNo } from '../types';

const pill = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border whitespace-nowrap';

export function optionsOf(values: readonly string[], blank = true) {
  return [...(blank ? [{ value: '', label: '—' }] : []), ...values.map((v) => ({ value: v, label: v }))];
}

/** A stored value not on the list is still shown, not silently replaced by the first option. */
export function EnumSelect({ value, options, onChange, blank = true, disabled }: { value: string; options: readonly string[]; onChange: (v: string) => void; blank?: boolean; disabled?: boolean }) {
  const opts = optionsOf(options, blank);
  if (value && !options.includes(value)) opts.push({ value, label: `${value} (not on list)` });
  if (disabled) return <TextInput value={value} disabled readOnly />;
  return <Select value={value} onChange={onChange} options={opts} />;
}

export function YesNoSelect({ value, onChange }: { value: YesNo; onChange: (v: YesNo) => void }) {
  return (
    <Select
      value={value}
      onChange={(v) => onChange(v as YesNo)}
      options={[
        { value: '', label: '— not answered' },
        { value: 'Y', label: 'Y' },
        { value: 'N', label: 'N' },
      ]}
    />
  );
}

export function GateBadge({ gate }: { gate: OutreachGate }) {
  if (gate === 'blocked') return <span className={`${pill} bg-rose-50 text-rose-800 border-rose-300`}>⛔ Do not contact</span>;
  if (gate === 'caution') return <span className={`${pill} bg-neutral-50 text-neutral-600 border-neutral-300 border-dashed`}>Consent not established</span>;
  return <span className={`${pill} bg-emerald-50 text-emerald-800 border-emerald-300`}>Permission on record</span>;
}

const FOLLOW_UP: Record<FollowUpState, { label: string; cls: string } | null> = {
  none: null,
  unreadable: { label: '❓ Date unreadable', cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  overdue: { label: 'Overdue', cls: 'bg-rose-50 text-rose-800 border-rose-300' },
  today: { label: 'Due today', cls: 'bg-orange-50 text-orange-800 border-orange-300' },
  'this-week': { label: 'This week', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  later: { label: 'Scheduled', cls: 'bg-white text-neutral-500 border-neutral-300' },
};

export function FollowUpBadge({ state, date }: { state: FollowUpState; date?: string }) {
  const f = FOLLOW_UP[state];
  if (!f) return <span className="text-neutral-300">—</span>;
  return (
    <span className={`${pill} ${f.cls}`} title={date}>
      {f.label}
      {date && state !== 'unreadable' ? ` · ${date}` : ''}
    </span>
  );
}

export function Flag({ children, tone = 'amber' }: { children: React.ReactNode; tone?: 'amber' | 'rose' | 'slate' }) {
  const cls = { amber: 'bg-amber-50 text-amber-800 border-amber-300', rose: 'bg-rose-50 text-rose-800 border-rose-300', slate: 'bg-slate-100 text-slate-700 border-slate-300' }[tone];
  return <span className={`${pill} ${cls}`}>{children}</span>;
}

/**
 * Type a name; an exact match against a contact links the record to it.
 * Anything else stays as unlinked free text -- a near match is never guessed.
 */
export function ContactPicker({ value, contacts, onChange }: { value: string; contacts: Contact[]; onChange: (prospect: string, contactRecordId: string) => void }) {
  const listId = useId();
  return (
    <>
      <TextInput
        list={listId}
        value={value}
        onChange={(e) => {
          const name = e.target.value;
          const match = contacts.filter((c) => c.data.displayName === name);
          onChange(name, match.length === 1 ? match[0].id : '');
        }}
      />
      <datalist id={listId}>
        {contacts.map((c) => (
          <option key={c.id} value={c.data.displayName}>
            {c.data.contactId}
          </option>
        ))}
      </datalist>
    </>
  );
}

/** A labelled count list: one neutral hue, value as text beside every bar, hover shows the exact figure. */
export function CountBars({ rows, empty = 'Nothing recorded yet.' }: { rows: { label: string; count: number }[]; empty?: string }) {
  const max = Math.max(0, ...rows.map((r) => r.count));
  const total = rows.reduce((s, r) => s + r.count, 0);
  if (total === 0) return <p className="text-sm text-neutral-400">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-2 text-sm" title={`${r.label}: ${r.count} of ${total}`}>
          <span className="truncate text-neutral-600">{r.label}</span>
          <span className="h-2 bg-neutral-100 rounded-full overflow-hidden">
            <span className="block h-full bg-neutral-700 rounded-full" style={{ width: `${max ? (r.count / max) * 100 : 0}%` }} />
          </span>
          <span className="text-right tabular-nums text-neutral-800">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}

/** Actual against a target, as a meter. Text carries the numbers; the bar is only a glance. */
export function TargetMeter({ label, actual, target }: { label: string; actual: number; target: number }) {
  const pct = target > 0 ? Math.min(1, actual / target) : 0;
  const met = actual >= target;
  return (
    <div className="rounded-lg border border-neutral-200 px-4 py-3 bg-neutral-50">
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
        <p className="text-xs text-neutral-500">{met ? '✓ target met' : `target ${target}`}</p>
      </div>
      <p className="text-xl font-semibold text-neutral-900 tabular-nums">
        {actual} <span className="text-sm font-normal text-neutral-400">/ {target}</span>
      </p>
      <div className="h-1.5 mt-1 bg-neutral-200 rounded-full overflow-hidden" title={`${actual} of ${target}`}>
        <div className={`h-full rounded-full ${met ? 'bg-emerald-600' : 'bg-neutral-700'}`} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
