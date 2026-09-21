/**
 * Module 08 · the shared half. Imports no seed, same as module 04.
 *
 * Two rules live here in how things render rather than in what is stored:
 *
 *   - The slot meter computes against 10 and counts a task with two run times
 *     as two. The arithmetic is in ./slots.ts with its own tests.
 *   - A domain marked numbers-barred renders as a name and a cadence and
 *     nothing else. There is no branch in this file that can put a metric, a
 *     target or a count into that view, because the view never receives one.
 */

import React from 'react'
import type { Surface } from '../../core/types'
import { Panel, Empty, Flag, Meter } from '../../ui/components'
import { countSlots, type ScheduledTask } from './slots'

export interface DomainRow {
  ref: string
  name: string | null
  tool: string | null
  /** true = a name and a cadence only. No number reaches this row. */
  numbersBarred: boolean
  cadence?: string
  note?: string
}

export interface SystemOfRecord {
  domain: string
  system: string
}

export interface Collision {
  title: string
  detail: string
  consequence: string
  resolution: string
  state: string
}

export interface LifeopsView {
  note: string
  systems: SystemOfRecord[]
  systemsNote: string
  domains: DomainRow[]
  domainsNote: string
  cadences: string[]
  tasks: ScheduledTask[]
  tasksNote: string
  collision: Collision
}

/**
 * A domain that bars numbers renders through here and nowhere else.
 *
 * It receives a name and a cadence as its only inputs. Health, training and
 * nutrition detail stays out of this console entirely, so there is no shape in
 * which a figure could arrive and be rendered by accident.
 */
function BarredDomain({ name, cadence }: { name: string; cadence: string }) {
  return (
    <article className="record" data-numbers-barred="true">
      <div>
        <div className="record__title">{name}</div>
        <div className="panel__purpose" style={{ margin: 0 }}>
          {cadence}
        </div>
      </div>
    </article>
  )
}

export function Lifeops({
  view,
  surface,
}: {
  view: LifeopsView
  surface: Surface
}) {
  const slots = countSlots(view.tasks)

  return (
    <>
      <Panel
        kind="board"
        title="Domains and their system of record"
        purpose={view.systemsNote}
      >
        <Flag tone="permanent">{view.note}</Flag>
        {view.systems.map((s) => (
          <article className="record" key={s.domain}>
            <div>
              <div className="record__title">{s.domain}</div>
            </div>
            <div className="record__meta">
              <span className="status status--built">{s.system}</span>
            </div>
          </article>
        ))}

        <p className="panel__purpose" style={{ marginTop: 'var(--s5)' }}>
          {view.domainsNote}
        </p>
        {view.domains.map((d) =>
          d.numbersBarred && d.name ? (
            <BarredDomain
              key={d.ref}
              name={d.name}
              cadence={d.cadence ?? 'cadence awaiting source'}
            />
          ) : (
            <article className="record" key={d.ref}>
              <div>
                <span className="record__code">{d.ref}</span>
                <div className="record__title">
                  {d.name ?? 'Domain awaiting source'}
                </div>
                <div className="panel__purpose" style={{ margin: 0 }}>
                  Tool {d.tool ?? 'awaiting source'}
                </div>
              </div>
              <div className="record__meta">
                <span
                  className={`status ${
                    d.name ? 'status--draft' : 'status--unknown'
                  }`}
                >
                  {d.name ? 'NAMED' : 'AWAITING SOURCE'}
                </span>
              </div>
            </article>
          ),
        )}
      </Panel>

      <Panel
        kind="board"
        title="Cadence"
        purpose="Standing tasks by how often they run, with their run times and the surface that owns them."
      >
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
          {view.cadences.map((c) => (
            <span key={c} className="status status--draft">
              {c}
            </span>
          ))}
        </div>
        {view.tasks.length === 0 ? (
          <Empty title="No standing tasks recorded">
            Nothing is scheduled here yet.
          </Empty>
        ) : (
          view.tasks.map((t) => (
            <article className="record" key={t.id}>
              <div>
                <span className="record__code">{t.id}</span>
                <div className="record__title">
                  {t.title ?? 'Awaiting source'}
                </div>
                <div className="panel__purpose" style={{ margin: 0 }}>
                  {t.cadence ?? 'Cadence awaiting source'} ·{' '}
                  {t.runTimes === null
                    ? 'run times awaiting source'
                    : `${t.runTimes.length} run time${t.runTimes.length === 1 ? '' : 's'} · ${t.runTimes.join(', ')}`}{' '}
                  · owned by {t.owningSurface ?? 'awaiting source'}
                </div>
              </div>
              <div className="record__meta">
                <span className="status status--unknown">AWAITING SOURCE</span>
              </div>
            </article>
          ))
        )}
        <Flag>{view.tasksNote}</Flag>
      </Panel>

      <Panel
        kind="meter"
        title="Scheduled-task slots"
        purpose="The ceiling is ten. A task with two run times consumes two slots, so the register can be over capacity with fewer rows than slots."
        alert={slots.overCapacity}
      >
        <Meter
          value={slots.consumed}
          max={Math.max(slots.ceiling, slots.consumed)}
          threshold={slots.ceiling}
          unit={`slots consumed of ${slots.ceiling}`}
          caption={
            slots.overCapacity
              ? `Over capacity by ${slots.overBy}. The register stays over until it is trimmed — the ceiling does not move.`
              : 'Within capacity.'
          }
        />
        {slots.assumedSingle.length > 0 && (
          <Flag>
            {slots.assumedSingle.length} tasks have no run times in this
            workspace and are counted as one slot each — the least they could
            consume. The true figure is at least {slots.consumed} and cannot be
            lower.
          </Flag>
        )}
      </Panel>

      <Panel
        kind="gate"
        title="Naming collision"
        purpose={view.collision.title}
        alert={view.collision.state === 'OPEN'}
      >
        <p className="panel__purpose">{view.collision.detail}</p>
        <Flag tone="alert">{view.collision.consequence}</Flag>
        <Flag tone="permanent">{view.collision.resolution}</Flag>
        <article className="record">
          <div>
            <div className="record__title">Renaming decision</div>
          </div>
          <div className="record__meta">
            <span className="status status--conditional">
              {view.collision.state}
            </span>
          </div>
        </article>
      </Panel>

      <p className="panel__purpose">
        Instance: {surface}. Its data comes from one seed file and this
        component never sees the other.
      </p>
    </>
  )
}
