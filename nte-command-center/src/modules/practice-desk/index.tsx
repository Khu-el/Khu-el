/*
 * Module 06 · Practice Desk
 *
 * The desk: team, production, recruiting, pipeline. Built before the rest of
 * the enterprise modules because it is the only surface whose separation
 * failure is visible from outside, and because the outside business activity
 * question at the bottom of this file is the cheapest open item on the whole
 * working list to close.
 *
 * Everything here is written in plain business language, including this
 * comment, including every variable name, including every key in
 * seed/practice-desk.json. Comments end up in the bundle, and a term that is
 * not supposed to exist on this desk does not get to exist in a comment
 * either. The palette this surface uses is its own — slate and teal, defined
 * as its own token block, sharing no accent value with any other surface.
 *
 * Shape copied from module 01: seed as data, storage for state, a Reset to
 * seed control. What it does not copy is the document-control strip — no
 * document codes in the enterprise format, no seal, no nine-point strip. A
 * record here is a business record.
 */

import React, { useState } from 'react'
import type { ModuleDefinition, Proof, Surface } from '../../core/types'
import { Panel, Empty, Flag, ProofForm, ProofLine } from '../../ui/components'
import { load, save } from '../../core/storage'
import seed from '../../../seed/practice-desk.json'

interface AgendaItem {
  id: string
  title: string
  collects: string
}

interface Member {
  id: string
  name: string
  licensing: string
  started: string
}

interface Stage {
  position: number
  name: string | null
  prompts: string | null
}

interface Asset {
  id: string
  title: string
  what: string
  status: string
  note?: string
}

interface DeskData {
  standup: {
    cadence: string
    lastRun: string
    agenda: AgendaItem[]
    members: Member[]
  }
  funnel: {
    title: string
    stageLabelsSource: string
    note: string
    stages: Stage[]
  }
  warmMarket: Asset[]
  outsideActivity: {
    id: string
    question: string
    state: string
    blocks: string
    why: string
    letter: { title: string; status: string; note: string }
    proof: Proof | null
  }
}

const KEY = 'practice-desk'
const SEED = seed as unknown as DeskData

function DeskModule({ surface }: { surface: Surface }) {
  const [data, setData] = useState<DeskData>(() => load<DeskData>(KEY, SEED))
  const [recording, setRecording] = useState(false)

  const update = (next: DeskData) => {
    save(KEY, next)
    setData(next)
  }

  const submitted = Boolean(data.outsideActivity.proof)

  return (
    <>
      <Panel
        kind="gate"
        title="Outside business activity"
        purpose="One question. It is the single highest-leverage open item on this desk, and it is a letter."
        alert={!submitted}
      >
        <p className="record__title">{data.outsideActivity.question}</p>
        <p className="panel__purpose" style={{ marginTop: 'var(--s3)' }}>
          {data.outsideActivity.why}
        </p>
        <Flag tone={submitted ? 'permanent' : 'alert'}>
          {data.outsideActivity.blocks}
        </Flag>
        <article className="record">
          <div>
            <div className="record__title">
              {data.outsideActivity.letter.title}
            </div>
            <div className="panel__purpose" style={{ margin: 0 }}>
              {data.outsideActivity.letter.note}
            </div>
          </div>
          <div className="record__meta">
            <span className="status status--draft">
              {data.outsideActivity.letter.status}
            </span>
          </div>
        </article>
        <article className="record">
          <div>
            <div className="record__title">Response on file</div>
            {data.outsideActivity.proof ? (
              <ProofLine proof={data.outsideActivity.proof} />
            ) : (
              <div className="panel__purpose" style={{ margin: 0 }}>
                Nothing recorded. This moves when a written response is
                recorded with its source, not when the letter goes out.
              </div>
            )}
          </div>
          <div className="record__meta">
            <span
              className={`status ${
                submitted ? 'status--built' : 'status--conditional'
              }`}
            >
              {submitted ? 'SUBMITTED · RESPONSE ON FILE' : data.outsideActivity.state}
            </span>
            {!submitted && (
              <button
                className="nav__item"
                onClick={() => setRecording(!recording)}
              >
                {recording ? 'Cancel' : 'Record the response'}
              </button>
            )}
          </div>
        </article>
        {recording && !submitted && (
          <ProofForm
            label="Record the written response"
            onSubmit={(proof) => {
              update({
                ...data,
                outsideActivity: { ...data.outsideActivity, proof },
              })
              setRecording(false)
            }}
          />
        )}
      </Panel>

      <Panel
        kind="board"
        title="Team standup"
        purpose={`${data.standup.cadence} · last run ${data.standup.lastRun}. Five sections, same order every week.`}
      >
        {data.standup.agenda.map((item) => (
          <article className="record" key={item.id}>
            <div>
              <div className="record__title">{item.title}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                {item.collects}
              </div>
            </div>
          </article>
        ))}
        {data.standup.members.length === 0 ? (
          <Empty title="No roster loaded">
            <p>
              The desk roster is not in this workspace. It ships empty rather
              than filled with placeholder people — a made-up roster reads like
              a working desk and would be worse than a blank one.
            </p>
            <p>
              Drop the roster in and the production columns above fill in with
              it.
            </p>
          </Empty>
        ) : (
          data.standup.members.map((m) => (
            <article className="record" key={m.id}>
              <div>
                <div className="record__title">{m.name}</div>
                <div className="panel__purpose" style={{ margin: 0 }}>
                  {m.licensing} · started {m.started}
                </div>
              </div>
            </article>
          ))
        )}
      </Panel>

      <Panel
        kind="board"
        title={data.funnel.title}
        purpose="Seven stages, in order, with the prompts that belong to each one."
      >
        <Flag>{data.funnel.note}</Flag>
        {data.funnel.stages.map((stage) => (
          <article className="record" key={stage.position}>
            <div>
              <div className="record__title">
                Stage {stage.position}
                {stage.name ? ` · ${stage.name}` : ''}
              </div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                {stage.prompts ?? 'Prompts awaiting source'}
              </div>
            </div>
            <div className="record__meta">
              <span
                className={`status ${
                  stage.name ? 'status--draft' : 'status--unknown'
                }`}
              >
                {stage.name ? 'LOADED' : 'AWAITING SOURCE'}
              </span>
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="register"
        title="Warm-market assets"
        purpose="The three things the first ninety days actually run on."
      >
        {data.warmMarket.map((asset) => (
          <article className="record" key={asset.id}>
            <div>
              <div className="record__title">{asset.title}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                {asset.what}
              </div>
              {asset.note && <Flag tone="permanent">{asset.note}</Flag>}
            </div>
            <div className="record__meta">
              <span
                className={`status ${
                  asset.status === 'UNKNOWN' ? 'status--unknown' : 'status--draft'
                }`}
              >
                {asset.status}
              </span>
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
  id: 'practice-desk',
  ordinal: '06',
  title: 'Practice Desk',
  eyebrow: 'Team and pipeline',
  surfaces: ['practice'],
  buildWork: false,
  panels: [
    { id: 'outside-activity', kind: 'gate', title: 'Outside business activity', purpose: 'One question.' },
    { id: 'standup', kind: 'board', title: 'Team standup', purpose: 'Weekly, five sections.' },
    { id: 'funnel', kind: 'board', title: 'Recruiting funnel', purpose: 'Seven stages.' },
    { id: 'warm-market', kind: 'register', title: 'Warm-market assets', purpose: 'List, scripts, tracker.' },
  ],
  Component: DeskModule,
}

export default definition
