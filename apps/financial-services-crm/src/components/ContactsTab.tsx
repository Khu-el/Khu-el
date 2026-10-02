import { useMemo, useState } from 'react';
import { Button, Card, Field, Select, TextInput } from '@nte/governance-core';
import { MACHO_LABELS } from '../data';
import {
  detectSensitive,
  followUpState,
  isContactable,
  laneQualificationGap,
  machoAssessed,
  machoScore,
  needsFollowUp,
  outreachGate,
  parseDay,
} from '../crm';
import { patchRecord } from '../store';
import {
  BUSINESS_MOTIVATIONS,
  CONSENT_STATUSES,
  CONTACT_METHODS,
  CONTACT_STATUSES,
  INTEREST_LEVELS,
  OPERATIONAL_LANES,
  PRIORITIES,
  RELATIONSHIP_TYPES,
  SOURCES,
  type Contact,
  type ContactData,
  type EntityRecord,
} from '../types';
import { EnumSelect, Flag, FollowUpBadge, GateBadge, YesNoSelect, optionsOf } from './common';

const PAGE = 50;

type Attention = '' | 'follow-up' | 'duplicates' | 'sensitive' | 'blocked' | 'not-contactable';

interface Props {
  contacts: Contact[];
  activities: EntityRecord<'activity'>[];
  duplicates: Set<string>;
  now: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onUpdate: (c: Contact) => void;
  onRemove: (id: string) => void;
  onLogAttempt: (c: Contact) => void;
  onOpenActivity: (id: string) => void;
}

export function ContactsTab({ contacts, activities, duplicates, now, selectedId, onSelect, onAdd, onUpdate, onRemove, onLogAttempt, onOpenActivity }: Props) {
  const [query, setQuery] = useState('');
  const [lane, setLane] = useState('');
  const [consent, setConsent] = useState('');
  const [status, setStatus] = useState('');
  const [attention, setAttention] = useState<Attention>('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return contacts
      .filter((c) => {
        const d = c.data;
        if (lane && d.operationalLane !== lane) return false;
        if (consent && d.consentStatus !== consent) return false;
        if (status && d.contactStatus !== status) return false;
        if (attention === 'follow-up' && !(needsFollowUp(followUpState(d.nextFollowUp, now)) && outreachGate(d) !== 'blocked')) return false;
        if (attention === 'duplicates' && !duplicates.has(c.id)) return false;
        if (attention === 'sensitive' && !d.sensitiveDataPresent) return false;
        if (attention === 'blocked' && outreachGate(d) !== 'blocked') return false;
        if (attention === 'not-contactable' && isContactable(d)) return false;
        if (!q) return true;
        return (
          [d.displayName, d.contactId, d.primaryEmail, d.company, d.jobTitle, d.notes].some((v) => v.toLowerCase().includes(q)) ||
          (digits.length >= 3 && d.allPhones.replace(/\D/g, '').includes(digits))
        );
      })
      .sort((a, b) => a.data.displayName.localeCompare(b.data.displayName));
  }, [contacts, query, lane, consent, status, attention, duplicates, now]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE, current * PAGE + PAGE);
  const selected = contacts.find((c) => c.id === selectedId) ?? null;
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(0);
  };

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] gap-4 items-start">
      <Card
        title="Contact Master"
        subtitle="Imported contacts are neutral network records. Lane, interest and consent are set on purpose, one person at a time."
        right={<Button onClick={onAdd}>+ New contact</Button>}
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
          <div className="lg:col-span-5">
            <TextInput placeholder="Search name, ID, email, phone, company, notes…" value={query} onChange={(e) => resetPage(setQuery)(e.target.value)} />
          </div>
          <Select value={lane} onChange={resetPage(setLane)} options={[{ value: '', label: 'All lanes' }, ...optionsOf(OPERATIONAL_LANES, false)]} />
          <Select value={consent} onChange={resetPage(setConsent)} options={[{ value: '', label: 'All consent' }, ...optionsOf(CONSENT_STATUSES, false)]} />
          <Select value={status} onChange={resetPage(setStatus)} options={[{ value: '', label: 'All statuses' }, ...optionsOf(CONTACT_STATUSES, false)]} />
          <div className="lg:col-span-2">
            <Select
              value={attention}
              onChange={(v) => resetPage(setAttention)(v as Attention)}
              options={[
                { value: '', label: 'Everyone' },
                { value: 'follow-up', label: 'Follow-up due / overdue' },
                { value: 'duplicates', label: 'Possible duplicates' },
                { value: 'sensitive', label: 'Sensitive data flagged' },
                { value: 'blocked', label: 'Do not contact / suppressed' },
                { value: 'not-contactable', label: 'No email or phone' },
              ]}
            />
          </div>
        </div>

        {contacts.length === 0 ? (
          <p className="text-sm text-neutral-400 py-8 text-center">No contacts yet. Import your workbook or Google Contacts export from the Import tab, or add one by hand.</p>
        ) : (
          <>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200">
                    <th className="px-3 py-2 font-medium">ID</th>
                    <th className="px-3 py-2 font-medium">Contact</th>
                    <th className="px-3 py-2 font-medium">Lane</th>
                    <th className="px-3 py-2 font-medium">Permission</th>
                    <th className="px-3 py-2 font-medium">Follow-up</th>
                    <th className="px-3 py-2 font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => {
                    const d = c.data;
                    return (
                      <tr key={c.id} onClick={() => onSelect(c.id)} className={`border-b border-neutral-100 cursor-pointer hover:bg-neutral-50 align-top ${c.id === selectedId ? 'bg-neutral-100' : ''}`}>
                        <td className="px-3 py-2 text-neutral-500 tabular-nums whitespace-nowrap">{d.contactId}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-neutral-900">{d.displayName || '(no name)'}</p>
                          <p className="text-xs text-neutral-500 truncate max-w-[18rem]">{[d.company, d.primaryPhone, d.primaryEmail].filter(Boolean).join(' · ') || 'No contact details'}</p>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-neutral-700">{d.operationalLane}</td>
                        <td className="px-3 py-2">
                          <GateBadge gate={outreachGate(d)} />
                        </td>
                        <td className="px-3 py-2">
                          <FollowUpBadge state={followUpState(d.nextFollowUp, now)} date={d.nextFollowUp} />
                        </td>
                        <td className="px-3 py-2 space-x-1 whitespace-nowrap">
                          {duplicates.has(c.id) && <Flag>Dup?</Flag>}
                          {d.sensitiveDataPresent && <Flag tone="rose">Sensitive</Flag>}
                          {d.syncStatus === 'Error' && <Flag tone="rose">Sync error</Flag>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3 text-sm text-neutral-500">
              <span>
                {filtered.length} of {contacts.length} contacts
              </span>
              {pages > 1 && (
                <span className="flex items-center gap-2">
                  <Button variant="secondary" disabled={current === 0} onClick={() => setPage(current - 1)}>
                    ‹
                  </Button>
                  Page {current + 1} / {pages}
                  <Button variant="secondary" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
                    ›
                  </Button>
                </span>
              )}
            </div>
          </>
        )}
      </Card>

      {selected ? (
        <ContactEditor
          contact={selected}
          isDuplicate={duplicates.has(selected.id)}
          history={activities.filter((a) => a.data.contactRecordId === selected.id)}
          onUpdate={onUpdate}
          onClose={() => onSelect(null)}
          onRemove={() => {
            if (window.confirm(`Delete ${selected.data.displayName || 'this contact'}? This removes the CRM record only — nothing is deleted in Google Contacts.`)) {
              onRemove(selected.id);
              onSelect(null);
            }
          }}
          onLogAttempt={() => onLogAttempt(selected)}
          onOpenActivity={onOpenActivity}
        />
      ) : (
        <div className="hidden xl:block bg-white border border-dashed border-neutral-300 rounded-xl p-10 text-center text-neutral-400 text-sm">Select a contact to qualify, schedule a follow-up, or log an attempt.</div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-neutral-100 pt-3 mt-3 first:border-0 first:pt-0 first:mt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">{title}</p>
      {children}
    </div>
  );
}

function ContactEditor({
  contact,
  isDuplicate,
  history,
  onUpdate,
  onClose,
  onRemove,
  onLogAttempt,
  onOpenActivity,
}: {
  contact: Contact;
  isDuplicate: boolean;
  history: EntityRecord<'activity'>[];
  onUpdate: (c: Contact) => void;
  onClose: () => void;
  onRemove: () => void;
  onLogAttempt: () => void;
  onOpenActivity: (id: string) => void;
}) {
  const d = contact.data;
  const set = (patch: Partial<ContactData>) => onUpdate(patchRecord(contact, patch));
  // Identity belongs to Google Contacts once a contact came from there (Data Dictionary).
  const googleOwned = d.googleResourceName !== '';
  const gate = outreachGate(d);
  const laneGap = laneQualificationGap(d);
  const sensitiveHits = detectSensitive(`${d.notes}\n${d.nextAction}`);
  const assessed = machoAssessed(d.macho);
  const text = (key: keyof ContactData, label: string, opts: { readOnly?: boolean; type?: string; hint?: string } = {}) => (
    <Field label={label} hint={opts.hint}>
      <TextInput type={opts.type} value={String(d[key] ?? '')} readOnly={opts.readOnly} disabled={opts.readOnly} onChange={(e) => set({ [key]: e.target.value } as Partial<ContactData>)} />
    </Field>
  );
  const sortedHistory = [...history].sort((a, b) => (parseDay(b.data.date) || 0) - (parseDay(a.data.date) || 0));

  return (
    <Card
      title={d.displayName || '(no name)'}
      subtitle={`${d.contactId} · ${d.source}${d.company ? ` · ${d.company}` : ''}`}
      right={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2 mb-3">
        <GateBadge gate={gate} />
        {isDuplicate && <Flag>Shares an email or phone with another contact — review, do not auto-merge</Flag>}
      </div>

      {(d.sensitiveDataPresent || sensitiveHits.length > 0) && (
        <p className="text-sm text-rose-800 bg-rose-50 border border-rose-300 rounded-md px-3 py-2 mb-3">
          {sensitiveHits.length > 0 ? `These notes look like they contain ${sensitiveHits.join(', ')}. ` : 'Marked as holding sensitive data. '}
          SSNs, bank/account details, policy numbers, medical or underwriting detail and ID images belong in company-approved systems only — remove it here and
          keep a reference in “Official CRM Ref”.
        </p>
      )}

      <div className="flex gap-2 mb-4">
        <Button onClick={onLogAttempt} disabled={gate === 'blocked'} title={gate === 'blocked' ? 'Marked do-not-contact' : undefined}>
          Log attempt
        </Button>
        <Button variant="danger" onClick={onRemove}>
          Delete
        </Button>
      </div>

      <Section title="Identity">
        {googleOwned && <p className="text-xs text-neutral-500 mb-2">Owned by Google Contacts — change it there and re-import. The CRM does not overwrite identity.</p>}
        <div className="grid sm:grid-cols-2 gap-x-3">
          {text('displayName', 'Contact', { readOnly: googleOwned })}
          {text('company', 'Company', { readOnly: googleOwned })}
          {text('firstName', 'First Name', { readOnly: googleOwned })}
          {text('lastName', 'Last Name', { readOnly: googleOwned })}
          {text('primaryPhone', 'Primary Phone', { readOnly: googleOwned })}
          {text('primaryEmail', 'Primary Email', { readOnly: googleOwned })}
          {text('jobTitle', 'Job Title', { readOnly: googleOwned })}
          {text('state', 'State')}
        </div>
        {(d.allPhones !== d.primaryPhone || d.allEmails !== d.primaryEmail) && (
          <p className="text-xs text-neutral-500">
            All phones: {d.allPhones || '—'} · All emails: {d.allEmails || '—'}
          </p>
        )}
      </Section>

      <Section title="Qualification">
        <div className="grid sm:grid-cols-2 gap-x-3">
          <Field label="Relationship Type">
            <EnumSelect value={d.relationshipType} options={RELATIONSHIP_TYPES} onChange={(v) => set({ relationshipType: v })} />
          </Field>
          <Field label="Operational Lane">
            <EnumSelect value={d.operationalLane} options={OPERATIONAL_LANES} blank={false} onChange={(v) => set({ operationalLane: v as ContactData['operationalLane'] })} />
          </Field>
          <Field label="Client Interest" hint="Only after a real conversation — never inferred from the address book.">
            <EnumSelect value={d.clientInterest} options={INTEREST_LEVELS} blank={false} onChange={(v) => set({ clientInterest: v })} />
          </Field>
          <Field label="Opportunity Interest" hint="Only after a real conversation.">
            <EnumSelect value={d.opportunityInterest} options={INTEREST_LEVELS} blank={false} onChange={(v) => set({ opportunityInterest: v })} />
          </Field>
          <Field label="Priority">
            <EnumSelect value={d.priority} options={PRIORITIES} onChange={(v) => set({ priority: v })} />
          </Field>
          <Field label="Business Motivation">
            <EnumSelect value={d.businessMotivation} options={BUSINESS_MOTIVATIONS} onChange={(v) => set({ businessMotivation: v })} />
          </Field>
        </div>
        {laneGap && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-300 rounded-md px-3 py-2 mb-3">{laneGap}</p>}
        <p className="text-sm font-medium text-neutral-700 mb-1">
          MACHO {assessed === 0 ? <span className="text-neutral-400 font-normal">— not assessed</span> : <span className="tabular-nums">{machoScore(d.macho)} / 5</span>}
          {assessed > 0 && assessed < 5 && <span className="text-neutral-400 font-normal"> ({assessed} of 5 assessed)</span>}
        </p>
        <div className="grid grid-cols-5 gap-2 mb-1">
          {MACHO_LABELS.map((m) => (
            <label key={m.key} className="text-xs text-neutral-600" title={m.meaning}>
              <span className="block font-semibold mb-1">{m.letter}</span>
              <YesNoSelect value={d.macho[m.key]} onChange={(v) => set({ macho: { ...d.macho, [m.key]: v } })} />
            </label>
          ))}
        </div>
        <p className="text-xs text-neutral-400 mb-2">{MACHO_LABELS.map((m) => `${m.letter}: ${m.meaning}`).join(' · ')}. A count, not a compliance or eligibility decision.</p>
      </Section>

      <Section title="Permission & follow-up">
        <div className="grid sm:grid-cols-2 gap-x-3">
          <Field label="Consent Status" hint="Address-book presence alone is not commercial consent.">
            <EnumSelect value={d.consentStatus} options={CONSENT_STATUSES} blank={false} onChange={(v) => set({ consentStatus: v as ContactData['consentStatus'] })} />
          </Field>
          <Field label="Contact Status">
            <EnumSelect value={d.contactStatus} options={CONTACT_STATUSES} blank={false} onChange={(v) => set({ contactStatus: v as ContactData['contactStatus'] })} />
          </Field>
          <Field label="Preferred Contact Method">
            <EnumSelect value={d.preferredContactMethod} options={CONTACT_METHODS} onChange={(v) => set({ preferredContactMethod: v })} />
          </Field>
          {text('lastContacted', 'Last Contacted', { type: 'date' })}
          {text('nextFollowUp', 'Next Follow-Up', { type: 'date', hint: 'Set only when a concrete next action exists.' })}
          {text('nextAction', 'Next Action')}
        </div>
      </Section>

      <Section title="Notes">
        <textarea
          value={d.notes}
          onChange={(e) => set({ notes: e.target.value })}
          rows={4}
          className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
          placeholder="Relationship context. No SSNs, account numbers, policy numbers, or medical detail."
        />
        <label className="flex items-center gap-2 text-sm text-neutral-700 mt-2">
          <input type="checkbox" checked={d.sensitiveDataPresent} onChange={(e) => set({ sensitiveDataPresent: e.target.checked })} />
          Sensitive data present (should normally be unchecked)
        </label>
      </Section>

      <Section title="References">
        <div className="grid sm:grid-cols-2 gap-x-3">
          <Field label="Source">
            <EnumSelect value={d.source} options={SOURCES} onChange={(v) => set({ source: v })} />
          </Field>
          {text('officialCrmRef', 'Official CRM Ref', { hint: 'A reference to the company-approved record — never a copy of it.' })}
          {text('clickUpTaskId', 'ClickUp Task ID', { hint: 'Only when a concrete action exists.' })}
          {text('clickUpTaskUrl', 'ClickUp Task URL')}
          {text('licensedProspectRef', 'Licensed Prospect Ref')}
          {text('recruitProspectRef', 'Recruit Prospect Ref')}
        </div>
      </Section>

      <Section title={`Activity (${history.length})`}>
        {sortedHistory.length === 0 ? (
          <p className="text-sm text-neutral-400">No attempts logged against this contact.</p>
        ) : (
          <ul className="text-sm divide-y divide-neutral-100">
            {sortedHistory.slice(0, 10).map((a) => (
              <li key={a.id}>
                <button className="w-full text-left py-1.5 hover:bg-neutral-50" onClick={() => onOpenActivity(a.id)}>
                  <span className="tabular-nums text-neutral-500">{a.data.date || '—'}</span> · {a.data.attemptType} · {a.data.outcome || 'no outcome'}
                  {a.data.appointmentSet === 'Y' && ' · appointment set'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {googleOwned && (
        <Section title="Sync">
          <dl className="text-xs text-neutral-500 grid grid-cols-[8rem_1fr] gap-y-1">
            <dt>Resource name</dt>
            <dd className="break-all">{d.googleResourceName}</dd>
            <dt>Google updated</dt>
            <dd>{d.googleUpdatedAt || '—'}</dd>
            <dt>Sync status</dt>
            <dd>{d.syncStatus || '—'}</dd>
            {d.syncError && (
              <>
                <dt>Sync error</dt>
                <dd className="text-rose-700">{d.syncError}</dd>
              </>
            )}
          </dl>
        </Section>
      )}
    </Card>
  );
}

