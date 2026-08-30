/**
 * Module registry.
 *
 * A surface renders only the modules whose `surfaces` array includes it.
 * Nothing else routes. Adding a module means adding one import here — if a
 * module is not in this array it does not exist to the app, which keeps the
 * firewall auditable from a single file.
 *
 * Modules 01 and 10 are built. The other nine are declared in
 * docs/MODULE-SPECS.md and stubbed below so the nav renders honestly: an
 * unbuilt module shows an empty state naming what it needs, not a blank panel.
 */

import type { ModuleDefinition, Surface } from './types'
import governance from '../modules/gov-infrastructure'
import ventures from '../modules/ventures-revenue'
import education from '../modules/education-nvu'
import marketing from '../modules/marketing-content'
import compliance from '../modules/compliance-cp'
import techStack from '../modules/tech-stack'
import practiceDesk from '../modules/practice-desk'
import familyOffice from '../modules/family-office'
import lifeops from '../modules/lifeops'
import { makeStub } from '../modules/stub'

export const SURFACES: Record<Surface, { label: string; seal: string }> = {
  'lane-a': { label: 'Enterprise', seal: 'Lane A' },
  'lane-b': { label: 'Household', seal: 'Lane B' },
  practice: { label: 'Practice', seal: 'Practice desk' },
}

export const MODULES: ModuleDefinition[] = [
  governance,
  ventures,
  education,
  marketing,
  techStack,
  practiceDesk,
  familyOffice,
  lifeops,
  makeStub({
    id: 'capability-services',
    ordinal: '09',
    title: 'Capability & Services',
    eyebrow: 'Client-facing work',
    surfaces: ['lane-a'],
    buildWork: true,
    needs: [
      'Service products with ladder position and entity routing',
      'The separation protocol gate, computed across every product it touches',
      'A pipeline board where stage five needs all four criteria',
    ],
  }),
  compliance,
  makeStub({
    id: 'knowledge-canon',
    ordinal: '11',
    title: 'Knowledge & Canon',
    eyebrow: 'Source of record',
    surfaces: ['lane-a'],
    buildWork: false,
    needs: [
      'Canon manifest rows with file references',
      'The quarantine list, with no preview or copy affordance',
      'A three-step doctrine pass attached to every recovery action',
    ],
  }),
]

export function modulesFor(surface: Surface): ModuleDefinition[] {
  return MODULES.filter((m) => m.surfaces.includes(surface)).sort((a, b) =>
    a.ordinal.localeCompare(b.ordinal),
  )
}

export function moduleById(id: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.id === id)
}
