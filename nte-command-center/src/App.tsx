import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleDefinition, Surface } from './core/types'
import { SURFACES, modulesFor } from './core/registry'
import { setSurface } from './core/storage'
import { assertSurface } from './core/lane-guard'
import {
  freezeStatus,
  isModuleLocked,
  loadFreeze,
  logContacts,
  saveFreeze,
  type FreezeState,
  type FreezeStatus,
} from './core/build-freeze'
import { Panel, Meter, FreezeStamp } from './ui/components'
import './ui/tokens.css'

/**
 * Surface is chosen once and held. There is no combined view and no admin
 * view that sees all three — that is the firewall, not a navigation
 * limitation. Switching is deliberate, the way switching capacity is.
 */
function SurfacePicker({ onPick }: { onPick: (s: Surface) => void }) {
  return (
    <div className="shell" data-surface="lane-a">
      <header className="masthead">
        <p className="masthead__seal">Command center</p>
        <h1 className="masthead__title">Choose a surface</h1>
      </header>
      <Panel
        kind="register"
        title="Three surfaces"
        purpose="One at a time. They do not share storage, vocabulary, or trade dress, and nothing renders across them."
      >
        {(Object.keys(SURFACES) as Surface[]).map((s) => (
          <article className="record" key={s}>
            <div>
              <span className="record__code">{s}</span>
              <div className="record__title">{SURFACES[s].label}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                {modulesFor(s).length} modules
              </div>
            </div>
            <div className="record__meta">
              <button className="nav__item" onClick={() => onPick(s)}>
                Open
              </button>
            </div>
          </article>
        ))}
      </Panel>
    </div>
  )
}

/**
 * One counter, worded for whoever is reading it.
 *
 * The number is the same on every surface — it is held outside the per-surface
 * namespace precisely so it cannot be reset by switching. Only the words
 * change, because the practice desk does not borrow the enterprise's language
 * for its own discipline.
 */
const METER_COPY: Record<Surface, { title: string; purpose: string }> = {
  'lane-a': {
    title: 'Outbound contacts this week',
    purpose:
      'Forty documented contacts opens build work. Below that, selling, signatures, conditions and register review stay open — those are never build work.',
  },
  'lane-b': {
    title: 'Outbound contacts this week',
    purpose:
      'The same count the enterprise surface reads. Nothing on this surface is gated on it.',
  },
  practice: {
    title: 'Calls and conversations this week',
    purpose:
      'Forty documented outreach contacts a week is the standard. Everything on this desk stays open whatever the number says — the count is here to be looked at, not to lock anything.',
  },
}

function ContactMeter({
  state,
  surface,
  onLog,
}: {
  state: FreezeState
  surface: Surface
  onLog: (n: number) => void
}) {
  const status = freezeStatus(state)
  const copy = METER_COPY[surface]
  return (
    <Panel
      kind="meter"
      title={copy.title}
      purpose={copy.purpose}
      alert={status.frozen && surface === 'lane-a'}
    >
      <Meter
        value={status.count}
        max={60}
        threshold={status.threshold}
        unit="contacts logged"
      />
      <div style={{ display: 'flex', gap: 'var(--s2)', marginTop: 'var(--s3)' }}>
        {[1, 5, 10].map((n) => (
          <button key={n} className="nav__item" onClick={() => onLog(n)}>
            Log {n}
          </button>
        ))}
      </div>
    </Panel>
  )
}

/**
 * The freeze decision, in one place.
 *
 * Extracted from App so the rule can be exercised directly: a module that
 * declares buildWork renders the stamp instead of its content below the
 * threshold, and a module that does not declare it renders its content at any
 * count. assertSurface runs here rather than at routing so a direct render
 * cannot smuggle a module onto a surface it does not declare.
 */
export function ModuleBody({
  module,
  surface,
  status,
}: {
  module: ModuleDefinition
  surface: Surface
  status: FreezeStatus
}) {
  assertSurface(module.id, module.surfaces, surface)

  if (isModuleLocked(module.buildWork, status)) {
    const Exempt = module.FreezeExempt
    return (
      <>
        {Exempt && <Exempt surface={surface} />}
        <Panel
          kind="gate"
          title={module.title}
          purpose="This module is build work."
          alert
        >
          <FreezeStamp status={status} />
        </Panel>
      </>
    )
  }

  const Component = module.Component
  return <Component surface={surface} />
}

export default function App() {
  const [surface, setSurfaceState] = useState<Surface | null>(null)
  const [freeze, setFreeze] = useState<FreezeState>({ weeks: [] })
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (!surface) return
    setSurface(surface)
    setFreeze(loadFreeze())
    const first = modulesFor(surface)[0]
    setActiveId(first ? first.id : null)
  }, [surface])

  const modules = useMemo(
    () => (surface ? modulesFor(surface) : []),
    [surface],
  )
  const active = modules.find((m) => m.id === activeId)
  const status = freezeStatus(freeze)

  const onLog = (n: number) => {
    const next = logContacts(freeze, n)
    saveFreeze(next)
    setFreeze(next)
  }

  if (!surface) return <SurfacePicker onPick={setSurfaceState} />

  return (
    <div className="shell" data-surface={surface}>
      <header className="masthead">
        <p className="masthead__seal">{SURFACES[surface].seal}</p>
        <h1 className="masthead__title">{SURFACES[surface].label}</h1>
        <nav className="nav" aria-label="Modules">
          {modules.map((m) => (
            <button
              key={m.id}
              className="nav__item"
              aria-current={m.id === activeId}
              onClick={() => setActiveId(m.id)}
            >
              <span className="nav__ordinal">{m.ordinal}</span>
              {m.title}
            </button>
          ))}
          <button
            className="nav__item"
            onClick={() => {
              setSurfaceState(null)
              setActiveId(null)
            }}
          >
            Switch surface
          </button>
        </nav>
      </header>

      {surface !== 'lane-b' && (
        <ContactMeter state={freeze} surface={surface} onLog={onLog} />
      )}

      {active && (
        <ModuleBody module={active} surface={surface} status={status} />
      )}
    </div>
  )
}
