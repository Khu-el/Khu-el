/**
 * Module 08 acceptance — the household surface of the operating-system module.
 * The lane-b-only office module was removed with the estate surface.
 */
import React from 'react'
import { readFileSync } from 'node:fs'
import { describe, expect, it, beforeEach } from 'vitest'
import lifeops from '../src/modules/lifeops'
import { ModuleBody } from '../src/App'
import { freezeStatus } from '../src/core/build-freeze'
import { modulesFor } from '../src/core/registry'
import { setSurface } from '../src/core/storage'
import { SLOT_CEILING, countSlots, slotsFor } from '../src/modules/lifeops/slots'
import opsA from '../seed/lifeops-lane-a.json'
import opsB from '../seed/lifeops-lane-b.json'
import { render, weekWith } from './helpers'

beforeEach(() => {
  window.localStorage.clear()
  setSurface('lane-b')
})

const status = freezeStatus(weekWith(0))

// ── Module 08 ─────────────────────────────────────────────────────────────

describe('the slot meter', () => {
  it('computes against ten, not fifteen', () => {
    expect(SLOT_CEILING).toBe(10)
    expect(countSlots([]).ceiling).toBe(10)
  })

  it('counts a task with two run times as two', () => {
    const one = { id: 'a', title: 'a', cadence: 'Daily', runTimes: ['07:00'], owningSurface: null }
    const two = { ...one, id: 'b', runTimes: ['07:00', '19:00'] }
    expect(slotsFor(one)).toBe(1)
    expect(slotsFor(two)).toBe(2)

    const count = countSlots([one, two])
    expect(count.consumed).toBe(3)
    expect(count.overCapacity).toBe(false)

    // Six rows, ten slots, over capacity with fewer rows than the ceiling.
    const six = Array.from({ length: 6 }, (_, i) => ({ ...two, id: `t${i}` }))
    const over = countSlots(six)
    expect(over.consumed).toBe(12)
    expect(over.overBy).toBe(2)
    expect(over.overCapacity).toBe(true)
  })

  it('counts an unknown task as one rather than as none', () => {
    const unknown = { id: 'u', title: null, cadence: null, runTimes: null, owningSurface: null }
    expect(slotsFor(unknown)).toBe(1)
    expect(countSlots([unknown]).assumedSingle).toEqual(['u'])
  })

  it('shows the enterprise register over capacity and says by how much', () => {
    setSurface('lane-a')
    const v = render(
      <ModuleBody module={lifeops} surface="lane-a" status={status} />,
    )
    expect(v.text).toContain('15 slots consumed of 10')
    expect(v.text).toContain('Over capacity by 5')
    expect(v.text).toContain('the ceiling does not move')
    v.unmount()
  })
})

describe('empty task rows', () => {
  it('say awaiting source and are not filled in by inference', () => {
    for (const t of opsA.opsTasks) {
      expect(t.taskName).toBe(null)
      expect(t.taskCadence).toBe(null)
      expect(t.taskRunTimes).toBe(null)
    }
    setSurface('lane-a')
    const v = render(
      <ModuleBody module={lifeops} surface="lane-a" status={status} />,
    )
    expect(v.text).toContain('Awaiting source')
    expect(v.text).toContain('run times awaiting source')
    v.unmount()
  })
})

describe('the health and training domain', () => {
  it('renders a name and a cadence and no number of any kind', () => {
    for (const surface of ['lane-a', 'lane-b'] as const) {
      setSurface(surface)
      const v = render(
        <ModuleBody module={lifeops} surface={surface} status={status} />,
      )
      const barred = Array.from(
        v.container.querySelectorAll('[data-numbers-barred="true"]'),
      )
      expect(barred.length).toBe(1)
      const text = barred[0]!.textContent ?? ''
      expect(text).toContain('Health and training')
      expect(text).toContain('Daily')
      expect(text).not.toMatch(/\d/)
      v.unmount()
    }
  })

  it('holds no metric in either seed for that domain', () => {
    const a = opsA.opsDomains.find((d) => d.domainNumbersBarred)!
    const b = opsB.houseDomains.find((d) => d.areaNumbersBarred)!
    for (const [row, keys] of [
      [a, ['domainName', 'domainCadence']],
      [b, ['areaName', 'areaCadence']],
    ] as const) {
      for (const [k, v] of Object.entries(row)) {
        if (typeof v === 'number') throw new Error(`numeric field ${k}`)
      }
      for (const k of keys) expect(k in row).toBe(true)
    }
  })
})

describe('module 08 keeps its two instances apart', () => {
  it('shares no key between the seed files, at any depth', () => {
    const keysOf = (value: unknown, out = new Set<string>()): Set<string> => {
      if (Array.isArray(value)) for (const v of value) keysOf(v, out)
      else if (value && typeof value === 'object')
        for (const [k, v] of Object.entries(value)) {
          out.add(k)
          keysOf(v, out)
        }
      return out
    }
    const a = keysOf(opsA)
    const b = keysOf(opsB)
    expect([...a].filter((k) => b.has(k))).toEqual([])
  })

  it('keeps each instance file importing exactly one seed', () => {
    const shared = readFileSync('src/modules/lifeops/shared.tsx', 'utf8')
    const a = readFileSync('src/modules/lifeops/lane-a-instance.tsx', 'utf8')
    const b = readFileSync('src/modules/lifeops/lane-b-instance.tsx', 'utf8')
    expect(shared).not.toMatch(/from '.*seed\//)
    expect(a).toContain('seed/lifeops-lane-a.json')
    expect(a).not.toContain('seed/lifeops-lane-b.json')
    expect(b).toContain('seed/lifeops-lane-b.json')
    expect(b).not.toContain('seed/lifeops-lane-a.json')
  })

  it('renders on both surfaces and on neither of the others', () => {
    expect(lifeops.surfaces).toEqual(['lane-a', 'lane-b'])
    expect(modulesFor('practice').map((m) => m.id)).not.toContain('lifeops')
  })
})

describe('the naming collision', () => {
  it('is an open item and is not auto-resolved', () => {
    setSurface('lane-a')
    const v = render(
      <ModuleBody module={lifeops} surface="lane-a" status={status} />,
    )
    expect(v.text).toContain('S-01 means two different things')
    expect(v.text).toContain('Renaming decision')
    expect(v.text).toContain('OPEN')
    expect(v.text).toContain('does not pick a winner')
    v.unmount()
  })
})
