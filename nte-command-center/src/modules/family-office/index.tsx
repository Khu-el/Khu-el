/**
 * Module 07 · Household & Estate
 *
 * Household surface only. Shape copied from module 01, with two behaviours
 * that are refusals rather than treatments:
 *
 *   - The commands ledger will not accept a third carry. Not a warning, not a
 *     colour, not a confirm someone clicks through — the carry does not
 *     happen and the ledger says why.
 *   - Any panel holding a youth record has export disabled at the component,
 *     and `exportRows` refuses as well. A panel that forgot to disable its
 *     button still cannot produce a file.
 *
 * There is no revenue field in this module and there is not meant to be. Value
 * reaches this side as an approved distribution; the console records that a
 * distribution was approved and does not model an amount.
 */

import React, { useState } from 'react'
import type { ModuleDefinition, Proof, Surface } from '../../core/types'
import { Panel, Flag, ProofForm, ProofLine } from '../../ui/components'
import { load, save } from '../../core/storage'
import {
  CARRY_LIMIT,
  attemptCarry,
  canExport,
  closeCommand,
  dropCommand,
  type Command,
} from './ledger'
import seed from '../../../seed/family-office.json'

interface RhythmStep {
  id: string
  title: string
  what: string
  cadence: string
  state: string
}

interface BinderRow {
  id: string
  docCode: string
  title: string
  revision: string
  status: string
  note: string
  /** Present so a youth instrument added later reaches the export guard. */
  youth?: boolean
}

interface YouthRow {
  id: string
  safeguard: string
  detail: string
  youth: boolean
}

interface HouseholdData {
  sundayRhythm: RhythmStep[]
  commands: Command[]
  commandsNote: string
  binder: BinderRow[]
  distribution: {
    rule: string
    why: string
    approvalState: string
    proof: Proof | null
  }
  youth: YouthRow[]
}

const KEY = 'family-office'
const SEED = seed as unknown as HouseholdData

/**
 * The export control.
 *
 * `disabled` is the real attribute, not a class. The label says why rather
 * than leaving someone to guess, because a control that is off for a reason
 * and a control that is broken look identical otherwise.
 */
function ExportControl({ rows }: { rows: { youth?: boolean }[] }) {
  const allowed = canExport(rows)
  return (
    <button
      className="nav__item"
      disabled={!allowed}
      aria-disabled={!allowed}
      data-export-control="true"
      title={
        allowed
          ? 'Export these rows'
          : 'Refused: this panel holds a youth record. Nothing containing one leaves this console.'
      }
      onClick={() => {
        /* Nothing here needs to guard: exportRows refuses on its own. */
      }}
    >
      {allowed ? 'Export' : 'Export disabled — youth record present'}
    </button>
  )
}

function HouseholdModule({ surface }: { surface: Surface }) {
  const [data, setData] = useState<HouseholdData>(() =>
    load<HouseholdData>(KEY, SEED),
  )
  const [message, setMessage] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)

  const update = (next: HouseholdData) => {
    save(KEY, next)
    setData(next)
  }

  const carried = data.commands.filter((c) => c.state === 'carried')

  const carry = (id: string) => {
    const result = attemptCarry(data.commands, id)
    setMessage(result.message)
    if (result.ok) update({ ...data, commands: result.commands })
  }

  return (
    <>
      <Panel
        kind="board"
        title="Sunday rhythm"
        purpose="Three steps, same order every week. Prep before bulletin, bulletin before council."
      >
        {data.sundayRhythm.map((s) => (
          <article className="record" key={s.id}>
            <div>
              <span className="record__code">{s.id}</span>
              <div className="record__title">{s.title}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                {s.what}
              </div>
            </div>
            <div className="record__meta">
              <span className="record__updated">{s.cadence}</span>
              <span className="status status--built">{s.state}</span>
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="ledger"
        title="Commands"
        purpose={`Two carried at most. A third is refused — close one or drop one on purpose. ${carried.length} of ${CARRY_LIMIT} carried now.`}
        alert={carried.length >= CARRY_LIMIT}
      >
        <Flag tone="permanent">{data.commandsNote}</Flag>
        {message && (
          <p className="flag flag--alert" role="status" data-carry-message="true">
            {message}
          </p>
        )}
        {data.commands.map((c) => (
          <article className="record" key={c.id}>
            <div>
              <span className="record__code">{c.id}</span>
              <div className="record__title">{c.title}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                Opened {c.opened} · carried {c.carries}
                {c.dropReason ? ` · dropped: ${c.dropReason}` : ''}
              </div>
            </div>
            <div className="record__meta">
              <span
                className={`status ${
                  c.state === 'closed'
                    ? 'status--built'
                    : c.state === 'carried'
                      ? 'status--conditional'
                      : c.state === 'dropped'
                        ? 'status--superseded'
                        : 'status--draft'
                }`}
              >
                {c.state.toUpperCase()}
              </span>
              {c.state === 'open' && (
                <>
                  <button className="nav__item" onClick={() => carry(c.id)}>
                    Carry
                  </button>
                  <button
                    className="nav__item"
                    onClick={() =>
                      update({ ...data, commands: closeCommand(data.commands, c.id) })
                    }
                  >
                    Close
                  </button>
                  <button
                    className="nav__item"
                    onClick={() =>
                      update({
                        ...data,
                        commands: dropCommand(
                          data.commands,
                          c.id,
                          'dropped at council, on purpose',
                        ),
                      })
                    }
                  >
                    Drop
                  </button>
                </>
              )}
              {c.state === 'carried' && (
                <button
                  className="nav__item"
                  onClick={() =>
                    update({ ...data, commands: closeCommand(data.commands, c.id) })
                  }
                >
                  Close
                </button>
              )}
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="register"
        title="Instrument binder"
        purpose="The household's own instruments, at their own revisions."
      >
        {data.binder.map((b) => (
          <article className="record" key={b.id}>
            <div>
              <span className="record__code">{b.docCode}</span>
              {b.revision !== 'UNKNOWN' && (
                <span className="record__rev">Rev. {b.revision}</span>
              )}
              <div className="record__title">{b.title}</div>
              <Flag tone="permanent">{b.note}</Flag>
            </div>
            <div className="record__meta">
              <span className="status status--unknown">{b.status}</span>
            </div>
          </article>
        ))}
        <ExportControl rows={data.binder} />
      </Panel>

      <Panel
        kind="gate"
        title="Distribution"
        purpose={data.distribution.rule}
      >
        <Flag tone="permanent">{data.distribution.why}</Flag>
        <article className="record">
          <div>
            <div className="record__title">Approval on file</div>
            {data.distribution.proof ? (
              <ProofLine proof={data.distribution.proof} />
            ) : (
              <div className="panel__purpose" style={{ margin: 0 }}>
                Nothing recorded.
              </div>
            )}
          </div>
          <div className="record__meta">
            <span
              className={`status ${
                data.distribution.proof ? 'status--built' : 'status--conditional'
              }`}
            >
              {data.distribution.proof ? 'APPROVED' : data.distribution.approvalState}
            </span>
            {!data.distribution.proof && (
              <button className="nav__item" onClick={() => setRecording(!recording)}>
                {recording ? 'Cancel' : 'Record an approval'}
              </button>
            )}
          </div>
        </article>
        {recording && !data.distribution.proof && (
          <ProofForm
            label="Record the approval"
            onSubmit={(proof) => {
              update({ ...data, distribution: { ...data.distribution, proof } })
              setRecording(false)
            }}
          />
        )}
      </Panel>

      <Panel
        kind="register"
        title="Youth safeguards"
        purpose="Read only. These govern every view in this module that names a minor."
      >
        {data.youth.map((y) => (
          <article className="record" key={y.id}>
            <div>
              <span className="record__code">{y.id}</span>
              <div className="record__title">{y.safeguard}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                {y.detail}
              </div>
            </div>
            <div className="record__meta">
              <span className="status status--built">IN FORCE</span>
            </div>
          </article>
        ))}
        <ExportControl rows={data.youth} />
      </Panel>

      <button className="nav__item" onClick={() => update(SEED)}>
        Reset to seed
      </button>
    </>
  )
}

const definition: ModuleDefinition = {
  id: 'family-office',
  ordinal: '07',
  title: 'Household & Estate',
  eyebrow: 'Sunday rhythm',
  surfaces: ['lane-b'],
  buildWork: false,
  panels: [
    { id: 'rhythm', kind: 'board', title: 'Sunday rhythm', purpose: 'Prep, bulletin, council.' },
    { id: 'commands', kind: 'ledger', title: 'Commands', purpose: 'Two carried at most.' },
    { id: 'binder', kind: 'register', title: 'Instrument binder', purpose: 'Household instruments.' },
    { id: 'distribution', kind: 'gate', title: 'Distribution', purpose: 'Approval state, no amounts.' },
    { id: 'youth', kind: 'register', title: 'Youth safeguards', purpose: 'Read only.' },
  ],
  Component: HouseholdModule,
}

export default definition
