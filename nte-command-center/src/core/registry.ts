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
import compliance from '../modules/compliance-cp'
import { makeStub } from '../modules/stub'

export const SURFACES: Record<Surface, { label: string; seal: string }> = {
  'lane-a': { label: 'Enterprise', seal: 'Lane A' },
  'lane-b': { label: 'Household', seal: 'Lane B' },
  practice: { label: 'Practice', seal: 'Practice desk' },
}

export const MODULES: ModuleDefinition[] = [
  governance,
  makeStub({
    id: 'ventures-revenue',
    ordinal: '02',
    title: 'Ventures & Revenue',
    eyebrow: 'What is being sold',
    surfaces: ['lane-a'],
    buildWork: true,
    needs: [
      'seed/ventures.json — 51 venture rows with class, group and entity routing',
      'The six plan records with revision and funder-annex state',
      'Model registry rows for MODEL-TOP5-001 and MODEL-LAND-001',
    ],
  }),
  makeStub({
    id: 'education-nvu',
    ordinal: '03',
    title: 'Education',
    eyebrow: 'Catalog and production',
    surfaces: ['lane-a'],
    buildWork: true,
    needs: [
      'seed/education.json — 83 course rows with house, level, price, status',
      'Deliverable gap counts by type and wave assignment',
      'The six AUTHORED provenance flags, non-dismissible',
    ],
  }),
  makeStub({
    id: 'marketing-content',
    ordinal: '04',
    title: 'Marketing & Content',
    eyebrow: 'Calendar and assets',
    surfaces: ['lane-a', 'practice'],
    buildWork: true,
    needs: [
      'Two seed files — one per surface, zero shared keys',
      'Content calendar rows with channel and status',
      'A contact meter reading the same count as the build freeze',
    ],
  }),
  makeStub({
    id: 'tech-stack',
    ordinal: '05',
    title: 'Tech Stack',
    eyebrow: 'Repositories and health',
    surfaces: ['lane-a'],
    buildWork: true,
    needs: [
      'The security hold record, rendered first and non-collapsible',
      'A two-step gate for the unified OS: export and hash before deploy',
      'A computed external-request count, not a typed one',
    ],
  }),
  makeStub({
    id: 'practice-desk',
    ordinal: '06',
    title: 'Practice Desk',
    eyebrow: 'Team and pipeline',
    surfaces: ['practice'],
    buildWork: false,
    needs: [
      'Roster, production and blockers for the weekly standup',
      'The seven-stage recruiting funnel',
      'The outside business activity gate with its drafted letter attached',
    ],
  }),
  makeStub({
    id: 'family-office',
    ordinal: '07',
    title: 'Household & Estate',
    eyebrow: 'Sunday rhythm',
    surfaces: ['lane-b'],
    buildWork: false,
    needs: [
      'The commands ledger with the two-carry limit enforced',
      'Instrument binder rows',
      'Youth records with export disabled at the component level',
    ],
  }),
  makeStub({
    id: 'lifeops',
    ordinal: '08',
    title: 'Operating System',
    eyebrow: 'Domains and cadence',
    surfaces: ['lane-a', 'lane-b'],
    buildWork: false,
    needs: [
      'Eight domains with their tool assignment',
      'A slot meter computing against 10, counting dual-run tasks as two',
      'Task rows left empty and labelled awaiting source, not reconstructed',
    ],
  }),
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
