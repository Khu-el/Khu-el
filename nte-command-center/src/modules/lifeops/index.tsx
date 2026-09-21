/**
 * Module 08 · LIFEOPS — dual-hosted, separate seed per surface.
 *
 * Same shape as module 04: this file routes, the instances hold one seed
 * each, and shared.tsx holds the code and imports neither.
 */

import React from 'react'
import type { ModuleDefinition, Surface } from '../../core/types'
import { assertSurface } from '../../core/lane-guard'
import { LaneAInstance } from './lane-a-instance'
import { LaneBInstance } from './lane-b-instance'

const SURFACES: Surface[] = ['lane-a', 'lane-b']

function LifeopsModule({ surface }: { surface: Surface }) {
  assertSurface('lifeops', SURFACES, surface)
  return surface === 'lane-b' ? (
    <LaneBInstance surface={surface} />
  ) : (
    <LaneAInstance surface={surface} />
  )
}

const definition: ModuleDefinition = {
  id: 'lifeops',
  ordinal: '08',
  title: 'Operating System',
  eyebrow: 'Domains and cadence',
  surfaces: SURFACES,
  buildWork: false,
  panels: [
    { id: 'domains', kind: 'board', title: 'Domains', purpose: 'One domain, one system.' },
    { id: 'cadence', kind: 'board', title: 'Cadence', purpose: 'Standing tasks.' },
    { id: 'slots', kind: 'meter', title: 'Slots', purpose: 'Ceiling of ten.' },
    { id: 'collision', kind: 'gate', title: 'Naming collision', purpose: 'S-01 twice.' },
  ],
  Component: LifeopsModule,
}

export default definition
