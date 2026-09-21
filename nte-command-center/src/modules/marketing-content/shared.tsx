/**
 * Module 04 · the shared half.
 *
 * This file imports no seed. It cannot: it is rendered on two surfaces whose
 * data must never meet, and a file that imported both would be the meeting
 * place. It takes a normalised shape as a prop and each instance file supplies
 * it from exactly one seed.
 *
 * Shared code, separate data. The separation is structural — enforced by which
 * file is allowed to import what — rather than by a conditional inside one
 * component that reads both and picks.
 */

import React from 'react'
import type { Surface } from '../../core/types'
import { Panel, Empty, Flag, Meter } from '../../ui/components'
import { freezeStatus, loadFreeze } from '../../core/build-freeze'

/** What both instances normalise to. Neither seed uses these names. */
export interface CalendarWeek {
  label: string
  slots: { title: string; channel: string; state: string }[]
}

export interface AssetRow {
  ref: string
  name: string
  kind: string
  line: string
  palette: 'enterprise' | 'imprint' | 'desk'
  state: string
  remark: string
}

export interface LedgerRow {
  ref: string
  date: string
  channel: string
  entry: string
}

export interface MarketingView {
  note: string
  calendarLabel: string
  calendarNote: string
  weeks: CalendarWeek[]
  assets: AssetRow[]
  ledger: LedgerRow[]
  meterLabel: string
  /** Present only where the surface has an imprint of its own. */
  imprint?: { name: string; selector: string; note: string }
}

export function MarketingContent({
  view,
  surface,
}: {
  view: MarketingView
  surface: Surface
}) {
  // One counter, read the same way on both surfaces. It is held outside the
  // per-surface namespace precisely so these two panels cannot disagree.
  const status = freezeStatus(loadFreeze())

  return (
    <>
      <Panel kind="board" title="Calendar" purpose={view.calendarLabel}>
        <Flag tone="permanent">{view.note}</Flag>
        {view.weeks.map((w) => (
          <article className="record" key={w.label}>
            <div>
              <span className="record__code">{w.label}</span>
              {w.slots.length === 0 ? (
                <div className="panel__purpose" style={{ margin: 0 }}>
                  No slots scheduled.
                </div>
              ) : (
                w.slots.map((s) => (
                  <div key={s.title} className="record__title">
                    {s.title} · {s.channel} · {s.state}
                  </div>
                ))
              )}
            </div>
            <div className="record__meta">
              <span className="status status--unknown">
                {w.slots.length} scheduled
              </span>
            </div>
          </article>
        ))}
        <Flag>{view.calendarNote}</Flag>
      </Panel>

      <Panel
        kind="register"
        title="Assets"
        purpose="What exists, which line it belongs to, and which palette it carries."
      >
        {view.assets.length === 0 ? (
          <Empty title="No assets recorded">
            Nothing is listed here yet.
          </Empty>
        ) : (
          view.assets.map((a) => (
            <article
              className="record"
              key={a.ref}
              data-imprint={
                a.palette === 'imprint' ? 'opportunity-architect' : undefined
              }
            >
              <div>
                <span className="record__code">{a.ref}</span>
                <span className="record__rev">{a.kind}</span>
                <div className="record__title">{a.name}</div>
                <div className="panel__purpose" style={{ margin: 0 }}>
                  {a.line} · {a.palette} palette
                </div>
                <Flag tone="permanent">{a.remark}</Flag>
              </div>
              <div className="record__meta">
                <span
                  className={`status ${
                    a.state === 'UNKNOWN' ? 'status--unknown' : 'status--draft'
                  }`}
                >
                  {a.state}
                </span>
              </div>
            </article>
          ))
        )}
      </Panel>

      {view.imprint && (
        <Panel
          kind="register"
          title={`${view.imprint.name} palette`}
          purpose={view.imprint.note}
        >
          <div data-imprint="opportunity-architect" className="record">
            <div>
              <span className="record__code">{view.imprint.selector}</span>
              <div className="record__title">
                Drafting-paper grey-green, survey ink, parcel teal.
              </div>
            </div>
          </div>
        </Panel>
      )}

      <Panel
        kind="meter"
        title={view.meterLabel}
        purpose="The same underlying count on every surface that shows it. One discipline, one number."
      >
        <Meter
          value={status.count}
          max={60}
          threshold={status.threshold}
          unit="contacts logged"
        />
      </Panel>

      <Panel
        kind="ledger"
        title="Published"
        purpose="Dates and channels. Append only — writing a thing is not publishing it, and this records the second."
      >
        {view.ledger.map((l) => (
          <article className="record" key={l.ref}>
            <div>
              <span className="record__code">{l.ref}</span>
              <div className="record__title">{l.entry}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                {l.channel}
              </div>
            </div>
            <div className="record__meta">
              <span className="record__updated">{l.date}</span>
            </div>
          </article>
        ))}
      </Panel>

      <p className="panel__purpose">
        Instance: {surface}. Its data comes from one seed file and this
        component never sees the other.
      </p>
    </>
  )
}
