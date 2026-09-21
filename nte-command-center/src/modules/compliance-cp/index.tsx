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
import {
  asymmetries,
  canClearCondition,
  derivedDependsOn,
  openBlockers,
  typeBreakdown,
} from './edges'
import { Panel, RecordRow, Meter, Flag, ProofForm } from '../../ui/components'
import { hasShape, load, save } from '../../core/storage'
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

/**
 * The top-level keys this module reads. A stored value missing any of them
 * would throw on first render, and the Reset control is inside this module.
 */
const SHAPE = { criticalSet: 'object', conditions: 'array', remediation: 'array', documents: 'array', changes: 'array' } as const

function ComplianceModule({ surface }: { surface: Surface }) {
  const [data, setData] = useState<ComplianceData>(() =>
    load<ComplianceData>(KEY, seed as unknown as ComplianceData, (v) => hasShape(v, SHAPE)),
  )
  const [open, setOpen] = useState<string | null>(null)
  const [refusal, setRefusal] = useState<string | null>(null)

  const update = (next: ComplianceData) => {
    save(KEY, next)
    setData(next)
  }

  const clearCondition = (id: string, proof: Proof) => {
    // Proof is necessary and not sufficient. A condition cannot clear ahead of
    // what must clear before it, or the reconciled register shows CLEARED on a
    // row whose blocker is still open.
    const decision = canClearCondition(data.conditions, id)
    if (!decision.ok) {
      setRefusal(decision.message)
      return
    }
    setRefusal(null)
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

  // Both arrays describe the same edge set from opposite ends, so the union is
  // that set. Rendering only `dependsOn` made a condition another row blocks
  // read as waiting on nothing.
  const waits = useMemo(() => derivedDependsOn(data.conditions), [data.conditions])
  const edgeAsymmetries = useMemo(
    () => asymmetries(data.conditions),
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
        purpose={`The ones that gate the rest of the portfolio: ${
          critical.length
        } open, by type ${typeBreakdown(critical)}. None is build work — none of these waits on the freeze. The declared critical set is seven names; the register flags ${
          data.conditions.filter((c) => c.critical).length
        }, which the panel above reconciles.`}
        alert={critical.length > 0}
      >
        {refusal && (
          <p className="flag flag--alert" role="status" data-clear-refusal="true">
            {refusal}
          </p>
        )}
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
                {(waits.get(c.id) ?? []).length
                  ? ` · waits on ${(waits.get(c.id) ?? []).join(', ')}`
                  : ''}
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
                disabled={openBlockers(data.conditions, c.id).length > 0}
                aria-disabled={openBlockers(data.conditions, c.id).length > 0}
                title={
                  openBlockers(data.conditions, c.id).length > 0
                    ? `Blocked: ${openBlockers(data.conditions, c.id).join(', ')} must clear first.`
                    : 'Record the proof that clears this condition'
                }
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
        {edgeAsymmetries.length > 0 && (
          <Flag tone="alert">
            {edgeAsymmetries.length} dependency edges are recorded in one
            direction only:{' '}
            {edgeAsymmetries
              .map((a) =>
                a.declaredIn === 'blocks'
                  ? `${a.from} blocks ${a.to}, which does not say it waits on ${a.from}`
                  : `${a.from} waits on ${a.to}, which does not say it blocks ${a.from}`,
              )
              .join('; ')}
            . The panel derives the edge set from both directions, so nothing
            renders as waiting on nothing — but the register disagrees with
            itself and that is not reconciled here.
          </Flag>
        )}
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
              {(waits.get(c.id) ?? []).length > 0 && (
                <div className="panel__purpose" style={{ margin: 0 }}>
                  Waits on {(waits.get(c.id) ?? []).join(', ')}
                </div>
              )}
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
