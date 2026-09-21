/**
 * Module 06 acceptance, plus the guard correction that made it writable.
 */
import React from 'react'
import { readFileSync } from 'node:fs'
import { describe, expect, it, beforeEach } from 'vitest'
import practiceDesk from '../src/modules/practice-desk'
import { ModuleBody } from '../src/App'
import { freezeStatus } from '../src/core/build-freeze'
import { modulesFor } from '../src/core/registry'
import { setSurface } from '../src/core/storage'
import {
  ENTERPRISE_TERMS,
  assertSurface,
  guardText,
  termPattern,
} from '../src/core/lane-guard'
// Guard behaviour itself is exercised in tests/lane-guard.test.ts, which is
// where a blocked term may be written out. This file must not contain one:
// it lives under a practice- path and is scanned as practice source.
import { render, weekWith } from './helpers'

beforeEach(() => {
  window.localStorage.clear()
  setSurface('practice')
})

// buildWork is false, so the desk is open at any count. Zero is the harder
// case and the one that proves it.
const status = freezeStatus(weekWith(0))

function renderDesk() {
  return render(
    <ModuleBody module={practiceDesk} surface="practice" status={status} />,
  )
}

describe('the rendered desk carries no enterprise vocabulary', () => {
  it('scans clean across the rendered DOM', () => {
    const view = renderDesk()
    // Text and markup both: a term hiding in a class name or a title
    // attribute is still in the bundle and still readable.
    for (const scanned of [view.text, view.html]) {
      const result = guardText(scanned, 'practice')
      expect(result.blocked).toEqual([])
      expect(result.ok).toBe(true)
    }
    view.unmount()
  })

  it('contains not one of the blocked terms, checked one at a time', () => {
    const view = renderDesk()
    const haystack = `${view.text} ${view.html}`
    for (const term of ENTERPRISE_TERMS) {
      expect(
        termPattern(term).test(haystack),
        `blocked term "${term}" reached the practice surface`,
      ).toBe(false)
    }
    view.unmount()
  })

  it('renders something worth scanning — an empty tree passes trivially', () => {
    const view = renderDesk()
    expect(view.text.length).toBeGreaterThan(600)
    expect(view.text).toContain('Outside business activity')
    expect(view.text).toContain('Team standup')
    expect(view.text).toContain('Recruiting funnel')
    expect(view.text).toContain('Warm-market assets')
    view.unmount()
  })
})

describe('the practice palette is its own', () => {
  const css = readFileSync('src/ui/tokens.css', 'utf8')

  function paletteOf(surface: string): string[] {
    const block = css.slice(css.indexOf(`[data-surface="${surface}"]`))
    const body = block.slice(block.indexOf('{') + 1, block.indexOf('}'))
    return [...body.matchAll(/#[0-9a-fA-F]{3,8}/g)].map((m) =>
      m[0].toLowerCase(),
    )
  }

  it('shares no colour value with the enterprise or household palettes', () => {
    const practice = paletteOf('practice')
    expect(practice.length).toBeGreaterThan(8)
    for (const other of ['lane-a', 'lane-b']) {
      const shared = paletteOf(other).filter((c) => practice.includes(c))
      expect(shared, `shared colour with ${other}`).toEqual([])
    }
  })

  it('carries no navy or gold', () => {
    // The enterprise accent and ground, spelled out, so a later edit that
    // copies one across fails here rather than in review.
    for (const token of ['#c8a44a', '#7d6730', '#0c1520', '#132131']) {
      expect(paletteOf('practice')).not.toContain(token)
    }
  })
})

describe('the desk is reachable from one surface only', () => {
  it('does not appear on the enterprise or household surfaces', () => {
    expect(practiceDesk.surfaces).toEqual(['practice'])
    expect(modulesFor('practice').map((m) => m.id)).toContain('practice-desk')
    for (const surface of ['lane-a', 'lane-b'] as const) {
      expect(modulesFor(surface).map((m) => m.id)).not.toContain('practice-desk')
      expect(() =>
        assertSurface('practice-desk', practiceDesk.surfaces, surface),
      ).toThrow()
    }
  })
})
