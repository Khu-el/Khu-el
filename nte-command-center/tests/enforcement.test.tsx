/**
 * Step 2 of the build order: proof that the freeze and the firewall bite.
 *
 * These four are the load-bearing guarantees of the whole console. If any of
 * them can be made to pass by accident, the enforcement layer is decoration.
 */
import React from 'react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { ModuleBody } from '../src/App'
import { freezeStatus } from '../src/core/build-freeze'
import { assertSurface } from '../src/core/lane-guard'
import { load, save, setSurface } from '../src/core/storage'
import type { ModuleDefinition, Surface } from '../src/core/types'
import { render, weekWith } from './helpers'

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
