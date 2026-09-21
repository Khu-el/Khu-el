/**
 * Module 11 · Knowledge Base & Canon
 *
 * Shape copied from module 01. The constraint here is unusual: most of it is
 * about what this file does NOT contain.
 *
 * Quarantined material may be listed and never opened, previewed, excerpted,
 * copied or downloaded. So the quarantine rows below carry a title, an
 * exclusion reference and a reason, and no control of any kind. There is no
 * href, no button, no expandable body, no title attribute holding the content,
 * and no field in the seed that could hold it. The affordance is the leak; not
 * having one is the whole mechanism.
 *
 * Recovery actions are attached to the three-step doctrine pass, and the
 * controls are disabled until all three carry proof. A recovery action with no
 * gate attached is a failed implementation.
 */

import React, { useState } from 'react'
import type { ModuleDefinition, Proof, Surface } from '../../core/types'
import { Panel, Flag, ProofForm, ProofLine } from '../../ui/components'
import { hasShape, load, save } from '../../core/storage'
import seed from '../../../seed/knowledge-canon.json'

interface Instrument {
  id: string
  title: string | null
  fileId: string | null
  classification: string
}

interface QuarantineRow {
  id: string
  title: string
  exclusion: string
  why: string
}

interface PassStep {
  n: number
  id: string
  title: string
  test: string
  passed: boolean
  proof: Proof | null
}

interface CanonData {
  canon: {
    domains: { domain: string; system: string }[]
    instrumentCount: number
    instruments: Instrument[]
    note: string
  }
  supersession: {
    id: string
    classification: string
    entry: string
    date: string
  }[]
  classifications: string[]
  quarantine: QuarantineRow[]
  quarantineRule: string
  doctrinePass: {
    steps: PassStep[]
    rule: string
    actions: { id: string; title: string; performed?: Proof | null }[]
  }
  missing: { id: string; title: string; heldBy: string; state: string }[]
  missingRule: string
}

const KEY = 'knowledge-canon'

/**
 * The top-level keys this module reads. A stored value missing any of them
 * would throw on first render, and the Reset control is inside this module.
 */
const SHAPE = { canon: 'object', supersession: 'array', classifications: 'array', quarantine: 'array', doctrinePass: 'object', missing: 'array' } as const
const SEED = seed as unknown as CanonData

function KnowledgeModule({ surface }: { surface: Surface }) {
  const [data, setData] = useState<CanonData>(() => load<CanonData>(KEY, SEED, (v) => hasShape(v, SHAPE)))
  const [openStep, setOpenStep] = useState<string | null>(null)
  const [recording, setRecording] = useState<string | null>(null)

  const update = (next: CanonData) => {
    save(KEY, next)
    setData(next)
  }

  const passComplete = data.doctrinePass.steps.every(
    (s) => s.passed && s.proof,
  )
  const outstanding = data.doctrinePass.steps.filter((s) => !s.proof)

  const recordAction = (id: string, proof: Proof) => {
    update({
      ...data,
      doctrinePass: {
        ...data.doctrinePass,
        actions: data.doctrinePass.actions.map((a) =>
          a.id === id ? { ...a, performed: proof } : a,
        ),
      },
    })
    setRecording(null)
  }

  const provePass = (id: string, proof: Proof) => {
    update({
      ...data,
      doctrinePass: {
        ...data.doctrinePass,
        steps: data.doctrinePass.steps.map((s) =>
          s.id === id ? { ...s, passed: true, proof } : s,
        ),
      },
    })
    setOpenStep(null)
  }

  return (
    <>
      <Panel
        kind="register"
        title="Canon manifest"
        purpose="The authoritative set by domain, and the system instruments behind it."
      >
        {data.canon.domains.map((d) => (
          <article className="record" key={d.domain}>
            <div>
              <div className="record__title">{d.domain}</div>
            </div>
            <div className="record__meta">
              <span className="status status--built">{d.system}</span>
            </div>
          </article>
        ))}
        <Flag tone="permanent">{data.canon.note}</Flag>
        {data.canon.instruments.map((i) => (
          <article className="record" key={i.id}>
            <div>
              <span className="record__code">{i.id}</span>
              <div className="record__title">
                {i.title ?? 'Title awaiting source'}
              </div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                File reference {i.fileId ?? 'awaiting source'}
              </div>
            </div>
            <div className="record__meta">
              <span className="status status--unknown">{i.classification}</span>
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="ledger"
        title="File-level supersession"
        purpose={`Four classifications: ${data.classifications.join(' · ')}. Append only.`}
      >
        {data.supersession.map((s) => (
          <article className="record" key={s.id}>
            <div>
              <span className="record__code">{s.id}</span>
              <span className="record__rev">{s.classification}</span>
              <div className="record__title">{s.entry}</div>
            </div>
            <div className="record__meta">
              <span className="record__updated">{s.date}</span>
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="register"
        title="Doctrine quarantine"
        purpose={data.quarantineRule}
        alert
      >
        {data.quarantine.map((q) => (
          // Title, reference and reason. No control, no link, no expandable
          // body, no attribute carrying content. Deliberately inert.
          <article className="record" key={q.id} data-quarantined="true">
            <div>
              <span className="record__code">{q.id}</span>
              <span className="record__rev">{q.exclusion}</span>
              <div className="record__title">{q.title}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                {q.why}
              </div>
            </div>
            <div className="record__meta">
              <span className="status status--excluded">QUARANTINED</span>
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="gate"
        title="Doctrine pass"
        purpose={data.doctrinePass.rule}
        alert={!passComplete}
      >
        {data.doctrinePass.steps.map((s) => (
          <article className="record" key={s.id}>
            <div>
              <span className="record__code">{s.id}</span>
              <div className="record__title">
                Step {s.n} · {s.title}
              </div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                {s.test}
              </div>
              {s.proof && <ProofLine proof={s.proof} />}
              {openStep === s.id && !s.proof && (
                <ProofForm
                  label={`Record the ${s.title.toLowerCase()}`}
                  onSubmit={(p) => provePass(s.id, p)}
                />
              )}
            </div>
            <div className="record__meta">
              <span
                className={`status ${
                  s.proof ? 'status--built' : 'status--conditional'
                }`}
              >
                {s.proof ? 'PASSED' : 'OPEN'}
              </span>
              {!s.proof && (
                <button
                  className="nav__item"
                  onClick={() => setOpenStep(openStep === s.id ? null : s.id)}
                >
                  {openStep === s.id ? 'Cancel' : 'Record pass'}
                </button>
              )}
            </div>
          </article>
        ))}

        {/* Every recovery action lives inside this gate. There is no recovery
            control anywhere else in the module. */}
        {data.doctrinePass.actions.map((a) => (
          <article className="record" key={a.id} data-recovery-action="true">
            <div>
              <div className="record__title">{a.title}</div>
              {!passComplete && (
                <Flag>
                  Unreachable. {outstanding.length} of{' '}
                  {data.doctrinePass.steps.length} steps carry no proof
                  ({outstanding.map((s) => s.id).join(', ')}).
                </Flag>
              )}
              {a.performed ? (
                <ProofLine proof={a.performed} />
              ) : (
                passComplete &&
                recording === a.id && (
                  <ProofForm
                    label={`Record that ${a.id} was carried out`}
                    onSubmit={(proof) => recordAction(a.id, proof)}
                  />
                )
              )}
            </div>
            <div className="record__meta">
              <span
                className={`status ${
                  a.performed
                    ? 'status--built'
                    : passComplete
                      ? 'status--conditional'
                      : 'status--unknown'
                }`}
              >
                {a.performed ? 'RECORDED' : passComplete ? 'UNBLOCKED' : 'BLOCKED'}
              </span>
              {/* This console records that work happened; it does not perform
                  recovery. The control used to read "Run" with no handler, so
                  a click did nothing and an operator read that as a failed
                  run. It now opens the same proof form every other outcome in
                  this console goes through. */}
              {!a.performed && (
                <button
                  className="nav__item"
                  disabled={!passComplete}
                  aria-disabled={!passComplete}
                  title={
                    passComplete
                      ? 'Record that this recovery was carried out, with its proof'
                      : 'Blocked: the three-step doctrine pass is not complete.'
                  }
                  onClick={() =>
                    setRecording(recording === a.id ? null : a.id)
                  }
                >
                  {!passComplete
                    ? 'Blocked'
                    : recording === a.id
                      ? 'Cancel'
                      : 'Record outcome'}
                </button>
              )}
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="register"
        title="Genuinely missing evidence"
        purpose={data.missingRule}
      >
        {data.missing.map((m) => (
          <article className="record" key={m.id}>
            <div>
              <span className="record__code">{m.id}</span>
              <div className="record__title">{m.title}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                Held by {m.heldBy}. Not in any vault. It has to be requested.
              </div>
            </div>
            <div className="record__meta">
              <span className="status status--excluded">{m.state}</span>
            </div>
          </article>
        ))}
      </Panel>

      <button className="nav__item" onClick={() => update(SEED)}>
        Reset to seed
      </button>
    </>
  )
}

const definition: ModuleDefinition = {
  id: 'knowledge-canon',
  ordinal: '11',
  title: 'Knowledge & Canon',
  eyebrow: 'Source of record',
  surfaces: ['lane-a'],
  buildWork: false,
  panels: [
    { id: 'canon', kind: 'register', title: 'Canon manifest', purpose: 'The authoritative set.' },
    { id: 'supersession', kind: 'ledger', title: 'File supersession', purpose: 'Four classifications.' },
    { id: 'quarantine', kind: 'register', title: 'Quarantine', purpose: 'Listed, never opened.' },
    { id: 'pass', kind: 'gate', title: 'Doctrine pass', purpose: 'Three steps.' },
    { id: 'missing', kind: 'register', title: 'Missing evidence', purpose: 'Five items, in no vault.' },
  ],
  Component: KnowledgeModule,
}

export default definition
