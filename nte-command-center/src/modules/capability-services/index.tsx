/**
 * Module 09 · Capability & Services
 *
 * Shape copied from module 01. Two gates, both computed across the set from
 * the seed rather than decided per row:
 *
 *   - The separation protocol blocks every product it touches, and an
 *     unclassified product counts as touched. Hard-coding availability per
 *     product would drift silently the first time a product is added.
 *   - Stage five is the forecast gate. Four criteria, all of them, or the deal
 *     does not advance. The refusal names what is missing.
 *
 * Deals are the operator's to enter. Nothing here is seeded, because a
 * pipeline of invented deals is fictional revenue sitting in front of a
 * forecast gate.
 */

import React, { useMemo, useState } from 'react'
import type { ModuleDefinition, Proof, Surface } from '../../core/types'
import { Panel, Empty, Flag, ProofForm, ProofLine } from '../../ui/components'
import { load, save } from '../../core/storage'
import {
  FORECAST_CRITERIA,
  FORECAST_STAGE,
  advance,
  availability,
  blockedByProtocol,
  emptyCriteria,
  type Deal,
  type ForecastCriterion,
  type ServiceProduct,
} from './pipeline'
import seed from '../../../seed/capability-services.json'

interface CapabilityData {
  capabilityStatement: { status: string; note: string }
  products: ServiceProduct[]
  productsNote: string
  protocol: {
    id: string
    alias: string
    title: string
    why: string
    signed: boolean
    proof: Proof | null
    clauses: { n: number; text: string }[]
    clausesNote: string
  }
  exclusion: { id: string; title: string; rule: string }
  stages: { n: number; name: string | null; note?: string }[]
  stagesNote: string
  deals: Deal[]
  dealsNote: string
  playbooks: { id: string; title: string; status: string; note: string }[]
  playbooksNote: string
}

const KEY = 'capability-services'
const SEED = seed as unknown as CapabilityData

const CRITERION_LABEL: Record<ForecastCriterion, string> = {
  realProblem: 'Real problem',
  realConsequence: 'Real consequence',
  identifiedStakeholder: 'Identified stakeholder',
  scheduledNextStep: 'Scheduled next step',
}

function CapabilityModule({ surface }: { surface: Surface }) {
  const [data, setData] = useState<CapabilityData>(() =>
    load<CapabilityData>(KEY, SEED),
  )
  const [signing, setSigning] = useState(false)
  const [dealName, setDealName] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const update = (next: CapabilityData) => {
    save(KEY, next)
    setData(next)
  }

  const signed = data.protocol.signed && Boolean(data.protocol.proof)
  const blocked = useMemo(
    () => blockedByProtocol(data.products, signed),
    [data.products, signed],
  )

  const addDeal = () => {
    if (!dealName.trim()) return
    update({
      ...data,
      deals: [
        ...data.deals,
        {
          id: `D-${String(data.deals.length + 1).padStart(3, '0')}`,
          name: dealName.trim(),
          stage: 1,
          criteria: emptyCriteria(),
        },
      ],
    })
    setDealName('')
  }

  const toggleCriterion = (id: string, criterion: ForecastCriterion) => {
    update({
      ...data,
      deals: data.deals.map((d) =>
        d.id === id
          ? { ...d, criteria: { ...d.criteria, [criterion]: !d.criteria[criterion] } }
          : d,
      ),
    })
  }

  const advanceDeal = (id: string) => {
    const deal = data.deals.find((d) => d.id === id)
    if (!deal) return
    const result = advance(deal, data.stages.length)
    setMessage(result.message)
    if (result.ok) {
      update({
        ...data,
        deals: data.deals.map((d) => (d.id === id ? result.deal : d)),
      })
    }
  }

  return (
    <>
      <Panel
        kind="gate"
        title={`${data.protocol.id} · ${data.protocol.title}`}
        purpose={data.protocol.why}
        alert={!signed}
      >
        <Flag tone={signed ? 'permanent' : 'alert'}>
          {signed
            ? 'Signed with a proof on file.'
            : `Unsigned. ${blocked.length} of ${data.products.length} service products are blocked by it right now, computed across the set — not marked blocked one by one.`}
        </Flag>
        {data.protocol.clauses.map((c) => (
          <article className="record" key={c.n}>
            <div>
              <span className="record__code">Clause {c.n}</span>
              <div className="record__title">{c.text}</div>
            </div>
          </article>
        ))}
        <Flag tone="permanent">{data.protocol.clausesNote}</Flag>
        {data.protocol.proof ? (
          <ProofLine proof={data.protocol.proof} />
        ) : (
          <>
            <button className="nav__item" onClick={() => setSigning(!signing)}>
              {signing ? 'Cancel' : 'Record the signed protocol'}
            </button>
            {signing && (
              <ProofForm
                label="Record the signature"
                onSubmit={(proof) => {
                  update({
                    ...data,
                    protocol: { ...data.protocol, signed: true, proof },
                  })
                  setSigning(false)
                }}
              />
            )}
          </>
        )}
      </Panel>

      <Panel
        kind="register"
        title="Service products"
        purpose={data.productsNote}
      >
        <Flag tone="alert">
          {data.exclusion.id} · {data.exclusion.title} — {data.exclusion.rule}
        </Flag>
        {data.products.map((p) => {
          const state = availability(p, signed)
          return (
            <article className="record" key={p.id}>
              <div>
                <span className="record__code">{p.id}</span>
                <div className="record__title">
                  {p.name ?? 'Product awaiting source'}
                </div>
                <div className="panel__purpose" style={{ margin: 0 }}>
                  Ladder {p.ladderPosition ?? 'awaiting source'} · price{' '}
                  {p.price ?? 'awaiting source'} · routed to{' '}
                  {p.entityRouting ?? 'awaiting source'} · adjacency{' '}
                  {p.adjacency}
                </div>
                {state.blockedBy.map((reason) => (
                  <Flag key={reason}>{reason}</Flag>
                ))}
              </div>
              <div className="record__meta">
                <span
                  className={`status ${
                    state.available ? 'status--built' : 'status--conditional'
                  }`}
                >
                  {state.available ? 'AVAILABLE' : 'BLOCKED'}
                </span>
              </div>
            </article>
          )
        })}
      </Panel>

      <Panel
        kind="board"
        title="Pipeline"
        purpose={data.stagesNote}
      >
        {data.stages.map((s) => (
          <article className="record" key={s.n}>
            <div>
              <span className="record__code">Stage {s.n}</span>
              <div className="record__title">
                {s.name ?? 'Stage name awaiting source'}
              </div>
              {s.note && <Flag tone="permanent">{s.note}</Flag>}
            </div>
            <div className="record__meta">
              <span
                className={`status ${
                  s.n === FORECAST_STAGE ? 'status--conditional' : 'status--unknown'
                }`}
              >
                {s.n === FORECAST_STAGE ? 'FORECAST GATE' : 'AWAITING SOURCE'}
              </span>
            </div>
          </article>
        ))}

        <div style={{ display: 'flex', gap: 'var(--s2)', marginTop: 'var(--s5)' }}>
          <input
            className="nav__item"
            placeholder="Deal name"
            aria-label="Deal name"
            value={dealName}
            onChange={(e) => setDealName(e.target.value)}
          />
          <button className="nav__item" onClick={addDeal} disabled={!dealName.trim()}>
            Add deal
          </button>
        </div>
        <Flag tone="permanent">{data.dealsNote}</Flag>

        {message && (
          <p className="flag flag--alert" role="status" data-stage-message="true">
            {message}
          </p>
        )}

        {data.deals.length === 0 ? (
          <Empty title="No deals in the pipeline">
            Nothing is seeded here. Add a deal and it starts at stage one.
          </Empty>
        ) : (
          data.deals.map((d) => (
            <article className="record" key={d.id} data-deal={d.id}>
              <div>
                <span className="record__code">{d.id}</span>
                <div className="record__title">{d.name}</div>
                <div className="panel__purpose" style={{ margin: 0 }}>
                  Stage {d.stage} of {data.stages.length}
                </div>
                {d.stage === FORECAST_STAGE && (
                  <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginTop: 'var(--s2)' }}>
                    {FORECAST_CRITERIA.map((c) => (
                      <button
                        key={c}
                        className="nav__item"
                        aria-current={d.criteria[c]}
                        data-criterion={c}
                        onClick={() => toggleCriterion(d.id, c)}
                      >
                        {d.criteria[c] ? '✓ ' : ''}
                        {CRITERION_LABEL[c]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="record__meta">
                <button
                  className="nav__item"
                  data-advance={d.id}
                  onClick={() => advanceDeal(d.id)}
                >
                  Advance
                </button>
              </div>
            </article>
          ))
        )}
      </Panel>

      <Panel
        kind="register"
        title="Reference playbooks"
        purpose={data.playbooksNote}
      >
        {data.playbooks.map((p) => (
          <article className="record" key={p.id}>
            <div>
              <span className="record__code">{p.id}</span>
              <div className="record__title">{p.title}</div>
              <Flag tone="permanent">{p.note}</Flag>
            </div>
            <div className="record__meta">
              <span className="status status--unknown">REFERENCE ONLY</span>
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
  id: 'capability-services',
  ordinal: '09',
  title: 'Capability & Services',
  eyebrow: 'Client-facing work',
  surfaces: ['lane-a'],
  buildWork: true,
  panels: [
    { id: 'protocol', kind: 'gate', title: 'Separation protocol', purpose: 'Seven clauses.' },
    { id: 'products', kind: 'register', title: 'Service products', purpose: 'Ladder and routing.' },
    { id: 'pipeline', kind: 'board', title: 'Pipeline', purpose: 'Ten stages, five is the gate.' },
    { id: 'playbooks', kind: 'register', title: 'Playbooks', purpose: 'Reference only.' },
  ],
  Component: CapabilityModule,
}

export default definition
