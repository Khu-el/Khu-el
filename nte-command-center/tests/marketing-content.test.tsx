/**
 * Module 04 acceptance. The dual-hosted one, where getting it wrong removes
 * the firewall rather than bending it.
 */
import React from 'react'
import { readFileSync } from 'node:fs'
import { describe, expect, it, beforeEach } from 'vitest'
import marketing from '../src/modules/marketing-content'
import { ModuleBody } from '../src/App'
import { freezeStatus, logContacts, saveFreeze } from '../src/core/build-freeze'
import { modulesFor } from '../src/core/registry'
import { setSurface } from '../src/core/storage'
import { guardText, isPracticePath } from '../src/core/lane-guard'
import laneA from '../seed/marketing-lane-a.json'
import practice from '../seed/marketing-practice.json'
import { render, weekWith } from './helpers'

beforeEach(() => {
  window.localStorage.clear()
  setSurface('lane-a')
})

const open = freezeStatus(weekWith(40))

function keysOf(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const v of value) keysOf(v, out)
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.add(k)
      keysOf(v, out)
    }
  }
  return out
}

describe('the two instances share no data', () => {
  it('shares not one key between the seed files, at any depth', () => {
    const a = keysOf(laneA)
    const b = keysOf(practice)
    expect(a.size).toBeGreaterThan(10)
    expect(b.size).toBeGreaterThan(10)
    expect([...a].filter((k) => b.has(k))).toEqual([])
  })

  it('keeps each instance file importing exactly one seed', () => {
    const shared = readFileSync('src/modules/marketing-content/shared.tsx', 'utf8')
    const laneAFile = readFileSync('src/modules/marketing-content/lane-a-instance.tsx', 'utf8')
    const practiceFile = readFileSync('src/modules/marketing-content/practice-instance.tsx', 'utf8')

    // The shared half imports no seed at all — it cannot be the meeting place.
    expect(shared).not.toMatch(/from '.*seed\//)

    expect(laneAFile).toContain("seed/marketing-lane-a.json")
    expect(laneAFile).not.toContain("seed/marketing-practice.json")
    expect(practiceFile).toContain("seed/marketing-practice.json")
    expect(practiceFile).not.toContain("seed/marketing-lane-a.json")
  })
})

describe('the practice instance passes the firewall', () => {
  it('renders clean on its own surface', () => {
    setSurface('practice')
    const v = render(
      <ModuleBody module={marketing} surface="practice" status={open} />,
    )
    for (const scanned of [v.text, v.html]) {
      expect(guardText(scanned, 'practice').blocked).toEqual([])
    }
    // Read from the seed rather than written out: this file is not on a
    // practice path, so the desk's own vocabulary must not appear in it.
    for (const asset of practice.deskAssets) {
      expect(v.text).toContain(asset.itemName)
    }
    v.unmount()
  })

  it('is on a path the firewall scan reads as this surface', () => {
    // The delivered detector missed seed/marketing-practice.json entirely.
    expect(isPracticePath('seed/marketing-practice.json')).toBe(true)
    expect(isPracticePath('src/modules/marketing-content/practice-instance.tsx')).toBe(true)
    expect(isPracticePath('src/modules/marketing-content/lane-a-instance.tsx')).toBe(false)
    expect(isPracticePath('src/modules/gov-infrastructure/index.tsx')).toBe(false)
  })
})

describe('the enterprise instance carries no practice vocabulary', () => {
  it('renders clean on its own surface', () => {
    const v = render(
      <ModuleBody module={marketing} surface="lane-a" status={open} />,
    )
    for (const scanned of [v.text, v.html]) {
      expect(guardText(scanned, 'lane-a').blocked).toEqual([])
    }
    expect(v.text).toContain('Neterverse Publishing')
    expect(v.text).toContain('The Opportunity Architect')
    v.unmount()
  })
})

describe('the imprint palette is its own', () => {
  const css = readFileSync('src/ui/tokens.css', 'utf8')

  function paletteOf(selector: string): string[] {
    const block = css.slice(css.indexOf(selector))
    const body = block.slice(block.indexOf('{') + 1, block.indexOf('}'))
    return [...body.matchAll(/#[0-9a-fA-F]{3,8}/g)].map((m) => m[0].toLowerCase())
  }

  it('exists as a block rather than a variant', () => {
    expect(css).toContain('[data-imprint="opportunity-architect"]')
    expect(paletteOf('[data-imprint="opportunity-architect"]').length).toBeGreaterThan(8)
  })

  it('inherits no navy and no gold', () => {
    const imprint = paletteOf('[data-imprint="opportunity-architect"]')
    const enterprise = paletteOf('[data-surface="lane-a"]')
    expect(imprint.filter((c) => enterprise.includes(c))).toEqual([])
    for (const token of ['#c8a44a', '#7d6730', '#0c1520', '#132131']) {
      expect(imprint).not.toContain(token)
    }
  })

  it('is applied to the imprint rows, not just declared', () => {
    const v = render(
      <ModuleBody module={marketing} surface="lane-a" status={open} />,
    )
    const tagged = v.container.querySelectorAll(
      '[data-imprint="opportunity-architect"]',
    )
    expect(tagged.length).toBe(
      laneA.imprintAssets.filter((a) => a.assetPalette === 'imprint').length + 1,
    )
    v.unmount()
  })
})

describe('the contact meter reads one count on both instances', () => {
  it('shows the same number after logging on one surface', () => {
    setSurface('lane-a')
    saveFreeze(logContacts({ weeks: [] }, 17))

    const a = render(<ModuleBody module={marketing} surface="lane-a" status={open} />)
    expect(a.text).toContain('17 contacts logged')
    a.unmount()

    // Switching surfaces does not reset it. If it did, the freeze would have
    // a bypass and every buildWork module could be unlocked by a click.
    setSurface('practice')
    const p = render(<ModuleBody module={marketing} surface="practice" status={open} />)
    expect(p.text).toContain('17 contacts logged')
    p.unmount()
  })
})

describe('routing', () => {
  it('appears on both surfaces and on neither of the others', () => {
    expect(marketing.surfaces).toEqual(['lane-a', 'practice'])
    expect(modulesFor('lane-a').map((m) => m.id)).toContain('marketing-content')
    expect(modulesFor('practice').map((m) => m.id)).toContain('marketing-content')
    expect(modulesFor('lane-b').map((m) => m.id)).not.toContain('marketing-content')
  })
})
