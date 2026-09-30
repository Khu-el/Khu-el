/**
 * Module 03 · Education
 *
 * Shape copied from module 01. Two things here are not negotiable and both
 * are enforced in code rather than by care:
 *
 *   - The AUTHORED provenance flag has no dismiss control anywhere in this
 *     file. Six entries carry it permanently. The UI must make it impossible
 *     to present them as recovered prior work, so there is no branch in which
 *     the flag is absent and no state that hides it.
 *   - Nothing a student or a prospect reads carries the word this state
 *     reserves. Outward-facing strings pass through `outward()`, which runs
 *     the firewall's outward-facing scan on them. Internal views may use the
 *     other word; this module's outward name is Academy.
 *
 * The twelve houses are a board. A house with nothing built in it renders the
 * specs waiting on it as rows, by name — never a generic "nothing here."
 */

import React, { useMemo, useState } from 'react'
import type { ModuleDefinition, Surface } from '../../core/types'
import { Panel, Empty, Flag, Meter } from '../../ui/components'
import { assertLane } from '../../core/lane-guard'
import { load, save } from '../../core/storage'
import seed from '../../../seed/education.json'

interface Course {
  id: string
  code: string | null
  title: string | null
  house: string | null
  level: string | null
  price: number | null
  status: string
  deliverablesFilled: number | null
  deliverableSlots: number
  blockingCp: string | null
  authored?: boolean
  productionReady?: boolean
  inoperable?: boolean
  inoperableBecause?: string
  statusAssumed?: boolean
  note?: string
}

interface House {
  numeral: string
  name: string
  builtCount: number | null
  note: string
}

interface EducationData {
  outwardName: string
  internalName: string
  namingCondition: string
  namingNote: string
  distribution: Record<string, number | string>
  courses: Course[]
  houses: House[]
  housesAtZero: {
    count: number
    which: string[] | null
    waitingSpecCount: number
    note: string
  }
  deliverables: {
    slots: number
    filled: number
    open: number
    slotsPerCourse: number
    note: string
    byType: { type: string; open: number }[]
    waves: { id: string; quarter: string | null }[]
    waveNote: string
  }
  conditions: {
    id: string
    alias: string
    title: string
    covers: string
    cleared: boolean
  }[]
  doctrineScreen: {
    run: boolean
    test: string
    consequence: string
    flagged: string[]
    note: string
  }
  amendments: {
    procedure: string[]
    note: string
    entries: {
      id: string
      title: string
      against: string
      reached: string
      entry: string
      date: string
    }[]
  }
}

const KEY = 'education-nvu'
const SEED = seed as unknown as EducationData

/**
 * Anything a student or a prospect will read goes through here.
 *
 * It runs the firewall's outward-facing scan, which blocks the word this state
 * reserves for institutions holding a commission authorisation. In development
 * a breach throws; in production it renders redacted rather than taking the
 * surface down. Either way the word does not reach a reader.
 */
function outward(text: string, surface: Surface, context: string): string {
  return assertLane(text, surface, `education-nvu/${context}`, true)
}

/** Outward-facing text, marked so it can be scanned in the rendered DOM. */
function Outward({
  children,
  surface,
  context,
}: {
  children: string
  surface: Surface
  context: string
}) {
  return <span data-outward="true">{outward(children, surface, context)}</span>
}

function courseLabel(c: Course): string {
  if (c.code && c.title) return `${c.code} · ${c.title}`
  if (c.code) return `${c.code} · title awaiting source`
  return 'Code and title awaiting source'
}

function statusClassFor(status: string): string {
  switch (status) {
    case 'BUILT':
      return 'status--built'
    case 'PARTIAL':
    case 'SPECIFIED':
      return 'status--conditional'
    default:
      return 'status--unknown'
  }
}

function CourseRow({ course }: { course: Course }) {
  return (
    <article className="record" key={course.id}>
      <div>
        <span className="record__code">{course.id}</span>
        {course.code && <span className="record__rev">{course.code}</span>}
        <div className="record__title">{courseLabel(course)}</div>
        <div className="panel__purpose" style={{ margin: 0 }}>
          House {course.house ?? 'awaiting source'} · level{' '}
          {course.level ?? 'awaiting source'} · price{' '}
          {course.price === null ? 'awaiting source' : course.price} ·
          deliverables{' '}
          {course.deliverablesFilled === null
            ? `awaiting source of ${course.deliverableSlots}`
            : `${course.deliverablesFilled}/${course.deliverableSlots}`}
          {course.blockingCp ? ` · blocked on ${course.blockingCp}` : ''}
        </div>
        {/* No dismiss, no toggle, no condition under which this is absent. */}
        {course.authored && (
          <p className="flag flag--permanent" data-permanent="authored">
            AUTHORED — written for this catalog. This is not recovered prior
            work and must never be presented as such. Permanent.
          </p>
        )}
        {course.inoperable && (
          <Flag tone="alert">
            INOPERABLE — {course.inoperableBecause}
          </Flag>
        )}
        {course.statusAssumed && (
          <Flag>
            Status is an assumption of this console, not a fact carried from the
            register.
          </Flag>
        )}
        {course.note && !course.authored && (
          <Flag tone="permanent">{course.note}</Flag>
        )}
      </div>
      <div className="record__meta">
        {course.inoperable && (
          <span className="status status--conditional">INOPERABLE</span>
        )}
        <span className={`status ${statusClassFor(course.status)}`}>
          {course.status}
        </span>
      </div>
    </article>
  )
}

function EducationModule({ surface }: { surface: Surface }) {
  const [data, setData] = useState<EducationData>(() =>
    load<EducationData>(KEY, SEED),
  )
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const update = (next: EducationData) => {
    save(KEY, next)
    setData(next)
  }

  const visible = useMemo(
    () =>
      data.courses.filter(
        (c) => statusFilter === 'all' || c.status === statusFilter,
      ),
    [data.courses, statusFilter],
  )

  const authored = data.courses.filter((c) => c.authored)
  const waiting = data.courses.filter((c) => c.productionReady)
  const emptyHouses = data.houses.filter((h) => h.builtCount === 0)

  return (
    <>
      <Panel
        kind="register"
        title="Course register"
        purpose={`${data.distribution.total} entries. ${data.distribution.note}`}
      >
        <p className="panel__purpose">
          Outward-facing name:{' '}
          <Outward surface={surface} context="outward-name">
            {data.outwardName}
          </Outward>
          . {data.namingNote} Naming condition {data.namingCondition} is open.
        </p>
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
          <button
            className="nav__item"
            aria-current={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          >
            All ({data.courses.length})
          </button>
          {['BUILT', 'PARTIAL', 'SPECIFIED', 'PLANNED'].map((s) => (
            <button
              key={s}
              className="nav__item"
              aria-current={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            >
              {s} ({data.distribution[s]})
            </button>
          ))}
        </div>
        <Flag tone="permanent">
          {authored.length} entries carry the permanent AUTHORED flag. Titles,
          house assignment, level and price are not in this workspace and are
          left empty rather than filled in — a catalog of invented course titles
          reads like something a student could buy from.
        </Flag>
        {visible.map((c) => (
          <CourseRow key={c.id} course={c} />
        ))}
      </Panel>

      <Panel
        kind="board"
        title="Houses"
        purpose="Twelve houses. A house with nothing built in it lists the specs waiting on it, by name."
      >
        <Flag>{data.housesAtZero.note}</Flag>
        {data.houses.map((h) => (
          <article className="record" key={h.numeral}>
            <div>
              <span className="record__code">{h.numeral}</span>
              <div className="record__title">
                <Outward surface={surface} context={`house-${h.numeral}`}>
                  {h.name}
                </Outward>
              </div>
              {h.builtCount === 0 ? (
                <Empty title={`Nothing built in ${h.name}`}>
                  <ul>
                    {waiting
                      .filter((c) => c.house === h.numeral)
                      .map((c) => (
                        <li key={c.id}>{courseLabel(c)}</li>
                      ))}
                  </ul>
                </Empty>
              ) : (
                <div className="panel__purpose" style={{ margin: 0 }}>
                  {h.note}
                </div>
              )}
            </div>
            <div className="record__meta">
              <span
                className={`status ${
                  h.builtCount === null ? 'status--unknown' : 'status--built'
                }`}
              >
                {h.builtCount === null ? 'UNKNOWN' : `${h.builtCount} built`}
              </span>
            </div>
          </article>
        ))}

        {emptyHouses.length === 0 && (
          <>
            <p className="panel__purpose" style={{ marginTop: 'var(--s5)' }}>
              {data.housesAtZero.count} houses have nothing built in them and{' '}
              {waiting.length} production-ready specs are waiting. Which house
              each one belongs to is not in this workspace, so they are listed
              here rather than assigned to a house on a guess.
            </p>
            {waiting.map((c) => (
              <CourseRow key={c.id} course={c} />
            ))}
          </>
        )}
      </Panel>

      <Panel
        kind="meter"
        title="Deliverable gap"
        purpose={data.deliverables.note}
      >
        <Meter
          value={data.deliverables.filled}
          max={data.deliverables.slots}
          threshold={data.deliverables.slots}
          unit={`of ${data.deliverables.slots} slots filled · ${data.deliverables.open} open`}
        />
        {data.deliverables.byType.map((t) => (
          <article className="record" key={t.type}>
            <div>
              <span className="record__code">{t.type}</span>
            </div>
            <div className="record__meta">
              <span className="record__updated">{t.open} open</span>
            </div>
          </article>
        ))}
        <Flag>{data.deliverables.waveNote}</Flag>
        {data.deliverables.waves.map((w) => (
          <article className="record" key={w.id}>
            <div>
              <span className="record__code">{w.id}</span>
            </div>
            <div className="record__meta">
              <span className="status status--unknown">
                {w.quarter ?? 'QUARTER AWAITING SOURCE'}
              </span>
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="gate"
        title="Course-level conditions"
        purpose="Five conditions. None of them is build work; four are a review and one is a disclosure."
        alert={data.conditions.some((c) => !c.cleared)}
      >
        {data.conditions.map((c) => (
          <article className="record" key={`${c.id}-${c.title}`}>
            <div>
              <span className="record__code">{c.id}</span>
              <span className="record__rev">also {c.alias}</span>
              <div className="record__title">{c.title}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                {c.covers}
              </div>
            </div>
            <div className="record__meta">
              <span
                className={`status ${
                  c.cleared ? 'status--built' : 'status--conditional'
                }`}
              >
                {c.cleared ? 'CLEARED' : 'OPEN'}
              </span>
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="gate"
        title="Doctrine screen"
        purpose={data.doctrineScreen.test}
        alert={!data.doctrineScreen.run}
      >
        <Flag tone="alert">{data.doctrineScreen.consequence}</Flag>
        <Flag tone="permanent">{data.doctrineScreen.note}</Flag>
        {data.doctrineScreen.flagged.length === 0 ? (
          <Empty title="Screen not run">
            No entry is marked clear of this test, because clearing it requires
            running it. An empty flagged list is not a clean result.
          </Empty>
        ) : (
          data.doctrineScreen.flagged.map((id) => (
            <article className="record" key={id}>
              <div>
                <span className="record__code">{id}</span>
                <div className="record__title">
                  Locked. Not previewable, not releasable.
                </div>
              </div>
              <div className="record__meta">
                <span className="status status--excluded">UNPUBLISHED</span>
              </div>
            </article>
          ))
        )}
      </Panel>

      <Panel
        kind="ledger"
        title="Amendment ledger"
        purpose={data.amendments.note}
      >
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
          {data.amendments.procedure.map((step, i) => (
            <span key={step} className="status status--draft">
              {i + 1}. {step}
            </span>
          ))}
        </div>
        {data.amendments.entries.map((a) => (
          <article className="record" key={a.id}>
            <div>
              <span className="record__code">{a.id}</span>
              <span className="record__rev">against {a.against}</span>
              <div className="record__title">{a.entry}</div>
            </div>
            <div className="record__meta">
              <span className="status status--unknown">
                reached {a.reached}
              </span>
              <span className="record__updated">{a.date}</span>
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
  id: 'education-nvu',
  ordinal: '03',
  title: 'Education',
  eyebrow: 'Catalog and production',
  surfaces: ['lane-a'],
  buildWork: true,
  panels: [
    { id: 'courses', kind: 'register', title: 'Course register', purpose: '83 entries.' },
    { id: 'houses', kind: 'board', title: 'Houses', purpose: 'Twelve, four empty.' },
    { id: 'deliverables', kind: 'meter', title: 'Deliverable gap', purpose: '152 of 248.' },
    { id: 'conditions', kind: 'gate', title: 'Course conditions', purpose: 'Five reviews.' },
    { id: 'screen', kind: 'gate', title: 'Doctrine screen', purpose: 'Not yet run.' },
    { id: 'amendments', kind: 'ledger', title: 'Amendment ledger', purpose: 'Six steps.' },
  ],
  Component: EducationModule,
}

export default definition
