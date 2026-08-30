/**
 * Module 04 · Marketing & Content — dual-hosted.
 *
 * This file routes and nothing else. It holds no copy, no data and no
 * rendering: it maps a surface to the one instance permitted on it. The
 * instances hold the data, one seed each, and `shared.tsx` holds the code and
 * imports no seed at all.
 *
 * That is the shape the spec asks for. A single component reading both seeds
 * and branching on a prop would satisfy the sentence and defeat the rule —
 * both files would be in the same bundle scope, one conditional away from each
 * other.
 */

import React from 'react'
import type { ModuleDefinition, Surface } from '../../core/types'
import { assertSurface } from '../../core/lane-guard'
import { LaneAInstance } from './lane-a-instance'
import { PracticeInstance } from './practice-instance'

const SURFACES: Surface[] = ['lane-a', 'practice']

function MarketingModule({ surface }: { surface: Surface }) {
  assertSurface('marketing-content', SURFACES, surface)
  return surface === 'practice' ? (
    <PracticeInstance surface={surface} />
  ) : (
    <LaneAInstance surface={surface} />
  )
}

const definition: ModuleDefinition = {
  id: 'marketing-content',
  ordinal: '04',
  title: 'Marketing & Content',
  eyebrow: 'Calendar and assets',
  surfaces: SURFACES,
  buildWork: true,
  panels: [
    { id: 'calendar', kind: 'board', title: 'Calendar', purpose: 'Weeks and slots.' },
    { id: 'assets', kind: 'register', title: 'Assets', purpose: 'What exists.' },
    { id: 'meter', kind: 'meter', title: 'Contacts', purpose: 'One count, both instances.' },
    { id: 'ledger', kind: 'ledger', title: 'Published', purpose: 'Dates and channels.' },
  ],
  Component: MarketingModule,
}

export default definition
