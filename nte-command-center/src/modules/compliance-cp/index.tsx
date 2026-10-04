/**
 * Module 10 · Compliance & Conditions Precedent
 *
 * The second reference module. It demonstrates the one pattern module 01 does
 * not: a control that is disabled until proof exists. Four overlapping
 * numbering systems reconcile to the Q-series here, with aliases rendered
 * inline — that overlap is the known cause of a false "cleared", and this
 * panel exists to prevent it.
 */

import React, { useMemo, useState } from 'react'
import type {
  ConditionPrecedent,
  ControlledRecord,
  ModuleDefinition,
  Proof,
  Surface,
} from '../../core/types'
import { canClear, gateNoteConflict } from '../../core/types'
import { Panel, RecordRow, Meter, Flag, ProofForm } from '../../ui/components'
import { load, save } from '../../core/storage'
import seed from '../../../seed/compliance.json'

interface ChangeEntry {
  id: string
  date: string
  against: string
  entry: string
  carriedBy: string
}

interface CriticalSet {
  declared: string[]
  declaredCount: number
  declaredSplit: Record<string, number>
  resolution: {
    name: string
    resolvesTo: string
    type: string
    collision?: string
  }[]
  discrepancies: string[]
  note: string
  buildWorkCount: number
  buildWorkNote: string
}

interface ComplianceData {
  criticalSet: CriticalSet
  conditions: ConditionPrecedent[]
  remediation: ControlledRecord[]
  documents: ControlledRecord[]
  changes: ChangeEntry[]
}

const KEY = 'compliance-cp'

function ComplianceModule({ surface }: { surface: Surface }) {
  const [data, setData] = useState<ComplianceData>(() =>
    load<ComplianceData>(KEY, seed as unknown as ComplianceData),
  )
  const [open, setOpen] = useState<string | null>(null)

  const update = (next: ComplianceData) => {
    save(KEY, next)
    setData(next)
  }

  const clearCondition = (id: string, proof: Proof) => {
    update({
      ...data,
      conditions: data.conditions.map((c) =>
        c.id === id ? { ...c, proof, cleared: true } : c,
      ),
    })
    setOpen(null)
  }

  const critical = useMemo(
    () => data.conditions.filter((c) => c.critical && !c.cleared),
    [data.conditions],
  )

  // How many DRAFT documents are blocked on point 8 alone. If a document has
  // passed the other eight, the only thing standing between it and release is
  // an event ID — which is administrative, not build work.
  const eventIdOnly = useMemo(
    () =>
      data.documents.filter(
        (d) => !d.gate[7] && d.gate.filter(Boolean).length === 8,
      ).length,
    [data.documents],
  )

  const declaredResolved = new Set(
    data.criticalSet.resolution.map((r) => r.resolvesTo),
  )
  const flaggedCritical = data.conditions.filter((c) => c.critical)

  // How many documents sit at each gate position, and which notes disagree
  // with their own strip.
  const positions = useMemo(() => {
    const byPosition = new Map<number, string[]>()
    for (const d of data.documents) {
      const passed = d.gate.filter(Boolean).length
      byPosition.set(passed, [...(byPosition.get(passed) ?? []), d.docCode])
    }
    return [...byPosition.entries()].sort((a, b) => b[0] - a[0])
  }, [data.documents])

  const conflicts = useMemo(
    () =>
      data.documents.flatMap((d) => {
        const conflict = gateNoteConflict(d)
        return conflict ? [{ id: d.docCode, ...conflict }] : []
      }),
    [data.documents],
  )

  return (
    <>
      <Panel
        kind="gate"
        title="The critical set, reconciled"
        purpose={data.criticalSet.note}
        alert
      >
        {data.criticalSet.resolution.map((r) => (
          <article className="record" key={r.name}>
            <div>
              <span className="record__code">{r.name}</span>
              <span className="record__rev">resolves to {r.resolvesTo}</span>
              <div className="record__title">{r.type}</div>
              {r.collision && <Flag tone="alert">{r.collision}</Flag>}
            </div>
            <div className="record__meta">
              <span className="status status--conditional">
                {r.type.toUpperCase()}
              </span>
            </div>
          </article>
        ))}
        <Flag tone="permanent">
          {data.criticalSet.buildWorkNote} Build-work conditions in the critical
          set: {data.criticalSet.buildWorkCount}.
        </Flag>
        {data.criticalSet.discrepancies.map((d) => (
          <Flag key={d} tone="alert">
            {d}
          </Flag>
        ))}
        <article className="record">
          <div>
            <div className="record__title">
              {data.criticalSet.declaredCount} declared names ·{' '}
              {declaredResolved.size} distinct conditions ·{' '}
              {flaggedCritical.length} flagged critical in the register
            </div>
          </div>
          <div className="record__meta">
            <span className="status status--conditional">OPEN</span>
          </div>
        </article>
      </Panel>

      <Panel
        kind="gate"
        title="Critical conditions"
        purpose="The ones that gate the rest of the portfolio. Five are administrative and one is drafting. None is build work — none of these waits on the freeze."
        alert={critical.length > 0}
      >
        {critical.map((c) => (
          <article className="record" key={c.id}>
            <div>
              <span className="record__code">{c.id}</span>
              <span className="record__rev">
                {c.aliases.length > 0
                  ? `also ${c.aliases.join(' · ')}`
                  : 'no alias in the other three systems'}
              </span>
              <div className="record__title">{c.title}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                {c.type} · blocks {c.blocks.length || 'nothing recorded'}
                {c.blocks.length ? ` (${c.blocks.join(', ')})` : ''}
                {c.dependsOn.length ? ` · waits on ${c.dependsOn.join(', ')}` : ''}
              </div>
              {!canClear(c) && (
                <Flag tone="permanent">
                  Clearing needs a proof source. Authoring a letter is not
                  submitting one.
                </Flag>
              )}
              {open === c.id && (
                <ProofForm
                  label="Clear condition"
                  onSubmit={(p) => clearCondition(c.id, p)}
                />
              )}
            </div>
            <div className="record__meta">
              <span className="status status--conditional">OPEN</span>
              <button
                className="nav__item"
                onClick={() => setOpen(open === c.id ? null : c.id)}
              >
                {open === c.id ? 'Cancel' : 'Record proof'}
              </button>
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="gate"
        title="All conditions, reconciled"
        purpose="Four numbering systems in one register, aliases inline. Two rows with different numbers and the same substance is how a false clear happens."
      >
        {data.conditions.map((c) => (
          <article className="record" key={c.id}>
            <div>
              <span className="record__code">{c.id}</span>
              <span className="record__rev">
                {c.aliases.length > 0
                  ? `also ${c.aliases.join(' · ')}`
                  : 'no alias in the other three systems'}
              </span>
              <div className="record__title">{c.title}</div>
            </div>
            <div className="record__meta">
              <span
                className={`status ${
                  c.cleared ? 'status--built' : 'status--conditional'
                }`}
              >
                {c.cleared ? 'CLEARED' : 'OPEN'}
              </span>
              <span className="record__updated">{c.opened}</span>
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="register"
        title="Release remediation"
        purpose="Six items standing between the corpus and a clean release."
      >
        {data.remediation.map((r) => (
          <RecordRow key={r.id} record={r} />
        ))}
      </Panel>

      <Panel
        kind="ledger"
        title="Changes ledger"
        purpose="CL-001 onward. What changed, what it changed against, and which instrument carries it. Append only — no edit and no delete control exists here."
      >
        {data.changes.map((c) => (
          <article className="record" key={c.id}>
            <div>
              <span className="record__code">{c.id}</span>
              <span className="record__rev">against {c.against}</span>
              <div className="record__title">{c.entry}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                Carried by {c.carriedBy}
              </div>
            </div>
            <div className="record__meta">
              <span className="record__updated">{c.date}</span>
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="meter"
        title="Release gate position"
        purpose="How many drafts are blocked on the event ID alone."
      >
        <Meter
          value={eventIdOnly}
          max={Math.max(1, data.documents.length)}
          unit={`of ${data.documents.length} drafts blocked on point 8 only`}
          caption="A document at eight of nine is an administrative step from release, not a build."
        />
        {/* Without the distribution, a zero here reads as "nothing to see".
            It is a finding: no document is one step from release. */}
        <Flag tone="permanent">
          Distribution:{' '}
          {positions
            .map(
              ([passed, ids]) =>
                `${passed} of 9 — ${ids.length} document${ids.length === 1 ? '' : 's'}`,
            )
            .join(' · ')}
          .
        </Flag>
        {/* The documents themselves, which the meter counts. A gauge computed
            over rows nobody can see is a number to be taken on trust. */}
        {data.documents.map((d) => (
          <RecordRow key={d.id} record={d} />
        ))}
        {conflicts.length > 0 && (
          <Flag tone="alert">
            {conflicts.length} document{conflicts.length === 1 ? '' : 's'} carry
            a note claiming a gate position the strip does not record:{' '}
            {conflicts
              .map((c) => `${c.id} (note says ${c.claimed}, strip says ${c.actual})`)
              .join('; ')}
            . Not reconciled here — the answer is with whoever ran the gate.
          </Flag>
        )}
      </Panel>
    </>
  )
}

const definition: ModuleDefinition = {
  id: 'compliance-cp',
  ordinal: '10',
  title: 'Compliance & Conditions',
  eyebrow: 'What may be worked on',
  surfaces: ['lane-a'],
  buildWork: false,
  panels: [
    { id: 'critical-set', kind: 'gate', title: 'The critical set', purpose: 'Seven names, six conditions.' },
    { id: 'critical', kind: 'gate', title: 'Critical conditions', purpose: 'Open and blocking.' },
    { id: 'all', kind: 'gate', title: 'All conditions', purpose: 'Reconciled register.' },
    { id: 'remediation', kind: 'register', title: 'Remediation', purpose: 'R-01..R-06.' },
    { id: 'changes', kind: 'ledger', title: 'Changes ledger', purpose: 'CL-001 onward.' },
    { id: 'gate', kind: 'meter', title: 'Release gate', purpose: 'Point 8 position.' },
  ],
  Component: ComplianceModule,
}

export default definition
