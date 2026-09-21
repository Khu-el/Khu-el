/**
 * Step 2 of the build order: proof that the freeze and the firewall bite.
 *
 * These four are the load-bearing guarantees of the whole console. If any of
 * them can be made to pass by accident, the enforcement layer is decoration.
 */
import React from 'react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { ModuleBody } from '../src/App'
import {
  freezeStatus,
  logContacts,
  mondayOf,
} from '../src/core/build-freeze'
import { assertSurface } from '../src/core/lane-guard'
import { hasShape, load, save, setSurface } from '../src/core/storage'
import familyOffice from '../src/modules/family-office'
import type { ModuleDefinition, Surface } from '../src/core/types'
import { ProofForm } from '../src/ui/components'
import { click, render, typeInto, weekWith } from './helpers'

const CONTENT = 'module content rendered'

function fixture(buildWork: boolean, surfaces: Surface[] = ['lane-a']): ModuleDefinition {
  return {
    id: buildWork ? 'fixture-build' : 'fixture-open',
    ordinal: '99',
    title: 'Fixture module',
    eyebrow: 'Test',
    surfaces,
    buildWork,
    panels: [],
    Component: () => <p>{CONTENT}</p>,
  }
}

describe('1 · the build freeze locks build work and only build work', () => {
  it('renders the freeze stamp below 40 logged contacts', () => {
    const status = freezeStatus(weekWith(39))
    const view = render(
      <ModuleBody module={fixture(true)} surface="lane-a" status={status} />,
    )
    expect(status.frozen).toBe(true)
    expect(view.text).toContain('Build freeze')
    expect(view.text).toContain('39 of 40 documented contacts logged')
    expect(view.text).not.toContain(CONTENT)
    view.unmount()
  })

  it('renders its content at exactly 40 — the threshold is met, not passed', () => {
    const status = freezeStatus(weekWith(40))
    const view = render(
      <ModuleBody module={fixture(true)} surface="lane-a" status={status} />,
    )
    expect(status.frozen).toBe(false)
    expect(view.text).toContain(CONTENT)
    expect(view.text).not.toContain('Build freeze')
    view.unmount()
  })
})

describe('2 · a module that is not build work is never locked', () => {
  it('renders its content at zero contacts', () => {
    const status = freezeStatus(weekWith(0))
    const view = render(
      <ModuleBody module={fixture(false)} surface="lane-a" status={status} />,
    )
    expect(status.frozen).toBe(true)
    expect(view.text).toContain(CONTENT)
    expect(view.text).not.toContain('Build freeze')
    view.unmount()
  })
})

describe('3 · assertSurface refuses an undeclared surface', () => {
  it('throws when the module does not declare the surface', () => {
    expect(() => assertSurface('family-office', ['lane-b'], 'practice')).toThrow(
      /not permitted on surface practice/,
    )
  })

  it('throws at render, not only at routing', () => {
    const status = freezeStatus(weekWith(40))
    // React logs a component-stack error alongside any throw during render.
    // The throw is the assertion; the log is noise, so it is held back.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() =>
        render(
          <ModuleBody
            module={fixture(false, ['lane-b'])}
            surface="lane-a"
            status={status}
          />,
        ),
      ).toThrow(/not permitted on surface lane-a/)
    } finally {
      quiet.mockRestore()
    }
  })

  it('permits a surface the module declares', () => {
    expect(() =>
      assertSurface('marketing-content', ['lane-a', 'practice'], 'practice'),
    ).not.toThrow()
  })
})

describe('4 · storage is namespaced per surface', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('does not read a lane-a key from lane-b', () => {
    setSurface('lane-a')
    save('carry', { commands: ['written under lane-a'] })
    expect(load('carry', null)).toEqual({ commands: ['written under lane-a'] })

    setSurface('lane-b')
    expect(load('carry', null)).toBe(null)

    // And a write under lane-b does not reach back across.
    save('carry', { commands: ['written under lane-b'] })
    setSurface('lane-a')
    expect(load('carry', null)).toEqual({ commands: ['written under lane-a'] })
  })

  it('namespaces the key itself, so the separation survives a raw read', () => {
    setSurface('lane-b')
    save('binder', { rows: 3 })
    const keys = Object.keys(window.localStorage)
    expect(keys).toContain('ccenter:lane-b:binder')
    expect(keys).not.toContain('ccenter:lane-a:binder')
    expect(keys.every((k) => k.startsWith('ccenter:'))).toBe(true)
  })
})

// ── Regressions found by review, each confirmed by probe first ────────────

describe('5 · the week key stays in local calendar time', () => {
  // The defect: getDay() and setDate() are local, toISOString() is UTC. West
  // of Greenwich the key moved forward from the evening onwards; east of it,
  // early morning moved the key back a week. Either way contacts logged in one
  // local week landed under two keys, the count appeared to reset, and the
  // freeze could be cleared twice over.
  //
  // Reproduced before fixing, in America/New_York: Monday 09:00 gave
  // 2026-09-14 and Monday 21:00 gave 2026-09-15.
  //
  // CI runs UTC, where neither direction manifests, so these cases pin the
  // contract rather than reproduce the failure: the key is built from local
  // calendar fields, so it is the local Monday at every local hour of the
  // week. Dates are constructed with local-time arguments deliberately — an
  // ISO string with an offset would re-introduce the timezone dependency the
  // test is trying to remove.
  const localMonday = '2026-09-14'

  it('returns the same local Monday at every hour of a local day', () => {
    const keys = [0, 6, 12, 18, 23].map((hour) =>
      mondayOf(new Date(2026, 8, 14, hour, 30)),
    )
    expect(new Set(keys).size).toBe(1)
    expect(keys[0]).toBe(localMonday)
  })

  it('returns that Monday from every day of the week, Sunday included', () => {
    for (const [day, hour] of [
      [14, 0], [15, 9], [16, 12], [17, 18], [18, 23], [19, 6], [20, 23],
    ] as const) {
      expect(mondayOf(new Date(2026, 8, day, hour, 30)), `${day} ${hour}h`).toBe(
        localMonday,
      )
    }
  })

  it('is built from local fields, not an ISO conversion', () => {
    const at = new Date(2026, 8, 17, 23, 45)
    const monday = new Date(at)
    monday.setDate(monday.getDate() + (monday.getDay() === 0 ? -6 : 1 - monday.getDay()))
    const localFormatted = [
      monday.getFullYear(),
      String(monday.getMonth() + 1).padStart(2, '0'),
      String(monday.getDate()).padStart(2, '0'),
    ].join('-')
    expect(mondayOf(at)).toBe(localFormatted)
  })

  it('keeps one local day\u2019s contacts in one week', () => {
    let state = logContacts({ weeks: [] }, 25, new Date(2026, 8, 14, 9, 0))
    state = logContacts(state, 20, new Date(2026, 8, 14, 21, 0))
    expect(state.weeks).toHaveLength(1)
    const status = freezeStatus(state, new Date(2026, 8, 14, 21, 0))
    expect(status.count).toBe(45)
    expect(status.frozen).toBe(false)
  })
})

describe('6 · whitespace is not evidence', () => {
  it('refuses a proof whose fields are blank', () => {
    const view = render(<ProofForm label="Clear it" onSubmit={() => {}} />)
    const inputs = view.container.querySelectorAll<HTMLInputElement>('input')
    const submit = () =>
      Array.from(view.container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Clear it',
      )!

    for (const input of Array.from(inputs)) typeInto(input, '   ')
    // Boolean(' ') is true, so three spaces used to enable this control and
    // record a Proof with blank fields — which cleared a condition precedent
    // and marked a security hold remediated.
    expect(submit().hasAttribute('disabled')).toBe(true)
    view.unmount()
  })

  it('records trimmed values once real ones are entered', () => {
    let captured: { source: string; reference: string; verifiedBy: string } | null = null
    const view = render(
      <ProofForm
        label="Clear it"
        onSubmit={(p) => {
          captured = p
        }}
      />,
    )
    const inputs = view.container.querySelectorAll<HTMLInputElement>('input')
    typeInto(inputs[0]!, '  Written response  ')
    typeInto(inputs[1]!, ' REF-1 ')
    typeInto(inputs[2]!, ' Operator ')
    click(
      Array.from(view.container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Clear it',
      )!,
    )
    expect(captured).toEqual({
      source: 'Written response',
      reference: 'REF-1',
      verifiedBy: 'Operator',
      obtained: expect.any(String),
    })
    view.unmount()
  })
})

describe('7 · a fallback write is readable', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('survives a localStorage that refuses to write', () => {
    setSurface('lane-a')
    const setItem = window.localStorage.setItem
    // Quota, or private mode. save() falls back to memory; load() used to read
    // only backing whenever backing existed, so the write vanished.
    window.localStorage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    try {
      save('fallback-probe', { rows: 7 })
      expect(load('fallback-probe', null)).toEqual({ rows: 7 })
    } finally {
      window.localStorage.setItem = setItem
    }
  })

  it('lets a later persistent write win over the fallback copy', () => {
    setSurface('lane-a')
    const setItem = window.localStorage.setItem
    window.localStorage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    try {
      save('fallback-probe', { rows: 1 })
    } finally {
      window.localStorage.setItem = setItem
    }
    save('fallback-probe', { rows: 2 })
    expect(load('fallback-probe', null)).toEqual({ rows: 2 })
  })
})

describe('8 · a malformed stored value does not brick a module', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setSurface('lane-b')
  })

  it('checks the keys the module reads', () => {
    expect(hasShape({ a: [], b: {} }, { a: 'array', b: 'object' })).toBe(true)
    expect(hasShape({ a: {}, b: {} }, { a: 'array', b: 'object' })).toBe(false)
    expect(hasShape({ a: [] }, { a: 'array', b: 'object' })).toBe(false)
    expect(hasShape({ a: [], b: [] }, { a: 'array', b: 'object' })).toBe(false)
    expect(hasShape(null, { a: 'array' })).toBe(false)
    expect(hasShape([], { a: 'array' })).toBe(false)
    expect(hasShape('{}', { a: 'array' })).toBe(false)
  })

  it('falls back to the seed rather than throwing on render', () => {
    // Valid JSON, wrong shape. The module reads data.commands.filter(...), so
    // this used to throw on first render — and because the stored value wins
    // after first load and Reset to seed lives inside the module, the module
    // stayed dead on every reload.
    save('family-office', { commands: 'not an array' })
    const view = render(
      <ModuleBody
        module={familyOffice}
        surface="lane-b"
        status={freezeStatus(weekWith(0))}
      />,
    )
    expect(view.text).toContain('Sunday rhythm')
    expect(view.text).toContain('Commands')
    view.unmount()
  })

  it('leaves the bad value in place for inspection', () => {
    save('family-office', { commands: 'not an array' })
    load('family-office', { ok: true }, (v) => hasShape(v, { commands: 'array' }))
    expect(window.localStorage.getItem('ccenter:lane-b:family-office')).toContain(
      'not an array',
    )
  })

  it('still returns a stored value that does have the shape', () => {
    save('shape-probe', { rows: [1, 2] })
    expect(
      load('shape-probe', { rows: [] }, (v) => hasShape(v, { rows: 'array' })),
    ).toEqual({ rows: [1, 2] })
  })
})
