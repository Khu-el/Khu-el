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
import { canClear } from '../../core/types'
import { Panel, RecordRow, Meter, Flag, ProofForm } from '../../ui/components'
import { load, save } from '../../core/storage'
import seed from '../../../seed/compliance.json'

interface ComplianceData {
  conditions: ConditionPrecedent[]
  remediation: ControlledRecord[]
  documents: ControlledRecord[]
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

  return (
    <>
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
              {c.aliases.length > 0 && (
                <span className="record__rev">
                  also {c.aliases.join(' · ')}
                </span>
              )}
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
              {c.aliases.length > 0 && (
                <span className="record__rev">also {c.aliases.join(' · ')}</span>
              )}
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
    { id: 'critical', kind: 'gate', title: 'Critical conditions', purpose: 'The seven.' },
    { id: 'all', kind: 'gate', title: 'All conditions', purpose: 'Reconciled register.' },
    { id: 'remediation', kind: 'register', title: 'Remediation', purpose: 'R-01..R-06.' },
    { id: 'gate', kind: 'meter', title: 'Release gate', purpose: 'Point 8 position.' },
  ],
  Component: ComplianceModule,
}

export default definition
