/**
 * Module 02 · Ventures & Revenue
 *
 * Shape copied from module 01. Three things this module has to get right and
 * all three are ways a number can lie:
 *
 *   - Every projection carries its scenario label. A number without one is not
 *     a projection, so the label is not optional metadata on the row — it is
 *     part of rendering the number at all.
 *   - Placeholder values are flagged and excluded from every roll-up,
 *     subtotals included. src/modules/ventures-revenue/rollup.ts does the
 *     excluding and names what it left out.
 *   - Where a plan and a model disagree the model governs and the row says so.
 *     Not averaged, not silently picked.
 *
 * The plans board is declared FreezeExempt: reading a finished plan is not
 * build work, and the spec says so. Everything else in here locks.
 */

import React, { useMemo, useState } from 'react'
import type { ModuleDefinition, Proof, Surface } from '../../core/types'
import { Panel, Empty, Flag, Meter, ProofForm, ProofLine } from '../../ui/components'
import { load, save } from '../../core/storage'
import {
  governing,
  placeholderAsProjection,
  rollUp,
  tranchesReconcile,
  type Placeholder,
  type Projection,
  type Scenario,
} from './rollup'
import seed from '../../../seed/ventures.json'

interface VentureRow {
  id: string
  class: string
  title: string | null
  group: string | null
  entity: string | null
  status: string
}

interface Plan {
  code: string
  docCode: string
  title: string
  revision: string
  phase: string
  funderAnnex: string
  blockingCp: string
  docCodeProvisional?: boolean
  note?: string
}

interface Tranche {
  id: string
  amount: number
  event: string | null
  eventRef: string | null
  proof: Proof | null
}

interface Model {
  id: string
  title: string
  tabs: number
  formulas: number
  recalcStatus: string
  scenarioSwitchCell: string
  placeholders: Placeholder[]
  placeholderNote: string
}

interface VenturesData {
  classes: { code: string; declared: number; note: string | null }[]
  groups: { id: string; name: string | null }[]
  ventures: VentureRow[]
  plans: Plan[]
  capital: { ask: number; currency: string; note: string; tranches: Tranche[] }
  models: Model[]
  projections: Projection[]
  scenarios: { id: string; label: string; status: string; note: string }[]
  classARevenue: {
    declaredCount: number
    lineCount: number
    note: string
    lines: { position: number; label: string | null; value: number | null }[]
  }
}

const KEY = 'ventures-revenue'
const SEED = seed as unknown as VenturesData

const money = (n: number, currency: string) =>
  `${n < 0 ? '(' : ''}${currency} ${Math.abs(n).toLocaleString('en-US')}${n < 0 ? ')' : ''}`

// ── Plans board — readable under the freeze ───────────────────────────────

function PlansBoard({ plans }: { plans: Plan[] }) {
  return (
    <Panel
      kind="board"
      title="Plans"
      purpose="Six plans, their phase, and the one condition each is waiting on. Reading a plan is not build work, so this panel stays open at any contact count."
    >
      {plans.map((p) => (
        <article className="record" key={p.code}>
          <div>
            <span className="record__code">{p.docCode}</span>
            {p.docCodeProvisional && (
              <span className="record__rev">code provisional</span>
            )}
            {p.revision !== 'UNKNOWN' && (
              <span className="record__rev">Rev. {p.revision}</span>
            )}
            <div className="record__title">
              {p.code} · {p.title}
            </div>
            <div className="panel__purpose" style={{ margin: 0 }}>
              Phase {p.phase} · funder annex {p.funderAnnex} · blocked on{' '}
              {p.blockingCp}
            </div>
            {p.note && <Flag tone="permanent">{p.note}</Flag>}
          </div>
          <div className="record__meta">
            <span
              className={`status ${
                p.phase === 'UNKNOWN' ? 'status--unknown' : 'status--conditional'
              }`}
            >
              {p.phase === 'UNKNOWN' ? 'UNKNOWN' : 'CONDITIONAL'}
            </span>
          </div>
        </article>
      ))}
    </Panel>
  )
}

function VenturesFrozen() {
  const data = load<VenturesData>(KEY, SEED)
  return <PlansBoard plans={data.plans} />
}

// ── The module ────────────────────────────────────────────────────────────

function VenturesModule({ surface }: { surface: Surface }) {
  const [data, setData] = useState<VenturesData>(() =>
    load<VenturesData>(KEY, SEED),
  )
  const [classFilter, setClassFilter] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [openTranche, setOpenTranche] = useState<string | null>(null)

  const update = (next: VenturesData) => {
    save(KEY, next)
    setData(next)
  }

  const visible = useMemo(
    () =>
      data.ventures.filter(
        (v) =>
          (classFilter === 'all' || v.class === classFilter) &&
          (groupFilter === 'all' || v.group === groupFilter),
      ),
    [data.ventures, classFilter, groupFilter],
  )

  // Placeholders are folded in as projections so the roll-up has to exclude
  // them by rule rather than by nobody having passed them in.
  const withPlaceholders = useMemo<Projection[]>(
    () => [
      ...data.projections,
      ...data.models.flatMap((m) =>
        m.placeholders.map((p) => placeholderAsProjection(p, m.id)),
      ),
    ],
    [data.projections, data.models],
  )

  const base = useMemo(() => rollUp(withPlaceholders, 'base'), [withPlaceholders])
  const reconciles = tranchesReconcile(data.capital.ask, data.capital.tranches)
  const proven = data.capital.tranches.filter((t) => t.proof)
  const released = proven.reduce((sum, t) => sum + t.amount, 0)

  const proveTranche = (id: string, proof: Proof) => {
    update({
      ...data,
      capital: {
        ...data.capital,
        tranches: data.capital.tranches.map((t) =>
          t.id === id ? { ...t, proof } : t,
        ),
      },
    })
    setOpenTranche(null)
  }

  return (
    <>
      <PlansBoard plans={data.plans} />

      <Panel
        kind="register"
        title="Venture register"
        purpose={`${data.ventures.length} ventures by class and group. Titles, group assignment and entity routing are not in this workspace, so the rows are slots rather than names.`}
      >
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
          <button
            className="nav__item"
            aria-current={classFilter === 'all'}
            onClick={() => setClassFilter('all')}
          >
            All classes ({data.ventures.length})
          </button>
          {data.classes.map((c) => (
            <button
              key={c.code}
              className="nav__item"
              aria-current={classFilter === c.code}
              onClick={() => setClassFilter(c.code)}
            >
              Class {c.code} ({c.declared})
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
          <button
            className="nav__item"
            aria-current={groupFilter === 'all'}
            onClick={() => setGroupFilter('all')}
          >
            All groups
          </button>
          {data.groups.map((g) => (
            <button
              key={g.id}
              className="nav__item"
              aria-current={groupFilter === g.id}
              onClick={() => setGroupFilter(g.id)}
            >
              {g.id}
              {g.name ? ` · ${g.name}` : ' · unnamed'}
            </button>
          ))}
        </div>

        {data.classes
          .filter((c) => classFilter === 'all' || c.code === classFilter)
          .map((c) => (
            <p className="panel__purpose" key={c.code} style={{ margin: 0 }}>
              {c.note ? `Class ${c.code}: ${c.note}` : ''}
            </p>
          ))}

        {visible.length === 0 ? (
          <Empty title="No ventures in this filter">
            Group membership is not in this workspace, so filtering by group
            returns nothing until it is supplied. The class filter works.
          </Empty>
        ) : (
          visible.map((v) => (
            <article className="record" key={v.id}>
              <div>
                <span className="record__code">{v.id}</span>
                <div className="record__title">
                  {v.title ?? 'Title awaiting source'}
                </div>
                <div className="panel__purpose" style={{ margin: 0 }}>
                  Class {v.class} · group {v.group ?? 'awaiting source'} ·
                  routed to {v.entity ?? 'awaiting source'}
                </div>
              </div>
              <div className="record__meta">
                <span className="status status--unknown">{v.status}</span>
              </div>
            </article>
          ))
        )}
      </Panel>

      <Panel
        kind="meter"
        title="Capital position"
        purpose={data.capital.note}
        alert={!reconciles}
      >
        <Meter
          value={released}
          max={data.capital.ask}
          threshold={data.capital.ask}
          unit={`${data.capital.currency} released of ${data.capital.ask.toLocaleString('en-US')} asked`}
          caption={
            reconciles
              ? 'The four tranches sum to the ask.'
              : 'The tranches do not sum to the ask. One of the five numbers is wrong.'
          }
        />
        {data.capital.tranches.map((t) => {
          const unnamed = t.event === null
          return (
            <article className="record" key={t.id}>
              <div>
                <span className="record__code">{t.id}</span>
                <div className="record__title">
                  {money(t.amount, data.capital.currency)}
                </div>
                <div className="panel__purpose" style={{ margin: 0 }}>
                  {t.event
                    ? `Gated on: ${t.event}${t.eventRef ? ` (${t.eventRef})` : ''}`
                    : 'No gating event named.'}
                </div>
                {unnamed && (
                  <Flag tone="alert">
                    A tranche gated on an unnamed event is not gated. Name the
                    verifiable event before this tranche is offered to anyone.
                  </Flag>
                )}
                {t.proof && <ProofLine proof={t.proof} />}
                {openTranche === t.id && !unnamed && !t.proof && (
                  <ProofForm
                    label={`Record the event for ${t.id}`}
                    onSubmit={(p) => proveTranche(t.id, p)}
                  />
                )}
              </div>
              <div className="record__meta">
                <span
                  className={`status ${
                    t.proof
                      ? 'status--built'
                      : unnamed
                        ? 'status--unknown'
                        : 'status--conditional'
                  }`}
                >
                  {t.proof ? 'RELEASED' : unnamed ? 'DEFECTIVE' : 'LOCKED'}
                </span>
                {!t.proof && (
                  <button
                    className="nav__item"
                    disabled={unnamed}
                    aria-disabled={unnamed}
                    title={
                      unnamed
                        ? 'This tranche has no named gating event to prove.'
                        : 'Record the event that unlocks this tranche'
                    }
                    onClick={() =>
                      setOpenTranche(openTranche === t.id ? null : t.id)
                    }
                  >
                    {openTranche === t.id ? 'Cancel' : 'Record event'}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </Panel>

      <Panel
        kind="register"
        title="Base-case figures"
        purpose="Every figure carries its scenario. Where the model and a plan disagree, the model governs and the row says so."
      >
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
          {data.scenarios.map((s) => (
            <span
              key={s.id}
              className={`status ${
                s.status === 'LOADED' ? 'status--built' : 'status--unknown'
              }`}
              title={s.note}
            >
              {s.label} · {s.status}
            </span>
          ))}
        </div>
        {data.projections.map((p) => {
          const g = governing(p)
          return (
            <article className="record" key={p.id}>
              <div>
                <span className="record__code">{p.model}</span>
                <span className="record__rev">scenario: {p.scenario}</span>
                <div className="record__title">{p.label}</div>
                {g.note && <Flag>{g.note}</Flag>}
              </div>
              <div className="record__meta">
                <span className="record__updated">
                  {money(g.value, data.capital.currency)}
                </span>
                <span
                  className={`status ${
                    g.disagrees ? 'status--conditional' : 'status--built'
                  }`}
                >
                  {g.disagrees ? 'MODEL GOVERNS' : p.scenario.toUpperCase()}
                </span>
              </div>
            </article>
          )
        })}
        <div className="meter__readout">
          <span>
            Base-case roll-up of {base.included.length} verified figures
          </span>
          <span>{money(base.total, data.capital.currency)}</span>
        </div>
        {base.excluded.length > 0 && (
          <Flag>
            Excluded from that total:{' '}
            {base.excluded
              .map((e) => `${e.id} (${e.value}) — ${e.reason}`)
              .join('; ')}
          </Flag>
        )}
      </Panel>

      <Panel
        kind="register"
        title="Model registry"
        purpose="Two models, their shape, their recalculation state, and the placeholder cells that must never reach a total."
      >
        {data.models.map((m) => (
          <article className="record" key={m.id}>
            <div>
              <span className="record__code">{m.id}</span>
              <div className="record__title">{m.title}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                {m.tabs} tabs · {m.formulas} formulas · recalculated{' '}
                {m.recalcStatus} · scenario switch cell {m.scenarioSwitchCell}
              </div>
              {m.placeholders.map((p) => (
                <Flag key={p.cell}>
                  {p.cell} · {p.label} · {p.value} — unverified, not a real
                  figure. Excluded from every roll-up above, subtotals included.
                </Flag>
              ))}
              <Flag tone="permanent">{m.placeholderNote}</Flag>
            </div>
            <div className="record__meta">
              <span className="status status--unknown">{m.recalcStatus}</span>
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="gate"
        title="Class A count discrepancy"
        purpose="An open item. It is not reconciled here and must not be."
        alert
      >
        <article className="record">
          <div>
            <span className="record__code">CLASS-A</span>
            <div className="record__title">
              {data.classARevenue.lineCount} entries on the near-term revenue
              line against {data.classARevenue.declaredCount} declared Class A
              ventures ·{' '}
              {data.classARevenue.lineCount - data.classARevenue.declaredCount}{' '}
              unaccounted for
            </div>
            <Flag tone="alert">{data.classARevenue.note}</Flag>
          </div>
          <div className="record__meta">
            <span className="status status--conditional">OPEN</span>
          </div>
        </article>
        {data.classARevenue.lines.map((l) => (
          <article className="record" key={l.position}>
            <div>
              <span className="record__code">line {l.position}</span>
              <div className="record__title">
                {l.label ?? 'Label awaiting source'}
              </div>
            </div>
            <div className="record__meta">
              <span className="status status--unknown">
                {l.value === null ? 'AWAITING SOURCE' : String(l.value)}
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
  id: 'ventures-revenue',
  ordinal: '02',
  title: 'Ventures & Revenue',
  eyebrow: 'What is being sold',
  surfaces: ['lane-a'],
  buildWork: true,
  panels: [
    { id: 'plans', kind: 'board', title: 'Plans', purpose: 'Six plans and their blocking condition.' },
    { id: 'ventures', kind: 'register', title: 'Venture register', purpose: '51 by class and group.' },
    { id: 'capital', kind: 'meter', title: 'Capital position', purpose: 'Ask and four tranches.' },
    { id: 'figures', kind: 'register', title: 'Base-case figures', purpose: 'Scenario-labelled projections.' },
    { id: 'models', kind: 'register', title: 'Model registry', purpose: 'Two models and their placeholders.' },
    { id: 'class-a', kind: 'gate', title: 'Class A discrepancy', purpose: 'Twelve against nine.' },
  ],
  Component: VenturesModule,
  FreezeExempt: VenturesFrozen,
}

export default definition
