/**
 * A note that claims a gate position must agree with the strip.
 *
 * Found in the delivered compliance seed: NTE-GOV-2026-SCHED-001 carries the
 * note "Eight of nine. The only thing between this and release is an event
 * ID", and its strip records seven — points 8 and 9 are both open, so two
 * things stand between it and release, not one.
 *
 * A note is prose and nobody diffs it. The strip is data. When they disagree
 * the note is what gets quoted, which is how a document arrives at a signing
 * described as cleared. The check is mechanical so it covers every register,
 * not the one row where it was noticed.
 */
import React from 'react'
import { describe, expect, it, beforeEach } from 'vitest'
import compliance from '../src/modules/compliance-cp'
import { ModuleBody } from '../src/App'
import { freezeStatus } from '../src/core/build-freeze'
import { setSurface } from '../src/core/storage'
import {
  EMPTY_GATE,
  claimedGatePosition,
  gateNoteConflict,
  type GateStrip,
} from '../src/core/types'
import cpSeed from '../seed/compliance.json'
import { render, weekWith } from './helpers'

beforeEach(() => {
  window.localStorage.clear()
  setSurface('lane-a')
})

const strip = (passed: number): GateStrip =>
  EMPTY_GATE.map((_, i) => i < passed) as unknown as GateStrip

describe('reading a claimed position out of a note', () => {
  it('reads the number word and the digit', () => {
    expect(claimedGatePosition('Eight of nine. One step from release.')).toBe(8)
    expect(claimedGatePosition('8 of 9')).toBe(8)
    expect(claimedGatePosition('eight of 9')).toBe(8)
    expect(claimedGatePosition('Sitting at seven of nine.')).toBe(7)
    expect(claimedGatePosition('zero of nine')).toBe(0)
  })

  it('returns null where a note claims nothing', () => {
    for (const note of [
      undefined,
      '',
      'Blocked on Q-01. This is a letter, not a build.',
      'Complete build, conditional on the determination.',
      'Nine points open.',
      'Eight of the twelve exclusions are permanent.',
      'Three of four criteria checked.',
    ]) {
      expect(claimedGatePosition(note), String(note)).toBe(null)
    }
  })
})

describe('the conflict itself', () => {
  it('reports claimed against actual when they differ', () => {
    expect(
      gateNoteConflict({ gate: strip(7), notes: 'Eight of nine.' }),
    ).toEqual({ claimed: 8, actual: 7 })
  })

  it('says nothing when they agree, or when nothing is claimed', () => {
    expect(gateNoteConflict({ gate: strip(8), notes: 'Eight of nine.' })).toBe(null)
    expect(gateNoteConflict({ gate: strip(7), notes: 'Blocked on Q-01.' })).toBe(null)
    expect(gateNoteConflict({ gate: strip(7) })).toBe(null)
  })
})

describe('the delivered seed carries exactly this defect', () => {
  it('finds it in the compliance register', () => {
    const found = cpSeed.documents.flatMap((d) => {
      const conflict = gateNoteConflict(d as never)
      return conflict ? [{ code: d.docCode, ...conflict }] : []
    })
    expect(found).toEqual([
      { code: 'NTE-GOV-2026-SCHED-001', claimed: 8, actual: 7 },
    ])
  })

  it('is not silently corrected in the data', () => {
    // The console reports the conflict. It does not pick a winner: the answer
    // is with whoever ran the gate, and an invented resolution here would be
    // the false "cleared" this module exists to prevent.
    const row = cpSeed.documents.find((d) => d.docCode === 'NTE-GOV-2026-SCHED-001')!
    expect(row.notes).toContain('Eight of nine')
    expect(row.gate.filter(Boolean).length).toBe(7)
  })
})

describe('the console renders it', () => {
  const view = () =>
    render(
      <ModuleBody
        module={compliance}
        surface="lane-a"
        status={freezeStatus(weekWith(0))}
      />,
    )

  it('flags the conflicting row wherever it appears in a register', () => {
    const v = view()
    const flags = v.container.querySelectorAll('[data-gate-conflict="true"]')
    expect(flags.length).toBeGreaterThan(0)
    expect(flags[0]!.textContent).toContain('claims 8 of nine')
    expect(flags[0]!.textContent).toContain('strip records 7')
    v.unmount()
  })

  it('shows the gate-position distribution so the zero is legible', () => {
    const v = view()
    // No document is at eight of nine, which is the finding — not an absence.
    expect(v.text).toContain('0 of 6 drafts blocked on point 8 only')
    expect(v.text).toContain('7 of 9 — 3 documents')
    expect(v.text).toContain('6 of 9 — 2 documents')
    expect(v.text).toContain('0 of 9 — 1 document')
    v.unmount()
  })

  it('names the conflicting document in the meter panel', () => {
    const v = view()
    expect(v.text).toContain(
      'NTE-GOV-2026-SCHED-001 (note says 8, strip says 7)',
    )
    expect(v.text).toContain('Not reconciled here')
    v.unmount()
  })
})
