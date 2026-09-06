/**
 * Module 01 · Governance & Infrastructure
 *
 * REFERENCE IMPLEMENTATION. Every other module copies this shape:
 *   - seed imported as data, never hard-coded in the component
 *   - state through storage.load / storage.save, namespaced by surface
 *   - controlled records rendered through <RecordRow>, never bespoke markup
 *   - a Reset to seed control
 *   - buildWork: false, because governance is never build work
 *
 * Do not invent a second shape.
 */

import React, { useMemo, useState } from 'react'
import type { ModuleDefinition, ControlledRecord, Surface } from '../../core/types'
import { Panel, RecordRow, Empty, Flag } from '../../ui/components'
import { load, save } from '../../core/storage'
import seed from '../../../seed/governance.json'

interface Entity {
  code: string
  name: string
  nameStatus: 'CONFIRMED' | 'PROVISIONAL'
  role: string
  note?: string
}

interface Licence {
  id: string
  from: string
  to: string
  field: string
  blockedBy: string | null
  prerequisite: string | null
}

interface Exclusion {
  id: string
  title: string
}

interface LedgerEntry {
  id: string
  date: string
  entry: string
}

interface GovernanceData {
  instruments: ControlledRecord[]
  entities: Entity[]
  licences: Licence[]
  exclusions: Exclusion[]
  supersession: LedgerEntry[]
}

const KEY = 'gov-infrastructure'

function GovernanceModule({ surface }: { surface: Surface }) {
  const [data, setData] = useState<GovernanceData>(() =>
    load<GovernanceData>(KEY, seed as unknown as GovernanceData),
  )

  const reset = () => {
    const fresh = seed as unknown as GovernanceData
    save(KEY, fresh)
    setData(fresh)
  }

  // The head licence is a prerequisite of the seven sublicences, not a peer.
  // Rendering eight in a flat list is a failed implementation, so the split is
  // computed here rather than left to the seed ordering.
  const head = useMemo(
    () => data.licences.find((l) => l.prerequisite === null),
    [data.licences],
  )
  const subs = useMemo(
    () => data.licences.filter((l) => l.prerequisite !== null),
    [data.licences],
  )

  return (
    <>
      <Panel
        kind="register"
        title="Controlling instruments"
        purpose="What governs today, at what revision, and how far each one has moved through the release gate."
      >
        {data.instruments.map((r) => (
          <RecordRow key={r.id} record={r} />
        ))}
      </Panel>

      <Panel
        kind="register"
        title="Entity and capacity"
        purpose="Which entity names are settled and which are still provisional. Any instrument using a superseded name fails the release gate on that ground alone."
      >
        {data.entities.map((e) => (
          <article className="record" key={e.code}>
            <div>
              <span className="record__code">{e.code}</span>
              <div className="record__title">{e.name}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                {e.role}
              </div>
              {e.note && <Flag>{e.note}</Flag>}
            </div>
            <div className="record__meta">
              <span
                className={`status ${
                  e.nameStatus === 'CONFIRMED'
                    ? 'status--built'
                    : 'status--conditional'
                }`}
              >
                {e.nameStatus}
              </span>
            </div>
          </article>
        ))}
        <Flag tone="permanent">
          The three-capacity protocol traces to course material, not to trust
          law, and is retired. No instrument issues in an executor capacity.
        </Flag>
      </Panel>

      <Panel
        kind="gate"
        title="Licence chain"
        purpose="Eight instruments, not seven. The head licence must precede the sublicences or all seven are defective at the root."
      >
        {head ? (
          <>
            <article className="record">
              <div>
                <span className="record__code">{head.id}</span>
                <div className="record__title">
                  Head licence · {head.from} → {head.to}
                </div>
                <div className="panel__purpose" style={{ margin: 0 }}>
                  {head.field}
                </div>
              </div>
              <div className="record__meta">
                <span className="status status--conditional">PREREQUISITE</span>
              </div>
            </article>
            <div style={{ paddingLeft: 'var(--s5)' }}>
              {subs.map((l) => (
                <article className="record" key={l.id}>
                  <div>
                    <span className="record__code">{l.id}</span>
                    <div className="record__title">
                      {l.from} → {l.to}
                    </div>
                    <div className="panel__purpose" style={{ margin: 0 }}>
                      {l.field}
                    </div>
                    {l.blockedBy && <Flag>Blocked on {l.blockedBy}</Flag>}
                  </div>
                  <div className="record__meta">
                    <span
                      className={`status ${
                        l.blockedBy ? 'status--conditional' : 'status--draft'
                      }`}
                    >
                      {l.blockedBy ? 'BLOCKED' : 'CLEAR TO DRAFT'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <Empty title="No head licence recorded">
            Seven sublicences cannot be drafted until the head licence exists.
            Add it to the seed before working this panel.
          </Empty>
        )}
      </Panel>

      <Panel
        kind="ledger"
        title="Supersession"
        purpose="What replaced what, and when. Append only — there is no edit or delete control here by design."
      >
        {data.supersession.map((e) => (
          <article className="record" key={e.id}>
            <div>
              <span className="record__code">{e.id}</span>
              <div className="record__title">{e.entry}</div>
            </div>
            <div className="record__meta">
              <span className="record__updated">{e.date}</span>
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="register"
        title="Excluded register"
        purpose="Permanently visible so these do not get reinvented. Read only; there is no dismiss."
      >
        {data.exclusions.map((x) => (
          <article className="record" key={x.id}>
            <div>
              <span className="record__code">{x.id}</span>
              <div className="record__title">{x.title}</div>
            </div>
            <div className="record__meta">
              <span className="status status--excluded">EXCLUDED</span>
            </div>
          </article>
        ))}
      </Panel>

      <button className="nav__item" onClick={reset}>
        Reset to seed
      </button>
    </>
  )
}

const definition: ModuleDefinition = {
  id: 'gov-infrastructure',
  ordinal: '01',
  title: 'Governance & Infrastructure',
  eyebrow: 'Control layer',
  surfaces: ['lane-a'],
  buildWork: false,
  panels: [
    {
      id: 'instruments',
      kind: 'register',
      title: 'Controlling instruments',
      purpose: 'What governs today.',
    },
    {
      id: 'entities',
      kind: 'register',
      title: 'Entity and capacity',
      purpose: 'Settled versus provisional names.',
    },
    {
      id: 'licences',
      kind: 'gate',
      title: 'Licence chain',
      purpose: 'Head licence and seven sublicences.',
    },
    {
      id: 'supersession',
      kind: 'ledger',
      title: 'Supersession',
      purpose: 'What replaced what.',
    },
    {
      id: 'exclusions',
      kind: 'register',
      title: 'Excluded register',
      purpose: 'Permanently closed lines.',
    },
  ],
  Component: GovernanceModule,
}

export default definition
