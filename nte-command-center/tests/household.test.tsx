/**
 * Modules 07 and 08 acceptance — the household surface.
 */
import React from 'react'
import { readFileSync } from 'node:fs'
import { describe, expect, it, beforeEach } from 'vitest'
import familyOffice from '../src/modules/family-office'
import lifeops from '../src/modules/lifeops'
import { ModuleBody } from '../src/App'
import { freezeStatus } from '../src/core/build-freeze'
import { modulesFor } from '../src/core/registry'
import { save, setSurface } from '../src/core/storage'
import {
  CARRY_LIMIT,
  attemptCarry,
  canExport,
  exportRows,
  type Command,
} from '../src/modules/family-office/ledger'
import { SLOT_CEILING, countSlots, slotsFor } from '../src/modules/lifeops/slots'
import household from '../seed/family-office.json'
import governance from '../seed/governance.json'
import opsA from '../seed/lifeops-lane-a.json'
import opsB from '../seed/lifeops-lane-b.json'
import { render, click, weekWith } from './helpers'

beforeEach(() => {
  window.localStorage.clear()
  setSurface('lane-b')
})

// Both modules are buildWork: false. Zero contacts is the harder case.
const status = freezeStatus(weekWith(0))

const house = () =>
  render(<ModuleBody module={familyOffice} surface="lane-b" status={status} />)

// ── Module 07 ─────────────────────────────────────────────────────────────

describe('the commands ledger refuses a third carry', () => {
  const base: Command[] = [
    { id: 'A', title: 'a', state: 'open', carries: 0, opened: '2026-01-01' },
    { id: 'B', title: 'b', state: 'open', carries: 0, opened: '2026-01-01' },
    { id: 'C', title: 'c', state: 'open', carries: 0, opened: '2026-01-01' },
  ]

  it('accepts two and refuses the third at the rule', () => {
    const one = attemptCarry(base, 'A')
    expect(one.ok).toBe(true)
    const two = attemptCarry(one.commands, 'B')
    expect(two.ok).toBe(true)
    const three = attemptCarry(two.commands, 'C')

    expect(three.ok).toBe(false)
    // Refused, not warned: the ledger is unchanged.
    expect(three.commands).toBe(two.commands)
    expect(three.commands.find((c) => c.id === 'C')!.state).toBe('open')
    expect(three.message).toContain('A third is not accepted')
    expect(three.message).toContain('Close one or drop one on purpose')
    expect(three.message).toContain('A, B')
  })

  it('accepts the third once one is closed', () => {
    let commands = attemptCarry(base, 'A').commands
    commands = attemptCarry(commands, 'B').commands
    commands = commands.map((c) => (c.id === 'A' ? { ...c, state: 'closed' as const } : c))
    expect(attemptCarry(commands, 'C').ok).toBe(true)
  })

  it('refuses in the UI with a message a person can act on', () => {
    const v = house()
    const carryButtons = () =>
      Array.from(v.container.querySelectorAll('button')).filter(
        (b) => b.textContent === 'Carry',
      )
    click(carryButtons()[0]!)
    click(carryButtons()[0]!)
    click(carryButtons()[0]!)

    const message = v.container.querySelector('[data-carry-message="true"]')!
    expect(message.textContent).toContain('A third is not accepted')
    const carried = Array.from(v.container.querySelectorAll('.record')).filter(
      (r) => (r.textContent ?? '').includes('CARRIED'),
    )
    expect(carried.length).toBe(CARRY_LIMIT)
    v.unmount()
  })
})

describe('youth records cannot be exported', () => {
  it('disables the control at the component, not by styling', () => {
    const v = house()
    const controls = Array.from(
      v.container.querySelectorAll<HTMLButtonElement>('[data-export-control="true"]'),
    )
    expect(controls.length).toBe(2)
    const youthPanel = controls.find((c) =>
      (c.closest('.panel')?.textContent ?? '').includes('Youth safeguards'),
    )!
    expect(youthPanel.hasAttribute('disabled')).toBe(true)
    expect(youthPanel.disabled).toBe(true)
    // Not display:none, not visibility:hidden, not opacity — present and off.
    expect(youthPanel.style.display).not.toBe('none')
    expect(youthPanel.textContent).toContain('Export disabled')
    v.unmount()
  })

  it('refuses at the export function too, so a live button cannot leak one', () => {
    expect(canExport([{ youth: false }])).toBe(true)
    expect(canExport([{ youth: false }, { youth: true }])).toBe(false)
    expect(() => exportRows(household.youth)).toThrow(/contains a youth record/)
    expect(() => exportRows([{ youth: false }])).not.toThrow()
  })
})

describe('the household surface carries nothing from the enterprise', () => {
  it('shows no enterprise entity name, seal or document code', () => {
    const v = house()
    const text = `${v.text} ${v.html}`
    for (const entity of governance.entities) {
      expect(text, `entity ${entity.code}`).not.toContain(entity.name)
    }
    for (const instrument of governance.instruments) {
      expect(text).not.toContain(instrument.docCode)
    }
    // No document code in the enterprise format at all.
    expect(text).not.toMatch(/NTE-[A-Z]+-\d{4}/)
    v.unmount()
  })

  it('holds no revenue field and no amount anywhere', () => {
    // The prose says the rule out loud, which is correct. What must not exist
    // is a field: a key that could hold a figure, or a figure in the data.
    const keys = new Set<string>()
    const numbers: string[] = []
    const walk = (value: unknown, path: string): void => {
      if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`))
      else if (value && typeof value === 'object')
        for (const [k, v] of Object.entries(value)) {
          keys.add(k.toLowerCase())
          walk(v, `${path}.${k}`)
        }
      else if (typeof value === 'number' && path !== '.commands[0].carries')
        numbers.push(`${path} = ${value}`)
    }
    walk(household, '')

    for (const word of ['revenue', 'income', 'amount', 'gross', 'profit', 'value', 'balance']) {
      expect([...keys].some((k) => k.includes(word)), `field named ${word}`).toBe(false)
    }
    // The only numbers in this module are carry counts, which are not money.
    for (const n of numbers) expect(n, n).toMatch(/carries = \d+$/)
  })

  it('is reachable from the household surface only', () => {
    expect(familyOffice.surfaces).toEqual(['lane-b'])
    expect(modulesFor('lane-a').map((m) => m.id)).not.toContain('family-office')
    expect(modulesFor('practice').map((m) => m.id)).not.toContain('family-office')
  })
})

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
